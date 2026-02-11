/**
 * ML noise cancellation pipeline using RNNoise WASM + Web Audio.
 *
 * Pipeline:
 *   getUserMedia() → raw MediaStream
 *       ↓
 *   BiquadFilterNode (highpass @ 85Hz) — cuts low rumble (HVAC, traffic)
 *       ↓
 *   ScriptProcessorNode (RNNoise WASM) — ML noise suppression, outputs VAD
 *       ↓
 *   AudioWorkletNode (noise gate) — mutes mic when VAD says "not speech"
 *       ↓
 *   DynamicsCompressorNode — level normalization
 *       ↓
 *   MediaStreamDestination → processed MediaStream → peer.call()
 *
 * Fallback: if any step fails, returns the raw stream unchanged.
 */

import { logger } from './logger';

export interface AudioProcessor {
  /** The processed MediaStream to use for WebRTC */
  processedStream: MediaStream;
  /** The processed audio track (convenience) */
  processedAudioTrack: MediaStreamTrack;
  /** Clean up all AudioContext resources */
  destroy: () => void;
}

// RNNoise frame size (fixed by the model)
const RNNOISE_FRAME_SIZE = 480; // 10ms at 48kHz

/**
 * Creates an audio processing pipeline with ML noise cancellation.
 *
 * @param rawStream - The raw MediaStream from getUserMedia()
 * @returns AudioProcessor with processedStream, or throws on failure
 */
export async function createAudioProcessor(rawStream: MediaStream): Promise<AudioProcessor> {
  const audioTrack = rawStream.getAudioTracks()[0];
  if (!audioTrack) {
    throw new Error('No audio track in stream');
  }

  logger.info('audio', 'Creating ML audio processing pipeline...');

  // Force 48kHz sample rate (RNNoise requirement)
  const ctx = new AudioContext({ sampleRate: 48000 });

  // --- Load RNNoise WASM ---
  let rnnoiseModule: Awaited<ReturnType<typeof import('@jitsi/rnnoise-wasm')['createRNNWasmModule']>>;
  try {
    const { createRNNWasmModule } = await import('@jitsi/rnnoise-wasm');
    rnnoiseModule = await createRNNWasmModule();
    logger.info('audio', 'RNNoise WASM loaded');
  } catch (err) {
    ctx.close();
    throw new Error(`Failed to load RNNoise WASM: ${err}`);
  }

  // Create RNNoise state
  const rnnoiseState = rnnoiseModule._rnnoise_create();
  if (!rnnoiseState) {
    ctx.close();
    throw new Error('Failed to create RNNoise state');
  }

  // Allocate WASM memory for input/output frames
  const inputPtr = rnnoiseModule._malloc(RNNOISE_FRAME_SIZE * 4); // float32 = 4 bytes
  const outputPtr = rnnoiseModule._malloc(RNNOISE_FRAME_SIZE * 4);

  // --- Build audio graph ---

  // 1. Source: raw microphone stream
  const source = ctx.createMediaStreamSource(rawStream);

  // 2. Highpass filter: cuts rumble below 85Hz (HVAC, traffic, low hum)
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 85;
  highpass.Q.value = 0.7;

  // 3. ScriptProcessorNode for RNNoise
  // Buffer size 4096 gives ~85ms chunks, processed as multiple 480-sample frames
  const scriptProcessor = ctx.createScriptProcessor(4096, 1, 1);

  // Accumulation buffer for RNNoise frames
  let inputBuffer: Float32Array = new Float32Array(0);
  let latestVadProbability = 1.0;

  scriptProcessor.onaudioprocess = (event) => {
    const input = event.inputBuffer.getChannelData(0);
    const output = event.outputBuffer.getChannelData(0);

    // Concatenate new samples to accumulation buffer
    const combined = new Float32Array(inputBuffer.length + input.length);
    combined.set(inputBuffer);
    combined.set(input, inputBuffer.length);

    let readPos = 0;
    let writePos = 0;

    // Process complete 480-sample frames through RNNoise
    while (readPos + RNNOISE_FRAME_SIZE <= combined.length && writePos + RNNOISE_FRAME_SIZE <= output.length) {
      // Copy frame to WASM memory (RNNoise expects float samples scaled to ±32768)
      const heapOffset = inputPtr / 4;
      for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
        rnnoiseModule.HEAPF32[heapOffset + i] = combined[readPos + i] * 32768;
      }

      // Process frame — returns VAD probability [0, 1]
      latestVadProbability = rnnoiseModule._rnnoise_process_frame(rnnoiseState, inputPtr, outputPtr);

      // Copy denoised output back (scale from ±32768 to ±1)
      const outHeapOffset = outputPtr / 4;
      for (let i = 0; i < RNNOISE_FRAME_SIZE; i++) {
        output[writePos + i] = rnnoiseModule.HEAPF32[outHeapOffset + i] / 32768;
      }

      readPos += RNNOISE_FRAME_SIZE;
      writePos += RNNOISE_FRAME_SIZE;
    }

    // Fill remaining output with silence if we ran out of full frames
    for (let i = writePos; i < output.length; i++) {
      output[i] = 0;
    }

    // Keep leftover samples for next callback
    inputBuffer = combined.slice(readPos);
  };

  // 4. Noise gate (AudioWorklet) — optional, falls back to direct connection
  let noiseGateNode: AudioWorkletNode | null = null;
  let gateInterval: ReturnType<typeof setInterval> | null = null;

  try {
    await ctx.audioWorklet.addModule('/audio/noise-gate-processor.js');
    noiseGateNode = new AudioWorkletNode(ctx, 'noise-gate-processor');

    // Forward VAD probability to the worklet at regular intervals
    gateInterval = setInterval(() => {
      noiseGateNode?.port.postMessage({
        type: 'vad',
        probability: latestVadProbability,
      });
    }, 20); // Every 20ms

    logger.info('audio', 'Noise gate AudioWorklet loaded');
  } catch (err) {
    logger.warn('audio', `AudioWorklet not available, skipping noise gate: ${err}`);
    // Continue without noise gate — RNNoise alone still helps
  }

  // 5. Dynamics compressor: level normalization
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 6;
  compressor.ratio.value = 12;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // 6. Destination: creates a new MediaStream with processed audio
  const destination = ctx.createMediaStreamDestination();

  // --- Wire up the graph ---
  source.connect(highpass);
  highpass.connect(scriptProcessor);

  if (noiseGateNode) {
    scriptProcessor.connect(noiseGateNode);
    noiseGateNode.connect(compressor);
  } else {
    scriptProcessor.connect(compressor);
  }

  compressor.connect(destination);

  // Also connect scriptProcessor to ctx.destination (required for onaudioprocess to fire)
  // Use a silent gain node to prevent double-output
  const silentGain = ctx.createGain();
  silentGain.gain.value = 0;
  scriptProcessor.connect(silentGain);
  silentGain.connect(ctx.destination);

  const processedTrack = destination.stream.getAudioTracks()[0];
  logger.info('audio', `Pipeline active: highpass → RNNoise → ${noiseGateNode ? 'gate → ' : ''}compressor → output`);

  return {
    processedStream: destination.stream,
    processedAudioTrack: processedTrack,
    destroy: () => {
      logger.info('audio', 'Destroying audio processing pipeline');

      if (gateInterval) clearInterval(gateInterval);

      // Disconnect all nodes
      try { source.disconnect(); } catch { /* already disconnected */ }
      try { highpass.disconnect(); } catch { /* already disconnected */ }
      try { scriptProcessor.disconnect(); } catch { /* already disconnected */ }
      try { noiseGateNode?.disconnect(); } catch { /* already disconnected */ }
      try { compressor.disconnect(); } catch { /* already disconnected */ }
      try { silentGain.disconnect(); } catch { /* already disconnected */ }

      // Free RNNoise resources
      try {
        rnnoiseModule._rnnoise_destroy(rnnoiseState);
        rnnoiseModule._free(inputPtr);
        rnnoiseModule._free(outputPtr);
      } catch (err) {
        logger.warn('audio', `RNNoise cleanup error: ${err}`);
      }

      // Close the AudioContext
      ctx.close().catch(() => {});
    },
  };
}

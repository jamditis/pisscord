/**
 * Noise gate AudioWorklet processor.
 *
 * Receives a VAD (voice activity detection) probability from the main thread
 * via the MessagePort, and gates the audio accordingly — muting when the
 * probability drops below a threshold for a sustained period.
 *
 * This runs on the audio rendering thread, so it adds zero main-thread cost.
 */
class NoiseGateProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // VAD probability from RNNoise (0 = noise, 1 = speech)
    this._vadProbability = 1.0;

    // Gate state
    this._gateOpen = true;
    this._smoothedVad = 1.0;

    // Config
    this._openThreshold = 0.6;   // Open gate when VAD > this
    this._closeThreshold = 0.3;  // Close gate when VAD < this (hysteresis)
    this._attackTime = 0.005;    // 5ms attack (gate opening)
    this._releaseTime = 0.05;    // 50ms release (gate closing, avoids clicks)
    this._currentGain = 1.0;

    // Listen for VAD updates from main thread
    this.port.onmessage = (event) => {
      if (event.data.type === 'vad') {
        this._vadProbability = event.data.probability;
      } else if (event.data.type === 'config') {
        if (event.data.openThreshold !== undefined) this._openThreshold = event.data.openThreshold;
        if (event.data.closeThreshold !== undefined) this._closeThreshold = event.data.closeThreshold;
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input[0] || !output || !output[0]) {
      return true;
    }

    // Smoothed VAD with exponential moving average
    const alpha = 0.15;
    this._smoothedVad = this._smoothedVad * (1 - alpha) + this._vadProbability * alpha;

    // Hysteresis gate logic
    if (this._gateOpen && this._smoothedVad < this._closeThreshold) {
      this._gateOpen = false;
    } else if (!this._gateOpen && this._smoothedVad > this._openThreshold) {
      this._gateOpen = true;
    }

    // Target gain based on gate state
    const targetGain = this._gateOpen ? 1.0 : 0.0;

    // Smooth gain transition (attack/release) to avoid clicks
    const samplesPerFrame = input[0].length; // 128 samples per render quantum
    const sampleRate = 48000; // AudioContext forced to 48kHz
    const attackCoeff = 1.0 - Math.exp(-1.0 / (this._attackTime * sampleRate));
    const releaseCoeff = 1.0 - Math.exp(-1.0 / (this._releaseTime * sampleRate));

    for (let channel = 0; channel < input.length; channel++) {
      const inputChannel = input[channel];
      const outputChannel = output[channel];

      for (let i = 0; i < samplesPerFrame; i++) {
        // Ramp gain toward target
        const coeff = targetGain > this._currentGain ? attackCoeff : releaseCoeff;
        this._currentGain += coeff * (targetGain - this._currentGain);
        outputChannel[i] = inputChannel[i] * this._currentGain;
      }
    }

    return true;
  }
}

registerProcessor('noise-gate-processor', NoiseGateProcessor);

import React, { useState } from 'react';
import { unlockEncryption } from '../services/encryption';

interface PassphraseModalProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const PassphraseModal: React.FC<PassphraseModalProps> = ({ onComplete, onSkip }) => {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassphrase, setShowPassphrase] = useState(false);

  const handleUnlock = async () => {
    if (!passphrase) {
      setError('Please enter the passphrase');
      return;
    }

    if (passphrase.length < 4) {
      setError('Passphrase must be at least 4 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await unlockEncryption(passphrase);
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Failed to unlock encryption');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-discord-sidebar w-full max-w-md rounded-lg shadow-2xl border border-discord-accent overflow-hidden">
        {/* Header */}
        <div className="bg-discord-accent p-4">
          <h2 className="text-white font-bold text-lg flex items-center">
            <i className="fas fa-lock mr-2"></i>
            Unlock Messages
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-discord-muted text-sm mb-4">
            Enter the shared passphrase to encrypt and decrypt messages.
            Ask an existing member if you don't know it.
          </p>

          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassphrase ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                placeholder="Enter passphrase"
                className="w-full bg-discord-dark text-white px-4 py-3 rounded border border-discord-hover focus:border-discord-accent focus:outline-none pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassphrase(!showPassphrase)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-discord-muted hover:text-white"
              >
                <i className={`fas ${showPassphrase ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>

            {error && (
              <p className="text-discord-red text-sm">{error}</p>
            )}

            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full bg-discord-accent hover:bg-discord-accent/80 text-white font-bold py-3 rounded transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <>
                  <i className="fas fa-unlock mr-2"></i> Unlock
                </>
              )}
            </button>

            {/* Skip option - only show if provided */}
            {onSkip && (
              <button
                onClick={onSkip}
                className="w-full text-discord-muted hover:text-white text-sm py-2"
              >
                Skip for now (encrypted messages won't be readable)
              </button>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-discord-hover">
            <p className="text-discord-muted text-xs">
              <i className="fas fa-info-circle mr-1"></i>
              Messages are encrypted using AES-256-GCM before being stored.
              Without the passphrase, messages appear as gibberish.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

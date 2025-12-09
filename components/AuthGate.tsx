import React, { useState } from 'react';
import { registerWithEmail, signInWithEmail } from '../services/auth';
import { VoidBackground } from './Visuals';

interface AuthGateProps {
  onAuthenticated: (user: { email: string; displayName?: string }) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const user = await registerWithEmail(email, password, displayName.trim() || undefined);
        onAuthenticated({ email: user.email || '', displayName: user.displayName || displayName });
      } else {
        const user = await signInWithEmail(email, password);
        onAuthenticated({ email: user.email || '', displayName: user.displayName || displayName });
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white relative overflow-hidden">
      <VoidBackground />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f]/80 via-[#11111a]/70 to-[#0a0a0f]/80 backdrop-blur" />
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl shadow-2xl p-8 backdrop-blur-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-white/60">Welcome to</p>
              <h1 className="text-3xl font-black text-white">PISSCORD</h1>
              <p className="text-sm text-white/60">Sign in to sync voice, video, and chat</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[#f0e130] font-bold">
              v1.4.7
            </div>
          </div>

          <div className="flex gap-2 mb-6 text-sm">
            <button
              className={`flex-1 py-2 rounded-lg border ${mode === 'login' ? 'bg-[#f0e130] text-black border-[#f0e130]' : 'border-white/10 text-white/70'}`}
              onClick={() => setMode('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 rounded-lg border ${mode === 'register' ? 'bg-[#f0e130] text-black border-[#f0e130]' : 'border-white/10 text-white/70'}`}
              onClick={() => setMode('register')}
              type="button"
            >
              Register
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm text-white/70 mb-1">Email</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f0e130]"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm text-white/70 mb-1">Display name</label>
                <input
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f0e130]"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How should others see you?"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-white/70 mb-1">Password</label>
              <input
                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#f0e130]"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-[#f0e130] text-black font-semibold hover:brightness-95 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { uploadFile } from '../services/firebase';
import { useIsMobile } from '../hooks/useIsMobile';

interface ReportIssueModalProps {
  onClose: () => void;
  onSubmit: (title: string, description: string, type: 'BUG' | 'FEATURE', screenshotUrl?: string) => void;
  onShowToast: (type: 'success' | 'error', title: string, message?: string) => void;
}

export const ReportIssueModal: React.FC<ReportIssueModalProps> = ({ onClose, onSubmit, onShowToast }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'BUG' | 'FEATURE'>('BUG');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    let screenshotUrl = undefined;

    try {
      if (screenshot) {
        screenshotUrl = await uploadFile(screenshot);
      }
      onSubmit(title, description, type, screenshotUrl);
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Submission Failed', err.message);
      setIsSubmitting(false);
    }
  };

  // Mobile layout - full screen
  if (isMobile) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
          <motion.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center"
          >
            <i className="fas fa-arrow-left text-white/70"></i>
          </motion.button>
          <h2 className="text-lg font-bold text-white">Report Issue</h2>
          <motion.button
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim() || !description.trim()}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-xl text-sm font-medium ${
              isSubmitting || !title.trim() || !description.trim()
                ? 'bg-white/5 text-white/30'
                : 'bg-purple-500 text-white'
            }`}
          >
            {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Submit'}
          </motion.button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type Selection */}
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => setType('BUG')}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl font-medium text-sm transition-all flex flex-col items-center gap-2 ${
                  type === 'BUG'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  type === 'BUG' ? 'bg-red-500/20' : 'bg-white/5'
                }`}>
                  <i className="fas fa-bug"></i>
                </div>
                Bug Report
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setType('FEATURE')}
                whileTap={{ scale: 0.98 }}
                className={`p-4 rounded-2xl font-medium text-sm transition-all flex flex-col items-center gap-2 ${
                  type === 'FEATURE'
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-white/50 border border-white/10'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  type === 'FEATURE' ? 'bg-green-500/20' : 'bg-white/5'
                }`}>
                  <i className="fas fa-star"></i>
                </div>
                Feature Request
              </motion.button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'BUG' ? "e.g., Mic stops working" : "e.g., Add dark mode"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 placeholder-white/30"
                maxLength={100}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'BUG' ? "Steps to reproduce the issue..." : "Why would this feature be helpful?"}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500/50 placeholder-white/30 h-32 resize-none"
                required
              />
            </div>

            {/* Screenshot */}
            <div>
              <label className="block text-xs font-bold text-white/40 uppercase mb-2 tracking-wide">Screenshot (Optional)</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                className="hidden"
                accept="image/*"
              />
              <motion.div
                onClick={() => fileInputRef.current?.click()}
                whileTap={{ scale: 0.98 }}
                className={`border-2 border-dashed rounded-xl p-6 cursor-pointer transition-all text-center ${
                  screenshot
                    ? 'border-green-500/30 bg-green-500/10'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                {screenshot ? (
                  <div className="text-green-400 text-sm flex items-center justify-center gap-2">
                    <i className="fas fa-check-circle"></i>
                    <span className="truncate max-w-[200px]">{screenshot.name}</span>
                  </div>
                ) : (
                  <div className="text-white/40">
                    <i className="fas fa-camera text-2xl mb-2"></i>
                    <p className="text-sm">Tap to add screenshot</p>
                  </div>
                )}
              </motion.div>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  // Desktop layout
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-discord-main w-full max-w-md rounded-lg shadow-2xl overflow-hidden border border-discord-dark">
        <div className="p-4 border-b border-discord-dark flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Submit Issue / Request</h3>
          <button onClick={onClose} className="text-discord-muted hover:text-white">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setType('BUG')}
              className={`p-2 rounded font-bold text-sm transition-colors ${type === 'BUG' ? 'bg-red-500 text-white' : 'bg-discord-dark text-discord-muted hover:bg-discord-hover'}`}
            >
              <i className="fas fa-bug mr-2"></i> Bug Report
            </button>
            <button
              type="button"
              onClick={() => setType('FEATURE')}
              className={`p-2 rounded font-bold text-sm transition-colors ${type === 'FEATURE' ? 'bg-green-500 text-white' : 'bg-discord-dark text-discord-muted hover:bg-discord-hover'}`}
            >
              <i className="fas fa-star mr-2"></i> Feature Request
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={type === 'BUG' ? "e.g., Mic stops working after reconnect" : "e.g., Add dark mode toggle"}
              className="w-full bg-discord-dark text-white rounded p-2 outline-none focus:ring-2 ring-discord-accent text-sm"
              maxLength={100}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'BUG' ? "Steps to reproduce..." : "Why is this feature needed?"}
              className="w-full bg-discord-dark text-white rounded p-2 outline-none focus:ring-2 ring-discord-accent text-sm h-32 resize-none"
              required
            />
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-xs font-bold text-discord-muted uppercase mb-1">Screenshot (Optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
              className="hidden"
              accept="image/*"
            />
            <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-discord-muted/30 rounded p-3 cursor-pointer hover:bg-discord-hover/20 transition-colors text-center"
            >
                {screenshot ? (
                    <div className="text-green-400 text-sm flex items-center justify-center">
                        <i className="fas fa-check-circle mr-2"></i>
                        {screenshot.name}
                    </div>
                ) : (
                    <div className="text-discord-muted text-sm">
                        <i className="fas fa-image mr-2"></i>
                        Click to upload image
                    </div>
                )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-white hover:underline text-sm">Cancel</button>
            <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-2 rounded text-white font-bold text-sm transition-colors ${isSubmitting ? 'bg-discord-sidebar cursor-not-allowed' : 'bg-discord-accent hover:bg-indigo-600'}`}
            >
                {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

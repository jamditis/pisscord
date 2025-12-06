import React, { useState, useRef } from 'react';
import { uploadFile } from '../services/firebase';

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

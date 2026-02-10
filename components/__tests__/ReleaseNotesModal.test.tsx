import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('../../services/platform', () => ({
  Platform: { isWeb: true, isMobileWeb: false, isElectron: false, isCapacitor: false },
  UpdateService: { isSupported: false, downloadUpdate: vi.fn() },
  LinkService: { openExternal: vi.fn() },
}));

vi.mock('../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'purple',
    colors: {
      primary: '#a855f7',
      primaryRgb: '168, 85, 247',
    },
  }),
}));

import { shouldShowReleaseNotes, markVersionAsSeen, ReleaseNotesModal } from '../ReleaseNotesModal';

describe('ReleaseNotesModal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('shouldShowReleaseNotes', () => {
    it('returns true when no version has been seen', () => {
      expect(shouldShowReleaseNotes('2.0.0')).toBe(true);
    });

    it('returns false when current version has been seen', () => {
      markVersionAsSeen('2.0.0');
      expect(shouldShowReleaseNotes('2.0.0')).toBe(false);
    });

    it('returns true when a different version was seen', () => {
      markVersionAsSeen('1.5.0');
      expect(shouldShowReleaseNotes('2.0.0')).toBe(true);
    });
  });

  describe('markVersionAsSeen', () => {
    it('stores version in localStorage', () => {
      markVersionAsSeen('2.0.0');
      expect(localStorage.getItem('pisscord_last_seen_version')).toBe('2.0.0');
    });
  });

  describe('ReleaseNotesModal component', () => {
    const defaultProps = {
      version: '2.0.0',
      releaseNotes: '## What\'s New\n- Feature one\n- Feature two',
      onDismiss: vi.fn(),
    };

    it('renders version number', () => {
      render(<ReleaseNotesModal {...defaultProps} />);
      expect(screen.getByText('Version 2.0.0')).toBeTruthy();
    });

    it('renders "What\'s New" header', () => {
      render(<ReleaseNotesModal {...defaultProps} />);
      // Both the modal header and release notes content contain "What's New"
      expect(screen.getAllByText("What's New").length).toBeGreaterThanOrEqual(1);
    });

    it('renders release notes content', () => {
      render(<ReleaseNotesModal {...defaultProps} />);
      expect(screen.getByText('Feature one')).toBeTruthy();
      expect(screen.getByText('Feature two')).toBeTruthy();
    });

    it('shows "Refresh to Update" on web platform', () => {
      render(<ReleaseNotesModal {...defaultProps} />);
      expect(screen.getByText('Refresh to Update')).toBeTruthy();
    });

    it('marks version as seen and calls onDismiss when "Maybe later" is clicked', () => {
      render(<ReleaseNotesModal {...defaultProps} />);
      fireEvent.click(screen.getByText('Maybe later'));
      expect(defaultProps.onDismiss).toHaveBeenCalled();
      expect(localStorage.getItem('pisscord_last_seen_version')).toBe('2.0.0');
    });

    it('shows empty state for no release notes', () => {
      render(<ReleaseNotesModal {...defaultProps} releaseNotes="" />);
      expect(screen.getByText('No release notes available.')).toBeTruthy();
    });
  });
});

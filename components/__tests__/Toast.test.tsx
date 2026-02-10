import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

// Mock framer-motion to avoid animation issues in jsdom
vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <div ref={ref} {...props}>{children}</div>
    )),
    button: React.forwardRef(({ children, ...props }: any, ref: any) => (
      <button ref={ref} {...props}>{children}</button>
    )),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('../../hooks/useIsMobile', () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

vi.mock('../../services/sounds', () => ({
  playSound: vi.fn(),
}));

import { ToastContainer, useToast, ToastMessage } from '../Toast';
import { playSound } from '../../services/sounds';

// Test wrapper that exposes the useToast hook
const ToastTestHarness = () => {
  const { toasts, success, error, info, warning, dismissToast } = useToast();

  return (
    <div>
      <button onClick={() => success('Success!', 'It worked')}>Add success</button>
      <button onClick={() => error('Error!', 'Something failed')}>Add error</button>
      <button onClick={() => info('Info', 'FYI')}>Add info</button>
      <button onClick={() => warning('Warning', 'Be careful')}>Add warning</button>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when toasts array is empty', () => {
    const { container } = render(
      <ToastContainer toasts={[]} onDismiss={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders toast with title and message', () => {
    const toast: ToastMessage = {
      id: '1',
      type: 'success',
      title: 'Test title',
      message: 'Test message',
    };
    render(<ToastContainer toasts={[toast]} onDismiss={vi.fn()} />);
    expect(screen.getByText('Test title')).toBeTruthy();
    expect(screen.getByText('Test message')).toBeTruthy();
  });

  it('calls onDismiss when close button is clicked', () => {
    const onDismiss = vi.fn();
    const toast: ToastMessage = { id: '42', type: 'info', title: 'Dismiss me' };
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledWith('42');
  });

  it('auto-dismisses after default duration', () => {
    const onDismiss = vi.fn();
    const toast: ToastMessage = { id: '1', type: 'info', title: 'Auto dismiss' };
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(3500);
    });

    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  it('auto-dismisses after custom duration', () => {
    const onDismiss = vi.fn();
    const toast: ToastMessage = { id: '1', type: 'error', title: 'Custom', duration: 1000 };
    render(<ToastContainer toasts={[toast]} onDismiss={onDismiss} />);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(onDismiss).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onDismiss).toHaveBeenCalledWith('1');
  });

  it('useToast hook: plays error sound for error toasts', () => {
    const { getByText } = render(<ToastTestHarness />);

    act(() => {
      fireEvent.click(getByText('Add error'));
    });

    expect(playSound).toHaveBeenCalledWith('error');
  });

  it('useToast hook: does not play sound for success toasts', () => {
    const { getByText } = render(<ToastTestHarness />);

    act(() => {
      fireEvent.click(getByText('Add success'));
    });

    expect(playSound).not.toHaveBeenCalled();
  });

  it('renders multiple toasts', () => {
    const toasts: ToastMessage[] = [
      { id: '1', type: 'success', title: 'First' },
      { id: '2', type: 'error', title: 'Second' },
      { id: '3', type: 'warning', title: 'Third' },
    ];
    render(<ToastContainer toasts={toasts} onDismiss={vi.fn()} />);
    expect(screen.getByText('First')).toBeTruthy();
    expect(screen.getByText('Second')).toBeTruthy();
    expect(screen.getByText('Third')).toBeTruthy();
  });
});

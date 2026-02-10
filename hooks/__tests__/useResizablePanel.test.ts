import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizablePanel } from '../useResizablePanel';

describe('useResizablePanel', () => {
  const defaultOptions = {
    storageKey: 'test_panel_width',
    defaultWidth: 240,
    minWidth: 160,
    maxWidth: 400,
    side: 'left' as const,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('initializes with default width', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.width).toBe(240);
  });

  it('loads saved width from localStorage', () => {
    localStorage.setItem('test_panel_width', '300');
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.width).toBe(300);
  });

  it('ignores saved width outside min/max range', () => {
    localStorage.setItem('test_panel_width', '50');
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.width).toBe(240); // falls back to default
  });

  it('ignores invalid saved width', () => {
    localStorage.setItem('test_panel_width', 'not-a-number');
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.width).toBe(240);
  });

  it('setWidth clamps to min', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));

    act(() => {
      result.current.setWidth(50);
    });

    expect(result.current.width).toBe(160); // clamped to minWidth
  });

  it('setWidth clamps to max', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));

    act(() => {
      result.current.setWidth(600);
    });

    expect(result.current.width).toBe(400); // clamped to maxWidth
  });

  it('setWidth persists to localStorage', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));

    act(() => {
      result.current.setWidth(320);
    });

    expect(localStorage.getItem('test_panel_width')).toBe('320');
  });

  it('starts not resizing', () => {
    const { result } = renderHook(() => useResizablePanel(defaultOptions));
    expect(result.current.isResizing).toBe(false);
  });
});

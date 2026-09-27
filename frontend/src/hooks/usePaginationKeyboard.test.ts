import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePaginationKeyboard } from './usePaginationKeyboard';

describe('usePaginationKeyboard', () => {
  it('navigates with ArrowRight and ArrowLeft, strictly ignoring ArrowUp and ArrowDown', () => {
    const setPage = vi.fn();

    const { rerender } = renderHook(
      ({ page, totalPages }) => usePaginationKeyboard({ page, totalPages, setPage }),
      { initialProps: { page: 2, totalPages: 5 } }
    );

    // ArrowRight -> increases page
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    expect(setPage).toHaveBeenCalledTimes(1);

    // ArrowLeft -> decreases page
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
    expect(setPage).toHaveBeenCalledTimes(2);

    // ArrowUp -> should be completely ignored
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(setPage).toHaveBeenCalledTimes(2);

    // ArrowDown -> should be completely ignored
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(setPage).toHaveBeenCalledTimes(2);

    // When on page 1, ArrowLeft should not trigger
    rerender({ page: 1, totalPages: 5 });
    setPage.mockClear();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
    expect(setPage).not.toHaveBeenCalled();

    // When on last page, ArrowRight should not trigger
    rerender({ page: 5, totalPages: 5 });
    setPage.mockClear();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    expect(setPage).not.toHaveBeenCalled();
  });

  it('does not trigger pagination when activeElement is an input field', () => {
    const setPage = vi.fn();
    renderHook(() => usePaginationKeyboard({ page: 2, totalPages: 5, setPage }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
    expect(setPage).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not trigger pagination when a modal dialog is open', () => {
    const setPage = vi.fn();
    renderHook(() => usePaginationKeyboard({ page: 2, totalPages: 5, setPage }));

    const dialog = document.createElement('div');
    dialog.setAttribute('data-slot', 'dialog-content');
    document.body.appendChild(dialog);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
    expect(setPage).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });
});

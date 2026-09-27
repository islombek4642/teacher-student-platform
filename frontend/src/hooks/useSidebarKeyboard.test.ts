import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSidebarKeyboard } from './useSidebarKeyboard';

const mockNavigate = vi.fn();
let mockPathname = '/teacher/groups';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: mockPathname }),
}));

describe('useSidebarKeyboard', () => {
  const navLinks = [
    { to: '/teacher/groups', labelKey: 'groups.title' },
    { to: '/teacher/ielts/listening', labelKey: 'ielts.listening' },
    { to: '/teacher/ielts/reading', labelKey: 'ielts.reading' },
  ];

  it('navigates with ArrowDown and ArrowUp, and strictly ignores ArrowLeft and ArrowRight', () => {
    mockPathname = '/teacher/groups';
    mockNavigate.mockClear();

    renderHook(() => useSidebarKeyboard({ navLinks }));

    // ArrowDown -> navigates to next link (/teacher/ielts/listening)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/ielts/listening');

    // ArrowLeft / ArrowRight -> should be completely ignored (reserved for pagination)
    mockNavigate.mockClear();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', cancelable: true }));
    expect(mockNavigate).not.toHaveBeenCalled();

    // From listening, ArrowUp -> navigates back to groups
    mockPathname = '/teacher/ielts/listening';
    renderHook(() => useSidebarKeyboard({ navLinks }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true }));
    expect(mockNavigate).toHaveBeenCalledWith('/teacher/groups');
  });

  it('does not navigate when focused on an input element', () => {
    mockNavigate.mockClear();
    mockPathname = '/teacher/groups';
    renderHook(() => useSidebarKeyboard({ navLinks }));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('does not navigate when a modal dialog is open', () => {
    mockNavigate.mockClear();
    mockPathname = '/teacher/groups';
    renderHook(() => useSidebarKeyboard({ navLinks }));

    const dialog = document.createElement('div');
    dialog.setAttribute('data-slot', 'dialog-content');
    document.body.appendChild(dialog);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(dialog);
  });
});

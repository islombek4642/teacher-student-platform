import { useEffect } from 'react';

export interface UsePaginationKeyboardOptions {
  page: number;
  totalPages: number;
  setPage: (page: number | ((prev: number) => number)) => void;
  enabled?: boolean;
}

/**
 * Enables keyboard arrow navigation for pagination across lists:
 * - ArrowLeft: navigates to previous page (if page > 1)
 * - ArrowRight: navigates to next page (if page < totalPages)
 * - ArrowUp / ArrowDown are strictly ignored
 * - Automatically pauses if a modal dialog, dropdown menu, or text input is active
 */
export function usePaginationKeyboard({
  page,
  totalPages,
  setPage,
  enabled = true,
}: UsePaginationKeyboardOptions) {
  useEffect(() => {
    if (!enabled || totalPages <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ONLY ArrowLeft and ArrowRight (strictly NOT ArrowUp or ArrowDown)
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
        return;
      }

      // Check if a modal/dialog or dropdown/popover is currently open in the DOM
      const hasOpenModal = document.querySelector(
        '[data-slot="dialog-content"], [role="dialog"], [data-slot="dropdown-menu-content"]'
      );
      if (hasOpenModal) {
        return;
      }

      // Check if active element is an input, textarea, or editable element
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tagName = activeEl.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || activeEl.isContentEditable) {
          const inputType = (activeEl as HTMLInputElement).type;
          if (!['button', 'submit', 'reset', 'checkbox', 'radio'].includes(inputType)) {
            return;
          }
        }
      }

      if (e.key === 'ArrowLeft') {
        if (page > 1) {
          e.preventDefault();
          setPage((p) => Math.max(1, p - 1));
        }
      } else if (e.key === 'ArrowRight') {
        if (page < totalPages) {
          e.preventDefault();
          setPage((p) => Math.min(totalPages, p + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [page, totalPages, setPage, enabled]);
}

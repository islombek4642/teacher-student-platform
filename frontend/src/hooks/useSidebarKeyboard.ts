import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export interface SidebarLinkItem {
  to: string;
  labelKey: string;
  icon?: string;
}

export interface UseSidebarKeyboardOptions {
  navLinks: SidebarLinkItem[];
  enabled?: boolean;
}

/**
 * Enables keyboard arrow navigation for the sidebar:
 * - ArrowDown: navigates to the next sidebar link
 * - ArrowUp: navigates to the previous sidebar link
 * - ArrowLeft / ArrowRight are strictly ignored (reserved for table pagination)
 * - Automatically pauses if a modal dialog, dropdown menu, or text input is active
 */
export function useSidebarKeyboard({ navLinks, enabled = true }: UseSidebarKeyboardOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!enabled || !navLinks || navLinks.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ONLY ArrowUp and ArrowDown
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') {
        return;
      }

      // Check if a modal dialog, alert dialog, or dropdown menu is open
      const hasOpenOverlay = document.querySelector(
        '[data-slot="dialog-content"]:not([data-closed]), [role="dialog"]:not([data-closed]):not([aria-hidden="true"]), [data-slot="dropdown-menu-content"]:not([data-closed]), [data-slot="popover-content"]:not([data-closed])'
      );
      if (hasOpenOverlay) {
        return;
      }

      // Check if viewing full-screen task viewer or iframe
      if (document.querySelector('iframe')) {
        return;
      }

      // Check if active element is an input, textarea, or editable element
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl) {
        const tagName = activeEl.tagName;
        if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || activeEl.isContentEditable) {
          const inputType = (activeEl as HTMLInputElement).type;
          if (!['button', 'submit', 'reset', 'checkbox', 'radio'].includes(inputType)) {
            return;
          }
        }
      }

      // Find current active index based on route
      // Home links (/teacher, /student) must use exact match to avoid
      // matching all sub-routes (e.g. /teacher/groups)
      const currentIndex = navLinks.findIndex((link) => {
        const isHome = link.to === '/teacher' || link.to === '/student';
        return isHome
          ? location.pathname === link.to
          : location.pathname.startsWith(link.to);
      });

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % navLinks.length;
        if (nextIndex >= 0 && nextIndex < navLinks.length) {
          if (nextIndex !== currentIndex) {
            navigate(navLinks[nextIndex].to);
          }
          const targetLinkEl = document.querySelector<HTMLAnchorElement>(
            `a[href="${navLinks[nextIndex].to}"][data-sidebar="menu-button"], [data-sidebar="menu-button"][href="${navLinks[nextIndex].to}"], a[href="${navLinks[nextIndex].to}"]`
          );
          targetLinkEl?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = currentIndex === -1 ? navLinks.length - 1 : (currentIndex - 1 + navLinks.length) % navLinks.length;
        if (prevIndex >= 0 && prevIndex < navLinks.length) {
          if (prevIndex !== currentIndex) {
            navigate(navLinks[prevIndex].to);
          }
          const targetLinkEl = document.querySelector<HTMLAnchorElement>(
            `a[href="${navLinks[prevIndex].to}"][data-sidebar="menu-button"], [data-sidebar="menu-button"][href="${navLinks[prevIndex].to}"], a[href="${navLinks[prevIndex].to}"]`
          );
          targetLinkEl?.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navLinks, location.pathname, navigate, enabled]);
}

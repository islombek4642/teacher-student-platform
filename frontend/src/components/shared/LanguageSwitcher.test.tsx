import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LanguageSwitcher } from './LanguageSwitcher';

vi.mock('@/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/i18n')>();
  return { ...actual, setLanguage: vi.fn() };
});

describe('LanguageSwitcher', () => {
  it('calls setLanguage with the other language when clicked', async () => {
    const { setLanguage } = await import('@/i18n');
    render(<LanguageSwitcher />);

    await userEvent.click(screen.getByRole('button', { name: /EN/i }));

    expect(setLanguage).toHaveBeenCalledWith('en');
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from './ConfirmDialog';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: any) => opts?.defaultValue || key,
    }),
  };
});

describe('ConfirmDialog Keyboard Navigation', () => {
  it('navigates between cancel and confirm buttons using ArrowLeft and ArrowRight and triggers on Enter', async () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="O'chirishni tasdiqlang"
        description="Rostdan ham o'chirmoqchimisiz?"
        confirmText="O'chirish"
        cancelText="Bekor qilish"
        onConfirm={handleConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: "Bekor qilish" });
    const deleteButton = screen.getByRole('button', { name: "O'chirish" });

    // Focus starts on Cancel button or we focus it
    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);

    const dialogContent = cancelButton.closest('[data-slot="dialog-content"]');
    expect(dialogContent).toBeTruthy();

    // Press ArrowRight -> Focus moves to Delete button
    fireEvent.keyDown(cancelButton, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(deleteButton);

    // Press ArrowLeft -> Focus moves back to Cancel button
    fireEvent.keyDown(deleteButton, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cancelButton);

    // Press ArrowRight again -> Focus moves to Delete button
    fireEvent.keyDown(cancelButton, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(deleteButton);

    // Press Enter on the focused Delete button using userEvent
    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('triggers cancel on Enter when cancel button is focused', async () => {
    const handleConfirm = vi.fn();
    const handleOpenChange = vi.fn();

    render(
      <ConfirmDialog
        open={true}
        onOpenChange={handleOpenChange}
        title="Tasdiqlash"
        description="Tavsif"
        confirmText="Tasdiqlash"
        cancelText="Bekor qilish"
        onConfirm={handleConfirm}
      />
    );

    const cancelButton = screen.getByRole('button', { name: "Bekor qilish" });
    cancelButton.focus();
    expect(document.activeElement).toBe(cancelButton);

    const user = userEvent.setup();
    await user.keyboard('{Enter}');
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

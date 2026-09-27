import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Dialog, DialogContent, DialogFooter } from './dialog';
import { Button } from './button';
import { Input } from './input';

describe('Dialog Keyboard Navigation', () => {
  it('navigates between footer buttons with ArrowRight and ArrowLeft', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <p>Dialog Content</p>
          <DialogFooter>
            <Button variant="outline">Button 1</Button>
            <Button variant="default">Button 2</Button>
            <Button variant="destructive">Button 3</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    const btn1 = screen.getByRole('button', { name: 'Button 1' });
    const btn2 = screen.getByRole('button', { name: 'Button 2' });
    const btn3 = screen.getByRole('button', { name: 'Button 3' });

    btn1.focus();
    expect(document.activeElement).toBe(btn1);

    // ArrowRight -> btn2
    fireEvent.keyDown(btn1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn2);

    // ArrowRight -> btn3
    fireEvent.keyDown(btn2, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn3);

    // ArrowRight on last button -> wraps to btn1
    fireEvent.keyDown(btn3, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(btn1);

    // ArrowLeft on btn1 -> wraps to btn3
    fireEvent.keyDown(btn1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(btn3);
  });

  it('does not intercept ArrowLeft / ArrowRight when focused on a text input', () => {
    render(
      <Dialog open={true}>
        <DialogContent>
          <Input data-testid="test-input" defaultValue="hello" />
          <DialogFooter>
            <Button variant="outline">Cancel</Button>
            <Button variant="default">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );

    const input = screen.getByTestId('test-input');
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });

    input.focus();
    expect(document.activeElement).toBe(input);

    // Press ArrowRight inside input
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    // Focus should REMAIN on input, not switch to button
    expect(document.activeElement).toBe(input);
    expect(document.activeElement).not.toBe(cancelBtn);
  });
});

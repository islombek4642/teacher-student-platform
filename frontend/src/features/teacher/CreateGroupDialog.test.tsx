import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateGroupDialog } from './CreateGroupDialog';
import { useCreateGroup } from './api/groups.api';

vi.mock('./api/groups.api');
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe('CreateGroupDialog', () => {
  it('does not submit an empty group name', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateGroup).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useCreateGroup>);
    render(<CreateGroupDialog open onOpenChange={() => {}} />);

    await userEvent.click(screen.getByRole('button', { name: /groups.create/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('submits the entered group name', async () => {
    const mutate = vi.fn();
    vi.mocked(useCreateGroup).mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useCreateGroup>);
    render(<CreateGroupDialog open onOpenChange={() => {}} />);

    await userEvent.type(screen.getByLabelText(/groups.name/i), '9-A');
    await userEvent.click(screen.getByRole('button', { name: /groups.create/i }));

    expect(mutate).toHaveBeenCalledWith('9-A', expect.anything());
  });
});

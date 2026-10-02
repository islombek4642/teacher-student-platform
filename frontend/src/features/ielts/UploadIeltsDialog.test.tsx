import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UploadIeltsDialog } from './UploadIeltsDialog';
import { useUploadIeltsTask, useIeltsTasks } from './api/ielts.api';

vi.mock('./api/ielts.api', () => ({
  useUploadIeltsTask: vi.fn(),
  useIeltsTasks: vi.fn().mockReturnValue({ data: [] }),
}));

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: any) => opts?.defaultValue || key,
    }),
  };
});

describe('UploadIeltsDialog', () => {
  it('initially only renders the file input, without title input', () => {
    vi.mocked(useUploadIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <UploadIeltsDialog
        open={true}
        onOpenChange={vi.fn()}
        type="READING"
      />
    );

    // File input should be visible
    expect(screen.getByText('ielts.htmlFile')).toBeInTheDocument();
    // Task name input should NOT be visible initially
    expect(screen.queryByText('ielts.taskName')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('ielts.exampleTest')).not.toBeInTheDocument();
  });

  it('reveals title input and populates title when valid HTML file is selected', async () => {
    vi.mocked(useUploadIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <UploadIeltsDialog
        open={true}
        onOpenChange={vi.fn()}
        type="READING"
      />
    );

    const user = userEvent.setup();
    const htmlContent = `
      <html>
        <head><title>IELTS Reading Test</title></head>
        <body>
          <div class="reading-passage">
            <p class="passage-title">The Secret Life of Whales</p>
            <p>Passage content...</p>
          </div>
        </body>
      </html>
    `;
    const file = new File([htmlContent], 'test1.html', { type: 'text/html' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('ielts.taskName')).toBeInTheDocument();
    });

    const titleInput = screen.getByPlaceholderText('ielts.exampleTest') as HTMLInputElement;
    expect(titleInput.value).toBe('The Secret Life of Whales');
  });

  it('does not show title input if file type contradicts section', async () => {
    vi.mocked(useUploadIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    render(
      <UploadIeltsDialog
        open={true}
        onOpenChange={vi.fn()}
        type="LISTENING"
      />
    );

    const user = userEvent.setup();
    // Reading passage uploaded to listening dialog
    const htmlContent = `
      <html>
        <head><title>IELTS Reading</title></head>
        <body>
          <div class="reading-passage">Passage 1 content</div>
        </body>
      </html>
    `;
    const file = new File([htmlContent], 'reading.html', { type: 'text/html' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('ielts.typeMismatch')).toBeInTheDocument();
    });

    // Title input should still NOT be present
    expect(screen.queryByText('ielts.taskName')).not.toBeInTheDocument();
  });

  it('shows duplicate title warning and disables upload button when task title already exists', async () => {
    vi.mocked(useUploadIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: [
        {
          id: 'task-1',
          title: 'The Secret Life of Whales',
          type: 'READING',
          createdAt: new Date().toISOString(),
        },
      ],
    } as any);

    render(
      <UploadIeltsDialog
        open={true}
        onOpenChange={vi.fn()}
        type="READING"
      />
    );

    const user = userEvent.setup();
    const htmlContent = `
      <html>
        <head><title>IELTS Reading Test</title></head>
        <body>
          <div class="reading-passage">
            <p class="passage-title">The Secret Life of Whales</p>
            <p>Passage content...</p>
          </div>
        </body>
      </html>
    `;
    const file = new File([htmlContent], 'test1.html', { type: 'text/html' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('ielts.taskAlreadyExists')).toBeInTheDocument();
    });

    const uploadButton = screen.getByRole('button', { name: 'ielts.upload' });
    expect(uploadButton).toBeDisabled();
  });

  it('renders multiple selected files and allows uploading them', async () => {
    const mutateAsyncMock = vi.fn().mockResolvedValue({});
    vi.mocked(useUploadIeltsTask).mockReturnValue({
      mutate: vi.fn(),
      mutateAsync: mutateAsyncMock,
      isPending: false,
    } as any);

    vi.mocked(useIeltsTasks).mockReturnValue({
      data: [],
    } as any);

    const onOpenChange = vi.fn();

    render(
      <UploadIeltsDialog
        open={true}
        onOpenChange={onOpenChange}
        type="READING"
      />
    );

    const user = userEvent.setup();
    const file1 = new File(
      [
        `<html><body><div class="reading-passage"><p class="passage-title">Whales Story</p></div></body></html>`,
      ],
      'whales.html',
      { type: 'text/html' }
    );
    const file2 = new File(
      [
        `<html><body><div class="reading-passage"><p class="passage-title">Dolphins Story</p></div></body></html>`,
      ],
      'dolphins.html',
      { type: 'text/html' }
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, [file1, file2]);

    await waitFor(() => {
      expect(screen.getByText('ielts.selectedFilesCount')).toBeInTheDocument();
    });

    // Check that both titles are extracted and displayed
    expect(screen.getByDisplayValue('Whales Story')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Dolphins Story')).toBeInTheDocument();

    const uploadButton = screen.getByRole('button', { name: /ielts\.upload/i });
    expect(uploadButton).toBeEnabled();

    await user.click(uploadButton);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(2);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('detectIeltsTaskType and WRITING handling', () => {
    it('detects WRITING from writing-textarea or writing-part', async () => {
      const { detectIeltsTaskType } = await import('./UploadIeltsDialog');
      const html = `<html><head><title>IELTS Writing Test</title></head><body><div class="writing-part"><textarea class="writing-textarea" id="writingTextarea"></textarea></div></body></html>`;
      expect(detectIeltsTaskType(html)).toBe('WRITING');
    });

    it('shows type mismatch error when uploading WRITING file to READING dialog', async () => {
      render(
        <UploadIeltsDialog
          open={true}
          onOpenChange={vi.fn()}
          type="READING"
        />
      );

      const user = userEvent.setup();
      const writingFile = new File(
        [`<html><head><title>IELTS Writing Test</title></head><body><div class="writing-part"><textarea id="writingTextarea" class="writing-textarea"></textarea></div></body></html>`],
        'writing-01.html',
        { type: 'text/html' }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, writingFile);

      await waitFor(() => {
        expect(screen.getByText('ielts.typeMismatch')).toBeInTheDocument();
      });
    });

    it('accepts WRITING file when dialog type is WRITING', async () => {
      render(
        <UploadIeltsDialog
          open={true}
          onOpenChange={vi.fn()}
          type="WRITING"
        />
      );

      const user = userEvent.setup();
      const writingFile = new File(
        [`<html><head><title>IELTS Writing Test</title></head><body><div class="writing-part"><div class="task-prompt"><p><strong>The provided chart illustrates the percentage...</strong></p></div><textarea id="writingTextarea" class="writing-textarea"></textarea></div></body></html>`],
        '01-writing.html',
        { type: 'text/html' }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, writingFile);

      await waitFor(() => {
        expect(screen.queryByText('ielts.typeMismatch')).not.toBeInTheDocument();
        expect(screen.getByDisplayValue(/The provided chart illustrates/i)).toBeInTheDocument();
      });
    });
  });
});


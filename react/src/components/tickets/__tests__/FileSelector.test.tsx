/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileSelector from '../FileSelector';
import { mockFiles } from '../../../test/fixtures/files';

// Mock the icons
vi.mock('@mui/icons-material', () => ({
  AttachFile: () => <div data-testid="attach-icon" />,
  Close: () => <div data-testid="close-icon" />,
  Description: () => <div data-testid="description-icon" />,
  Image: () => <div data-testid="image-icon" />,
  PictureAsPdf: () => <div data-testid="pdf-icon" />,
  InsertDriveFile: () => <div data-testid="file-icon" />
}));

describe('FileSelector', () => {
  const defaultProps = {
    files: [],
    onFilesChange: vi.fn(),
    maxFiles: 5,
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    disabled: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without files', () => {
    render(<FileSelector {...defaultProps} />);
    
    expect(screen.getByText('File Attachments')).toBeInTheDocument();
    expect(screen.getByText('Attach Files')).toBeInTheDocument();
    expect(screen.getByText(/You can attach images, PDFs, documents/)).toBeInTheDocument();
  });

  it('renders with files', () => {
    const files = [mockFiles.validImage, mockFiles.validPdf];
    render(<FileSelector {...defaultProps} files={files} />);
    
    expect(screen.getByText('image.png')).toBeInTheDocument();
    expect(screen.getByText('document.pdf')).toBeInTheDocument();
    expect(screen.getByText(/2 file\(s\) selected/)).toBeInTheDocument();
  });

  it('shows correct file icons based on type', () => {
    const files = [mockFiles.validImage, mockFiles.validPdf, mockFiles.validDoc];
    render(<FileSelector {...defaultProps} files={files} />);
    
    expect(screen.getByTestId('image-icon')).toBeInTheDocument();
    expect(screen.getByTestId('pdf-icon')).toBeInTheDocument();
    expect(screen.getByTestId('description-icon')).toBeInTheDocument();
  });

  it('formats file sizes correctly', () => {
    const files = [mockFiles.validImage]; // 1024 bytes = 1.0 KB
    render(<FileSelector {...defaultProps} files={files} />);
    
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  it('calls onFilesChange when files are selected', async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    
    render(<FileSelector {...defaultProps} onFilesChange={onFilesChange} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    
    const file = mockFiles.validImage;
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(onFilesChange).toHaveBeenCalledWith([file]);
    });
  });

  it('removes files when remove button is clicked', async () => {
    const user = userEvent.setup();
    const onFilesChange = vi.fn();
    const files = [mockFiles.validImage, mockFiles.validPdf];
    
    render(<FileSelector {...defaultProps} files={files} onFilesChange={onFilesChange} />);
    
    const removeButtons = screen.getAllByTestId('close-icon');
    await user.click(removeButtons[0]);
    
    expect(onFilesChange).toHaveBeenCalledWith([mockFiles.validPdf]);
  });

  it('shows warning when max files reached', () => {
    const files = Array(5).fill(mockFiles.validImage);
    render(<FileSelector {...defaultProps} files={files} />);
    
    expect(screen.getByText(/Maximum number of files \(5\) reached/)).toBeInTheDocument();
  });

  it('disables attach button when max files reached', () => {
    const files = Array(5).fill(mockFiles.validImage);
    render(<FileSelector {...defaultProps} files={files} />);
    
    const attachButton = screen.getByRole('button', { name: /add more/i });
    expect(attachButton).toBeDisabled();
  });

  it('disables components when disabled prop is true', () => {
    render(<FileSelector {...defaultProps} disabled={true} />);
    
    const attachButton = screen.getByRole('button', { name: /attach files/i });
    expect(attachButton).toBeDisabled();
  });

  it('validates file size', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    
    render(<FileSelector {...defaultProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const oversizedFile = mockFiles.oversizedFile;
    await user.upload(input, oversizedFile);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('File "large.png" is too large. Maximum size is 10MB.')
      );
    });
    
    alertSpy.mockRestore();
  });

  it('has correct file type acceptance', () => {
    render(<FileSelector {...defaultProps} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    expect(input.accept).toContain('image/jpeg');
    expect(input.accept).toContain('image/png');
    expect(input.accept).toContain('application/pdf');
    expect(input.accept).toContain('application/msword');
  });

  it('prevents adding more files than maxFiles limit', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const files = Array(4).fill(mockFiles.validImage);
    
    render(<FileSelector {...defaultProps} files={files} maxFiles={5} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    const newFiles = [mockFiles.validPdf, mockFiles.validDoc]; // Trying to add 2 more files
    await user.upload(input, newFiles);
    
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('You can only select up to 5 files total.');
    });
    
    alertSpy.mockRestore();
  });

  it('updates button text based on file count', () => {
    const { rerender } = render(<FileSelector {...defaultProps} />);
    expect(screen.getByText('Attach Files')).toBeInTheDocument();
    
    rerender(<FileSelector {...defaultProps} files={[mockFiles.validImage]} />);
    expect(screen.getByText('Add More')).toBeInTheDocument();
  });

  it('shows helper text when no files are selected', () => {
    render(<FileSelector {...defaultProps} />);
    expect(screen.getByText(/You can attach images, PDFs, documents/)).toBeInTheDocument();
  });

  it('shows file count and limits when files are selected', () => {
    const files = [mockFiles.validImage, mockFiles.validPdf];
    render(<FileSelector {...defaultProps} files={files} />);
    
    expect(screen.getByText(/2 file\(s\) selected/)).toBeInTheDocument();
  });
});
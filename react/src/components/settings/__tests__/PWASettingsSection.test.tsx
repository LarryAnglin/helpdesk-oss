/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PWASettingsSection from '../PWASettingsSection';
import { mockPWASettings, mockEmptyPWASettings, mockIconProcessingResult } from '../../../test/fixtures/pwa';
import { createMockFile } from '../../../test/fixtures/files';

// Mock the icon processing service
vi.mock('../../../lib/pwa/iconProcessingService', () => ({
  iconProcessingService: {
    validateIconFile: vi.fn(),
    processIconFile: vi.fn(),
    createPreview: vi.fn()
  },
  PWA_ICON_SIZES: [72, 96, 128, 144, 152, 192, 384, 512]
}));

// Mock MUI icons
vi.mock('@mui/icons-material', () => ({
  CloudUpload: () => <div data-testid="upload-icon" />,
  Delete: () => <div data-testid="delete-icon" />,
  Refresh: () => <div data-testid="refresh-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Smartphone: () => <div data-testid="mobile-icon" />,
  Computer: () => <div data-testid="desktop-icon" />
}));

describe('PWASettingsSection', () => {
  const defaultProps = {
    settings: mockPWASettings,
    onSettingsChange: vi.fn(),
    loading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders PWA settings form', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('PWA Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('App Name')).toHaveValue('Test Help Desk');
    expect(screen.getByLabelText('Short Name')).toHaveValue('TestDesk');
    expect(screen.getByLabelText('Description')).toHaveValue('Test help desk application');
    expect(screen.getByLabelText('Theme Color')).toHaveValue('#1976d2');
    expect(screen.getByLabelText('Background Color')).toHaveValue('#ffffff');
  });

  it('calls onSettingsChange when form fields are updated', async () => {
    const onSettingsChange = vi.fn();
    
    render(<PWASettingsSection {...defaultProps} onSettingsChange={onSettingsChange} />);
    
    const appNameInput = screen.getByLabelText('App Name');
    fireEvent.change(appNameInput, { target: { value: 'New App Name' } });
    
    expect(onSettingsChange).toHaveBeenCalledWith({
      ...mockPWASettings,
      appName: 'New App Name'
    });
  });

  it('displays current icon when iconUrl is provided', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('Current Icon')).toBeInTheDocument();
    expect(screen.getByText('Generated Sizes:')).toBeInTheDocument();
  });

  it('shows icon upload area', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('Upload App Icon')).toBeInTheDocument();
    expect(screen.getByText(/PNG, JPEG, or WebP/)).toBeInTheDocument();
  });

  it('shows PWA preview section', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('PWA Preview')).toBeInTheDocument();
    expect(screen.getByText('Mobile Install')).toBeInTheDocument();
    expect(screen.getByText('Desktop Install')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-icon')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-icon')).toBeInTheDocument();
  });

  it('displays generated icon sizes as chips', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('72x72')).toBeInTheDocument();
    expect(screen.getByText('96x96')).toBeInTheDocument();
    expect(screen.getByText('128x128')).toBeInTheDocument();
    expect(screen.getByText('192x192')).toBeInTheDocument();
    expect(screen.getByText('512x512')).toBeInTheDocument();
  });

  it('handles icon upload', async () => {
    const { iconProcessingService } = await import('../../../lib/pwa/iconProcessingService');
    iconProcessingService.validateIconFile = vi.fn().mockReturnValue(null);
    iconProcessingService.createPreview = vi.fn().mockResolvedValue('data:image/png;base64,preview');
    iconProcessingService.processIconFile = vi.fn().mockResolvedValue(mockIconProcessingResult);
    
    const user = userEvent.setup();
    const onSettingsChange = vi.fn();
    
    render(<PWASettingsSection {...defaultProps} onSettingsChange={onSettingsChange} />);
    
    const file = createMockFile('icon.png', 2048, 'image/png');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(iconProcessingService.validateIconFile).toHaveBeenCalledWith(file);
      expect(iconProcessingService.createPreview).toHaveBeenCalledWith(file);
    });
  });

  it('shows upload progress during icon processing', async () => {
    const { iconProcessingService } = await import('../../../lib/pwa/iconProcessingService');
    iconProcessingService.validateIconFile = vi.fn().mockReturnValue(null);
    iconProcessingService.createPreview = vi.fn().mockResolvedValue('data:image/png;base64,preview');
    iconProcessingService.processIconFile = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockIconProcessingResult), 100))
    );
    
    const user = userEvent.setup();
    
    render(<PWASettingsSection {...defaultProps} />);
    
    const file = createMockFile('icon.png', 2048, 'image/png');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    expect(screen.getByText('Processing...')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByText('Processing...')).not.toBeInTheDocument();
    });
  });

  it('handles icon validation errors', async () => {
    const { iconProcessingService } = await import('../../../lib/pwa/iconProcessingService');
    iconProcessingService.validateIconFile = vi.fn().mockReturnValue('File too large');
    
    const user = userEvent.setup();
    
    render(<PWASettingsSection {...defaultProps} />);
    
    const file = createMockFile('large.png', 10 * 1024 * 1024, 'image/png');
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await user.upload(input, file);
    
    await waitFor(() => {
      expect(screen.getByText('File too large')).toBeInTheDocument();
    });
  });

  it('removes icon when delete button is clicked', () => {
    const onSettingsChange = vi.fn();
    
    render(<PWASettingsSection {...defaultProps} onSettingsChange={onSettingsChange} />);
    
    const deleteButton = screen.getByTestId('delete-icon').closest('button');
    expect(deleteButton).toBeInTheDocument();
    
    if (deleteButton) {
      fireEvent.click(deleteButton);
      
      expect(onSettingsChange).toHaveBeenCalledWith({
        ...mockPWASettings,
        iconUrl: undefined,
        generatedIcons: undefined
      });
    }
  });

  it('has download manifest button', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    const downloadButton = screen.getByTestId('download-icon').closest('button');
    expect(downloadButton).toBeInTheDocument();
    expect(downloadButton).not.toBeDisabled();
  });

  it('shows auto-save information', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText('Changes are automatically saved after 2 seconds of inactivity.')).toBeInTheDocument();
  });

  it('disables form when loading is true', () => {
    render(<PWASettingsSection {...defaultProps} loading={true} />);
    
    expect(screen.getByLabelText('App Name')).toBeDisabled();
    expect(screen.getByLabelText('Short Name')).toBeDisabled();
    expect(screen.getByLabelText('Description')).toBeDisabled();
    expect(screen.getByText('Saving...')).toBeInTheDocument();
  });

  it('enforces short name character limit', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    const shortNameInput = screen.getByLabelText('Short Name');
    expect(shortNameInput).toHaveAttribute('maxLength', '12');
  });

  it('shows help text', () => {
    render(<PWASettingsSection {...defaultProps} />);
    
    expect(screen.getByText(/After saving PWA settings/)).toBeInTheDocument();
    expect(screen.getByText(/service worker will automatically update/)).toBeInTheDocument();
  });

  it('renders without icons', () => {
    render(<PWASettingsSection {...defaultProps} settings={mockEmptyPWASettings} />);
    
    expect(screen.queryByText('Current Icon')).not.toBeInTheDocument();
    expect(screen.getByText('Upload App Icon')).toBeInTheDocument();
  });
});
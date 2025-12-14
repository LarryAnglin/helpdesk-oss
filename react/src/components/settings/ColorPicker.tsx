/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Chip,
  Divider,
  Alert,
  Tooltip,
} from '@mui/material';
import { HexColorPicker } from 'react-colorful';
import { useTheme } from '../../context/ThemeContext';
import { 
  COLOR_PRESETS, 
  isValidColor, 
  getColorName, 
  hasGoodContrast,
  getAccessibleTextColor 
} from '../../lib/utils/colorUtils';

interface ColorPickerProps {
  onClose?: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onClose }) => {
  const { primaryColor, setPrimaryColor, resetToDefault } = useTheme();
  const [localColor, setLocalColor] = useState(primaryColor);
  const [customColorInput, setCustomColorInput] = useState(primaryColor);


  const handlePresetClick = (color: string) => {
    setLocalColor(color);
    setCustomColorInput(color);
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColorInput(value);
    if (isValidColor(value)) {
      setLocalColor(value);
    }
  };

  const handleApply = () => {
    if (isValidColor(localColor)) {
      setPrimaryColor(localColor);
      onClose?.();
    }
  };

  const handleReset = () => {
    resetToDefault();
    setLocalColor('#2563eb');
    setCustomColorInput('#2563eb');
  };

  // Check contrast for the preview
  const textColor = getAccessibleTextColor(localColor);
  const hasGoodTextContrast = hasGoodContrast(textColor, localColor);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Choose Your Accent Color
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Pick a color that matches your brand or personal preference. 
          We'll automatically generate contrasting colors for the best visibility.
        </Typography>

        {/* Color Preview */}
        <Box sx={{ my: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Preview
          </Typography>
          <Box
            sx={{
              height: 80,
              borderRadius: 2,
              backgroundColor: localColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="h6"
              sx={{
                color: getAccessibleTextColor(localColor),
                fontWeight: 600,
                textAlign: 'center',
              }}
            >
              Sample Header
            </Typography>
            {!hasGoodTextContrast && (
              <Tooltip title="Poor contrast - text may be hard to read">
                <Chip
                  label="⚠️"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'warning.main',
                    color: 'warning.contrastText',
                  }}
                />
              </Tooltip>
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            {getColorName(localColor)} • {localColor.toUpperCase()}
          </Typography>
        </Box>

        {/* Color Presets */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Quick Colors
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 1 }}>
            {COLOR_PRESETS.map((preset) => (
              <Button
                key={preset.color}
                variant={localColor === preset.color ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handlePresetClick(preset.color)}
                sx={{
                  height: 40,
                  backgroundColor: preset.color,
                  color: 'white',
                  border: localColor === preset.color ? '2px solid' : '1px solid',
                  borderColor: localColor === preset.color ? 'primary.main' : 'divider',
                  '&:hover': {
                    backgroundColor: preset.color,
                    opacity: 0.8,
                  },
                }}
              >
                {preset.name}
              </Button>
            ))}
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Custom Color Picker */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Custom Color
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Box sx={{ 
              mb: 2, 
              position: 'relative',
              overflow: 'hidden',
              '& .react-colorful': {
                width: '100%',
                maxWidth: 200,
                position: 'relative',
              },
              '& .react-colorful__pointer': {
                display: 'none !important',
              },
              '& .react-colorful__pointer-fill': {
                display: 'none !important',
              }
            }}>
              <HexColorPicker
                color={localColor}
                onChange={(color) => {
                  setLocalColor(color);
                  setCustomColorInput(color);
                }}
              />
            </Box>
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <TextField
                label="Hex Color"
                value={customColorInput}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                placeholder="#2563eb"
                size="small"
                fullWidth
                error={!isValidColor(customColorInput)}
                helperText={!isValidColor(customColorInput) ? 'Invalid color format' : ''}
                InputProps={{
                  startAdornment: (
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: 1,
                        backgroundColor: isValidColor(customColorInput) ? customColorInput : 'transparent',
                        border: '1px solid',
                        borderColor: 'divider',
                        mr: 1,
                      }}
                    />
                  ),
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* Accessibility Info */}
        {!hasGoodTextContrast && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This color may not provide sufficient contrast for text. 
            Consider choosing a darker or lighter shade for better accessibility.
          </Alert>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={handleReset} variant="outlined">
            Reset to Default
          </Button>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button 
            onClick={handleApply} 
            variant="contained"
            disabled={!isValidColor(localColor)}
          >
            Apply Color
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ColorPicker;
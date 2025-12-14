/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  IconButton,
  Paper,
  Slider,
  Alert,
  Autocomplete,
  createFilterOptions
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { FAQ } from '../../lib/ai/faqService';

interface FAQFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (faq: Omit<FAQ, 'id' | 'lastUpdated'>) => Promise<void>;
  initialData?: FAQ | null;
  categories: string[];
}

// Default categories for new entries
const DEFAULT_CATEGORIES = [
  'Account & Password',
  'Email & Communication',
  'Software & Applications',
  'Network & Internet',
  'Hardware & Performance',
  'Hardware & Peripherals',
  'Phone & Communication',
  'Security & Access',
  'Requests & Installations'
];

const filter = createFilterOptions<string>();

const FAQFormDialog: React.FC<FAQFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  initialData,
  categories
}) => {
  const [formData, setFormData] = useState({
    category: '',
    questions: [''],
    answer: '',
    keywords: [''],
    priority: 5,
    usage_count: 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All available categories (existing + defaults)
  const allCategories = Array.from(new Set([...categories, ...DEFAULT_CATEGORIES])).sort();

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          category: initialData.category,
          questions: [...initialData.questions],
          answer: initialData.answer,
          keywords: [...initialData.keywords],
          priority: initialData.priority,
          usage_count: initialData.usage_count || 0
        });
      } else {
        setFormData({
          category: '',
          questions: [''],
          answer: '',
          keywords: [''],
          priority: 5,
          usage_count: 0
        });
      }
      setErrors({});
    }
  }, [open, initialData]);

  // Validation
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }

    const validQuestions = formData.questions.filter(q => q.trim());
    if (validQuestions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }

    if (!formData.answer.trim()) {
      newErrors.answer = 'Answer is required';
    }

    if (formData.priority < 1 || formData.priority > 10) {
      newErrors.priority = 'Priority must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      // Clean up data before submitting
      const cleanedData = {
        category: formData.category.trim(),
        questions: formData.questions.filter(q => q.trim()).map(q => q.trim()),
        answer: formData.answer.trim(),
        keywords: formData.keywords.filter(k => k.trim()).map(k => k.trim()),
        priority: formData.priority,
        usage_count: formData.usage_count
      };

      await onSubmit(cleanedData);
      onClose();
    } catch (error) {
      console.error('Error submitting FAQ:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle adding new question
  const addQuestion = () => {
    setFormData(prev => ({
      ...prev,
      questions: [...prev.questions, '']
    }));
  };

  // Handle updating question
  const updateQuestion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => i === index ? value : q)
    }));
  };

  // Handle removing question
  const removeQuestion = (index: number) => {
    if (formData.questions.length > 1) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter((_, i) => i !== index)
      }));
    }
  };

  // Handle adding new keyword
  const addKeyword = () => {
    setFormData(prev => ({
      ...prev,
      keywords: [...prev.keywords, '']
    }));
  };

  // Handle updating keyword
  const updateKeyword = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.map((k, i) => i === index ? value : k)
    }));
  };

  // Handle removing keyword
  const removeKeyword = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter((_, i) => i !== index)
    }));
  };

  // Priority labels
  const getPriorityLabel = (value: number): string => {
    if (value >= 9) return 'Critical';
    if (value >= 7) return 'High';
    if (value >= 5) return 'Medium';
    if (value >= 3) return 'Low';
    return 'Very Low';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        {initialData ? 'Edit FAQ' : 'Create New FAQ'}
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Category Selection */}
          <Autocomplete
            value={formData.category}
            onChange={(_, newValue) => {
              if (typeof newValue === 'string') {
                setFormData(prev => ({ ...prev, category: newValue }));
              } else if (newValue && 'inputValue' in newValue) {
                // Create new category
                setFormData(prev => ({ ...prev, category: (newValue as any).inputValue }));
              } else {
                setFormData(prev => ({ ...prev, category: newValue || '' }));
              }
            }}
            filterOptions={(options, params) => {
              const filtered = filter(options, params);
              const { inputValue } = params;
              const isExisting = options.some(option => inputValue === option);
              if (inputValue !== '' && !isExisting) {
                filtered.push({
                  inputValue,
                  title: `Add "${inputValue}"`
                } as any);
              }
              return filtered;
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            options={allCategories}
            getOptionLabel={(option) => {
              if (typeof option === 'string') {
                return option;
              }
              if ((option as any).inputValue) {
                return (option as any).inputValue;
              }
              return (option as any).title;
            }}
            renderOption={(props, option) => (
              <li {...props}>
                {typeof option === 'string' ? option : (option as any).title}
              </li>
            )}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category"
                error={!!errors.category}
                helperText={errors.category || 'Select existing or create new category'}
                required
              />
            )}
          />

          {/* Questions Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Questions</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                (Different ways users might ask this question)
              </Typography>
            </Box>
            
            {formData.questions.map((question, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  fullWidth
                  label={`Question ${index + 1}${index === 0 ? ' (Primary)' : ''}`}
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  error={!!errors.questions && index === 0}
                  helperText={index === 0 && errors.questions}
                  required={index === 0}
                />
                <IconButton
                  onClick={() => removeQuestion(index)}
                  disabled={formData.questions.length === 1}
                  color="error"
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addQuestion}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              Add Question Variation
            </Button>
          </Box>

          {/* Answer Section */}
          <TextField
            label="Answer"
            multiline
            rows={8}
            value={formData.answer}
            onChange={(e) => setFormData(prev => ({ ...prev, answer: e.target.value }))}
            error={!!errors.answer}
            helperText={errors.answer || 'Use {SUPPORT_PHONE} placeholder for phone numbers. Markdown formatting is supported.'}
            required
            fullWidth
          />

          {/* Keywords Section */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Keywords</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                (Terms that help match this FAQ)
              </Typography>
            </Box>
            
            {formData.keywords.map((keyword, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TextField
                  fullWidth
                  label={`Keyword ${index + 1}`}
                  value={keyword}
                  onChange={(e) => updateKeyword(index, e.target.value)}
                  size="small"
                />
                <IconButton
                  onClick={() => removeKeyword(index)}
                  color="error"
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            
            <Button
              startIcon={<AddIcon />}
              onClick={addKeyword}
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
            >
              Add Keyword
            </Button>
          </Box>

          {/* Priority Section */}
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Priority</Typography>
              <Chip
                label={`${formData.priority} - ${getPriorityLabel(formData.priority)}`}
                color={formData.priority >= 8 ? 'error' : formData.priority >= 6 ? 'warning' : 'default'}
                sx={{ ml: 2 }}
              />
            </Box>
            
            <Slider
              value={formData.priority}
              onChange={(_, value) => setFormData(prev => ({ ...prev, priority: value as number }))}
              min={1}
              max={10}
              step={1}
              marks={[
                { value: 1, label: '1' },
                { value: 3, label: '3' },
                { value: 5, label: '5' },
                { value: 7, label: '7' },
                { value: 10, label: '10' }
              ]}
              valueLabelDisplay="auto"
            />
            
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Higher priority FAQs appear first in search results. Use 8-10 for critical issues,
                6-7 for important topics, 4-5 for common questions, and 1-3 for less common issues.
              </Typography>
            </Alert>
          </Paper>

          {/* Usage Count (if editing) */}
          {initialData && (
            <TextField
              label="Usage Count"
              type="number"
              value={formData.usage_count}
              onChange={(e) => setFormData(prev => ({ ...prev, usage_count: parseInt(e.target.value) || 0 }))}
              helperText="Number of times this FAQ has been matched"
              inputProps={{ min: 0 }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : (initialData ? 'Update FAQ' : 'Create FAQ')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FAQFormDialog;
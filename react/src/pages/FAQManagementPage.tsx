/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  TablePagination
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { FAQ } from '../lib/ai/faqService';
import { faqFirestoreService } from '../lib/firebase/faqFirestoreService';
import { useAuth } from '../lib/auth/AuthContext';
import { faqService } from '../lib/ai/faqService';
import FAQFormDialog from '../components/faq/FAQFormDialog';

const FAQManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [faqs, setFAQs] = useState<FAQ[]>([]);
  const [filteredFAQs, setFilteredFAQs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Form dialog state
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [faqToDelete, setFAQToDelete] = useState<FAQ | null>(null);
  
  // Migration dialog state
  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false);
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Load FAQs and categories
  const loadFAQs = async () => {
    try {
      setLoading(true);
      const allFAQs = await faqFirestoreService.getAllFAQs();
      const allCategories = await faqFirestoreService.getCategories();
      
      setFAQs(allFAQs);
      setCategories(allCategories);
      setFilteredFAQs(allFAQs);
    } catch (error) {
      showSnackbar('Failed to load FAQs', 'error');
      console.error('Error loading FAQs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFAQs();
  }, []);

  // Filter FAQs based on search term and category
  useEffect(() => {
    let filtered = [...faqs];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.questions.some(q => q.toLowerCase().includes(searchLower)) ||
        faq.answer.toLowerCase().includes(searchLower) ||
        faq.keywords.some(k => k.toLowerCase().includes(searchLower)) ||
        faq.category.toLowerCase().includes(searchLower)
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    setFilteredFAQs(filtered);
    setPage(0); // Reset to first page when filtering
  }, [faqs, searchTerm, selectedCategory]);

  // Show snackbar message
  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  // Handle FAQ creation
  const handleCreateFAQ = () => {
    setEditingFAQ(null);
    setFormDialogOpen(true);
  };

  // Handle FAQ editing
  const handleEditFAQ = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormDialogOpen(true);
  };

  // Handle FAQ form submission
  const handleFAQSubmit = async (faqData: Omit<FAQ, 'id' | 'lastUpdated'>) => {
    try {
      if (editingFAQ) {
        // Update existing FAQ
        await faqFirestoreService.updateFAQ(editingFAQ.id, faqData, user?.uid);
        showSnackbar('FAQ updated successfully', 'success');
      } else {
        // Create new FAQ
        await faqFirestoreService.createFAQ(faqData, user?.uid);
        showSnackbar('FAQ created successfully', 'success');
      }
      
      // Reload FAQs and rebuild search index
      await loadFAQs();
      await faqService.reloadFAQs();
      setFormDialogOpen(false);
    } catch (error) {
      showSnackbar('Failed to save FAQ', 'error');
      console.error('Error saving FAQ:', error);
    }
  };

  // Handle delete confirmation
  const handleDeleteClick = (faq: FAQ) => {
    setFAQToDelete(faq);
    setDeleteDialogOpen(true);
  };

  // Handle FAQ deletion
  const handleDeleteConfirm = async () => {
    if (!faqToDelete) return;

    try {
      await faqFirestoreService.deleteFAQ(faqToDelete.id);
      showSnackbar('FAQ deleted successfully', 'success');
      
      // Reload FAQs and rebuild search index
      await loadFAQs();
      await faqService.reloadFAQs();
    } catch (error) {
      showSnackbar('Failed to delete FAQ', 'error');
      console.error('Error deleting FAQ:', error);
    } finally {
      setDeleteDialogOpen(false);
      setFAQToDelete(null);
    }
  };

  // Handle legacy FAQ migration
  const handleMigration = async () => {
    try {
      // Import the legacy FAQs
      const { LEGACY_HELPDESK_FAQS } = await import('../lib/ai/faqService');
      
      // Convert to the format expected by Firestore (without id and lastUpdated)
      const legacyFAQsForFirestore = LEGACY_HELPDESK_FAQS.map(faq => ({
        category: faq.category,
        questions: faq.questions,
        answer: faq.answer,
        keywords: faq.keywords,
        priority: faq.priority,
        usage_count: faq.usage_count || 0
      }));
      
      await faqFirestoreService.batchCreateFAQs(legacyFAQsForFirestore, user?.uid);
      showSnackbar(`Successfully migrated ${legacyFAQsForFirestore.length} FAQs`, 'success');
      
      // Reload FAQs and rebuild search index
      await loadFAQs();
      await faqService.reloadFAQs();
    } catch (error) {
      showSnackbar('Failed to migrate FAQs', 'error');
      console.error('Error migrating FAQs:', error);
    } finally {
      setMigrationDialogOpen(false);
    }
  };

  // Handle table pagination
  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Get paginated FAQs
  const paginatedFAQs = filteredFAQs.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          FAQ Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setMigrationDialogOpen(true)}
            disabled={loading}
          >
            Migrate Legacy FAQs
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadFAQs}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateFAQ}
            disabled={loading}
          >
            Add FAQ
          </Button>
        </Box>
      </Box>

      {/* Search and Filter Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            label="Search FAQs"
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />
            }}
            sx={{ minWidth: 300 }}
          />
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              label="Category"
            >
              <MenuItem value="">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="body2" color="text.secondary">
            Showing {filteredFAQs.length} of {faqs.length} FAQs
          </Typography>
        </Box>
      </Paper>

      {/* FAQ Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell>Questions</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Usage Count</TableCell>
              <TableCell>Last Updated</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  Loading FAQs...
                </TableCell>
              </TableRow>
            ) : paginatedFAQs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  {searchTerm || selectedCategory ? 'No FAQs match your filters' : 'No FAQs found'}
                </TableCell>
              </TableRow>
            ) : (
              paginatedFAQs.map((faq) => (
                <TableRow key={faq.id} hover>
                  <TableCell>
                    <Chip label={faq.category} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                        {faq.questions[0]}
                      </Typography>
                      {faq.questions.length > 1 && (
                        <Typography variant="caption" color="text.secondary">
                          +{faq.questions.length - 1} more variations
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={faq.priority}
                      size="small"
                      color={faq.priority >= 8 ? 'error' : faq.priority >= 6 ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell>{faq.usage_count || 0}</TableCell>
                  <TableCell>
                    {faq.lastUpdated.toLocaleDateString()}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit FAQ">
                      <IconButton
                        size="small"
                        onClick={() => handleEditFAQ(faq)}
                        color="primary"
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete FAQ">
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(faq)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={filteredFAQs.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* FAQ Form Dialog */}
      <FAQFormDialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        onSubmit={handleFAQSubmit}
        initialData={editingFAQ}
        categories={categories}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete FAQ</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this FAQ? This action cannot be undone.
          </Typography>
          {faqToDelete && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', color: 'text.primary' }}>
                {faqToDelete.questions[0]}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.primary', opacity: 0.7 }}>
                Category: {faqToDelete.category}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Migration Confirmation Dialog */}
      <Dialog open={migrationDialogOpen} onClose={() => setMigrationDialogOpen(false)}>
        <DialogTitle>Migrate Legacy FAQs</DialogTitle>
        <DialogContent>
          <Typography>
            This will import all legacy hardcoded FAQs into Firestore. This should only be done once
            during initial setup.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            This will create duplicate entries if FAQs have already been migrated. Only proceed if
            this is a fresh setup.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMigrationDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleMigration} color="primary" variant="contained">
            Migrate FAQs
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FAQManagementPage;
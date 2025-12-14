/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Container, TextField, Button, List, ListItem, ListItemText, IconButton } from '@mui/material';
import { collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase/firebaseConfig';
import DeleteIcon from '@mui/icons-material/Delete';

interface WelcomeLink {
  id: string;
  title: string;
  url: string;
}

const ManageWelcomeLinks: React.FC = () => {
  const [links, setLinks] = useState<WelcomeLink[]>([]);
  const [newLink, setNewLink] = useState({ title: '', url: '' });

  const fetchLinks = async () => {
    const linksCollection = collection(db, 'welcomeLinks');
    const linksSnapshot = await getDocs(linksCollection);
    const linksList = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WelcomeLink));
    setLinks(linksList);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleAddLink = async () => {
    if (newLink.title && newLink.url) {
      await addDoc(collection(db, 'welcomeLinks'), newLink);
      setNewLink({ title: '', url: '' });
      fetchLinks();
    }
  };

  const handleDeleteLink = async (id: string) => {
    await deleteDoc(doc(db, 'welcomeLinks', id));
    fetchLinks();
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" gutterBottom>
          Manage Welcome Links
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
          <TextField
            label="Title"
            value={newLink.title}
            onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
            fullWidth
          />
          <TextField
            label="URL"
            value={newLink.url}
            onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
            fullWidth
          />
          <Button onClick={handleAddLink} variant="contained">
            Add
          </Button>
        </Box>
        <List>
          {links.map((link) => (
            <ListItem key={link.id} secondaryAction={
              <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteLink(link.id)}>
                <DeleteIcon />
              </IconButton>
            }>
              <ListItemText primary={link.title} secondary={link.url} />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Container>
  );
};

export default ManageWelcomeLinks;

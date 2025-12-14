/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Container, TextField, Button, List, ListItem, ListItemText, Link } from '@mui/material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase/firebaseConfig';

interface WelcomeLink {
  id: string;
  title: string;
  url: string;
}

const WelcomePage: React.FC = () => {
  const [links, setLinks] = useState<WelcomeLink[]>([]);
  const [question, setQuestion] = useState('');

  const fetchLinks = async () => {
    const linksCollection = collection(db, 'welcomeLinks');
    const linksSnapshot = await getDocs(linksCollection);
    const linksList = linksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WelcomeLink));
    setLinks(linksList);
  };

  useEffect(() => {
    fetchLinks();
  }, []);

  const handleAskQuestion = () => {
    // TODO: Implement backend search for the question
    console.log('Question asked:', question);
  };

  return (
    <Container maxWidth="md">
      <Paper elevation={3} sx={{ p: 4, mt: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome to the Help Desk!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here are some helpful links to get you started.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Helpful Links
          </Typography>
          <List>
            {links.map((link) => (
              <ListItem key={link.id}>
                <ListItemText primary={<Link href={link.url} target="_blank" rel="noopener">{link.title}</Link>} />
              </ListItem>
            ))}
          </List>
        </Box>

        <Box>
          <Typography variant="h6" gutterBottom>
            Ask a Question
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="What can we help you with?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              fullWidth
            />
            <Button onClick={handleAskQuestion} variant="contained">
              Ask
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default WelcomePage;
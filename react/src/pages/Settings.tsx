/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState } from 'react';
import {
  Container,
  Box,
  useTheme,
  useMediaQuery,
  Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../lib/auth/AuthContext';
import SettingsNavigation from '../components/settings/SettingsNavigation';
import SettingsForm from '../components/settings/SettingsForm';

export function Settings() {
  const { userData } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedSection, setSelectedSection] = useState<string>('company');
  const [showSection, setShowSection] = useState<boolean>(!isMobile);

  const handleSectionChange = (sectionId: string) => {
    setSelectedSection(sectionId);
    if (isMobile) {
      setShowSection(true);
    } else {
      // Scroll to section on desktop
      setTimeout(() => {
        const element = document.getElementById(`settings-section-${sectionId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  };

  const handleBackToNavigation = () => {
    setShowSection(false);
  };


  if (isMobile) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {!showSection ? (
          <SettingsNavigation
            selectedSection={selectedSection}
            onSectionChange={handleSectionChange}
            userRole={userData?.role}
          />
        ) : (
          <Box>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToNavigation}
              sx={{ mb: 2 }}
            >
              Back to Settings Menu
            </Button>
            <SettingsForm 
              selectedSection={selectedSection}
            />
          </Box>
        )}
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3, position: 'relative' }}>
      <Box sx={{ display: 'flex', gap: 3 }}>
        <SettingsNavigation
          selectedSection={selectedSection}
          onSectionChange={handleSectionChange}
          userRole={userData?.role}
        />
        <Box sx={{ flex: 1 }}>
          <SettingsForm 
            selectedSection={selectedSection}
          />
        </Box>
      </Box>
      
    </Container>
  );
}
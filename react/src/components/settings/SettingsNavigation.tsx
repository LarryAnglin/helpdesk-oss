/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Typography,
  Box,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { hasRole } from '../../lib/utils/roleUtils';
import { UserRole } from '../../lib/types/user';
import {
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Psychology as PsychologyIcon,
  AutoAwesome as AutoAwesomeIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Build as BuildIcon,
  AdminPanelSettings as AdminIcon,
  AttachMoney as MoneyIcon,
  HelpOutline as HelpOutlineIcon,
  Email as EmailIcon
} from '@mui/icons-material';

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactElement;
  adminOnly?: boolean;
}

export const settingsSections: SettingsSection[] = [
  {
    id: 'company',
    title: 'Company Information',
    description: 'Company name, logo, and contact details',
    icon: <BusinessIcon />,
    adminOnly: true
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Push notifications and alert preferences',
    icon: <NotificationsIcon />
  },
  {
    id: 'email',
    title: 'Email Configuration',
    description: 'Email provider and delivery settings',
    icon: <EmailIcon />,
    adminOnly: true
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Visual theme and accessibility settings',
    icon: <SecurityIcon />
  },
  {
    id: 'ai',
    title: 'AI Configuration',
    description: 'AI assistant settings and knowledge base',
    icon: <PsychologyIcon />,
    adminOnly: true
  },
  {
    id: 'automation',
    title: 'Automation',
    description: 'Auto-assignment rules and workflows',
    icon: <AutoAwesomeIcon />,
    adminOnly: true
  },
  {
    id: 'survey',
    title: 'Customer Surveys',
    description: 'Survey settings and feedback collection',
    icon: <AssessmentIcon />,
    adminOnly: true
  },
  {
    id: 'timeCategories',
    title: 'Time Categories & Rates',
    description: 'Configure billing rates for different types of work',
    icon: <MoneyIcon />,
    adminOnly: true
  },
  {
    id: 'pwa',
    title: 'Progressive Web App',
    description: 'Mobile app and offline settings',
    icon: <SearchIcon />,
    adminOnly: true
  },
  {
    id: 'form',
    title: 'Ticket Form Configuration',
    description: 'Customize ticket creation form fields',
    icon: <BuildIcon />,
    adminOnly: true
  },
  {
    id: 'system',
    title: 'System Settings',
    description: 'Advanced configuration and maintenance',
    icon: <BuildIcon />,
    adminOnly: true
  },
  {
    id: 'setup',
    title: 'Setup Wizard',
    description: 'Initial setup and health checks',
    icon: <AdminIcon />,
    adminOnly: true
  },
  {
    id: 'commonSolutions',
    title: 'Common Solutions',
    description: 'Manage quick help links displayed on login page',
    icon: <HelpOutlineIcon />,
    adminOnly: true
  },
];

interface SettingsNavigationProps {
  selectedSection: string;
  onSectionChange: (sectionId: string) => void;
  userRole?: UserRole;
}

const SettingsNavigation: React.FC<SettingsNavigationProps> = ({
  selectedSection,
  onSectionChange,
  userRole
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const visibleSections = settingsSections.filter(section => 
    !section.adminOnly || hasRole(userRole, 'company_admin')
  );

  if (isMobile) {
    return (
      <Paper sx={{ width: '100%', mb: 2 }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Choose a category to configure
          </Typography>
        </Box>
        <List>
          {visibleSections.map((section) => (
            <ListItem key={section.id} disablePadding>
              <ListItemButton
                selected={selectedSection === section.id}
                onClick={() => onSectionChange(section.id)}
                sx={{
                  borderRadius: 1,
                  mx: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: theme.palette.primary.contrastText,
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '& .MuiListItemIcon-root': {
                      color: theme.palette.primary.contrastText,
                    }
                  }
                }}
              >
                <ListItemIcon>
                  {section.icon}
                </ListItemIcon>
                <ListItemText
                  primary={section.title}
                  secondary={section.description}
                  secondaryTypographyProps={{
                    sx: {
                      color: selectedSection === section.id 
                        ? theme.palette.primary.contrastText 
                        : theme.palette.text.secondary,
                      opacity: selectedSection === section.id ? 0.8 : 1
                    }
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: 280, height: 'fit-content', position: 'sticky', top: 24 }}>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure your help desk
        </Typography>
      </Box>
      <List sx={{ pb: 1 }}>
        {visibleSections.map((section) => (
          <ListItem key={section.id} disablePadding>
            <ListItemButton
              selected={selectedSection === section.id}
              onClick={() => onSectionChange(section.id)}
              sx={{
                borderRadius: 1,
                mx: 1,
                mb: 0.5,
                '&.Mui-selected': {
                  backgroundColor: theme.palette.primary.main,
                  color: theme.palette.primary.contrastText,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                  },
                  '& .MuiListItemIcon-root': {
                    color: theme.palette.primary.contrastText,
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {section.icon}
              </ListItemIcon>
              <ListItemText
                primary={section.title}
                primaryTypographyProps={{
                  variant: 'body2',
                  fontWeight: selectedSection === section.id ? 600 : 400
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};

export default SettingsNavigation;
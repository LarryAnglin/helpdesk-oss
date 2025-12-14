/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Box, 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Tooltip,
  Avatar,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
// @ts-ignore - FolderIcon is used in the component
import FolderIcon from '@mui/icons-material/Folder';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import HelpIcon from '@mui/icons-material/Help';
import QuizIcon from '@mui/icons-material/Quiz';
import SchoolIcon from '@mui/icons-material/School';
import WebhookIcon from '@mui/icons-material/Webhook';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../lib/auth/AuthContext';
import { UnifiedSearch } from '../search/UnifiedSearch';
import { PWAInstallButton } from '../pwa/PWAInstallPrompt';
import TenantSelector from '../tenant/TenantSelector';
import { Company } from '../../lib/types/company';
import { getCompany } from '../../lib/firebase/companyService';
import { UserPreferences } from '../user/UserPreferences';

const drawerWidth = 220;

export default function Navbar() {
  const { mode, toggleColorMode } = useTheme();
  const { user, userData, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [userPreferencesOpen, setUserPreferencesOpen] = useState(false);

  // Load company data when user data changes
  useEffect(() => {
    const loadCompanyData = async () => {
      if (userData?.companyId) {
        setLoadingCompany(true);
        try {
          const companyData = await getCompany(userData.companyId);
          setCompany(companyData);
        } catch (error) {
          console.error('Error loading company data:', error);
        } finally {
          setLoadingCompany(false);
        }
      } else {
        setCompany(null);
      }
    };

    loadCompanyData();
  }, [userData?.companyId]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Determine if search should be shown on current route
  const shouldShowSearch = () => {
    const ticketRoutes = [
      '/dashboard',
      '/tickets',
      '/tickets/all'
    ];
    
    // Check exact matches for main routes
    if (ticketRoutes.includes(location.pathname)) {
      return true;
    }
    
    // Check for ticket detail routes (e.g., /tickets/123 or /tickets/edit/123)
    if (location.pathname.startsWith('/tickets/') && 
        (location.pathname.match(/^\/tickets\/[^\/]+$/) || 
         location.pathname.startsWith('/tickets/edit/'))) {
      return true;
    }
    
    return false;
  };

  const drawer = (
    <div>
      <Divider />
      <List>
        {userData?.role === 'user' ? (
          // Regular users see Create Ticket as their main option
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/create-ticket">
              <ListItemIcon>
                <ConfirmationNumberIcon />
              </ListItemIcon>
              <ListItemText primary="Create Ticket" />
            </ListItemButton>
          </ListItem>
        ) : (
          // Tech and admin users see Dashboard
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/dashboard">
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItemButton>
          </ListItem>
        )}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/tickets">
            <ListItemIcon>
              <ConfirmationNumberIcon />
            </ListItemIcon>
            <ListItemText primary="My Tickets" />
          </ListItemButton>
        </ListItem>
        {(userData?.role !== 'user') && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/tickets/all">
              <ListItemIcon>
                <ConfirmationNumberIcon />
              </ListItemIcon>
              <ListItemText primary="All Tickets" />
            </ListItemButton>
          </ListItem>
        )}
        {(userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin') && (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/users">
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Users" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/companies">
                <ListItemIcon>
                  <BusinessIcon />
                </ListItemIcon>
                <ListItemText primary="Companies" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/faq-management">
                <ListItemIcon>
                  <QuizIcon />
                </ListItemIcon>
                <ListItemText primary="FAQ Management" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/knowledge-base">
                <ListItemIcon>
                  <SchoolIcon />
                </ListItemIcon>
                <ListItemText primary="Knowledge Base" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/welcome-links">
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Welcome Links" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/tenants">
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Tenants" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/admin/webhooks">
                <ListItemIcon>
                  <WebhookIcon />
                </ListItemIcon>
                <ListItemText primary="Webhooks" />
              </ListItemButton>
            </ListItem>
          </>
        )}
        {/* <ListItem disablePadding>
          <ListItemButton component={Link} to="/projects">
            <ListItemIcon>
              <FolderIcon />
            </ListItemIcon>
            <ListItemText primary="Projects" />
          </ListItemButton>
        </ListItem> */}
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/organization">
            <ListItemIcon>
              <BusinessIcon />
            </ListItemIcon>
            <ListItemText primary="Organization" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/settings">
            <ListItemIcon>
              <SettingsIcon />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/self-help">
            <ListItemIcon>
              <HelpIcon />
            </ListItemIcon>
            <ListItemText primary="Self-Help" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} to="/export">
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText primary="Export" />
          </ListItemButton>
        </ListItem>
        {(userData?.role === 'organization_admin' || userData?.role === 'system_admin' || userData?.role === 'super_admin') && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/import">
              <ListItemIcon>
                <UploadIcon />
              </ListItemIcon>
              <ListItemText primary="Import" />
            </ListItemButton>
          </ListItem>
        )}
        {(userData?.role === 'company_admin') && (
          <ListItem disablePadding>
            <ListItemButton component={Link} to="/companies">
              <ListItemIcon>
                <BusinessIcon />
              </ListItemIcon>
              <ListItemText primary="Company Settings" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </div>
  );

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          top: 0,
          left: 0,
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {/* Dynamic page title would go here */}
          </Typography>

          <Box sx={{ mr: 2, display: { xs: 'none', sm: 'flex' } }}>
            <TenantSelector compact />
          </Box>

          {shouldShowSearch() && (
            <Box sx={{ mr: 2 }}>
              <UnifiedSearch />
            </Box>
          )}
          
          <Box sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}>
            <PWAInstallButton variant="outlined" />
          </Box>
          
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleColorMode} color="inherit">
              {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          </Tooltip>
          
          <Box sx={{ ml: 2 }}>
            <Tooltip title="Account">
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                aria-controls={Boolean(anchorEl) ? 'account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorEl) ? 'true' : undefined}
                color="inherit"
              >
                {user?.photoURL ? (
                  <Avatar src={user.photoURL} alt={user.displayName || ''} sx={{ width: 32, height: 32 }} />
                ) : (
                  <AccountCircleIcon />
                )}
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* User menu */}
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
            mt: 1.5,
            '& .MuiAvatar-root': {
              width: 32,
              height: 32,
              ml: -0.5,
              mr: 1,
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Avatar sx={{ width: 24, height: 24, mr: 1 }} />
          {userData?.displayName || user?.email || 'User'}
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); setUserPreferencesOpen(true); }}>
          <ListItemIcon>
            <PersonIcon fontSize="small" />
          </ListItemIcon>
          User Preferences
        </MenuItem>
        <MenuItem onClick={handleMenuClose} component={Link} to="/settings">
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={() => { handleMenuClose(); handleSignOut(); }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      
      {/* Logo Area - positioned above navigation sidebar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: drawerWidth,
          height: 64, // Same height as AppBar
          backgroundColor: '#000000',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1200,
        }}
      >
        {!loadingCompany && (
          <a
            href="https://anglinai.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img
              src={company?.logoUrl || "/anglinai.png"}
              alt={company?.name || "Help Desk"}
              style={{ height: '40px', objectFit: 'contain', cursor: 'pointer' }}
            />
          </a>
        )}
      </Box>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navigation links"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              top: 64, // Push drawer down to make space for logo
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      {/* User Preferences Dialog */}
      <UserPreferences 
        open={userPreferencesOpen}
        onClose={() => setUserPreferencesOpen(false)}
      />
    </>
  );
}
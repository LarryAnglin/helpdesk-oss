/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import {
  GetApp as InstallIcon,
  Close as CloseIcon,
  Smartphone as MobileIcon,
  Computer as DesktopIcon
} from '@mui/icons-material';
import { isPWA } from '../../lib/pwa/serviceWorkerRegistration';

interface PWAInstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = ({ onInstall, onDismiss }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isPWA());

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Only show prompt if not already installed and not dismissed recently
      const lastDismissed = localStorage.getItem('pwa-install-dismissed');
      const daysSinceDismissed = lastDismissed 
        ? (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24)
        : 999;
      
      if (!isPWA() && daysSinceDismissed > 7) {
        setShowPrompt(true);
      }
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA: App was installed');
      setIsInstalled(true);
      setShowPrompt(false);
      setShowSuccessMessage(true);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA: User accepted the install prompt');
      } else {
        console.log('PWA: User dismissed the install prompt');
        handleDismiss();
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('PWA: Install prompt failed:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    onDismiss?.();
  };


  // Don't show if already installed
  if (isInstalled) {
    return null;
  }

  // iOS Install Instructions Dialog
  if (isIOS && showPrompt) {
    return (
      <Dialog open={showPrompt} onClose={handleDismiss} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <MobileIcon color="primary" />
            Install Help Desk App
            <Box flexGrow={1} />
            <IconButton size="small" onClick={handleDismiss}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Install the Help Desk app on your iPhone/iPad for the best experience:
          </Typography>
          
          <Box component="ol" sx={{ pl: 2 }}>
            <Typography component="li" variant="body2" paragraph>
              Tap the <strong>Share</strong> button at the bottom of Safari
            </Typography>
            <Typography component="li" variant="body2" paragraph>
              Scroll down and tap <strong>"Add to Home Screen"</strong>
            </Typography>
            <Typography component="li" variant="body2" paragraph>
              Tap <strong>"Add"</strong> to confirm
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            The app will appear on your home screen and work like a native app, 
            even when offline!
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismiss}>
            Maybe Later
          </Button>
          <Button variant="contained" onClick={handleDismiss}>
            Got It
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Standard PWA Install Dialog
  return (
    <>
      <Dialog open={showPrompt} onClose={handleDismiss} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <DesktopIcon color="primary" />
            Install Help Desk App
            <Box flexGrow={1} />
            <IconButton size="small" onClick={handleDismiss}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            Install the Help Desk app for quick access and offline functionality:
          </Typography>
          
          <Box sx={{ my: 2 }}>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              ✅ <strong>Instant access</strong> from your desktop or app drawer
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              ✅ <strong>Works offline</strong> - view tickets without internet
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              ✅ <strong>Push notifications</strong> for ticket updates
            </Typography>
            <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              ✅ <strong>Native app experience</strong> on any device
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            The app is small (less than 5MB) and will automatically update itself.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDismiss}>
            Maybe Later
          </Button>
          <Button 
            variant="contained" 
            startIcon={<InstallIcon />}
            onClick={handleInstallClick}
            disabled={!deferredPrompt}
          >
            Install App
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={6000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccessMessage(false)} severity="success">
          Help Desk app installed successfully! Look for it in your app drawer or desktop.
        </Alert>
      </Snackbar>
    </>
  );
};

// Simple install button component
export const PWAInstallButton: React.FC<{ variant?: 'text' | 'outlined' | 'contained' }> = ({ 
  variant = 'outlined' 
}) => {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!canInstall || isPWA()) {
    return null;
  }

  return (
    <>
      <Button
        variant={variant}
        startIcon={<InstallIcon />}
        onClick={() => {}}
        size="small"
      >
        Install App
      </Button>
      
      <PWAInstallPrompt 
        onInstall={() => setCanInstall(false)}
        onDismiss={() => {}}
      />
    </>
  );
};

export default PWAInstallPrompt;
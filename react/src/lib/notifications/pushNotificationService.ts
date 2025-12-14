/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported as isMessagingSupported,
  Messaging
} from 'firebase/messaging';
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  getDoc,
  setDoc 
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { 
  FCMToken, 
  NotificationSubscription, 
  PushNotificationPayload,
  NotificationType,
  NOTIFICATION_TEMPLATES
} from '../types/notifications';

class PushNotificationService {
  private messaging: Messaging | null = null;
  private currentToken: string | null = null;

  // VAPID key for web push (you'll need to generate this in Firebase Console)
  private readonly VAPID_KEY = import.meta.env.VITE_VAPID_KEY;

  async initialize(): Promise<boolean> {
    try {
      // Check if messaging is supported
      const supported = await isMessagingSupported();
      if (!supported) {
        console.warn('Push notifications are not supported in this browser');
        return false;
      }

      // Initialize messaging
      this.messaging = getMessaging();
      
      // Set up foreground message handler
      this.setupForegroundMessageHandler();
      
      return true;
    } catch (error) {
      console.error('Failed to initialize push notification service:', error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    // Request permission
    const permission = await Notification.requestPermission();
    return permission;
  }

  async getSubscriptionStatus(): Promise<NotificationSubscription> {
    const permission = Notification.permission;
    
    if (permission === 'denied') {
      return {
        enabled: false,
        permission: 'denied',
        error: 'Notifications are blocked. Please enable them in your browser settings.'
      };
    }

    if (permission === 'default') {
      return {
        enabled: false,
        permission: 'default'
      };
    }

    try {
      const token = await this.getFCMToken();
      return {
        enabled: !!token,
        permission: 'granted',
        fcmToken: token || undefined
      };
    } catch (error) {
      return {
        enabled: false,
        permission: 'granted',
        error: 'Failed to get notification token'
      };
    }
  }

  async getFCMToken(): Promise<string | null> {
    if (!this.messaging) {
      await this.initialize();
    }

    if (!this.messaging) {
      return null;
    }

    try {
      // Only try to get token if VAPID key is available
      if (!this.VAPID_KEY) {
        console.warn('VAPID key not configured. Push notifications will not work.');
        return null;
      }

      const token = await getToken(this.messaging, {
        vapidKey: this.VAPID_KEY
      });
      
      this.currentToken = token;
      return token;
    } catch (error) {
      console.error('Failed to get FCM token:', error);
      return null;
    }
  }

  async subscribeUser(userId: string): Promise<boolean> {
    try {
      // Request permission first
      const permission = await this.requestPermission();
      if (permission !== 'granted') {
        return false;
      }

      // Get FCM token
      const token = await this.getFCMToken();
      if (!token) {
        return false;
      }

      // Store token in user preferences
      await this.storeFCMToken(userId, token);
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe user to push notifications:', error);
      return false;
    }
  }

  async unsubscribeUser(userId: string): Promise<boolean> {
    try {
      if (this.currentToken) {
        await this.removeFCMToken(userId, this.currentToken);
      }
      this.currentToken = null;
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe user from push notifications:', error);
      return false;
    }
  }

  private async storeFCMToken(userId: string, token: string): Promise<void> {
    const userPrefsRef = doc(db, 'userPreferences', userId);
    
    // Check if document exists
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    const fcmToken: FCMToken = {
      token,
      deviceInfo: this.getDeviceInfo(),
      userAgent: navigator.userAgent,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      isActive: true
    };

    if (userPrefsDoc.exists()) {
      // Update existing document
      await updateDoc(userPrefsRef, {
        fcmTokens: arrayUnion(fcmToken),
        updatedAt: Date.now()
      });
    } else {
      // Create new document with default preferences
      await setDoc(userPrefsRef, {
        userId,
        fcmTokens: [fcmToken],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        notifications: {
          emailEnabled: true,
          pushEnabled: true
        }
      });
    }
  }

  private async removeFCMToken(userId: string, token: string): Promise<void> {
    const userPrefsRef = doc(db, 'userPreferences', userId);
    const userPrefsDoc = await getDoc(userPrefsRef);
    
    if (userPrefsDoc.exists()) {
      const data = userPrefsDoc.data();
      const fcmTokens = data.fcmTokens || [];
      
      // Find and remove the token
      const updatedTokens = fcmTokens.filter((tokenObj: FCMToken) => tokenObj.token !== token);
      
      await updateDoc(userPrefsRef, {
        fcmTokens: updatedTokens,
        updatedAt: Date.now()
      });
    }
  }

  private setupForegroundMessageHandler(): void {
    if (!this.messaging) return;

    onMessage(this.messaging, (payload) => {
      console.log('Foreground message received:', payload);
      
      // Show notification when app is in foreground
      if (payload.notification) {
        this.showNotification({
          type: payload.data?.type as NotificationType || 'system_alert',
          title: payload.notification.title || 'Notification',
          body: payload.notification.body || '',
          icon: payload.notification.icon,
          data: payload.data
        });
      }
    });
  }

  async showNotification(notification: PushNotificationPayload): Promise<void> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.ready) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const template = NOTIFICATION_TEMPLATES[notification.type];
      
      const notificationOptions: any = {
        body: notification.body,
        icon: notification.icon || template?.icon || '/icons/icon-192.png',
        badge: notification.badge || '/icons/badge-72.png',
        tag: notification.tag || template?.tag || notification.type,
        data: {
          ...notification.data,
          type: notification.type
        },
        requireInteraction: ['ticket_assigned', 'system_alert'].includes(notification.type),
        silent: false,
        renotify: true
      };

      // Only add actions if they are supported
      if ('actions' in Notification.prototype && (notification.actions || template?.actions)) {
        notificationOptions.actions = notification.actions || template?.actions || [];
      }

      await registration.showNotification(notification.title, notificationOptions);
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private getDeviceInfo(): string {
    const platform = navigator.platform || 'Unknown';
    const userAgent = navigator.userAgent;
    
    // Try to detect device type
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'Mobile';
    } else if (/Tablet|iPad/.test(userAgent)) {
      return 'Tablet';
    } else {
      return `Desktop (${platform})`;
    }
  }

  // Clean up old/inactive tokens
  async cleanupOldTokens(userId: string, maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const userPrefsDoc = await getDoc(userPrefsRef);
      
      if (userPrefsDoc.exists()) {
        const data = userPrefsDoc.data();
        const fcmTokens = data.fcmTokens || [];
        const now = Date.now();
        
        const activeTokens = fcmTokens.filter((token: FCMToken) => 
          token.isActive && (now - token.lastUsed) < maxAge
        );
        
        if (activeTokens.length !== fcmTokens.length) {
          await updateDoc(userPrefsRef, {
            fcmTokens: activeTokens,
            updatedAt: now
          });
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old tokens:', error);
    }
  }

  // Update token last used timestamp
  async updateTokenUsage(userId: string, token: string): Promise<void> {
    try {
      const userPrefsRef = doc(db, 'userPreferences', userId);
      const userPrefsDoc = await getDoc(userPrefsRef);
      
      if (userPrefsDoc.exists()) {
        const data = userPrefsDoc.data();
        const fcmTokens = data.fcmTokens || [];
        
        const updatedTokens = fcmTokens.map((tokenObj: FCMToken) => 
          tokenObj.token === token 
            ? { ...tokenObj, lastUsed: Date.now() }
            : tokenObj
        );
        
        await updateDoc(userPrefsRef, {
          fcmTokens: updatedTokens,
          updatedAt: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to update token usage:', error);
    }
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();
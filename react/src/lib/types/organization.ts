/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

export type PlanType = 'free_trial' | 'monthly' | 'annual';
export type OrganizationStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export interface BillingInfo {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan: PlanType;
  planStartDate: number;
  planEndDate?: number;
  trialEndsAt?: number;
  billingEmail: string;
  nextBillingDate?: number;
  nextPaymentDate?: number;
  lastPaymentDate?: number;
  amount?: number; // in cents
  currency: string;
  interval?: 'month' | 'year';
  paymentStatus?: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentMethodId?: string;
  paymentMethod?: {
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string; // URL-friendly name
  description?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string; // User ID of the organization owner
  status: OrganizationStatus;
  
  // Billing information
  billing: BillingInfo;
  
  // Settings
  settings: {
    timezone?: string;
    locale?: string;
    allowUserRegistration?: boolean;
    defaultUserRole?: 'user' | 'tech';
  };
  
  // Counts for analytics/billing
  userCount: number;
  companyCount: number;
  ticketCount: number;
  
  // Owner and admin users
  ownerUserId: string;
  adminUserIds: string[];
}

export interface OrganizationFormData {
  name: string;
  description?: string;
  billingEmail: string;
  timezone?: string;
  locale?: string;
}

export interface OrganizationInvitation {
  id: string;
  organizationId: string;
  organizationName: string;
  email: string;
  role: 'organization_admin' | 'user';
  invitedBy: string;
  invitedByName: string;
  createdAt: number;
  expiresAt: number;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  token: string; // Unique invitation token
}

export interface CreateOrganizationRequest {
  name: string;
  description?: string;
  billingEmail: string;
  timezone?: string;
  locale?: string;
  plan: PlanType;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  type: PlanType;
  price: number; // in cents
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  stripePriceId?: string;
  isPopular?: boolean;
}

// Default trial period: 14 days
export const TRIAL_PERIOD_DAYS = 14;

// Default plans
export const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial',
    name: 'Free Trial',
    description: '14-day free trial with full access',
    type: 'free_trial',
    price: 0,
    currency: 'usd',
    interval: 'month',
    features: [
      'Unlimited tickets',
      'Unlimited users', 
      'Unlimited companies',
      'Email notifications',
      'Basic reporting',
      'File attachments'
    ]
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    description: 'Perfect for growing teams',
    type: 'monthly',
    price: 2900, // $29.00
    currency: 'usd',
    interval: 'month',
    features: [
      'Everything in trial',
      'Priority support',
      'Advanced reporting',
      'Custom branding',
      'API access',
      'Integrations'
    ],
    isPopular: true
  },
  {
    id: 'annual',
    name: 'Annual Plan',
    description: 'Best value - 2 months free',
    type: 'annual',
    price: 29000, // $290.00 (10 months)
    currency: 'usd',
    interval: 'year',
    features: [
      'Everything in monthly',
      '2 months free',
      'Premium support',
      'Advanced analytics',
      'White-label options',
      'Custom integrations'
    ]
  }
];
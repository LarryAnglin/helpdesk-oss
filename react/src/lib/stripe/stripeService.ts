/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

import { loadStripe } from '@stripe/stripe-js';

// This will be set from environment variables
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export interface CheckoutSessionRequest {
  organizationId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface BillingPortalRequest {
  organizationId: string;
  returnUrl: string;
}

/**
 * Creates a Stripe Checkout session for subscription
 */
export const createCheckoutSession = async (request: CheckoutSessionRequest): Promise<{ sessionId: string; url: string }> => {
  try {
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/createCheckoutSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Creates a Stripe Customer Portal session for managing billing
 */
export const createBillingPortalSession = async (request: BillingPortalRequest): Promise<{ url: string }> => {
  try {
    const response = await fetch('https://us-central1-your-project-id.cloudfunctions.net/createBillingPortalSession', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create billing portal session');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    throw error;
  }
};

/**
 * Redirects to Stripe Checkout
 */
export const redirectToCheckout = async (sessionId: string): Promise<void> => {
  const stripe = await stripePromise;
  if (!stripe) {
    throw new Error('Stripe not loaded');
  }

  const { error } = await stripe.redirectToCheckout({
    sessionId,
  });

  if (error) {
    throw new Error(error.message);
  }
};

/**
 * Subscription plan definitions with Stripe price IDs
 */
export interface StripePlan {
  id: string;
  name: string;
  description: string;
  price: number; // in cents
  interval: 'month' | 'year';
  stripePriceId: string;
  features: string[];
  isPopular?: boolean;
}

// These will be configured with actual Stripe price IDs
export const STRIPE_PLANS: StripePlan[] = [
  {
    id: 'monthly',
    name: 'Monthly Plan',
    description: 'Perfect for growing teams',
    price: 2900, // $29/month
    interval: 'month',
    stripePriceId: 'price_monthly_placeholder', // Replace with actual Stripe price ID
    features: [
      'Unlimited tickets',
      'Multiple companies',
      'Email notifications',
      'Basic analytics',
      'Standard support'
    ]
  },
  {
    id: 'annual',
    name: 'Annual Plan',
    description: 'Best value for committed teams',
    price: 29000, // $290/year (2 months free)
    interval: 'year',
    stripePriceId: 'price_annual_placeholder', // Replace with actual Stripe price ID
    features: [
      'Everything in Monthly',
      '2 months free',
      'Priority support',
      'Advanced analytics',
      'Custom integrations'
    ],
    isPopular: true
  }
];

/**
 * Format price for display
 */
export const formatPrice = (cents: number, interval: 'month' | 'year'): string => {
  const amount = cents / 100;
  const intervalText = interval === 'year' ? 'year' : 'month';
  return `$${amount.toFixed(2)}/${intervalText}`;
};

/**
 * Get plan by ID
 */
export const getPlanById = (planId: string): StripePlan | undefined => {
  return STRIPE_PLANS.find(plan => plan.id === planId);
};

/**
 * Get plan by Stripe price ID
 */
export const getPlanByPriceId = (priceId: string): StripePlan | undefined => {
  return STRIPE_PLANS.find(plan => plan.stripePriceId === priceId);
};
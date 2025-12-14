/*
 * Copyright (c) 2025 anglinAI All Rights Reserved
 */

const admin = require('firebase-admin');
const stripe = process.env.STRIPE_SECRET_KEY ? require('stripe')(process.env.STRIPE_SECRET_KEY) : null;

const db = admin.firestore();
const ORGANIZATIONS_COLLECTION = 'organizations';

/**
 * Creates a Stripe Checkout Session for subscription
 */
const createCheckoutSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    
    const { organizationId, priceId, successUrl, cancelUrl } = req.body;
    
    if (!organizationId || !priceId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get organization document
    const orgDoc = await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).get();
    if (!orgDoc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgDoc.data();
    
    // Create or get Stripe customer
    let customerId = organization.billing?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: organization.billing.billingEmail,
        name: organization.name,
        metadata: {
          organizationId: organizationId,
          organizationName: organization.name
        }
      });
      customerId = customer.id;
      
      // Update organization with customer ID
      await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
        'billing.stripeCustomerId': customerId
      });
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId: organizationId
      },
      subscription_data: {
        metadata: {
          organizationId: organizationId
        }
      }
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * Creates a Stripe Customer Portal Session for managing subscriptions
 */
const createBillingPortalSession = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe not configured' });
    }
    
    const { organizationId, returnUrl } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({ error: 'Missing organization ID' });
    }

    // Get organization document
    const orgDoc = await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).get();
    if (!orgDoc.exists) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const organization = orgDoc.data();
    const customerId = organization.billing?.stripeCustomerId;
    
    if (!customerId) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    // Create portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl
    });

    res.json({ url: portalSession.url });
  } catch (error) {
    console.error('Error creating billing portal session:', error);
    res.status(500).json({ error: 'Failed to create billing portal session' });
  }
};

/**
 * Handles Stripe webhooks
 */
const handleStripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }
  
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle completed checkout session
 */
const handleCheckoutSessionCompleted = async (session) => {
  const organizationId = session.metadata.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in checkout session metadata');
    return;
  }

  // Update organization with subscription info
  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.stripeCustomerId': session.customer,
    'billing.stripeSubscriptionId': session.subscription,
    'billing.paymentStatus': 'succeeded',
    'billing.lastPaymentDate': admin.firestore.FieldValue.serverTimestamp(),
    status: 'active'
  });

  console.log(`Checkout completed for organization: ${organizationId}`);
};

/**
 * Handle subscription created
 */
const handleSubscriptionCreated = async (subscription) => {
  const organizationId = subscription.metadata.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in subscription metadata');
    return;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  
  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.stripeSubscriptionId': subscription.id,
    'billing.stripePriceId': subscription.items.data[0].price.id,
    'billing.plan': subscription.items.data[0].price.lookup_key || 'premium',
    'billing.amount': subscription.items.data[0].price.unit_amount,
    'billing.interval': subscription.items.data[0].price.recurring.interval,
    'billing.nextPaymentDate': admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    'billing.paymentStatus': subscription.status,
    status: 'active'
  });

  console.log(`Subscription created for organization: ${organizationId}`);
};

/**
 * Handle subscription updated
 */
const handleSubscriptionUpdated = async (subscription) => {
  const organizationId = subscription.metadata.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in subscription metadata');
    return;
  }

  const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  let organizationStatus = 'active';
  
  if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    organizationStatus = 'suspended';
  }

  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.stripePriceId': subscription.items.data[0].price.id,
    'billing.plan': subscription.items.data[0].price.lookup_key || 'premium',
    'billing.amount': subscription.items.data[0].price.unit_amount,
    'billing.interval': subscription.items.data[0].price.recurring.interval,
    'billing.nextPaymentDate': admin.firestore.Timestamp.fromDate(currentPeriodEnd),
    'billing.paymentStatus': subscription.status,
    status: organizationStatus
  });

  console.log(`Subscription updated for organization: ${organizationId}`);
};

/**
 * Handle subscription deleted
 */
const handleSubscriptionDeleted = async (subscription) => {
  const organizationId = subscription.metadata.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in subscription metadata');
    return;
  }

  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.paymentStatus': 'canceled',
    status: 'cancelled'
  });

  console.log(`Subscription deleted for organization: ${organizationId}`);
};

/**
 * Handle successful payment
 */
const handlePaymentSucceeded = async (invoice) => {
  const organizationId = invoice.subscription_details?.metadata?.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in invoice metadata');
    return;
  }

  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.paymentStatus': 'succeeded',
    'billing.lastPaymentDate': admin.firestore.FieldValue.serverTimestamp(),
    status: 'active'
  });

  console.log(`Payment succeeded for organization: ${organizationId}`);
};

/**
 * Handle failed payment
 */
const handlePaymentFailed = async (invoice) => {
  const organizationId = invoice.subscription_details?.metadata?.organizationId;
  
  if (!organizationId) {
    console.error('No organization ID in invoice metadata');
    return;
  }

  await db.collection(ORGANIZATIONS_COLLECTION).doc(organizationId).update({
    'billing.paymentStatus': 'failed',
    status: 'suspended'
  });

  console.log(`Payment failed for organization: ${organizationId}`);
};

module.exports = {
  createCheckoutSession,
  createBillingPortalSession,
  handleStripeWebhook
};
import express from 'express';
import Stripe from 'stripe';
import Usuario from '../models/Usuario.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANES = {
  'price_1TRzHwR2KhBUiuqwE7yWmba5': 'basico',
  'price_1TRzKfR2KhBUiuqwZmtbnkHW': 'destacado',
  'price_1TRzLwR2KhBUiuqwdxvWLngL': 'starter',
  'price_1TRzN1R2KhBUiuqwWZERfgqT': 'pro_agentes',
  'price_1TRzO0R2KhBUiuqwZvlU3gdU': 'agencia_basica',
  'price_1TRzPGR2KhBUiuqwGZVr6kR8': 'agencia_pro',
};

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const subscriptionId = session.subscription;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0].price.id;
    const plan = PLANES[priceId] || 'gratis';
    const timestamp = subscription.current_period_end;
    const fechaFin = timestamp ? new Date(timestamp * 1000) : null;

    await Usuario.findOneAndUpdate(
      { email },
      {
        plan,
        planActivo: true,
        ...(fechaFin && { planFechaFin: fechaFin }),
        stripeCustomerId: session.customer,
        stripeSubscriptionId: subscriptionId,
      }
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    await Usuario.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { plan: 'gratis', planActivo: false, planFechaFin: null }
    );
  }

  res.json({ received: true });
});

export default router;
import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Crear sesión de pago
router.post('/crear-sesion', requireAuth, async (req, res) => {
  const { priceId } = req.body;
  
  try {
    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/perfil.html?pago=exitoso`,
      cancel_url: `${process.env.APP_URL}/planes.html?pago=cancelado`,
      client_reference_id: req.user.id,
      metadata: {
        usuarioId: req.user.id
      },
      subscription_data: {
        metadata: {
          usuarioId: req.user.id
        }
      }
    };

    if (req.user.stripeCustomerId) {
      sessionParams.customer = req.user.stripeCustomerId;
    } else {
      sessionParams.customer_email = req.user.email;
    }

    const session = await stripe.checkout.sessions.create({
      ...sessionParams
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Portal de cliente Stripe
router.post('/portal-cliente', requireAuth, async (req, res) => {
  const { customerId } = req.body;
  
  try {
    if (!req.user.stripeCustomerId) {
      return res.status(400).json({ error: 'El usuario no tiene cliente Stripe asociado' });
    }

    if (customerId && customerId !== req.user.stripeCustomerId) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${process.env.APP_URL}/perfil.html`,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error portal Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

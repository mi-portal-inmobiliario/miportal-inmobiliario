import express from 'express';
import Stripe from 'stripe';
import Usuario from '../models/Usuario.js';
import { requireAuth } from '../middleware/auth.js';
import { optionalCleanString, validateBody, z } from '../utils/validation.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANES = {
  'price_1TRzHwR2KhBUiuqwE7yWmba5': 'basico',
  'price_1TRzKfR2KhBUiuqwZmtbnkHW': 'destacado',
  'price_1TRzLwR2KhBUiuqwdxvWLngL': 'starter',
  'price_1TRzN1R2KhBUiuqwWZERfgqT': 'pro_agentes',
  'price_1TRzO0R2KhBUiuqwZvlU3gdU': 'agencia_basica',
};

const crearSesionSchema = z.object({
  priceId: z.string().trim().min(3).max(120)
});

const cambiarPlanSchema = z.object({
  priceId: z.string().trim().min(3).max(120)
});

const portalClienteSchema = z.object({
  customerId: optionalCleanString(120)
});

function fechaFinPeriodo(subscription) {
  const timestamp = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000) : null;
}

// Crear sesión de pago
router.post('/crear-sesion', requireAuth, validateBody(crearSesionSchema), async (req, res) => {
  const { priceId } = req.body;
  const plan = PLANES[priceId] || 'gratis';
  
  try {
    const metadata = {
      userId: req.user.id,
      usuarioId: req.user.id,
      plan,
      priceId
    };

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/perfil.html?pago=exitoso`,
      cancel_url: `${process.env.APP_URL}/planes.html?pago=cancelado`,
      client_reference_id: req.user.id,
      metadata,
      subscription_data: {
        metadata
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

// Cambiar plan de una suscripción existente
router.post('/cambiar-plan', requireAuth, validateBody(cambiarPlanSchema), async (req, res) => {
  const { priceId } = req.body;
  const plan = PLANES[priceId];

  if (!plan) {
    return res.status(400).json({ error: 'Plan inválido' });
  }

  if (!req.user.stripeSubscriptionId) {
    return res.status(400).json({ error: 'El usuario no tiene una suscripción activa para cambiar' });
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(req.user.stripeSubscriptionId);
    const item = subscription.items?.data?.[0];

    if (!item?.id) {
      return res.status(400).json({ error: 'No se pudo localizar el plan actual en Stripe' });
    }

    const metadata = {
      userId: req.user.id,
      usuarioId: req.user.id,
      plan,
      priceId
    };

    const subscriptionActualizada = await stripe.subscriptions.update(req.user.stripeSubscriptionId, {
      items: [{ id: item.id, price: priceId }],
      proration_behavior: 'create_prorations',
      metadata
    });

    const fechaFin = fechaFinPeriodo(subscriptionActualizada);
    const usuario = await Usuario.findByIdAndUpdate(
      req.user.id,
      {
        plan,
        planActivo: true,
        ...(fechaFin && { planFechaFin: fechaFin }),
        stripeSubscriptionId: subscriptionActualizada.id,
        stripeCustomerId: subscriptionActualizada.customer
      },
      { new: true }
    );

    res.json({
      ok: true,
      plan,
      planActivo: true,
      planFechaFin: fechaFin,
      usuario: usuario ? {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email,
        plan: usuario.plan || 'gratis',
        planActivo: usuario.planActivo || false,
        planFechaFin: usuario.planFechaFin || null,
        trialAccepted: usuario.trialAccepted || false,
        trialStartDate: usuario.trialStartDate || null,
        trialEndDate: usuario.trialEndDate || null,
        trialReminderSent: usuario.trialReminderSent || false,
        stripeCustomerId: usuario.stripeCustomerId || null,
        stripeSubscriptionId: usuario.stripeSubscriptionId || null
      } : null
    });
  } catch (error) {
    console.error('Error cambiando plan Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Portal de cliente Stripe
router.post('/portal-cliente', requireAuth, validateBody(portalClienteSchema), async (req, res) => {
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

import express from 'express';
import Stripe from 'stripe';
import Usuario from '../models/Usuario.js';
import { requireAuth } from '../middleware/auth.js';
import { optionalCleanString, validateBody, z } from '../utils/validation.js';
import { getPriceIdByPlan, getStripePriceEnvName } from '../utils/stripePlans.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANES_VALIDOS = ['basico', 'destacado', 'starter', 'pro_agentes', 'agencia_basica'];

const PLAN_LABELS = {
  basico: 'Básico',
  destacado: 'Destacado',
  starter: 'Starter',
  pro_agentes: 'Pro',
  agencia_basica: 'Agencia Básica'
};

const PLAN_RANKS = {
  gratis: 0,
  basico: 1,
  destacado: 2,
  starter: 3,
  pro_agentes: 4,
  agencia_basica: 5
};

const crearSesionSchema = z.object({
  plan: z.enum(PLANES_VALIDOS)
});

const cambiarPlanSchema = z.object({
  plan: z.enum(PLANES_VALIDOS)
});

const portalClienteSchema = z.object({
  customerId: optionalCleanString(120)
});

function fechaFinPeriodo(subscription) {
  const timestamp = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000) : null;
}

function launchPromoActiva() {
  if (process.env.LAUNCH_PROMO_ENABLED !== 'true') return false;
  if (!process.env.STRIPE_LAUNCH_COUPON_ID) return false;

  const deadline = process.env.LAUNCH_PROMO_DEADLINE;
  if (!deadline) return false;

  const fechaLimite = /^\d{4}-\d{2}-\d{2}$/.test(deadline)
    ? new Date(`${deadline}T23:59:59.999Z`)
    : new Date(deadline);

  if (Number.isNaN(fechaLimite.getTime())) return false;
  return new Date() <= fechaLimite;
}

function usuarioSeguro(usuario) {
  return {
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
    stripeSubscriptionId: usuario.stripeSubscriptionId || null,
    pendingPlan: usuario.pendingPlan || null,
    pendingPriceId: usuario.pendingPriceId || null,
    pendingPlanChangeAt: usuario.pendingPlanChangeAt || null,
    pendingPlanLabel: usuario.pendingPlanLabel || null
  };
}

// Crear sesión de pago
router.post('/crear-sesion', requireAuth, validateBody(crearSesionSchema), async (req, res) => {
  const { plan } = req.body;
  const priceId = getPriceIdByPlan(plan);

  if (!priceId) {
    return res.status(500).json({
      error: `Falta configurar la variable ${getStripePriceEnvName(plan)}`
    });
  }
  
  try {
    const promoLanzamientoActiva = launchPromoActiva();
    const metadata = {
      userId: req.user.id,
      usuarioId: req.user.id,
      plan,
      priceId
    };

    if (promoLanzamientoActiva) {
      Object.assign(metadata, {
        launchPromoEligible: 'true',
        launchPromoCouponId: process.env.STRIPE_LAUNCH_COUPON_ID
      });
    }

    const sessionParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.APP_URL}/perfil.html?pago=exitoso`,
      cancel_url: `${process.env.APP_URL}/planes?pago=cancelado`,
      client_reference_id: req.user.id,
      metadata,
      subscription_data: {
        metadata
      }
    };

    if (promoLanzamientoActiva) {
      console.log('Oferta lanzamiento: suscripción marcada como elegible para 50% en la tercera mensualidad', {
        userId: req.user.id,
        plan,
        priceId
      });
    }

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
  const { plan: nuevoPlan } = req.body;
  const priceId = getPriceIdByPlan(nuevoPlan);

  if (!priceId) {
    return res.status(500).json({
      error: `Falta configurar la variable ${getStripePriceEnvName(nuevoPlan)}`
    });
  }

  if (!req.user.stripeSubscriptionId) {
    return res.status(400).json({ error: 'El usuario no tiene una suscripción activa para cambiar' });
  }

  try {
    const usuarioActual = await Usuario.findById(req.user.id);
    if (!usuarioActual) return res.status(404).json({ error: 'Usuario no encontrado' });

    const planActual = usuarioActual.plan || 'gratis';
    const actualRank = PLAN_RANKS[planActual];
    const nuevoRank = PLAN_RANKS[nuevoPlan];

    if (actualRank === undefined || nuevoRank === undefined) {
      return res.status(400).json({ error: 'No se puede cambiar este plan automáticamente' });
    }

    if (nuevoRank === actualRank) {
      return res.status(400).json({ error: 'Ya tienes este plan activo' });
    }

    const subscription = await stripe.subscriptions.retrieve(req.user.stripeSubscriptionId);
    const item = subscription.items?.data?.[0];
    const fechaFinActual = fechaFinPeriodo(subscription) || usuarioActual.planFechaFin || null;

    if (!item?.id) {
      return res.status(400).json({ error: 'No se pudo localizar el plan actual en Stripe' });
    }

    if (nuevoRank < actualRank) {
      if (!fechaFinActual) {
        return res.status(400).json({ error: 'No se pudo obtener la fecha de fin del periodo actual' });
      }

      usuarioActual.pendingPlan = nuevoPlan;
      usuarioActual.pendingPriceId = priceId;
      usuarioActual.pendingPlanChangeAt = fechaFinActual;
      usuarioActual.pendingPlanLabel = PLAN_LABELS[nuevoPlan];
      await usuarioActual.save();

      return res.json({
        ok: true,
        tipoCambio: 'downgrade_programado',
        usuario: usuarioSeguro(usuarioActual)
      });
    }

    const metadata = {
      userId: req.user.id,
      usuarioId: req.user.id,
      plan: nuevoPlan,
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
        plan: nuevoPlan,
        planActivo: true,
        ...(fechaFin && { planFechaFin: fechaFin }),
        stripeSubscriptionId: subscriptionActualizada.id,
        stripeCustomerId: subscriptionActualizada.customer,
        pendingPlan: null,
        pendingPriceId: null,
        pendingPlanChangeAt: null,
        pendingPlanLabel: null
      },
      { new: true }
    );

    res.json({
      ok: true,
      tipoCambio: 'upgrade',
      plan: nuevoPlan,
      planActivo: true,
      planFechaFin: fechaFin,
      usuario: usuario ? usuarioSeguro(usuario) : null
    });
  } catch (error) {
    console.error('Error cambiando plan Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancelar un downgrade programado
router.post('/cancelar-cambio-programado', requireAuth, async (req, res) => {
  try {
    const usuario = await Usuario.findByIdAndUpdate(
      req.user.id,
      {
        pendingPlan: null,
        pendingPriceId: null,
        pendingPlanChangeAt: null,
        pendingPlanLabel: null
      },
      { new: true }
    );

    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    res.json({ ok: true, usuario: usuarioSeguro(usuario) });
  } catch (error) {
    console.error('Error cancelando cambio programado:', error);
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

    const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL;
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripeCustomerId,
      return_url: `${frontendUrl}/perfil.html?stripe=return`,
    });
    
    res.json({ url: session.url });
  } catch (error) {
    console.error('Error portal Stripe:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

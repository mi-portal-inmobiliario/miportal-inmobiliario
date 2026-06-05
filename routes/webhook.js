import express from 'express';
import Stripe from 'stripe';
import Usuario from '../models/Usuario.js';
import { enviarCorreo } from '../utils/email.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PLANES = {
  'price_1TRzHwR2KhBUiuqwE7yWmba5': 'basico',
  'price_1TRzKfR2KhBUiuqwZmtbnkHW': 'destacado',
  'price_1TRzLwR2KhBUiuqwdxvWLngL': 'starter',
  'price_1TRzN1R2KhBUiuqwWZERfgqT': 'pro_agentes',
  'price_1TRzO0R2KhBUiuqwZvlU3gdU': 'agencia_basica',
};

const NOMBRES_PLANES = {
  basico: 'Básico', destacado: 'Destacado', starter: 'Starter',
  pro_agentes: 'Pro', agencia_basica: 'Agencia Básica',
};

function esObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ''));
}

function fechaFinPeriodo(subscription) {
  const timestamp = subscription.current_period_end || subscription.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000) : null;
}

function datosPlanDesdeSubscription(subscription) {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  const plan = PLANES[priceId] || 'gratis';
  const fechaFin = fechaFinPeriodo(subscription);
  return { priceId, plan, fechaFin };
}

function customerId(subscription) {
  const customer = subscription.customer;
  return typeof customer === 'string' ? customer : customer?.id;
}

function metadataUserId(subscription) {
  return subscription.metadata?.userId || subscription.metadata?.usuarioId;
}

async function buscarUsuarioPorSubscription(subscription) {
  const customer = customerId(subscription);
  if (customer) {
    const usuario = await Usuario.findOne({ stripeCustomerId: customer });
    if (usuario) return usuario;
  }

  const userId = metadataUserId(subscription);
  if (esObjectId(userId)) {
    return Usuario.findById(userId);
  }

  return null;
}

async function actualizarUsuarioDesdeSubscription(subscription, extraUpdate = {}) {
  const { priceId, plan, fechaFin } = datosPlanDesdeSubscription(subscription);
  const customer = customerId(subscription);
  const usuario = await buscarUsuarioPorSubscription(subscription);

  if (!usuario) {
    return { usuario: null, priceId, plan, fechaFin, customer, updated: false };
  }

  usuario.plan = extraUpdate.plan || plan;
  usuario.planActivo = subscription.status === 'active' || subscription.status === 'trialing';
  if (fechaFin) usuario.planFechaFin = fechaFin;
  usuario.stripeSubscriptionId = subscription.id;
  if (customer) usuario.stripeCustomerId = customer;

  Object.entries(extraUpdate).forEach(([key, value]) => {
    usuario[key] = value;
  });

  await usuario.save();

  return { usuario, priceId, plan: usuario.plan, fechaFin, customer, updated: true };
}

function phasePriceId(phase) {
  const price = phase?.items?.[0]?.price;
  return typeof price === 'string' ? price : price?.id;
}

async function getScheduledPlanChange(subscription, currentPriceId) {
  const scheduleRef = subscription.schedule;
  if (!scheduleRef) return null;

  const schedule = typeof scheduleRef === 'string'
    ? await stripe.subscriptionSchedules.retrieve(scheduleRef)
    : scheduleRef;

  const now = Math.floor(Date.now() / 1000);
  const futurePhase = schedule.phases
    ?.filter(phase => Number(phase.start_date) > now)
    .sort((a, b) => Number(a.start_date) - Number(b.start_date))
    .find(phase => {
      const nextPriceId = phasePriceId(phase);
      return nextPriceId && nextPriceId !== currentPriceId;
    });

  if (!futurePhase) return null;

  const pendingPriceId = phasePriceId(futurePhase);
  const pendingPlan = PLANES[pendingPriceId];
  if (!pendingPlan) return null;

  return {
    pendingPlan,
    pendingPriceId,
    pendingPlanChangeAt: new Date(Number(futurePhase.start_date) * 1000),
    pendingPlanLabel: NOMBRES_PLANES[pendingPlan] || pendingPlan
  };
}

router.post('/', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  if (!Buffer.isBuffer(req.body)) {
    console.error('Webhook error: el body no llegó como Buffer', {
      bodyType: typeof req.body,
      isBuffer: Buffer.isBuffer(req.body)
    });
    return res.status(400).send('Webhook Error: invalid raw body');
  }

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message, {
      hasSignature: Boolean(sig),
      bodyIsBuffer: Buffer.isBuffer(req.body),
      bodyLength: req.body?.length
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ===== SUSCRIPCIÓN COMPLETADA =====
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const subscriptionId = session.subscription;
    const metadata = session.metadata || {};

    console.log('Stripe webhook recibido', {
      eventType: event.type,
      sessionId: session.id,
      metadata,
      customer: session.customer,
      subscription: subscriptionId
    });

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = metadata.plan || PLANES[priceId] || 'gratis';
    const userId = metadata.userId || metadata.usuarioId || session.client_reference_id;
    const fechaFin = fechaFinPeriodo(subscription);
    const update = {
      plan,
      planActivo: true,
      ...(fechaFin && { planFechaFin: fechaFin }),
      stripeCustomerId: session.customer,
      stripeSubscriptionId: subscriptionId,
    };

    let usuarioActualizado = null;

    if (esObjectId(userId)) {
      usuarioActualizado = await Usuario.findByIdAndUpdate(userId, update, { new: true });
    }

    if (!usuarioActualizado && email) {
      usuarioActualizado = await Usuario.findOneAndUpdate({ email }, update, { new: true });
    }

    console.log('Stripe webhook actualización usuario', {
      sessionId: session.id,
      userId,
      priceId,
      plan,
      actualizado: Boolean(usuarioActualizado),
      usuarioIdActualizado: usuarioActualizado?._id?.toString() || null,
      stripeCustomerGuardado: Boolean(usuarioActualizado?.stripeCustomerId),
      stripeSubscriptionGuardada: Boolean(usuarioActualizado?.stripeSubscriptionId),
      currentPeriodEnd: subscription.current_period_end || null,
      itemCurrentPeriodEnd: subscription.items?.data?.[0]?.current_period_end || null,
      planFechaFin: fechaFin?.toISOString() || null
    });

    // Email de confirmación
    if (usuarioActualizado?.email && fechaFin) {
      await enviarCorreo(
        usuarioActualizado.email,
        `✅ Tu plan ${NOMBRES_PLANES[plan]} está activo — HomeClick24`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <img src="https://www.homeclick24.com/HomeClick-full.png" alt="HomeClick24" style="height:60px;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:1.4rem;">¡Suscripción activada! 🎉</h1>
            <p style="color:#555;line-height:1.6;">Tu plan <strong>${NOMBRES_PLANES[plan]}</strong> está activo.</p>
            <div style="background:#f0f9e8;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <p style="margin:0;color:#5a9e2f;font-weight:600;">📅 Válido hasta: ${fechaFin.toLocaleDateString('es-ES')}</p>
            </div>
            <p style="color:#555;line-height:1.6;">Ya puedes publicar tus anuncios en HomeClick24.</p>
            <a href="https://www.homeclick24.com/publicar.html"
              style="display:inline-block;background:#7cc242;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
              Publicar anuncio
            </a>
            <p style="color:#aaa;font-size:0.85rem;margin-top:32px;">HomeClick24 · Tu portal inmobiliario de confianza</p>
          </div>
        `
      );
    }
  }

  // ===== RENOVACIÓN EXITOSA =====
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscriptionId = typeof invoice.subscription === 'string'
      ? invoice.subscription
      : invoice.subscription?.id;
    if (!subscriptionId) return res.json({ received: true });

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const { usuario, priceId, plan, fechaFin, customer, updated } = await actualizarUsuarioDesdeSubscription(subscription, {
      pendingPlan: null,
      pendingPriceId: null,
      pendingPlanChangeAt: null,
      pendingPlanLabel: null
    });

    console.log('Webhook invoice.payment_succeeded recibido', {
      customer,
      subscriptionId: subscription.id,
      priceIdDetectado: priceId,
      planDetectado: plan,
      usuarioEncontrado: Boolean(usuario),
      resultadoUpdate: updated,
      usuarioIdActualizado: usuario?._id?.toString() || null,
      planFechaFin: fechaFin?.toISOString() || null
    });

    if (usuario?.email && fechaFin) {
      await enviarCorreo(
        usuario.email,
        `🔄 Tu plan ${NOMBRES_PLANES[plan]} se ha renovado — HomeClick24`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <img src="https://www.homeclick24.com/HomeClick-full.png" alt="HomeClick24" style="height:60px;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:1.4rem;">Plan renovado correctamente 🔄</h1>
            <p style="color:#555;line-height:1.6;">Tu plan <strong>${NOMBRES_PLANES[plan]}</strong> se ha renovado.</p>
            <div style="background:#f0f9e8;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <p style="margin:0;color:#5a9e2f;font-weight:600;">📅 Válido hasta: ${fechaFin.toLocaleDateString('es-ES')}</p>
            </div>
            <p style="color:#aaa;font-size:0.85rem;margin-top:32px;">HomeClick24 · Tu portal inmobiliario de confianza</p>
          </div>
        `
      );
    }
  }

  // ===== SUSCRIPCIÓN ACTUALIZADA EN STRIPE PORTAL =====
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object;
    const priceId = subscription.items?.data?.[0]?.price?.id;
    const scheduledChange = await getScheduledPlanChange(subscription, priceId);
    const { usuario, plan, fechaFin, customer, updated } = await actualizarUsuarioDesdeSubscription(subscription, {
      pendingPlan: scheduledChange?.pendingPlan || null,
      pendingPriceId: scheduledChange?.pendingPriceId || null,
      pendingPlanChangeAt: scheduledChange?.pendingPlanChangeAt || null,
      pendingPlanLabel: scheduledChange?.pendingPlanLabel || null
    });

    console.log('Webhook subscription.updated recibido', {
      customer,
      subscriptionId: subscription.id,
      priceIdDetectado: priceId,
      planDetectado: plan,
      usuarioEncontrado: Boolean(usuario),
      resultadoUpdate: updated,
      status: subscription.status,
      schedule: typeof subscription.schedule === 'string' ? subscription.schedule : subscription.schedule?.id || null,
      pendingPlan: scheduledChange?.pendingPlan || null,
      pendingPlanChangeAt: scheduledChange?.pendingPlanChangeAt?.toISOString() || null,
      usuarioIdActualizado: usuario?._id?.toString() || null,
      planFechaFin: fechaFin?.toISOString() || null
    });
  }

  // ===== PAGO FALLIDO =====
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return res.json({ received: true });

    const usuario = await Usuario.findOne({ stripeSubscriptionId: subscriptionId });

    if (usuario?.email) {
      await enviarCorreo(
        usuario.email,
        `⚠️ Problema con tu pago — HomeClick24`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <img src="https://www.homeclick24.com/HomeClick-full.png" alt="HomeClick24" style="height:60px;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:1.4rem;">No hemos podido procesar tu pago ⚠️</h1>
            <p style="color:#555;line-height:1.6;">Ha habido un problema al renovar tu suscripción. Por favor actualiza tu método de pago para no perder el acceso.</p>
            <a href="https://www.homeclick24.com/perfil.html"
              style="display:inline-block;background:#f59e0b;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
              Actualizar método de pago
            </a>
            <p style="color:#aaa;font-size:0.85rem;margin-top:32px;">HomeClick24 · Tu portal inmobiliario de confianza</p>
          </div>
        `
      );
    }
  }

  // ===== SUSCRIPCIÓN CANCELADA =====
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const { usuario, priceId, plan, fechaFin, customer, updated } = await actualizarUsuarioDesdeSubscription(subscription, {
      pendingPlan: null,
      pendingPriceId: null,
      pendingPlanChangeAt: null,
      pendingPlanLabel: null
    });

    console.log('Webhook subscription.deleted recibido', {
      customer,
      subscriptionId: subscription.id,
      priceIdDetectado: priceId,
      planDetectado: plan,
      usuarioEncontrado: Boolean(usuario),
      resultadoUpdate: updated,
      usuarioIdActualizado: usuario?._id?.toString() || null,
      planFechaFin: fechaFin?.toISOString() || null
    });

    if (usuario?.email) {
      await enviarCorreo(
        usuario.email,
        `😔 Tu suscripción ha finalizado — HomeClick24`,
        `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;">
            <img src="https://www.homeclick24.com/HomeClick-full.png" alt="HomeClick24" style="height:60px;margin-bottom:24px;">
            <h1 style="color:#1a1a1a;font-size:1.4rem;">Tu suscripción ha finalizado</h1>
            <p style="color:#555;line-height:1.6;">Tu plan ha expirado y tu cuenta ha vuelto al plan gratuito. Tus anuncios activos pueden haberse desactivado.</p>
            <a href="https://www.homeclick24.com/planes.html"
              style="display:inline-block;background:#7cc242;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">
              Ver planes
            </a>
            <p style="color:#aaa;font-size:0.85rem;margin-top:32px;">HomeClick24 · Tu portal inmobiliario de confianza</p>
          </div>
        `
      );
    }
  }

  res.json({ received: true });
});

export default router;

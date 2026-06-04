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
  pro_agentes: 'Pro Agentes', agencia_basica: 'Agencia Básica',
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

  // ===== SUSCRIPCIÓN COMPLETADA =====
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_details?.email;
    const subscriptionId = session.subscription;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = PLANES[priceId] || 'gratis';
    const timestamp = subscription.current_period_end || subscription.billing_cycle_anchor;
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

    // Email de confirmación
    if (email && fechaFin) {
      await enviarCorreo(
        email,
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
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return res.json({ received: true });

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price?.id;
    const plan = PLANES[priceId] || 'gratis';
    const fechaFin = new Date(subscription.current_period_end * 1000);

    const usuario = await Usuario.findOneAndUpdate(
      { stripeSubscriptionId: subscriptionId },
      { plan, planActivo: true, planFechaFin: fechaFin }
    );

    if (usuario?.email) {
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

    const usuario = await Usuario.findOneAndUpdate(
      { stripeSubscriptionId: subscription.id },
      { plan: 'gratis', planActivo: false, planFechaFin: null }
    );

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

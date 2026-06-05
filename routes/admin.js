import express from 'express';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { Resend } from 'resend';
import Usuario from '../models/Usuario.js';
import Propiedad from '../models/Propiedad.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);
const PLANES_VALIDOS = [
  'gratis', 'basico', 'destacado', 'starter',
  'pro_agentes', 'agencia_basica', 'agencia_pro',
  'vip', 'vip_trial'
];

async function enviarInvitacionVipTrial(usuario) {
  const enlace = `${process.env.APP_URL}/vip-trial.html`;

  await resend.emails.send({
    from: 'HomeClick24 <contacto@homeclick24.com>',
    to: usuario.email,
    subject: 'Has sido invitado a una prueba gratuita VIP de 30 días',
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:auto;padding:32px;background:#fff;">
        <h2 style="color:#7cc242;margin:0 0 18px;">HomeClick24</h2>
        <p>Hola <strong>${usuario.nombre || ""}</strong>,</p>
        <p>Has sido invitado a una <strong>prueba gratuita VIP de 30 días</strong> en HomeClick24.</p>
        <p>La prueba empezará cuando aceptes las condiciones desde tu cuenta.</p>
        <a href="${enlace}" style="display:inline-block;margin:22px 0;padding:14px 24px;background:#7cc242;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
          Aceptar prueba VIP
        </a>
        <p style="color:#777;font-size:0.9rem;">Por seguridad, inicia sesión con este mismo email antes de aceptar la prueba.</p>
      </div>
    `
  });
}

// Login admin
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }
  const token = jwt.sign({ esAdmin: true }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

// Estadísticas generales
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const totalUsuarios = await Usuario.countDocuments();
    const totalPropiedades = await Propiedad.countDocuments();
    const usuariosPago = await Usuario.countDocuments({ planActivo: true });

    const planes = await Usuario.aggregate([
      { $group: { _id: '$plan', total: { $sum: 1 } } }
    ]);

    const PRECIOS = {
      gratis: 0, basico: 9.90, destacado: 19.90,
      starter: 29.90, pro_agentes: 59.90,
      agencia_basica: 79.90, agencia_pro: 149.90,
      vip: 0, vip_trial: 0
    };

    let ingresosMes = 0;
    planes.forEach(p => {
      ingresosMes += (PRECIOS[p._id] || 0) * p.total;
    });

    res.json({ totalUsuarios, totalPropiedades, usuariosPago, ingresosMes, planes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista de usuarios
router.get('/usuarios', requireAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find({}, {
      nombre: 1, email: 1, plan: 1, planActivo: 1, createdAt: 1, verificado: 1,
      stripeSubscriptionId: 1, cancelAtPeriodEnd: 1, subscriptionCancelAt: 1,
      trialAccepted: 1, trialStartDate: 1, trialEndDate: 1, trialReminderSent: 1
    }).sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Lista de propiedades
router.get('/propiedades', requireAdmin, async (req, res) => {
  try {
    const propiedades = await Propiedad.find({})
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(propiedades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar propiedad
router.delete('/propiedades/:id', requireAdmin, async (req, res) => {
  try {
    await Propiedad.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancelar suscripción Stripe al final del periodo
router.post('/usuarios/:id/cancelar-suscripcion', requireAdmin, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!usuario.stripeSubscriptionId) {
      return res.status(400).json({ error: 'El usuario no tiene una suscripción Stripe activa' });
    }

    console.log('Admin solicita cancelar suscripción Stripe', {
      usuarioId: usuario._id.toString(),
      email: usuario.email,
      stripeSubscriptionId: usuario.stripeSubscriptionId
    });

    const subscription = await stripe.subscriptions.update(usuario.stripeSubscriptionId, {
      cancel_at_period_end: true
    });
    const cancelAt = subscription.cancel_at
      ? new Date(subscription.cancel_at * 1000)
      : null;

    usuario.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
    usuario.subscriptionCancelAt = cancelAt;
    await usuario.save();

    console.log('Suscripción Stripe marcada para cancelar al final del periodo', {
      usuarioId: usuario._id.toString(),
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      cancelAt: cancelAt?.toISOString() || null
    });

    res.json({
      ok: true,
      cancelAtPeriodEnd: usuario.cancelAtPeriodEnd,
      subscriptionCancelAt: usuario.subscriptionCancelAt
    });
  } catch (err) {
    console.error('Error cancelando suscripción Stripe desde admin:', {
      usuarioId: req.params.id,
      error: err.message
    });
    res.status(500).json({ error: err.message });
  }
});

// Cambiar plan de usuario
router.put('/usuarios/:id/plan', requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANES_VALIDOS.includes(plan)) {
      return res.status(400).json({ error: 'Plan inválido' });
    }

    const update = { plan, planActivo: plan !== 'gratis' && plan !== 'vip_trial' };

    if (plan === 'gratis') {
      Object.assign(update, {
        planActivo: false,
        planFechaFin: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        trialAccepted: false,
        trialStartDate: null,
        trialEndDate: null,
        trialReminderSent: false,
        trialReminders: {
          sevenDays: false,
          threeDays: false,
          lastDay: false,
          expired: false
        }
      });
    } else if (plan === 'vip_trial') {
      Object.assign(update, {
        planActivo: false,
        trialAccepted: false,
        trialStartDate: null,
        trialEndDate: null,
        trialReminderSent: false,
        trialReminders: {
          sevenDays: false,
          threeDays: false,
          lastDay: false,
          expired: false
        },
        planFechaFin: null
      });
    } else {
      Object.assign(update, {
        trialAccepted: false,
        trialStartDate: null,
        trialEndDate: null,
        trialReminderSent: false,
        trialReminders: {
          sevenDays: false,
          threeDays: false,
          lastDay: false,
          expired: false
        }
      });
    }

    const usuario = await Usuario.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    let warning = null;
    if (plan === 'vip_trial') {
      try {
        await enviarInvitacionVipTrial(usuario);
      } catch (emailErr) {
        console.error('Error enviando invitación VIP Trial:', emailErr.message);
        warning = 'Plan cambiado, pero no se pudo enviar el email de invitación.';
      }
    }

    res.json({ ok: true, warning });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

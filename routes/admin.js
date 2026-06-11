import express from 'express';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { Resend } from 'resend';
import Usuario from '../models/Usuario.js';
import Propiedad from '../models/Propiedad.js';
import EstadisticaAnuncio from '../models/EstadisticaAnuncio.js';
import { requireAdmin } from '../middleware/auth.js';
import { normalizeSpanishPrice } from '../utils/prices.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const PLANES_VALIDOS = [
  'gratis', 'basico', 'destacado', 'starter',
  'pro_agentes', 'agencia_basica', 'agencia_pro',
  'vip', 'vip_trial'
];

function esObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(String(id || ''));
}

function limpiarTexto(value, max = 5000) {
  if (value === undefined || value === null) return undefined;
  return String(value).trim().replace(/\s+/g, ' ').slice(0, max);
}

function normalizarNumeroAdmin(value, fallback) {
  if (value === '' || value === undefined || value === null) return fallback;
  const numero = Number(value);
  return Number.isFinite(numero) && numero >= 0 ? numero : Number.NaN;
}

function inicioDia(fecha = new Date()) {
  const dia = new Date(fecha);
  dia.setHours(0, 0, 0, 0);
  return dia;
}

function sumarMetricas(registros) {
  return registros.reduce((total, item) => ({
    visitas: total.visitas + Number(item.visitas || 0),
    contactos: total.contactos + Number(item.contactos || 0)
  }), { visitas: 0, contactos: 0 });
}

function conversion(contactos, visitas) {
  return visitas > 0 ? Number(((contactos / visitas) * 100).toFixed(2)) : 0;
}

function serieUltimos30Dias(registros) {
  const hoy = inicioDia();
  const porFecha = new Map();

  registros.forEach(item => {
    const key = inicioDia(item.fecha).toISOString().slice(0, 10);
    const actual = porFecha.get(key) || { visitas: 0, contactos: 0 };
    actual.visitas += Number(item.visitas || 0);
    actual.contactos += Number(item.contactos || 0);
    porFecha.set(key, actual);
  });

  return Array.from({ length: 30 }, (_, index) => {
    const fecha = new Date(hoy);
    fecha.setDate(hoy.getDate() - (29 - index));
    const key = fecha.toISOString().slice(0, 10);
    const actual = porFecha.get(key) || { visitas: 0, contactos: 0 };
    return { fecha: key, visitas: actual.visitas, contactos: actual.contactos };
  });
}

function metricasTemporales(registros) {
  const desde7 = inicioDia();
  desde7.setDate(desde7.getDate() - 6);
  const desde30 = inicioDia();
  desde30.setDate(desde30.getDate() - 29);

  const registros7 = registros.filter(item => new Date(item.fecha) >= desde7);
  const registros30 = registros.filter(item => new Date(item.fecha) >= desde30);
  const m7 = sumarMetricas(registros7);
  const m30 = sumarMetricas(registros30);

  return {
    visitas7d: m7.visitas,
    contactos7d: m7.contactos,
    visitas30d: m30.visitas,
    contactos30d: m30.contactos,
    conversion7d: conversion(m7.contactos, m7.visitas),
    conversion30d: conversion(m30.contactos, m30.visitas),
    serieUltimos30Dias: serieUltimos30Dias(registros30)
  };
}

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
    const filtroSuscripcionRealActiva = {
      stripeSubscriptionId: { $exists: true, $nin: [null, ''] },
      subscriptionStatus: 'active'
    };
    const usuariosPago = await Usuario.countDocuments(filtroSuscripcionRealActiva);

    const planes = await Usuario.aggregate([
      { $group: { _id: '$plan', total: { $sum: 1 } } }
    ]);

    const PRECIOS = {
      gratis: 0, basico: 9.90, destacado: 19.90,
      starter: 29.90, pro_agentes: 59.90,
      agencia_basica: 79.90, agencia_pro: 149.90,
      vip: 0, vip_trial: 0
    };

    const usuariosConPagoReal = await Usuario.find(filtroSuscripcionRealActiva, { plan: 1 }).lean();
    const ingresosMes = usuariosConPagoReal.reduce((total, usuario) => (
      total + (PRECIOS[usuario.plan] || 0)
    ), 0);

    res.json({ totalUsuarios, totalPropiedades, usuariosPago, ingresosMes, planes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Estadísticas generales de actividad
router.get('/estadisticas', requireAdmin, async (req, res) => {
  try {
    const desde30 = inicioDia();
    desde30.setDate(desde30.getDate() - 29);

    const [totalUsuarios, propiedades, usuarios, historico30] = await Promise.all([
      Usuario.countDocuments(),
      Propiedad.find({}, {
        titulo: 1,
        referencia: 1,
        usuarioId: 1,
        visitas: 1,
        contactos: 1,
        createdAt: 1
      }).lean(),
      Usuario.find({}, {
        nombre: 1,
        email: 1,
        plan: 1,
        favoritos: 1
      }).lean(),
      EstadisticaAnuncio.find({ fecha: { $gte: desde30 } }, {
        fecha: 1,
        visitas: 1,
        contactos: 1
      }).lean()
    ]);

    const propiedadIds = new Set(propiedades.map(p => String(p._id)));
    const favoritosPorPropiedad = new Map();
    usuarios.forEach(usuario => {
      (usuario.favoritos || []).forEach(propiedadId => {
        const key = String(propiedadId);
        if (!propiedadIds.has(key)) return;
        favoritosPorPropiedad.set(key, (favoritosPorPropiedad.get(key) || 0) + 1);
      });
    });

    const usuariosPorId = new Map(usuarios.map(usuario => [String(usuario._id), usuario]));
    const resumenUsuarios = new Map();

    propiedades.forEach(propiedad => {
      const usuarioId = String(propiedad.usuarioId || '');
      if (!usuarioId) return;

      const actual = resumenUsuarios.get(usuarioId) || {
        usuarioId,
        nombre: usuariosPorId.get(usuarioId)?.nombre || 'Usuario',
        email: usuariosPorId.get(usuarioId)?.email || '',
        plan: usuariosPorId.get(usuarioId)?.plan || 'gratis',
        totalAnuncios: 0,
        visitas: 0,
        contactos: 0
      };

      actual.totalAnuncios += 1;
      actual.visitas += Number(propiedad.visitas || 0);
      actual.contactos += Number(propiedad.contactos || 0);
      resumenUsuarios.set(usuarioId, actual);
    });

    const propiedadesConFavoritos = propiedades.map(propiedad => ({
      _id: propiedad._id,
      titulo: propiedad.titulo || 'Sin título',
      referencia: propiedad.referencia || '',
      usuarioId: propiedad.usuarioId || null,
      propietario: usuariosPorId.get(String(propiedad.usuarioId || ''))?.nombre || 'Usuario',
      visitas: Number(propiedad.visitas || 0),
      contactos: Number(propiedad.contactos || 0),
      favoritos: favoritosPorPropiedad.get(String(propiedad._id)) || 0,
      createdAt: propiedad.createdAt
    }));

    const usuariosResumen = [...resumenUsuarios.values()];
    const temporales = metricasTemporales(historico30);

    res.json({
      totalUsuarios,
      totalAnuncios: propiedades.length,
      totalVisitas: propiedadesConFavoritos.reduce((total, p) => total + p.visitas, 0),
      totalContactos: propiedadesConFavoritos.reduce((total, p) => total + p.contactos, 0),
      totalFavoritos: propiedadesConFavoritos.reduce((total, p) => total + p.favoritos, 0),
      anunciosSinVisitas: propiedadesConFavoritos.filter(p => p.visitas === 0).length,
      topAnunciosPorVisitas: propiedadesConFavoritos
        .sort((a, b) => b.visitas - a.visitas)
        .slice(0, 10),
      topUsuariosPorVisitas: [...usuariosResumen]
        .sort((a, b) => b.visitas - a.visitas)
        .slice(0, 10),
      topUsuariosPorContactos: [...usuariosResumen]
        .sort((a, b) => b.contactos - a.contactos)
        .slice(0, 10),
      ...temporales
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas generales admin:', err.message);
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

// Estadísticas de anuncios por usuario
router.get('/usuarios/:id/estadisticas', requireAdmin, async (req, res) => {
  try {
    if (!esObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const usuario = await Usuario.findById(req.params.id, {
      nombre: 1, email: 1, plan: 1, planActivo: 1
    }).lean();
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    const propiedades = await Propiedad.find({ usuarioId: req.params.id }, {
      titulo: 1,
      referencia: 1,
      precio: 1,
      direccion: 1,
      estadoComercial: 1,
      visitas: 1,
      contactos: 1,
      ultimaVisita: 1,
      ultimoContacto: 1,
      createdAt: 1
    }).sort({ createdAt: -1 }).lean();
    const desde30 = inicioDia();
    desde30.setDate(desde30.getDate() - 29);
    const historico30 = await EstadisticaAnuncio.find({
      usuarioId: req.params.id,
      fecha: { $gte: desde30 }
    }, {
      fecha: 1,
      visitas: 1,
      contactos: 1
    }).lean();

    const propiedadesConFavoritos = await Promise.all(propiedades.map(async propiedad => {
      const favoritos = await Usuario.countDocuments({ favoritos: propiedad._id });
      return {
        _id: propiedad._id,
        titulo: propiedad.titulo,
        referencia: propiedad.referencia || '',
        precio: propiedad.precio || 0,
        direccion: propiedad.direccion || '',
        estadoComercial: propiedad.estadoComercial || 'Disponible',
        visitas: propiedad.visitas || 0,
        contactos: propiedad.contactos || 0,
        favoritos,
        ultimaVisita: propiedad.ultimaVisita || null,
        ultimoContacto: propiedad.ultimoContacto || null,
        createdAt: propiedad.createdAt
      };
    }));
    const temporales = metricasTemporales(historico30);

    res.json({
      usuario: {
        _id: usuario._id,
        nombre: usuario.nombre,
        email: usuario.email
      },
      plan: usuario.plan || 'gratis',
      planActivo: Boolean(usuario.planActivo),
      totalAnuncios: propiedadesConFavoritos.length,
      visitasTotales: propiedadesConFavoritos.reduce((total, p) => total + p.visitas, 0),
      contactosTotales: propiedadesConFavoritos.reduce((total, p) => total + p.contactos, 0),
      favoritosTotales: propiedadesConFavoritos.reduce((total, p) => total + p.favoritos, 0),
      propiedades: propiedadesConFavoritos,
      ...temporales
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas admin:', {
      usuarioId: req.params.id,
      error: err.message
    });
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

// Editar propiedad desde admin
router.put('/propiedades/:id', requireAdmin, async (req, res) => {
  try {
    if (!esObjectId(req.params.id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ error: 'Propiedad no encontrada' });

    const {
      titulo,
      precio,
      tipoOperacion,
      direccion,
      habitaciones,
      banos,
      superficie,
      descripcion,
      visiblePublicamente
    } = req.body;

    if (titulo !== undefined) propiedad.titulo = limpiarTexto(titulo, 160);
    if (direccion !== undefined) propiedad.direccion = limpiarTexto(direccion, 300);
    if (descripcion !== undefined) propiedad.descripcion = limpiarTexto(descripcion, 5000);

    if (precio !== undefined) {
      const precioNormalizado = normalizeSpanishPrice(precio);
      if (!Number.isFinite(precioNormalizado) || precioNormalizado < 0) {
        return res.status(400).json({ error: 'Precio inválido' });
      }
      propiedad.precio = precioNormalizado;
    }

    if (tipoOperacion !== undefined) {
      if (!['venta', 'alquiler'].includes(tipoOperacion)) {
        return res.status(400).json({ error: 'Tipo de operación inválido' });
      }
      propiedad.tipoOperacion = tipoOperacion;
    }

    if (habitaciones !== undefined) {
      const valor = normalizarNumeroAdmin(habitaciones, 0);
      if (!Number.isFinite(valor)) return res.status(400).json({ error: 'Habitaciones inválidas' });
      propiedad.habitaciones = valor;
    }

    if (banos !== undefined) {
      const valor = normalizarNumeroAdmin(banos, 0);
      if (!Number.isFinite(valor)) return res.status(400).json({ error: 'Baños inválidos' });
      propiedad.banos = valor;
    }

    if (superficie !== undefined) {
      const valor = normalizarNumeroAdmin(superficie, undefined);
      if (valor !== undefined && !Number.isFinite(valor)) return res.status(400).json({ error: 'Superficie inválida' });
      propiedad.superficie = valor;
    }
    if (visiblePublicamente !== undefined) {
      propiedad.visiblePublicamente = visiblePublicamente === true || visiblePublicamente === 'true';
    }

    await propiedad.save();
    res.json({ ok: true, propiedad });
  } catch (err) {
    console.error('Error editando propiedad desde admin:', {
      propiedadId: req.params.id,
      error: err.message
    });
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
        subscriptionStatus: null,
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

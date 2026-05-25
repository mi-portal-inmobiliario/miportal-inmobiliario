import express from 'express';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Propiedad from '../models/Propiedad.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

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
      agencia_basica: 79.90, agencia_pro: 149.90
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
      nombre: 1, email: 1, plan: 1, planActivo: 1, createdAt: 1, verificado: 1
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

// Cambiar plan de usuario
router.put('/usuarios/:id/plan', requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;
    const planActivo = plan !== 'gratis';
    await Usuario.findByIdAndUpdate(req.params.id, { plan, planActivo });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import Usuario from '../models/Usuario.js';
import Propiedad from '../models/Propiedad.js';

const router = express.Router();

// Middleware para verificar que es admin
function verificarAdmin(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.esAdmin) return res.status(403).json({ error: 'No tienes permisos' });
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
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
router.get('/stats', verificarAdmin, async (req, res) => {
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
router.get('/usuarios', verificarAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find({}, {
      nombre: 1, email: 1, plan: 1, planActivo: 1, createdAt: 1, verificado: 1
    }).sort({ createdAt: -1 });
    res.json(usuarios);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
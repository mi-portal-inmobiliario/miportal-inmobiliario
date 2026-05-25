import express from "express";
import Notificacion from "../models/Notificacion.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// Obtener notificaciones de un usuario
router.get("/:usuarioId", requireAuth, async (req, res) => {
  try {
    if (String(req.params.usuarioId) !== req.user.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const notificaciones = await Notificacion.find({
      usuarioId: req.params.usuarioId
    })
    .populate("propiedadId")
    .sort({ createdAt: -1 });

    res.json(notificaciones);
  } catch (error) {
    res.status(500).json({ message: "Error al obtener notificaciones" });
  }
});

// Marcar como leída
router.put("/:id/leida", requireAuth, async (req, res) => {
  try {
    const actual = await Notificacion.findById(req.params.id);
    if (!actual) return res.status(404).json({ message: "Notificación no encontrada" });
    if (String(actual.usuarioId) !== req.user.id) {
      return res.status(403).json({ message: "No autorizado" });
    }

    const notificacion = await Notificacion.findByIdAndUpdate(
      req.params.id,
      { leida: true },
      { new: true }
    );

    res.json(notificacion);
  } catch (error) {
    res.status(500).json({ message: "Error al actualizar notificación" });
  }
});

export default router;

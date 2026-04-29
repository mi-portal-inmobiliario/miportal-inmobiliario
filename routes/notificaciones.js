import express from "express";
import Notificacion from "../models/Notificacion.js";

const router = express.Router();

// Obtener notificaciones de un usuario
router.get("/:usuarioId", async (req, res) => {
  try {
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
router.put("/:id/leida", async (req, res) => {
  try {
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

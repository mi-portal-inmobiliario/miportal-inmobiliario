import express from "express";
import Alerta from "../models/Alerta.js";

const router = express.Router();

/* Crear alerta */
router.post("/", async (req, res) => {
  try {
    const nuevaAlerta = new Alerta(req.body);
    await nuevaAlerta.save();
    res.status(201).json(nuevaAlerta);
  } catch (error) {
    res.status(500).json({ error: "Error al crear alerta" });
  }
});

/* Obtener alertas de un usuario */
router.get("/:usuarioId", async (req, res) => {
  try {
    const alertas = await Alerta.find({
      usuarioId: req.params.usuarioId,
      activa: true
    });

    res.json(alertas);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener alertas" });
  }
});

/* Eliminar alerta */
router.delete("/:id", async (req, res) => {
  try {
    await Alerta.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar alerta" });
  }
});

export default router;
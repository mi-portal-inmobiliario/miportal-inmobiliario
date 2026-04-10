import express from "express";
import Propiedad from "../models/Propiedad.js";

const router = express.Router();

// ==================================================
// GET /propiedades — con filtros
// ==================================================
router.get("/", async (req, res) => {
  try {
    const { tipo, min, max, hab, texto } = req.query;
    const filtro = {};

    if (tipo) filtro.tipoOperacion = tipo;

    if (min || max) {
      filtro.precio = {};
      if (min) filtro.precio.$gte = Number(min);
      if (max) filtro.precio.$lte = Number(max);
    }

    if (hab) filtro.habitaciones = { $gte: Number(hab) };

    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto, $options: "i" } },
        { direccion: { $regex: texto, $options: "i" } }
      ];
    }

    console.log("FILTRO APLICADO:", filtro);

    const propiedades = await Propiedad.find(filtro).sort({ createdAt: -1 });
    res.json(propiedades);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

// ==================================================
// GET /propiedades/:id
// ==================================================
router.get("/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });
    res.json(propiedad);
  } catch (err) {
    res.status(400).json({ message: "ID inválido" });
  }
});

export default router;
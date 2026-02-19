const express = require("express");
const router = express.Router();
const Propiedad = require("../models/Propiedad");

/* ==================================================
   GET PROPIEDADES CON FILTROS PROFESIONALES
   Ejemplo:
   /propiedades?tipo=venta&min=100000&max=300000&hab=2&texto=cádiz
================================================== */
router.get("/", async (req, res) => {
  try {
    const { tipo, min, max, hab, texto } = req.query;

    let filtro = {};

    // ==============================
    // FILTRO TIPO OPERACIÓN
    // ==============================
    if (tipo) {
      filtro.tipoOperacion = tipo;
    }

    // ==============================
    // FILTRO PRECIO
    // ==============================
    if (min || max) {
      filtro.precio = {};

      if (min) {
        filtro.precio.$gte = Number(min);
      }

      if (max) {
        filtro.precio.$lte = Number(max);
      }
    }

    // ==============================
    // FILTRO HABITACIONES (mínimo)
    // ==============================
    if (hab) {
      filtro.habitaciones = { $gte: Number(hab) };
    }

    // ==============================
    // FILTRO TEXTO (título o dirección)
    // ==============================
    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto, $options: "i" } },
        { direccion: { $regex: texto, $options: "i" } }
      ];
    }

    const propiedades = await Propiedad.find(filtro).sort({ createdAt: -1 });

    res.json(propiedades);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

/* ==================================================
   GET PROPIEDAD POR ID
================================================== */
router.get("/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id);

    if (!propiedad) {
      return res.status(404).json({ message: "Propiedad no encontrada" });
    }

    res.json(propiedad);

  } catch (err) {
    res.status(400).json({ message: "ID inválido" });
  }
});

module.exports = router;

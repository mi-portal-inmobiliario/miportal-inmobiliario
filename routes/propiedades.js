const express = require("express");
const router = express.Router();
const Propiedad = require("../models/Propiedad");

/* =====================================================
   GET PROPIEDADES (FILTROS + PAGINACIÓN + ORDENACIÓN)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const {
      tipo,
      min,
      max,
      hab,
      texto,
      page = 1,
      limit = 6,
      sort
    } = req.query;

    const filtro = {};

    // 🔹 Tipo de operación
    if (tipo) {
      filtro.tipoOperacion = tipo;
    }

    // 🔹 Rango de precio
    if (min || max) {
      filtro.precio = {};
      if (min) filtro.precio.$gte = Number(min);
      if (max) filtro.precio.$lte = Number(max);
    }

    // 🔹 Habitaciones (si tu modelo las tiene)
    if (hab) {
      filtro.habitaciones = { $gte: Number(hab) };
    }

    // 🔹 Búsqueda por texto (titulo o direccion)
    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto, $options: "i" } },
        { direccion: { $regex: texto, $options: "i" } }
      ];
    }

    // 🔹 Ordenación
    let orden = { createdAt: -1 }; // por defecto más recientes

    if (sort === "precio_asc") orden = { precio: 1 };
    if (sort === "precio_desc") orden = { precio: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [propiedades, total] = await Promise.all([
      Propiedad.find(filtro)
        .sort(orden)
        .skip(skip)
        .limit(Number(limit)),
      Propiedad.countDocuments(filtro)
    ]);

    res.json({
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      resultados: propiedades
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

/* =====================================================
   GET PROPIEDAD POR ID
===================================================== */
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


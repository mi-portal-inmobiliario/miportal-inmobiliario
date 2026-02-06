const express = require("express");
const router = express.Router();
const Propiedad = require("../models/Propiedad");

/* ===============================
   GET TODAS LAS PROPIEDADES
   (esto ya lo usas en frontend)
================================ */
router.get("/", async (req, res) => {
  try {
    const propiedades = await Propiedad.find();
    res.json(propiedades);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

/* ===============================
   GET PROPIEDAD POR ID  ✅
================================ */
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

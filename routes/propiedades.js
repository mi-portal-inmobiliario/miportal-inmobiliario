import "dotenv/config";
import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import Propiedad from "../models/Propiedad.js";

const router = express.Router();

// ==================================================
// CLOUDINARY CONFIG
// ==================================================
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "miportal_inmobiliario",
    allowed_formats: ["jpg", "jpeg", "png", "webp"]
  }
});

const upload = multer({ storage });

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

// ==================================================
// POST /propiedades — crear propiedad con imágenes
// ==================================================
router.post("/", upload.array("imagenes", 10), async (req, res) => {
  try {
    const {
      titulo, direccion, precio, descripcion,
      tipoOperacion, habitaciones, usuarioId, lat, lng
    } = req.body;

    const imagenes = req.files?.map(f => f.path) || [];

    const propiedad = await Propiedad.create({
      titulo,
      direccion,
      precio:        Number(precio),
      descripcion,
      tipoOperacion,
      habitaciones:  Number(habitaciones),
      usuarioId:     usuarioId || null,
      lat:           lat ? Number(lat) : null,
      lng:           lng ? Number(lng) : null,
      imagenes
    });

    res.status(201).json(propiedad);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al crear propiedad" });
  }
});

// ==================================================
// PUT /propiedades/:id — editar propiedad
// ==================================================
router.put("/:id", upload.array("imagenes", 10), async (req, res) => {
  try {
    const {
      titulo, direccion, precio, descripcion,
      tipoOperacion, habitaciones, lat, lng
    } = req.body;

    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });

    propiedad.titulo       = titulo || propiedad.titulo;
    propiedad.direccion    = direccion || propiedad.direccion;
    propiedad.precio       = precio ? Number(precio) : propiedad.precio;
    propiedad.descripcion  = descripcion || propiedad.descripcion;
    propiedad.tipoOperacion = tipoOperacion || propiedad.tipoOperacion;
    propiedad.habitaciones = habitaciones ? Number(habitaciones) : propiedad.habitaciones;
    propiedad.lat          = lat ? Number(lat) : propiedad.lat;
    propiedad.lng          = lng ? Number(lng) : propiedad.lng;

    if (req.files?.length) {
      propiedad.imagenes = req.files.map(f => f.path);
    }

    await propiedad.save();
    res.json(propiedad);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al editar propiedad" });
  }
});

// ==================================================
// DELETE /propiedades/:id — eliminar propiedad
// ==================================================
router.delete("/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndDelete(req.params.id);
    if (!propiedad) return res.status(404).json({ message: "Propiedad no encontrada" });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al eliminar propiedad" });
  }
});

export default router;

import express from "express";
import mongoose from "mongoose";
import Propiedad from "../models/Propiedad.js";

const router = express.Router();

/* ======================
   SCHEMAS
====================== */
const ConversacionSchema = new mongoose.Schema({
  propiedadId:  String,
  anuncianteId: String,
  compradorId:  String,
  creado: { type: Date, default: Date.now }
});

const MensajeSchema = new mongoose.Schema({
  conversacionId: String,
  userId:         String,
  texto:          String,
  leido:          { type: Boolean, default: false },
  creado: { type: Date, default: Date.now }
});

const Conversacion = mongoose.model("Conversacion", ConversacionSchema);
const Mensaje      = mongoose.model("Mensaje",      MensajeSchema);

/* ======================
   CREAR / OBTENER CONVERSACIÓN
====================== */
router.post("/conversaciones", async (req, res) => {
  const { propiedadId, anuncianteId, compradorId } = req.body;

  let conv = await Conversacion.findOne({ propiedadId, anuncianteId, compradorId });
  if (!conv) {
    conv = await Conversacion.create({ propiedadId, anuncianteId, compradorId });
  }

  res.json(conv);
});

/* ======================
   MENSAJES
====================== */
router.get("/conversaciones/:id/mensajes", async (req, res) => {
  const msgs = await Mensaje.find({ conversacionId: req.params.id }).sort({ creado: 1 });
  res.json(msgs);
});

router.post("/conversaciones/:id/mensajes", async (req, res) => {
  const { userId, texto } = req.body;
  const msg = await Mensaje.create({ conversacionId: req.params.id, userId, texto });
  res.json(msg);
});

/* ======================
   LISTAR CONVERSACIONES CON TÍTULO
====================== */
router.get("/mis-conversaciones/:userId", async (req, res) => {
  const { userId } = req.params;

  const convs = await Conversacion.find({
    $or: [{ anuncianteId: userId }, { compradorId: userId }]
  }).sort({ creado: -1 });

  const convsConTitulo = await Promise.all(convs.map(async c => {
    let propiedadTitulo = "Propiedad";
    try {
      const prop = await Propiedad.findById(c.propiedadId);
      if (prop) propiedadTitulo = prop.titulo;
    } catch(e) {}
    return { ...c.toObject(), propiedadTitulo };
  }));

  res.json(convsConTitulo);
});

/* ======================
   OBTENER CONVERSACIÓN POR ID
====================== */
router.get("/conversaciones/:id", async (req, res) => {
  try {
    const conv = await Conversacion.findById(req.params.id);
    if (!conv) return res.status(404).json({ error: "No encontrada" });

    let propiedadTitulo = "Propiedad";
    try {
      const prop = await Propiedad.findById(conv.propiedadId);
      if (prop) propiedadTitulo = prop.titulo;
    } catch(e) {}

    res.json({ ...conv.toObject(), propiedadTitulo });
  } catch(e) {
    res.status(400).json({ error: "ID inválido" });
  }
});

// GET mensajes no leídos de un usuario
router.get("/no-leidos/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    // Conversaciones donde el usuario participa
    const convs = await Conversacion.find({
      $or: [{ anuncianteId: userId }, { compradorId: userId }]
    });

    const convIds = convs.map(c => c._id.toString());

    // Mensajes no leídos que NO son del propio usuario
    const count = await Mensaje.countDocuments({
      conversacionId: { $in: convIds },
      userId:         { $ne: userId },
      leido:          false
    });

    res.json({ count });
  } catch(e) {
    res.status(500).json({ error: "Error" });
  }
});

// PUT marcar mensajes como leídos
router.put("/conversaciones/:id/leer", async (req, res) => {
  try {
    const { userId } = req.body;
    await Mensaje.updateMany(
      { conversacionId: req.params.id, userId: { $ne: userId }, leido: false },
      { leido: true }
    );
    res.json({ ok: true });
  } catch(e) {
    res.status(500).json({ error: "Error" });
  }
});

export default router;
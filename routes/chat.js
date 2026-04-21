import express from "express";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import Propiedad from "../models/Propiedad.js";
import Usuario from "../models/Usuario.js";

const router = express.Router();

/* ======================
   NODEMAILER
====================== */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

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
  try {
    const { userId, texto } = req.body;
    const msg = await Mensaje.create({ conversacionId: req.params.id, userId, texto });

    // ── Notificación por email al anunciante ──
    try {
      const conv = await Conversacion.findById(req.params.id);

      // Solo notificar si quien escribe es el comprador (no el anunciante a sí mismo)
      if (conv && conv.anuncianteId !== userId) {
        const anunciante = await Usuario.findById(conv.anuncianteId);
        const comprador  = await Usuario.findById(userId);
        const propiedad  = await Propiedad.findById(conv.propiedadId);

        console.log("📧 Intentando enviar email a:", anunciante?.email);
        console.log("📧 GMAIL_USER:", process.env.GMAIL_USER);
        if (anunciante?.email) {
          await transporter.sendMail({
            from: `"Costa Hogar" <${process.env.GMAIL_USER}>`,
            to: anunciante.email,
            subject: "💬 Tienes un nuevo mensaje en Costa Hogar",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                <div style="background: #2563eb; padding: 20px; text-align: center;">
                  <h2 style="color: white; margin: 0;">Costa Hogar</h2>
                </div>
                <div style="padding: 24px;">
                  <p style="font-size: 16px;">Hola <strong>${anunciante.nombre || "anunciante"}</strong>,</p>
                  <p>Has recibido un nuevo mensaje sobre tu propiedad:</p>
                  <div style="background: #f3f4f6; border-radius: 6px; padding: 12px; margin: 16px 0;">
                    <p style="margin: 0; font-weight: bold;">🏠 ${propiedad?.titulo || "Tu propiedad"}</p>
                  </div>
                  <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 12px; border-radius: 4px; margin: 16px 0;">
                    <p style="margin: 0; color: #1e40af;"><strong>${comprador?.nombre || "Un usuario"}:</strong></p>
                    <p style="margin: 8px 0 0;">"${texto}"</p>
                  </div>
                  <a href="https://miportal-inmobiliario-server.onrender.com/chat.html" 
                     style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
                    Ver mensaje
                  </a>
                  <p style="font-size: 12px; color: #9ca3af; margin-top: 24px;">Costa Hogar · No respondas a este email</p>
                </div>
              </div>
            `
          });
        }
      }
    } catch(emailErr) {
      console.error("Error enviando email:", emailErr);
      // No bloqueamos la respuesta aunque falle el email
    }

    res.json(msg);
  } catch(e) {
    res.status(500).json({ error: "Error al enviar mensaje" });
  }
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
    let anuncianteNombre = "Anunciante";
    let compradorNombre = "Interesado";

    try {
      const prop = await Propiedad.findById(c.propiedadId);
      if (prop) propiedadTitulo = prop.titulo;
    } catch(e) {}

    try {
      const anunciante = await Usuario.findById(c.anuncianteId);
      if (anunciante) anuncianteNombre = anunciante.nombre;
    } catch(e) {}

    try {
      const comprador = await Usuario.findById(c.compradorId);
      if (comprador) compradorNombre = comprador.nombre;
    } catch(e) {}

    return { ...c.toObject(), propiedadTitulo, anuncianteNombre, compradorNombre };
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

/* ======================
   MENSAJES NO LEÍDOS
====================== */
router.get("/no-leidos/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const convs = await Conversacion.find({
      $or: [{ anuncianteId: userId }, { compradorId: userId }]
    });

    const convIds = convs.map(c => c._id.toString());

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

/* ======================
   MARCAR COMO LEÍDOS
====================== */
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
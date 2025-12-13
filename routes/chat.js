import express from "express";
import mongoose from "mongoose";

const router = express.Router();

/* =========================
   SCHEMAS
========================= */

// Conversación
const ConversacionSchema = new mongoose.Schema(
  {
    propiedadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Propiedad",
      required: true,
    },
    anuncianteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    compradorId: {
      type: String, // puede ser ObjectId o guest
      required: true,
    },
  },
  { timestamps: true }
);

const Conversacion = mongoose.model(
  "Conversacion",
  ConversacionSchema
);

// Mensajes
const MensajeSchema = new mongoose.Schema(
  {
    conversacionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversacion",
      required: true,
    },
    userId: {
      type: String, // usuario que envía
      required: true,
    },
    texto: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Mensaje = mongoose.model("Mensaje", MensajeSchema);

/* =========================
   RUTAS
========================= */

/**
 * Crear o recuperar conversación
 * POST /chat/conversaciones
 */
router.post("/conversaciones", async (req, res) => {
  try {
    const { propiedadId, compradorId, anuncianteId } = req.body;

    let conv = await Conversacion.findOne({
      propiedadId,
      compradorId,
      anuncianteId,
    });

    if (!conv) {
      conv = new Conversacion({
        propiedadId,
        compradorId,
        anuncianteId,
      });
      await conv.save();
    }

    res.json(conv);
  } catch (err) {
    console.error("❌ Error creando conversación:", err);
    res.status(500).json({ error: "Error conversación" });
  }
});

/**
 * Obtener mensajes de una conversación
 * GET /chat/conversaciones/:id/mensajes
 */
router.get("/conversaciones/:id/mensajes", async (req, res) => {
  try {
    const mensajes = await Mensaje.find({
      conversacionId: req.params.id,
    }).sort({ createdAt: 1 });

    res.json(mensajes);
  } catch (err) {
    console.error("❌ Error obteniendo mensajes:", err);
    res.status(500).json({ error: "Error mensajes" });
  }
});

/**
 * Enviar mensaje
 * POST /chat/conversaciones/:id/mensajes
 */
router.post("/conversaciones/:id/mensajes", async (req, res) => {
  try {
    const { userId, texto } = req.body;

    const nuevo = new Mensaje({
      conversacionId: req.params.id,
      userId,
      texto,
    });

    await nuevo.save();
    res.json(nuevo);
  } catch (err) {
    console.error("❌ Error enviando mensaje:", err);
    res.status(500).json({ error: "Error enviar mensaje" });
  }
});

export default router;

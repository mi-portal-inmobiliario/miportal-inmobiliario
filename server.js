// =============================
// CONFIG INICIAL (OBLIGATORIO ARRIBA)
// =============================
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Rutas
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import authMiddleware from "./middleware/auth.js";

// =============================
// FIX RUTAS EN RENDER (CLAVE)
// =============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =============================
// APP
// =============================
const app = express();

// =============================
// MIDDLEWARE
// =============================
app.use(cors());
app.use(express.json());

// 👉 SERVIR CARPETA PUBLIC (IMPORTANTE)
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

console.log("GEOCODE API KEY:", process.env.GEOCODE_API_KEY);
console.log("MONGO:", process.env.MONGO_URI);

// =============================
// MULTER (SUBIDA IMÁGENES)
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "uploads");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// =============================
// SCHEMA PROPIEDAD
// =============================
const PropiedadSchema = new mongoose.Schema({
  titulo: String,
  direccion: String,
  precio: Number,
  descripcion: String,
  tipoOperacion: String,
  imagenes: [String],
  lat: Number,
  lng: Number,
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }
});

const Propiedad = mongoose.model("Propiedad", PropiedadSchema);

// =============================
// GEOCODING
// =============================
async function geocode(direccion) {
  try {
    const url = `https://geocode.maps.co/search?q=${encodeURIComponent(
      direccion
    )}&api_key=${process.env.GEOCODE_API_KEY}`;

    const r = await fetch(url);
    const data = await r.json();

    if (!data?.length) return null;

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  } catch (err) {
    console.error("❌ Error geocoding:", err);
    return null;
  }
}

// =============================
// RUTAS
// =============================
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

// =============================
// PROPIEDADES
// =============================
app.get("/propiedades", async (req, res) => {
  const propiedades = await Propiedad.find();
  res.json(propiedades);
});

app.post(
  "/propiedades",
  authMiddleware,
  upload.array("imagenes", 10),
  async (req, res) => {
    try {
      const { titulo, direccion, precio, descripcion, tipoOperacion } = req.body;

      const imagenes = req.files.map(f =>
        "/uploads/" + f.filename
      );

      const geo = await geocode(direccion);

      const nueva = new Propiedad({
        titulo,
        direccion,
        precio,
        descripcion,
        tipoOperacion,
        imagenes,
        lat: geo?.lat || null,
        lng: geo?.lng || null,
        usuarioId: req.usuarioId
      });

      await nueva.save();
      res.json(nueva);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Error al crear propiedad" });
    }
  }
);

// =============================
// INDEX
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// START SERVER
// =============================
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB");
    app.listen(PORT, () =>
      console.log(`🚀 Servidor activo en puerto ${PORT}`)
    );
  })
  .catch(err => console.error("❌ Mongo error:", err));

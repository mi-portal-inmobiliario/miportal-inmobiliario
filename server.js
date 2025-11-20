import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

dotenv.config();
const app = express();

// =============================
// CONFIG BÁSICA
// =============================
app.use(cors());
app.use(express.json());

// Servir frontend y uploads
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

console.log("GEOCODE API KEY:", process.env.GEOCODE_API_KEY);
console.log("MONGO:", process.env.MONGODB_URI);

// =============================
// MULTER - subida de imágenes
// =============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// =============================
// MONGOOSE SCHEMA
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
});

const Propiedad = mongoose.model("Propiedad", PropiedadSchema);

// =============================
// GEOCODING API
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
// ENDPOINTS
// =============================

// GET todas las propiedades
app.get("/propiedades", async (req, res) => {
  const propiedades = await Propiedad.find();
  res.json(propiedades);
});

// POST crear propiedad
app.post("/propiedades", upload.array("imagenes", 10), async (req, res) => {
  try {
    const { titulo, direccion, precio, descripcion, tipoOperacion } = req.body;

    const imagenes = req.files.map(f => "/" + f.path.replace(/\\/g, "/"));

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
    });

    await nueva.save();

    res.json({ mensaje: "Propiedad creada", propiedad: nueva });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al crear propiedad" });
  }
});

// =============================
// SERVIR INDEX
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// =============================
// CONEXIÓN A MONGO Y START
// =============================
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI, { dbName: "CostaHogar" })
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () =>
      console.log(`🚀 Servidor funcionando en puerto ${PORT}`)
    );
  })
  .catch((err) => console.error("❌ Error MongoDB:", err));

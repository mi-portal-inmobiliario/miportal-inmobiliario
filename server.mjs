import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
console.log("GEOCODE_API_KEY cargada:", process.env.GEOCODE_API_KEY);

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// =============================
// 📁 MULTER CONFIG
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
// 📌 MONGOOSE SCHEMA
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
// 🌍 CONEXIÓN MONGODB
// =============================
mongoose
  .connect(process.env.MONGO_URI, { dbName: "CostaHogar" })
  .then(() => console.log("✔ MongoDB conectado"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// =============================
// 🌍 GEOCODING (con API KEY)
// =============================
async function geocodeDireccion(direccion) {
  try {
    const url = `https://geocode.maps.co/search?q=${encodeURIComponent(
      direccion
    )}&api_key=${process.env.GEOCODE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data?.length) return null;

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon)
    };
  } catch (e) {
    console.error("❌ Error geocodificando:", e);
    return null;
  }
}

// =============================
// 📌 ENDPOINT: LISTAR PROPIEDADES
// =============================
app.get("/propiedades", async (req, res) => {
  const propiedades = await Propiedad.find();
  res.json(propiedades);
});

// =============================
// 📌 ENDPOINT: CREAR PROPIEDAD
// =============================
app.post("/propiedades", upload.array("imagenes", 10), async (req, res) => {
  try {
    const { titulo, direccion, precio, descripcion, tipoOperacion } = req.body;

    const imagenes = req.files.map(f => "/" + f.path.replace(/\\/g, "/"));

    const geo = await geocodeDireccion(direccion);

    const nueva = new Propiedad({
      titulo,
      direccion,
      precio,
      descripcion,
      tipoOperacion,
      imagenes,
      lat: geo?.lat || null,
      lng: geo?.lng || null
    });

    await nueva.save();

    res.json({ mensaje: "Propiedad creada correctamente", propiedad: nueva });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Error al crear propiedad" });
  }
});

// =============================
// 🌐 SERVIR INDEX POR DEFECTO
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// =============================
// 🚀 INICIAR SERVIDOR
// =============================
app.listen(process.env.PORT, () =>
  console.log(`🚀 Servidor en puerto ${process.env.PORT}`)
);

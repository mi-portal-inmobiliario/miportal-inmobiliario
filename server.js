import express from "express";
import mongoose from "mongoose";
import multer from "multer";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// 📦 Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 📦 Configurar Multer (temporal)
const upload = multer({ dest: "uploads/" });

// 📦 Conectar a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ Conectado a MongoDB Atlas"))
  .catch(err => console.error("❌ Error MongoDB:", err));

// 📄 Definir el modelo de Propiedad
const propiedadSchema = new mongoose.Schema({
  titulo: String,
  direccion: String,
  precio: Number,
  descripcion: String,
  imagenes: [String], // 👈 Ahora es un array
  fecha: { type: Date, default: Date.now }
});
const Propiedad = mongoose.model("Propiedad", propiedadSchema);

// 🚀 Ruta: crear nueva propiedad con múltiples imágenes
app.post("/propiedades", upload.array("imagenes", 10), async (req, res) => {
  try {
    const { titulo, direccion, precio, descripcion } = req.body;
    const imagenes = [];

    // Subir imágenes a Cloudinary
    for (const file of req.files) {
      const subida = await cloudinary.uploader.upload(file.path, {
        folder: "miportal_inmobiliario"
      });
      imagenes.push(subida.secure_url);
      fs.unlinkSync(file.path); // eliminar archivo temporal
    }

    // Guardar propiedad
    const nuevaPropiedad = new Propiedad({
      titulo,
      direccion,
      precio,
      descripcion,
      imagenes
    });

    await nuevaPropiedad.save();
    res.json({ mensaje: "Propiedad añadida con éxito", propiedad: nuevaPropiedad });
  } catch (error) {
    console.error("❌ Error al subir propiedad:", error);
    res.status(500).json({ error: "Error al subir la propiedad" });
  }
});

// 📄 Ruta para obtener todas las propiedades
app.get("/propiedades", async (req, res) => {
  try {
    const propiedades = await Propiedad.find().sort({ fecha: -1 });
    res.json(propiedades);
  } catch (error) {
    res.status(500).json({ error: "Error al obtener propiedades" });
  }
});

// 📄 Ruta para eliminar una propiedad
app.delete("/propiedades/:id", async (req, res) => {
  try {
    await Propiedad.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Propiedad eliminada correctamente" });
  } catch (error) {
    res.status(500).json({ error: "Error al eliminar propiedad" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor en http://localhost:${PORT}`));

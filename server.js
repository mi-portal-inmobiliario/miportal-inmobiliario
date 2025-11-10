// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

// Carga variables de entorno
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});

// Configuración Multer + Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'propiedades', // Carpeta en Cloudinary
    allowed_formats: ['jpg', 'jpeg', 'png']
  }
});
const upload = multer({ storage });

// ----------------------
// MODELO DE PROPIEDAD
// ----------------------
const propiedadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  direccion: { type: String, required: true },
  imagen: { type: String } // URL de Cloudinary
});
const Propiedad = mongoose.model("Propiedad", propiedadSchema);

// ----------------------
// RUTAS CRUD PROPIEDADES
// ----------------------

// Crear propiedad con imagen
app.post("/propiedades", upload.single('imagen'), async (req, res) => {
  try {
    const { titulo, descripcion, precio, direccion } = req.body;
    const imagen = req.file ? req.file.path : ''; // URL de Cloudinary

    const propiedad = new Propiedad({ titulo, descripcion, precio, direccion, imagen });
    await propiedad.save();
    res.json(propiedad);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar la propiedad" });
  }
});

app.get("/propiedades", async (req, res) => {
  try {
    const propiedades = await Propiedad.find();
    res.json(propiedades);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener propiedades" });
  }
});

app.get("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id);
    res.json(propiedad);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener propiedad" });
  }
});

app.put("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(propiedad);
  } catch (err) {
    res.status(500).json({ error: "Error al actualizar propiedad" });
  }
});

app.delete("/propiedades/:id", async (req, res) => {
  try {
    await Propiedad.findByIdAndDelete(req.params.id);
    res.json({ message: "Propiedad eliminada" });
  } catch (err) {
    res.status(500).json({ error: "Error al eliminar propiedad" });
  }
});

// ----------------------
// CONFIGURAR OPENAI
// ----------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.post("/api/chat", async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(400).json({ error: "Mensaje vacío" });

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: mensaje }],
      max_tokens: 200
    });
    const respuesta = completion.choices[0].message.content;
    res.json({ respuesta });
  } catch (err) {
    console.error("Error OpenAI:", err);
    res.status(500).json({ error: "Error al conectarse con la IA" });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/vender.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'vender.html'));
});

// ----------------------
// CONEXIÓN A MONGODB Y PUERTO
// ----------------------
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.error("❌ Error al conectar MongoDB:", err));

// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// ----------------------
// CONFIGURACIÓN INICIAL
// ----------------------
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ----------------------
// CONFIGURAR CARPETA DE UPLOADS
// ----------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, 'public/uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// Servir la carpeta de uploads
app.use('/uploads', express.static(uploadDir));

// Configuración Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = file.originalname.match(/\..+$/)[0];
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});
const upload = multer({ storage });

// ----------------------
// SERVIR HTML
// ----------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));
app.get('/vender.html', (req, res) => res.sendFile(path.join(__dirname, 'public/vender.html')));
app.get('/profesionales.html', (req, res) => res.sendFile(path.join(__dirname, 'public/profesionales.html')));
app.get('/añadir.html', (req, res) => res.sendFile(path.join(__dirname, 'public/añadir.html')));

// ----------------------
// MODELO DE PROPIEDAD
// ----------------------
const propiedadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  direccion: { type: String, required: true },
  imagen: { type: String } // ruta relativa: uploads/archivo.jpg
});
const Propiedad = mongoose.model("Propiedad", propiedadSchema);

// ----------------------
// CRUD PROPIEDADES
// ----------------------

// Crear propiedad con imagen
app.post("/propiedades", upload.single("imagen"), async (req, res) => {
  try {
    const { titulo, descripcion, precio, direccion } = req.body;
    const nuevaPropiedad = new Propiedad({
      titulo,
      descripcion,
      precio,
      direccion,
      imagen: req.file ? `uploads/${req.file.filename}` : ""
    });
    const guardada = await nuevaPropiedad.save();
    res.status(201).json(guardada);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al guardar propiedad" });
  }
});

// Obtener todas las propiedades
app.get("/propiedades", async (req, res) => {
  try {
    const propiedades = await Propiedad.find();
    res.json(propiedades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener propiedades" });
  }
});

// Obtener propiedad por ID
app.get("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ error: "No encontrada" });
    res.json(propiedad);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al obtener propiedad" });
  }
});

// Actualizar propiedad
app.put("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!propiedad) return res.status(404).json({ error: "No encontrada" });
    res.json(propiedad);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar propiedad" });
  }
});

// Eliminar propiedad
app.delete("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndDelete(req.params.id);
    if (!propiedad) return res.status(404).json({ error: "No encontrada" });
    res.json({ mensaje: "Propiedad eliminada" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar propiedad" });
  }
});

// ----------------------
// CONFIGURAR OPENAI
// ----------------------
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Chat con IA
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

// ----------------------
// CONEXIÓN MONGODB Y PUERTO
// ----------------------
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.error("❌ Error al conectar MongoDB:", err));

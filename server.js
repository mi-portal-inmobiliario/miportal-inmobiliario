// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import OpenAI from "openai";

// Carga variables de entorno primero
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Servir index.html
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ----------------------
// MODELO DE PROPIEDAD
// ----------------------
const propiedadSchema = new mongoose.Schema({
  titulo: { type: String, required: true },
  descripcion: { type: String },
  precio: { type: Number, required: true },
  direccion: { type: String, required: true },
  imagen: { type: String } // URL de imagen
});
const Propiedad = mongoose.model("Propiedad", propiedadSchema);

// ----------------------
// RUTAS CRUD PROPIEDADES
// ----------------------
app.post("/propiedades", async (req, res) => { /* ... igual que antes ... */ });
app.get("/propiedades", async (req, res) => { /* ... igual que antes ... */ });
app.get("/propiedades/:id", async (req, res) => { /* ... igual que antes ... */ });
app.put("/propiedades/:id", async (req, res) => { /* ... igual que antes ... */ });
app.delete("/propiedades/:id", async (req, res) => { /* ... igual que antes ... */ });

// ----------------------
// CONFIGURAR OPENAI
// ----------------------
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ----------------------
// RUTA CHAT CON IA
// ----------------------
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

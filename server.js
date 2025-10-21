// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
// RUTAS DE PRUEBA
// ----------------------
app.get("/", (req, res) => {
  res.send("¡Servidor inmobiliario funcionando! 🏡");
});

// Ruta para comprobar que el móvil o navegador local recibe datos
app.get("/test", (req, res) => {
  res.send("¡Ruta de prueba funcionando en tu portal! 🚀");
});

// Rutas CRUD básicas para propiedades

// Crear propiedad
app.post("/propiedades", async (req, res) => {
  try {
    const nuevaPropiedad = new Propiedad(req.body);
    const resultado = await nuevaPropiedad.save();
    res.status(201).json(resultado);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Listar todas las propiedades
app.get("/propiedades", async (req, res) => {
  try {
    const propiedades = await Propiedad.find();
    res.json(propiedades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obtener propiedad por ID
app.get("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findById(req.params.id);
    if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" });
    res.json(propiedad);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar propiedad
app.put("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" });
    res.json(propiedad);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Borrar propiedad
app.delete("/propiedades/:id", async (req, res) => {
  try {
    const propiedad = await Propiedad.findByIdAndDelete(req.params.id);
    if (!propiedad) return res.status(404).json({ error: "Propiedad no encontrada" });
    res.json({ mensaje: "Propiedad eliminada" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// CONEXIÓN A MONGODB
// ----------------------
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.error("❌ Error al conectar MongoDB:", err));


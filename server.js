// =============================
// CONFIG INICIAL
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

// Rutas API
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import authMiddleware from "./middleware/auth.js";

// =============================
// FIX __dirname (OBLIGATORIO EN ES MODULES)
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

// =============================
// FRONTEND (CLAVE)
// =============================

// 👉 SERVIR TODO LO QUE HAY EN /public
const publicPath = path.resolve(__dirname, "public");
console.log("📂 Serving public from:", publicPath);

app.use(express.static(publicPath));

// =============================
// FIX RUTAS HTML (Render)
// =============================
app.get("/:page", (req, res, next) => {
  const file = path.join(__dirname, "public", req.params.page);
  if (fs.existsSync(file)) {
    return res.sendFile(file);
  }
  next();
});



// 👉 SERVIR uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =============================
// DEBUG (BORRA DESPUÉS)
// =============================
app.get("/_debug", (req, res) => {
  res.json({
    cwd: process.cwd(),
    dirname: __dirname,
    files: fs.readdirSync(path.join(__dirname, "public")),
  });
});

// =============================
// RUTAS API
// =============================
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);

// =============================
// PROPIEDADES
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
  usuarioId: mongoose.Schema.Types.ObjectId
});

const Propiedad = mongoose.model("Propiedad", PropiedadSchema);

app.get("/propiedades", async (req, res) => {
  const props = await Propiedad.find();
  res.json(props);
});

// =============================
// INDEX (EXPLÍCITO)
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// START
// =============================
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ Mongo conectado");
    app.listen(PORT, () =>
      console.log(`🚀 Servidor en puerto ${PORT}`)
    );
  })
  .catch(err => console.error("❌ Mongo error:", err));

// =============================
// CONFIG INICIAL
// =============================
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// =============================
// MODELOS
// =============================
import Propiedad from "./models/Propiedad.js";

// =============================
// RUTAS API
// =============================
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";

// =============================
// FIX __dirname (ES MODULES)
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
app.use(express.urlencoded({ extended: true }));

// =============================
// FRONTEND (PUBLIC)
// =============================
const publicPath = path.resolve(__dirname, "public");
app.use(express.static(publicPath));

// =============================
// UPLOADS
// =============================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// =============================
// DEBUG (opcional)
// =============================
app.get("/_debug", (req, res) => {
  res.json({
    dirname: __dirname,
    publicFiles: fs.readdirSync(publicPath)
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

// 👉 TODAS LAS PROPIEDADES (CON FILTROS + ORDENACIÓN)
app.get("/propiedades", async (req, res) => {
  try {
    const { tipo, min, max, hab, texto, sort } = req.query;

    const filtro = {};

    if (tipo) {
      filtro.tipoOperacion = tipo;
    }

    if (min || max) {
      filtro.precio = {};
      if (min) filtro.precio.$gte = Number(min);
      if (max) filtro.precio.$lte = Number(max);
    }

    if (hab) {
      filtro.habitaciones = { $gte: Number(hab) };
    }

    if (texto) {
      filtro.$or = [
        { titulo: { $regex: texto, $options: "i" } },
        { direccion: { $regex: texto, $options: "i" } }
      ];
    }

    // ORDENACIÓN
    let orden = {};
    if (sort === "precio_asc") orden.precio = 1;
    if (sort === "precio_desc") orden.precio = -1;

    const propiedades = await Propiedad
      .find(filtro)
      .sort(orden);

    res.json(propiedades);

  } catch (err) {
    res.status(500).json({ message: "Error al obtener propiedades" });
  }
});

// =============================
// INDEX (FRONTEND)
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ⚠️ NO HAY FALLBACK *
// (esto es HTML estático, no SPA)

// =============================
// START
// =============================
const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB conectado");
    app.listen(PORT, () => {
      console.log(`🚀 Servidor activo en http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error("❌ Error MongoDB:", err);
    process.exit(1);
  });

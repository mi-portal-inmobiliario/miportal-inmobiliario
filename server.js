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
// RUTAS API
// =============================
import usuariosRoutes from "./routes/usuarios.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import propiedadesRoutes from "./routes/propiedades.js";

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
// DEBUG
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
app.use("/propiedades", propiedadesRoutes);
app.use("/usuarios", usuariosRoutes);


// =============================
// INDEX
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// START
// =============================
const PORT = process.env.PORT || 3000;

// =============================
// 404
// =============================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

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

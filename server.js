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
import usuariosRoutes from "./routes/usuarios.js";
import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import propiedadesRoutes from "./routes/propiedades.js";
import alertasRoutes from "./routes/alertas.js";
import notificacionesRoutes from "./routes/notificaciones.js";
import pagosRoutes from "./routes/pagos.js";
import webhookRoutes from "./routes/webhook.js";

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
// Redirigir URL antigua a dominio propio
app.use((req, res, next) => {
  if (req.hostname === 'miportal-inmobiliario-server.onrender.com' || 
      req.hostname === 'homeclick24.onrender.com') {
    return res.redirect(301, `https://www.homeclick24.com${req.originalUrl}`);
  }
  next();
});
app.use("/webhook", webhookRoutes);
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
// ROBOTS.TXT
// =============================
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: *
Allow: /
Disallow: /perfil.html
Disallow: /publicar.html
Disallow: /chat.html
Disallow: /favoritos.html

Sitemap: https://www.homeclick24.com/sitemap.xml`);
});

// =============================
// SITEMAP.XML
// =============================
app.get("/sitemap.xml", async (req, res) => {
  try {
    const propiedades = await Propiedad.find({}, { _id: 1, updatedAt: 1 });

    const urls = [
      { loc: "/", priority: "1.0" },
      { loc: "/comprar.html", priority: "0.9" },
      { loc: "/alquiler.html", priority: "0.9" },
      { loc: "/registro.html", priority: "0.5" },
      { loc: "/login.html", priority: "0.3" },
      ...propiedades.map(p => ({
        loc: `/propiedad.html?id=${p._id}`,
        priority: "0.8",
        lastmod: p.updatedAt ? p.updatedAt.toISOString().split("T")[0] : ""
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>https://www.homeclick24.com${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
    <priority>${u.priority}</priority>
  </url>`).join("\n")}
</urlset>`;

    res.type("application/xml");
    res.send(xml);
  } catch(e) {
    res.status(500).send("Error generando sitemap");
  }
});

// =============================
// RUTAS API
// =============================
app.use("/auth", authRoutes);
app.use("/chat", chatRoutes);
app.use("/propiedades", propiedadesRoutes);
app.use("/usuarios", usuariosRoutes);
app.use("/alertas", alertasRoutes);
app.use("/notificaciones", notificacionesRoutes);
app.use("/pagos", pagosRoutes);

// =============================
// INDEX
// =============================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// =============================
// 404
// =============================
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

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
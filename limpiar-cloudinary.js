import "dotenv/config";
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import Propiedad from "./models/Propiedad.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function limpiarCloudinary() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Conectado a MongoDB");

  // Obtener todas las URLs de imágenes en uso
  const propiedades = await Propiedad.find({}, "imagenes");
  const urlsEnUso = new Set();
  for (const p of propiedades) {
    for (const url of p.imagenes || []) {
      const partes = url.split("/");
      const archivo = partes[partes.length - 1].split(".")[0];
      const carpeta = partes[partes.length - 2];
      urlsEnUso.add(`${carpeta}/${archivo}`);
    }
  }
  console.log(`Imágenes en uso en MongoDB: ${urlsEnUso.size}`);

  // Obtener todas las imágenes en Cloudinary
  let recursos = [];
  let nextCursor = null;
  do {
    const result = await cloudinary.api.resources({
      type: "upload",
      prefix: "miportal_inmobiliario",
      max_results: 500,
      next_cursor: nextCursor
    });
    recursos = recursos.concat(result.resources);
    nextCursor = result.next_cursor;
  } while (nextCursor);

  console.log(`Imágenes en Cloudinary: ${recursos.length}`);

  // Comparar y borrar las que no están en uso
  let borradas = 0;
  for (const recurso of recursos) {
    if (!urlsEnUso.has(recurso.public_id)) {
      console.log(`Borrando: ${recurso.public_id}`);
      await cloudinary.uploader.destroy(recurso.public_id);
      borradas++;
    }
  }

  console.log(`\nLimpieza completada. Imágenes borradas: ${borradas}`);
  await mongoose.disconnect();
}

limpiarCloudinary().catch(console.error);
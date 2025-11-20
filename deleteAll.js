// deleteAll.js
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import mongoose from "mongoose";

const mongoURI = process.env.MONGO_URI;
if (!mongoURI) {
  console.error("❌ ERROR: MONGO_URI no está definido. Revisa tu archivo .env");
  process.exit(1);
}

const PropiedadSchema = new mongoose.Schema({}, { strict: false });
const Propiedad = mongoose.model("Propiedad", PropiedadSchema, "propiedads");

async function borrarTodo() {
  try {
    await mongoose.connect(mongoURI, { dbName: "CostaHogar" });
    console.log("✅ Conectado a MongoDB");

    const result = await Propiedad.deleteMany({});
    console.log(`🗑 Se eliminaron ${result.deletedCount} propiedades`);

    await mongoose.disconnect();
    console.log("🔌 Conexión cerrada");
  } catch (err) {
    console.error("❌ Error al eliminar propiedades:", err);
  }
}

borrarTodo();

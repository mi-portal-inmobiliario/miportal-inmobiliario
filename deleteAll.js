import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const propiedadSchema = new mongoose.Schema({}, { strict: false });
const Propiedad = mongoose.model("Propiedad", propiedadSchema, "propiedads");

async function borrarTodo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const resultado = await Propiedad.deleteMany({});
    console.log(`🗑️ ${resultado.deletedCount} propiedades eliminadas`);
  } catch (error) {
    console.error("❌ Error al eliminar propiedades:", error);
  } finally {
    await mongoose.disconnect();
  }
}

borrarTodo();

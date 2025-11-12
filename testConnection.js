import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function testConnection() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conexión a MongoDB Atlas exitosa");
  } catch (error) {
    console.error("❌ Error al conectar con MongoDB:", error);
  } finally {
    await mongoose.disconnect();
  }
}

testConnection();

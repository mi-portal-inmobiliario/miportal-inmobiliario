
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
console.log("Mongo URI:", process.env.MONGODB_URI);


const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("¡Servidor inmobiliario funcionando! 🏡");
});

const PORT = process.env.PORT || 3000;

^G Get Help  ^O WriteOut  ^R Readimport express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
console.log("Mongo URI:", process.env.MONGODB_URI);


const app = express();
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("¡Servidor inmobiliario funcionando! 🏡");
});

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGODB_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ Conectado a MongoDB Atlas");
    app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
  })
  .catch(err => console.error("❌ Error al conectar MongoDB:", err));


import mongoose from "mongoose";

const ConversacionSchema = new mongoose.Schema({
  propiedadId: { type: String, required: true },
  propiedadTitulo: { type: String },
  compradorId: { type: String, required: true },
  compradorNombre: { type: String },
  anuncianteId: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Conversacion", ConversacionSchema);

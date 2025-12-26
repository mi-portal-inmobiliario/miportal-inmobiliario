import mongoose from "mongoose";

const MensajeSchema = new mongoose.Schema(
  {
    conversacionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversacion",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    texto: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Mensaje", MensajeSchema);

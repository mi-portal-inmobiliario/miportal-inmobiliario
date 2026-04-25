import mongoose from "mongoose";

const UsuarioSchema = new mongoose.Schema({
  nombre:     { type: String, required: true },
  email:      { type: String, required: true, unique: true },
  password:   { type: String },
  favoritos:  [{ type: mongoose.Schema.Types.ObjectId, ref: "Propiedad" }],
  verificado: { type: Boolean, default: false },
  token:      { type: String },
  tipoDoc:    { type: String },
  numDoc:     { type: String },
});

export default mongoose.model("Usuario", UsuarioSchema);
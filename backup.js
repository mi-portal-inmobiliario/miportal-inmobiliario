// ===========================================
// SCRIPT DE BACKUP - HomeClick24
// Exporta colecciones MongoDB y envía por email
// ===========================================

import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import { createGzip } from 'zlib';
import { createWriteStream, unlinkSync, existsSync, readFileSync } from 'fs';
import path from 'path';

// ---- CONFIGURACIÓN ----
const MONGODB_URI = process.env.MONGODB_URI;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// ---- EXPORTAR COLECCIONES ----
async function exportarColecciones() {
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `backup-${fecha}.json.gz`;
  const rutaLocal = path.join('/tmp', nombreArchivo);

  console.log(`📦 Conectando a MongoDB...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  const colecciones = await db.listCollections().toArray();

  console.log(`📂 Colecciones: ${colecciones.map(c => c.name).join(', ')}`);

  const datos = {};
  for (const col of colecciones) {
    const documentos = await db.collection(col.name).find({}).toArray();
    datos[col.name] = documentos;
    console.log(`  ✅ ${col.name}: ${documentos.length} documentos`);
  }

  await mongoose.disconnect();

  // Comprimir y guardar
  console.log(`💾 Comprimiendo backup...`);
  const json = JSON.stringify(datos, null, 2);
  const writeStream = createWriteStream(rutaLocal);
  const gzip = createGzip();

  await new Promise((resolve, reject) => {
    gzip.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', resolve);
    gzip.pipe(writeStream);
    gzip.write(json);
    gzip.end();
  });

  console.log(`✅ Backup creado: ${rutaLocal}`);
  return { rutaLocal, nombreArchivo };
}

// ---- ENVIAR POR EMAIL ----
async function enviarPorEmail(rutaLocal, nombreArchivo) {
  console.log(`📧 Enviando backup por email...`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: {
      user: 'resend',
      pass: process.env.RESEND_API_KEY,
    },
  });

  const fecha = new Date().toLocaleDateString('es-ES');
  
  await transporter.sendMail({
    from: 'backup@homeclick24.com',
    to: GMAIL_USER,
    subject: `🗄️ Backup HomeClick24 - ${fecha}`,
    text: `Backup automático de la base de datos de HomeClick24 del ${fecha}.\n\nColecciones incluidas en el adjunto.`,
    attachments: [
      {
        filename: nombreArchivo,
        content: readFileSync(rutaLocal),
      },
    ],
  });

  console.log(`✅ Backup enviado a ${GMAIL_USER}`);
}

// ---- FUNCIÓN PRINCIPAL ----
async function main() {
  console.log('🚀 Iniciando backup de HomeClick24...');
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
  console.log('----------------------------------------');

  let rutaLocal;
  try {
    const { rutaLocal: ruta, nombreArchivo } = await exportarColecciones();
    rutaLocal = ruta;
    await enviarPorEmail(rutaLocal, nombreArchivo);
    console.log('----------------------------------------');
    console.log('✅ Backup completado con éxito');
  } catch (error) {
    console.error('❌ Error en el backup:', error.message);
    process.exit(1);
  } finally {
    if (rutaLocal && existsSync(rutaLocal)) {
      unlinkSync(rutaLocal);
      console.log('🧹 Archivo temporal eliminado');
    }
  }
}

export default main;

main();
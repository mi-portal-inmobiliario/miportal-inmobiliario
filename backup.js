// ===========================================
// SCRIPT DE BACKUP - HomeClick24
// Exporta colecciones MongoDB y sube a Google Drive
// ===========================================

import { google } from 'googleapis';
import mongoose from 'mongoose';
import { createGzip } from 'zlib';
import { createWriteStream, createReadStream, unlinkSync, existsSync } from 'fs';
import { pipeline } from 'stream/promises';
import path from 'path';

// ---- CONFIGURACIÓN ----
const FOLDER_ID = '13PRqMFBgmK8wJMN7yPDnUdzorsAVHqSJ';
const MONGODB_URI = process.env.MONGODB_URI;
const GOOGLE_CREDENTIALS = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// ---- AUTENTICACIÓN CON GOOGLE ----
async function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: GOOGLE_CREDENTIALS,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return auth;
}

// ---- EXPORTAR COLECCIONES ----
async function exportarColecciones() {
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `backup-${fecha}.json.gz`;
  const rutaLocal = path.join('/tmp', nombreArchivo);

  console.log(`📦 Conectando a MongoDB...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db;
  const colecciones = await db.listCollections().toArray();
  
  console.log(`📂 Colecciones encontradas: ${colecciones.map(c => c.name).join(', ')}`);

  const datos = {};
  for (const col of colecciones) {
    const documentos = await db.collection(col.name).find({}).toArray();
    datos[col.name] = documentos;
    console.log(`  ✅ ${col.name}: ${documentos.length} documentos`);
  }

  await mongoose.disconnect();

  // Comprimir y guardar
  console.log(`💾 Guardando backup comprimido...`);
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

// ---- SUBIR A GOOGLE DRIVE ----
async function subirADrive(rutaLocal, nombreArchivo) {
  console.log(`☁️  Subiendo a Google Drive...`);

  const auth = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.create({
    requestBody: {
      name: nombreArchivo,
      parents: [FOLDER_ID],
    },
    media: {
      mimeType: 'application/gzip',
      body: createReadStream(rutaLocal),
    },
    fields: 'id, name',
  });

  console.log(`✅ Subido: ${response.data.name} (ID: ${response.data.id})`);
  return response.data;
}

// ---- LIMPIAR BACKUPS ANTIGUOS (mantener últimos 30) ----
async function limpiarBackupsAntiguos() {
  const auth = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name contains 'backup-' and trashed=false`,
    orderBy: 'createdTime desc',
    fields: 'files(id, name)',
  });

  const archivos = response.data.files;
  console.log(`📂 Total backups en Drive: ${archivos.length}`);

  if (archivos.length > 30) {
    for (const archivo of archivos.slice(30)) {
      await drive.files.delete({ fileId: archivo.id });
      console.log(`🗑️  Eliminado: ${archivo.name}`);
    }
  }
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
    await subirADrive(rutaLocal, nombreArchivo);
    await limpiarBackupsAntiguos();
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
// ===========================================
// SCRIPT DE BACKUP - HomeClick24
// Hace backup de MongoDB y lo sube a Google Drive
// ===========================================

import { execSync } from 'child_process';
import { google } from 'googleapis';
import fs from 'fs';
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

// ---- HACER EL BACKUP ----
async function crearBackup() {
  const fecha = new Date().toISOString().split('T')[0];
  const nombreArchivo = `backup-${fecha}.gz`;
  const rutaLocal = path.join('/tmp', nombreArchivo);

  console.log(`📦 Creando backup: ${nombreArchivo}`);

  execSync(
    `mongodump --uri="${MONGODB_URI}" --archive="${rutaLocal}" --gzip`,
    { stdio: 'inherit' }
  );

  console.log(`✅ Backup creado en ${rutaLocal}`);
  return { rutaLocal, nombreArchivo };
}

// ---- SUBIR A GOOGLE DRIVE ----
async function subirADrive(rutaLocal, nombreArchivo) {
  console.log(`☁️  Subiendo a Google Drive...`);

  const auth = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const fileMetadata = {
    name: nombreArchivo,
    parents: [FOLDER_ID],
  };

  const media = {
    mimeType: 'application/gzip',
    body: fs.createReadStream(rutaLocal),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name',
  });

  console.log(`✅ Subido correctamente: ${response.data.name} (ID: ${response.data.id})`);
  return response.data;
}

// ---- LIMPIAR BACKUPS ANTIGUOS (mantener últimos 30) ----
async function limpiarBackupsAntiguos() {
  const auth = await getGoogleAuth();
  const drive = google.drive({ version: 'v3', auth });

  const response = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and name contains 'backup-' and trashed=false`,
    orderBy: 'createdTime desc',
    fields: 'files(id, name, createdTime)',
  });

  const archivos = response.data.files;
  console.log(`📂 Total backups en Drive: ${archivos.length}`);

  if (archivos.length > 30) {
    const aEliminar = archivos.slice(30);
    for (const archivo of aEliminar) {
      await drive.files.delete({ fileId: archivo.id });
      console.log(`🗑️  Eliminado backup antiguo: ${archivo.name}`);
    }
  }
}

// ---- LIMPIAR ARCHIVO LOCAL ----
function limpiarLocal(rutaLocal) {
  if (fs.existsSync(rutaLocal)) {
    fs.unlinkSync(rutaLocal);
    console.log(`🧹 Archivo temporal eliminado`);
  }
}

// ---- FUNCIÓN PRINCIPAL ----
async function main() {
  console.log('🚀 Iniciando backup de HomeClick24...');
  console.log(`📅 Fecha: ${new Date().toLocaleString('es-ES')}`);
  console.log('----------------------------------------');

  let rutaLocal;
  try {
    const { rutaLocal: ruta, nombreArchivo } = await crearBackup();
    rutaLocal = ruta;

    await subirADrive(rutaLocal, nombreArchivo);
    await limpiarBackupsAntiguos();

    console.log('----------------------------------------');
    console.log('✅ Backup completado con éxito');
  } catch (error) {
    console.error('❌ Error en el backup:', error.message);
    process.exit(1);
  } finally {
    if (rutaLocal) limpiarLocal(rutaLocal);
  }
}

export default main;

// Solo ejecutar si se llama directamente
if (process.argv[1].includes('backup.js')) {
  main();
}
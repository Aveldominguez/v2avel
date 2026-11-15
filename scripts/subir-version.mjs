#!/usr/bin/env node
/**
 * Sube la versión de la app antes de publicar.
 *
 * Hace falta porque el incremento automático SÓLO funciona en modo
 * desarrollo, mientras se edita con el servidor local arrancado. Quien
 * trabaja editando ficheros y compilando —o la máquina que despliega— nunca
 * lo dispara, y entonces la app se publica sin avisar a nadie de que hay
 * versión nueva. Pasó con quince cambios seguidos.
 *
 *   node scripts/subir-version.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const FICHERO = 'src/config/version.ts';
const fuente = readFileSync(FICHERO, 'utf-8');

const m = fuente.match(/APP_VERSION\s*=\s*'(\d+)\.(\d+)'/);
if (!m) {
  console.error(`No encuentro APP_VERSION en ${FICHERO}`);
  process.exit(1);
}

const nueva = `${m[1]}.${Number(m[2]) + 1}`;
writeFileSync(FICHERO, fuente.replace(/APP_VERSION\s*=\s*'[^']+'/, `APP_VERSION = '${nueva}'`), 'utf-8');

console.log(`Versión ${m[1]}.${m[2]} → ${nueva}`);
console.log('Ahora edita el changelog en', FICHERO, 'y compila: los usuarios verán esa lista.');

/**
 * logos.js
 * Prepara los logos para el reporte .html: los achica y los convierte en
 * data: URL, para que la pagina lleve sus imagenes adentro y no dependa de
 * ningun otro archivo.
 *
 * Vive en electron/ (y no en src/core) porque usa nativeImage de Electron
 * para achicar las imagenes. Lo usan main.js y las pruebas de interfaz.
 */

const { nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const CARPETA_IMAGENES = path.join(__dirname, '..', 'src', 'ui', 'img');

/** Alto, en pixeles, de los logos dentro del reporte (el doble de lo que se ve). */
const ALTO_LOGO = 124;

let logosListos = null;

/**
 * @returns {{uat?:string, uamm?:string, isc?:string}} Cada logo como data: URL.
 *          Si falta un archivo, ese logo no viene y el reporte pone sus siglas.
 */
function logosParaReporte () {
  if (logosListos) return logosListos;   // se preparan una sola vez

  logosListos = {};
  for (const clave of ['uat', 'uamm', 'isc']) {
    try {
      const archivo = path.join(CARPETA_IMAGENES, `logo-${clave}.jpeg`);
      const imagen = nativeImage.createFromBuffer(fs.readFileSync(archivo));
      if (imagen.isEmpty()) continue;
      const chica = imagen.resize({ height: ALTO_LOGO, quality: 'best' });
      logosListos[clave] = 'data:image/jpeg;base64,' + chica.toJPEG(88).toString('base64');
    } catch (e) {
      // Sin este logo: el reporte pone las siglas en su lugar.
    }
  }
  return logosListos;
}

module.exports = { logosParaReporte };

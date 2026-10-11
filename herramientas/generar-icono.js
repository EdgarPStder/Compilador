/**
 * generar-icono.js
 * Genera el icono de la aplicacion (PNG 512x512) sin dependencias externas.
 *
 *   node herramientas/generar-icono.js
 *
 * Dibuja el distintivo del equipo: un cuadrado redondeado con degradado
 * azul-violeta y los simbolos < / > que representan el codigo fuente.
 * electron-builder convierte este PNG al .ico de Windows automaticamente.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LADO = 512;

// ---------------------------------------------------------------- utilidades

/** Mezcla dos colores segun t (0..1). */
function mezclar (a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

/** Distancia de un punto al segmento (x1,y1)-(x2,y2). */
function distanciaASegmento (px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largo = dx * dx + dy * dy;
  let t = largo === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / largo;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Cobertura de un rectangulo redondeado, con borde suavizado. */
function coberturaRedondeada (x, y, lado, radio) {
  const c = lado / 2;
  const dx = Math.abs(x - c) - (c - radio);
  const dy = Math.abs(y - c) - (c - radio);
  const fuera = Math.hypot(Math.max(dx, 0), Math.max(dy, 0));
  const dist = Math.min(Math.max(dx, dy), 0) + fuera - radio;
  return Math.max(0, Math.min(1, 0.5 - dist));
}

// ---------------------------------------------------------------- dibujo

function dibujar () {
  const pixeles = Buffer.alloc(LADO * LADO * 4, 0);

  const colorA = [77, 163, 255];   // azul  (--acento)
  const colorB = [124, 108, 255];  // violeta (--acento-2)
  const fondoOscuro = [15, 20, 28];
  const grosorTrazo = 26;

  // Trazos de los simbolos: < / >
  const m = LADO;
  const trazos = [
    // "<"  (dos segmentos)
    [[0.34 * m, 0.34 * m], [0.20 * m, 0.50 * m]],
    [[0.20 * m, 0.50 * m], [0.34 * m, 0.66 * m]],
    // ">"
    [[0.66 * m, 0.34 * m], [0.80 * m, 0.50 * m]],
    [[0.80 * m, 0.50 * m], [0.66 * m, 0.66 * m]],
    // "/" central
    [[0.56 * m, 0.30 * m], [0.44 * m, 0.70 * m]]
  ];

  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const i = (y * LADO + x) * 4;

      const cobertura = coberturaRedondeada(x + 0.5, y + 0.5, LADO, LADO * 0.22);
      if (cobertura <= 0) continue;

      // Degradado diagonal del fondo
      const t = (x / LADO) * 0.5 + (y / LADO) * 0.5;
      let color = mezclar(colorA, colorB, t);

      // Los simbolos se dibujan en el color oscuro del tema
      let tinta = 0;
      for (const [[x1, y1], [x2, y2]] of trazos) {
        const d = distanciaASegmento(x + 0.5, y + 0.5, x1, y1, x2, y2);
        tinta = Math.max(tinta, Math.max(0, Math.min(1, (grosorTrazo / 2 - d) + 0.5)));
      }
      if (tinta > 0) color = mezclar(color, fondoOscuro, tinta);

      pixeles[i] = color[0];
      pixeles[i + 1] = color[1];
      pixeles[i + 2] = color[2];
      pixeles[i + 3] = Math.round(255 * cobertura);
    }
  }

  return pixeles;
}

// ---------------------------------------------------------------- PNG

function trozo (tipo, datos) {
  const largo = Buffer.alloc(4);
  largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(calcularCRC(cuerpo) >>> 0, 0);
  return Buffer.concat([largo, cuerpo, crc]);
}

let TABLA_CRC = null;
function calcularCRC (buf) {
  if (!TABLA_CRC) {
    TABLA_CRC = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      TABLA_CRC[n] = c;
    }
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return c ^ 0xFFFFFFFF;
}

function escribirPNG (pixeles, ruta) {
  const firma = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(LADO, 0);
  ihdr.writeUInt32BE(LADO, 4);
  ihdr[8] = 8;   // bits por canal
  ihdr[9] = 6;   // RGBA
  ihdr[10] = 0;  // compresion
  ihdr[11] = 0;  // filtro
  ihdr[12] = 0;  // entrelazado

  // Cada fila lleva un byte de filtro (0 = sin filtro)
  const crudo = Buffer.alloc(LADO * (LADO * 4 + 1));
  for (let y = 0; y < LADO; y++) {
    crudo[y * (LADO * 4 + 1)] = 0;
    pixeles.copy(crudo, y * (LADO * 4 + 1) + 1, y * LADO * 4, (y + 1) * LADO * 4);
  }

  const png = Buffer.concat([
    firma,
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(crudo, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);

  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, png);
  return png.length;
}

const destino = path.join(__dirname, '..', 'build', 'icono.png');
const bytes = escribirPNG(dibujar(), destino);
console.log(`Icono generado: ${destino} (${LADO}x${LADO}, ${bytes} bytes)`);

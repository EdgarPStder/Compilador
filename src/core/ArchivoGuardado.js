/**
 * ArchivoGuardado.js
 * Las dos puntas de guardar un trabajo:
 *
 *   contenidoParaGuardar()  arma el archivo: reporte visual .html o texto .bs
 *   leerArchivoGuardado()   lo vuelve a abrir y recupera el codigo
 *
 * Al abrir (con Archivo -> Abrir, Ctrl+O, o arrastrando el archivo a la
 * ventana) se decide asi:
 *
 *   1. Un reporte .html del compilador  -> su codigo y la pestaña que traia
 *   2. Cualquier otra pagina web        -> error: no es un reporte nuestro
 *   3. Un reporte .bs con comentarios   -> solo su codigo
 *   4. Cualquier otro texto (.bs, .txt) -> se abre tal cual
 *
 * Se decide por el CONTENIDO y no por la extension, asi que un reporte al que
 * le cambiaron el nombre se sigue abriendo bien.
 */

const { construirReporteHTML, extraerDatosHTML, pareceHTML } = require('./ReporteHTML');
const { construirReporte, extraerCodigoFuente } = require('./Reporte');

/**
 * Arma el contenido del archivo que se va a guardar. El formato lo decide
 * la extension que se eligio en el dialogo de Guardar:
 *
 *   .html / .htm  ->  el reporte visual (ReporteHTML.js)
 *   cualquier otra ->  el reporte en texto (Reporte.js)
 *
 * @param {object} resultado Resultado de Compilador.compilar().
 * @param {string} nombre    Nombre del archivo, con su extension.
 * @param {object} [opciones] { pestana, logos, fecha }
 * @returns {{formato:'html'|'bs', contenido:string}}
 */
function contenidoParaGuardar (resultado, nombre, opciones = {}) {
  if (/\.html?$/i.test(nombre)) {
    return {
      formato: 'html',
      contenido: construirReporteHTML(resultado, Object.assign({ nombrePrograma: nombre }, opciones))
    };
  }
  return {
    formato: 'bs',
    contenido: construirReporte(resultado, { nombrePrograma: nombre, fecha: opciones.fecha })
  };
}

/**
 * @param {string} texto Contenido completo del archivo.
 * @returns {{ok:true, codigo:string, pestana:string|null} | {ok:false, error:string}}
 */
function leerArchivoGuardado (texto) {
  const contenido = String(texto || '');

  // 1. Reporte visual: trae el codigo en su bloque de datos.
  const datos = extraerDatosHTML(contenido);
  if (datos) return { ok: true, codigo: datos.codigo, pestana: datos.pestana };

  // 2. Una pagina web que no hizo este compilador: no hay codigo que sacar.
  if (pareceHTML(contenido)) {
    return {
      ok: false,
      error: 'Esta página web no es un reporte del compilador: no trae el código guardado.'
    };
  }

  // 3 y 4. Texto: si es un reporte .bs se queda solo el codigo; si no, tal cual.
  return { ok: true, codigo: extraerCodigoFuente(contenido), pestana: null };
}

module.exports = { contenidoParaGuardar, leerArchivoGuardado };

/**
 * ResaltadoJava.js
 * Colorea el codigo Java que genera la fase 6, con los mismos colores que los
 * cuadros de codigo de la aplicacion (el tema claro de VS Code, ver
 * 01.lexico/ResaltadoCodigo.js):
 *
 *   control de flujo     if for while return break      morado    j-control
 *   tipos y clases       int double String Math         verde azulado  j-tipo / j-clase
 *   declaraciones        public static class new true   azul      j-declaracion
 *   metodos              println pow sumar              cafe      j-funcion
 *   variables            edad i                         azul oscuro  j-variable
 *   textos y caracteres  "Hola" 'A'                     rojo      j-cadena
 *   numeros              20 3.5                         verde     j-numero
 *   comentarios          // ...   /** ... *\/            verde     j-comentario
 *
 * Trabaja renglon por renglon (el codigo que genera la fase 6 nunca parte un
 * texto en dos renglones), y devuelve HTML ya escapado.
 */

const CONTROL = ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue',
  'return', 'try', 'catch'];
const TIPOS = ['int', 'double', 'boolean', 'char', 'long', 'short', 'byte', 'float', 'void'];
const DECLARACION = ['public', 'static', 'class', 'new', 'import', 'true', 'false', 'null'];

/** Los pedazos de un renglon: comentario, texto, caracter, numero, palabra o lo demas. */
const PIEZAS = /(\/\/.*$|\/\*.*?\*\/|\/\*\*?.*$|^\s*\*.*$)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?[fFdDlL]?\b)|([A-Za-z_À-ɏ][\wÀ-ɏ]*)|([^]?)/g;

function escapar (texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Un renglon de Java en HTML con colores.
 * @param {string} renglon
 * @returns {string}
 */
function resaltarRenglonJava (renglon) {
  let html = '';
  let ultimo = 0;
  let anterior = '';
  PIEZAS.lastIndex = 0;
  for (let m = PIEZAS.exec(renglon); m && m.index < renglon.length; m = PIEZAS.exec(renglon)) {
    if (m[0] === '') {
      PIEZAS.lastIndex++;
      continue;
    }
    html += escapar(renglon.slice(ultimo, m.index));
    ultimo = m.index + m[0].length;
    const span = (clase) => `<span class="${clase}">${escapar(m[0])}</span>`;
    if (m[1]) html += span('j-comentario');
    else if (m[2] || m[3]) html += span('j-cadena');
    else if (m[4]) html += span('j-numero');
    else if (m[5]) {
      const palabra = m[5];
      const siguiente = renglon.slice(ultimo).match(/^\s*(\S)/);
      if (anterior === 'class') html += span('j-clase');
      else if (CONTROL.indexOf(palabra) !== -1) html += span('j-control');
      else if (TIPOS.indexOf(palabra) !== -1) html += span('j-tipo');
      else if (DECLARACION.indexOf(palabra) !== -1) html += span('j-declaracion');
      else if (siguiente && siguiente[1] === '(') html += span('j-funcion');
      else if (/^[A-Z]/.test(palabra) || /^(area|perimetro|volumen)$/.test(palabra)) html += span('j-clase');
      else html += span('j-variable');
      anterior = palabra;
    } else {
      html += escapar(m[0]);
    }
  }
  return html + escapar(renglon.slice(ultimo));
}

module.exports = { resaltarRenglonJava };

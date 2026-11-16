/**
 * ResaltadoCodigo.js
 * Colorea el codigo con el resaltado de sintaxis de Java.
 *
 * SwordByte esta basado en Java, asi que cada palabra se pinta como se
 * pintaria la palabra de Java que le corresponde. Los colores son los del tema
 * claro de VS Code (Light+), y la clasificacion la de su gramatica de Java
 * (java.tmLanguage):
 *
 *   Grupo de Java               Ejemplo Java        Ejemplo SwordByte          Color
 *   --------------------------  ------------------  -------------------------  -------
 *   control de flujo            if for return       si para retornar           morado
 *   tipos                       int double String   entero decimal cadena      verde azulado
 *   declaracion / constantes    class final true    clase Constante verdadero  azul
 *   operadores con palabra      (and, or)           Y AND O OR NO NOT          azul
 *   clases                      Math Exception      area perimetro Error       verde azulado
 *   metodos y funciones         println pow sumar   imprimirLn potencia sumar  cafe
 *   variables                   edad                edad                       azul oscuro
 *   textos y caracteres         "Hola" 'A'          "Hola" 'A'                 rojo
 *   numeros                     20 3.5              20 3.5                     verde
 *   comentarios                 // /* *\/            // /* *\/                   verde
 *   errores lexicos             -                   @                          subrayado rojo
 *
 * Usa el analizador lexico de verdad: se pinta como palabra del lenguaje
 * exactamente lo que la pestaña 1 reconoce como tal.
 *
 * Ademas, si se le pasan errores (de cualquier fase), subraya en rojo el
 * token donde cae cada uno (clase j-marca), como lo hace un editor de Java
 * mientras se escribe.
 *
 * Devuelve HTML con <span class="j-..."> alrededor de cada token. Todo el
 * texto va escapado, y ningun <span> cruza un salto de linea: asi el
 * resultado se puede partir por renglones (el reporte lo hace).
 */

const { TiposToken } = require('../comun/TiposToken');
const { analizarLexico } = require('./AnalizadorLexico');

/** Palabras de control de flujo (las keyword.control de Java). */
const CONTROL = [
  'si', 'sino', 'sinoSi', 'para', 'mientras', 'hacer', 'opcion', 'caso',
  'porDefecto', 'romper', 'retornar', 'intentar', 'capturar'
];

/** Palabras que declaran algo (como class, final, static en Java). */
const DECLARACION = ['clase', 'clasePrincipal', 'funcion', 'Constante', 'Arreglo', 'matriz'];

/** Palabras que hacen el papel de una clase de Java (Math, Exception). */
const CLASES = ['perimetro', 'area', 'volumen', 'Error'];

/** Valores constantes (true, false, null en Java). */
const CONSTANTES = ['verdadero', 'falso', 'Null'];

/**
 * Que clase de color le toca a un token.
 *
 * @param {object} t         El token.
 * @param {object} anterior  El token util de antes (sin comentarios), o null.
 * @param {object} siguiente El token util de despues, o null.
 * @returns {string|null} La clase CSS, o null si va sin color.
 */
function claseDe (t, anterior, siguiente) {
  switch (t.tipo) {
    case TiposToken.TIPO_DATO:
      return 'j-tipo';
    case TiposToken.LIT_LOGICO:
      return 'j-constante';
    case TiposToken.OP_LOGICO:
      // Y, AND, O, OR, NO, NOT son palabras; && || ! son simbolos.
      return /^[A-Za-z]/.test(t.lexema) ? 'j-operador' : null;
    case TiposToken.PALABRA_RESERVADA:
      if (CONTROL.indexOf(t.lexema) !== -1) return 'j-control';
      if (DECLARACION.indexOf(t.lexema) !== -1) return 'j-declaracion';
      if (CLASES.indexOf(t.lexema) !== -1) return 'j-clase';
      if (CONSTANTES.indexOf(t.lexema) !== -1) return 'j-constante';
      // Las demas (imprimir, leer, raiz, potencia...) son funciones.
      return 'j-funcion';
    case TiposToken.IDENTIFICADOR:
      // clase triangulo { ... }  ->  el nombre de la clase
      if (anterior && anterior.lexema === 'clase') return 'j-clase';
      // sumar(5, 3)  y  funcion entero sumar(...)  ->  una funcion
      if (siguiente && siguiente.lexema === '(') return 'j-funcion';
      // area.circulo(5)  ->  circulo es un metodo
      if (anterior && anterior.lexema === '.') return 'j-funcion';
      return 'j-variable';
    case TiposToken.LIT_CADENA:
    case TiposToken.LIT_CARACTER:
      return 'j-cadena';
    case TiposToken.LIT_ENTERO:
    case TiposToken.LIT_DECIMAL:
      return 'j-numero';
    case TiposToken.COMENTARIO:
      return 'j-comentario';
    case TiposToken.ERROR:
      return 'j-error';
    default:
      return null;   // operadores y signos: color normal
  }
}

/** Escapa < > & para meter texto en HTML. */
function escapar (texto) {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Envuelve un pedazo de texto en su color. Si el pedazo tiene saltos de linea
 * (un comentario de bloque), cada renglon se envuelve por separado.
 */
function pintar (pedazo, clase) {
  if (!clase) return escapar(pedazo);
  return pedazo.split('\n')
    .map((renglon) => (renglon ? `<span class="${clase}">${escapar(renglon)}</span>` : ''))
    .join('\n');
}

/**
 * El token que se subraya por un error. Cada error trae su linea y columna:
 *   1. si cae dentro de un token, ese token;
 *   2. si no (el error esta despues del ultimo token del renglon, como en
 *      "falta ;", o al final del archivo), el ultimo token antes de ahi.
 *
 * @param {object} e       El error: { linea, columna }.
 * @param {Array}  tokens  Los tokens utiles, en orden.
 */
function tokenDelError (e, tokens) {
  let anterior = null;
  for (const t of tokens) {
    const yaPaso = t.linea > e.linea || (t.linea === e.linea && t.columna > e.columna);
    if (yaPaso) break;
    const dentro = t.linea === e.linea && e.columna < t.columna + t.lexema.length;
    if (dentro) return t;
    anterior = t;
  }
  return anterior || tokens[0] || null;
}

/**
 * @param {string} fuente    El codigo tal cual se escribio.
 * @param {Array}  [errores] Errores a subrayar: [{ linea, columna }].
 * @returns {string} El mismo texto en HTML, con los colores.
 */
function resaltarCodigo (fuente, errores = []) {
  const texto = String(fuente || '');
  const { todosLosTokens } = analizarLexico(texto);

  // Los tokens utiles (sin comentarios), para saber que hay antes y despues
  // de cada uno: un nombre seguido de "(" es una funcion.
  const utiles = todosLosTokens.filter((t) => !t.ignorado && t.tipo !== TiposToken.FIN_ARCHIVO);
  const posicion = new Map(utiles.map((t, i) => [t, i]));

  // Los tokens donde cae algun error: se subrayan en rojo.
  const marcados = new Set();
  errores.forEach((e) => {
    const t = tokenDelError(e, utiles);
    if (t) marcados.add(t);
  });

  // Donde empieza cada renglon dentro del texto, para pasar de
  // (linea, columna) a una posicion. El analizador quita el BOM del inicio,
  // asi que si lo hay, el primer renglon se recorre un lugar.
  const inicios = [texto.charCodeAt(0) === 0xFEFF ? 1 : 0];
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '\n') inicios.push(i + 1);
  }

  let html = '';
  let pos = 0;
  for (const t of todosLosTokens) {
    if (t.tipo === TiposToken.FIN_ARCHIVO) continue;

    const desde = inicios[t.linea - 1] + t.columna - 1;
    const hasta = desde + t.lexema.length;
    if (desde < pos) continue;   // por seguridad: nunca se repite texto

    const i = posicion.has(t) ? posicion.get(t) : -1;
    const anterior = i > 0 ? utiles[i - 1] : null;
    const siguiente = i !== -1 && i + 1 < utiles.length ? utiles[i + 1] : null;

    // Su color y, si ahi hay un error, el subrayado rojo.
    const clases = [claseDe(t, anterior, siguiente), marcados.has(t) ? 'j-marca' : null]
      .filter((c) => c !== null).join(' ');

    html += escapar(texto.slice(pos, desde));   // espacios entre tokens
    html += pintar(texto.slice(desde, hasta), clases || null);
    pos = hasta;
  }
  html += escapar(texto.slice(pos));
  return html;
}

/** El codigo coloreado, un elemento por renglon (con sus errores subrayados). */
function resaltarLineas (fuente, errores = []) {
  return resaltarCodigo(fuente, errores).split('\n');
}

module.exports = { resaltarCodigo, resaltarLineas };

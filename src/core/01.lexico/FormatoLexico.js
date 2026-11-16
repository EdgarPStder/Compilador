/**
 * FormatoLexico.js
 * Convierte la lista de tokens en la salida clasica del analisis lexico:
 *
 *   Codigo fuente:    a > b + 9
 *   Salida lexica:    id1 > id2 + num(9)
 *
 * Reglas de presentacion:
 *   - Cada identificador se sustituye por id1, id2, id3... en orden de
 *     aparicion. El mismo nombre conserva siempre su etiqueta. Las etiquetas
 *     las da la TABLA DE SIMBOLOS (comun/TablaSimbolos.js): aqui el lexico
 *     anota cada identificador, y las otras dos fases usan la misma tabla.
 *   - Cada numero se envuelve como num(valor).
 *   - Cada pieza lleva la categoria a la que pertenece, para que la interfaz
 *     pueda pintar los operadores logicos en azul, los relacionales en rojo
 *     y los aritmeticos en negro.
 */

const { TiposToken } = require('../comun/TiposToken');
const { TablaSimbolos } = require('../comun/TablaSimbolos');

/** Tokens que se pegan a lo que traen atras:   a , b   ->   a, b */
const SE_PEGAN_ATRAS = [';', ',', ')', ']', '.', '++', '--'];

/** Tokens despues de los cuales no se separa nada:   ( a   ->   (a */
const SE_PEGAN_ADELANTE = ['(', '[', '.', '√'];

/**
 * Palabras de control. Son las unicas reservadas que llevan espacio antes del
 * parentesis, porque no son llamadas a una funcion:
 *   si (a > b)        mientras (a > b)
 *   imprimirLn(a)     longitud(a)        <- estas si van pegadas
 */
const PALABRAS_DE_CONTROL = [
  'si', 'sinoSi', 'sino', 'para', 'mientras', 'hacer',
  'opcion', 'intentar', 'capturar'
];

/**
 * Decide si entre dos tokens seguidos va un espacio.
 * Lo normal es que SI vaya; abajo estan los tres casos en los que no.
 *
 * @param {object|null} anterior Token de la izquierda (null si es el primero).
 * @param {object} actual Token de la derecha.
 * @returns {boolean}
 */
function llevaEspacioAntes (anterior, actual) {
  // 1. Es el primero de la linea: no hay nada de que separarlo.
  if (anterior === null) return false;

  // 2. Uno de los dos se pega al otro por lo que es.
  if (SE_PEGAN_ATRAS.indexOf(actual.lexema) !== -1) return false;
  if (SE_PEGAN_ADELANTE.indexOf(anterior.lexema) !== -1) return false;

  // 3. Un "(" o un "[" se pega al nombre del que cuelga:
  //      leer(x)    tabla[1]    tabla[1][2]    longitud(a)
  //    menos cuando ese nombre es una palabra de control:
  //      si (a > b)    mientras (a > b)
  if (actual.lexema === '(' || actual.lexema === '[') {
    if (anterior.tipo === TiposToken.IDENTIFICADOR) return false;
    if (anterior.lexema === ')' || anterior.lexema === ']') return false;
    if (anterior.tipo === TiposToken.PALABRA_RESERVADA) {
      return PALABRAS_DE_CONTROL.indexOf(anterior.lexema) !== -1;
    }
  }

  return true;
}

/**
 * Categoria de presentacion de un token. Es la que decide su color.
 *
 *   logico      operadores booleanos y los valores verdadero / falso  (azul)
 *   relacional  == != < > <= >=                                       (rojo)
 *   aritmetico  + - * / % ++ --                                       (negro)
 */
function categoriaDe (token) {
  switch (token.tipo) {
    case TiposToken.OP_LOGICO:
    case TiposToken.LIT_LOGICO:
      return 'logico';
    case TiposToken.OP_RELACIONAL:
      return 'relacional';
    case TiposToken.OP_ARITMETICO:
    case TiposToken.OP_INCREMENTO:
    // El "=" va con los aritmeticos, igual que en la jerarquia del lenguaje.
    case TiposToken.OP_ASIGNACION:
      return 'aritmetico';
    case TiposToken.LIT_ENTERO:
    case TiposToken.LIT_DECIMAL:
      return 'numero';
    case TiposToken.IDENTIFICADOR:
      return 'identificador';
    case TiposToken.LIT_CADENA:
    case TiposToken.LIT_CARACTER:
      return 'texto';
    case TiposToken.PALABRA_RESERVADA:
    case TiposToken.TIPO_DATO:
      return 'reservada';
    default:
      return 'normal';
  }
}

/**
 * @param {Array} tokens Tokens del analizador lexico.
 * @param {TablaSimbolos} [tabla] La tabla de simbolos del compilador, donde se
 *                                anotan los identificadores.
 * @returns {{lineas:Array, texto:string, mapa:Object, identificadores:Array}}
 */
function formatearSalidaLexica (tokens, tabla = new TablaSimbolos()) {
  // Solo los tokens que llegan al analisis: sin comentarios ni fin de archivo.
  const utiles = (tokens || []).filter(
    (t) => t.tipo !== TiposToken.FIN_ARCHIVO && !t.ignorado
  );

  /**
   * Un nombre escrito despues de un punto es un miembro, no una variable:
   * en "area.circulo(5)" la palabra "circulo" no se numera como identificador.
   */
  const esMiembro = (i) => i > 0 && utiles[i - 1].lexema === '.';

  /** true si este token se debe sustituir por una etiqueta idN. */
  const seRenombra = (t, i) =>
    t.tipo === TiposToken.IDENTIFICADOR && !esMiembro(i);

  // --- 1. Anotar los identificadores en la tabla de simbolos ---
  // La tabla le da a cada nombre su etiqueta (id1, id2...) por orden de
  // aparicion y cuenta cuantas veces aparece.
  utiles.forEach((t, i) => {
    if (seRenombra(t, i)) tabla.registrar(t.lexema, t.linea, t.columna);
  });
  const mapa = tabla.mapa();   // nombre original -> etiqueta idN

  /** Texto con el que se muestra un token en la salida. */
  const textoDe = (t, i) => {
    if (seRenombra(t, i)) return mapa[t.lexema];
    if (t.tipo === TiposToken.LIT_ENTERO || t.tipo === TiposToken.LIT_DECIMAL) {
      return `num(${t.lexema})`;
    }
    return t.lexema;
  };

  // --- 2. Reescribir el codigo linea por linea ---
  const porLinea = new Map();
  utiles.forEach((t, i) => {
    if (!porLinea.has(t.linea)) porLinea.set(t.linea, []);
    porLinea.get(t.linea).push({ token: t, indice: i });
  });

  const lineas = [];
  for (const numero of Array.from(porLinea.keys()).sort((a, b) => a - b)) {
    const deLaLinea = porLinea.get(numero);
    const sangria = ' '.repeat(Math.max(0, deLaLinea[0].token.columna - 1));

    const piezas = [];
    let texto = sangria;
    let anterior = null;

    for (const { token: t, indice } of deLaLinea) {
      const espacioAntes = llevaEspacioAntes(anterior, t);

      const pieza = {
        texto: textoDe(t, indice),
        categoria: categoriaDe(t),
        espacioAntes,
        lexema: t.lexema,
        tipo: t.tipo,
        descripcion: t.descripcion,
        columna: t.columna
      };

      piezas.push(pieza);
      texto += (espacioAntes ? ' ' : '') + pieza.texto;
      anterior = t;
    }

    lineas.push({ numero, sangria, piezas, texto });
  }

  return {
    lineas,
    texto: lineas.map((l) => l.texto).join('\n'),
    mapa,
    identificadores: tabla.identificadores
  };
}

module.exports = { formatearSalidaLexica, categoriaDe };

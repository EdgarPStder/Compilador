/**
 * TiposJava.js
 * Lo que la fase 6 necesita saber de los TIPOS y de los VALORES para
 * escribirlos en Java.
 *
 *   SwordByte     Java          Valor inicial
 *   ----------    ---------     -------------
 *   logico        boolean       false
 *   byte          byte          0
 *   caracter      char          '\0'
 *   corto         short         0
 *   entero        int           0
 *   largo         long          0L
 *   flotante      float         0.0f
 *   decimal       double        0.0
 *   cadena        String        ""
 *   Error         Exception     (solo en capturar)
 *
 * Un arreglo es tipo[]. Una MATRIZ tambien: en el codigo intermedio (fase 4)
 * se guarda renglon por renglon en un solo bloque, y t[i][j] es el lugar
 * i * columnas + j. El programa Java hace lo mismo: int[] t = new int[2 * 3].
 */

const JAVA = {
  logico: 'boolean',
  byte: 'byte',
  caracter: 'char',
  corto: 'short',
  entero: 'int',
  largo: 'long',
  flotante: 'float',
  decimal: 'double',
  cadena: 'String',
  vacio: 'void',
  Error: 'Exception'
};

const INICIAL = {
  logico: 'false',
  byte: '0',
  caracter: "'\\0'",
  corto: '0',
  entero: '0',
  largo: '0L',
  flotante: '0.0f',
  decimal: '0.0',
  cadena: '""'
};

/** Los tipos numericos, del mas chico al mas grande (como en el semantico). */
const NUMERICOS = ['byte', 'corto', 'entero', 'largo', 'flotante', 'decimal'];
const ENTEROS = ['byte', 'corto', 'entero', 'largo'];

const esNumerico = (t) => NUMERICOS.indexOf(t) !== -1;
const esEnteroT = (t) => ENTEROS.indexOf(t) !== -1;
const esArreglo = (t) => typeof t === 'string' && t.endsWith('[]');

/** El tipo de los elementos de un arreglo o matriz:  entero[][] -> entero */
const elementoDe = (t) => (t || '').replace(/\[\]/g, '');

/** El nombre del tipo en Java. Un arreglo o una matriz: tipo[] (ver arriba). */
function tipoJava (t) {
  if (esArreglo(t)) return `${JAVA[elementoDe(t)]}[]`;
  return JAVA[t] || 'Object';
}

/** El valor con el que empieza una variable que se declara antes de recibir uno. */
function valorInicial (t) {
  if (esArreglo(t)) return 'null';
  return INICIAL[t] || 'null';
}

/**
 * El tipo de una operacion entre dos numeros, como en Java: el mas grande de
 * los dos y como minimo int (byte + byte da int).
 */
function promover (a, b) {
  const mayor = Math.max(NUMERICOS.indexOf(a), NUMERICOS.indexOf(b), NUMERICOS.indexOf('entero'));
  return NUMERICOS[mayor];
}

/** El tipo de un valor escrito tal cual en el codigo intermedio:  5, 2.5f, "hola"... */
function tipoDeLiteral (x) {
  if (x === 'verdadero' || x === 'falso') return 'logico';
  if (/^"/.test(x)) return 'cadena';
  if (/^'/.test(x)) return 'caracter';
  if (/^-?\d+[lL]$/.test(x)) return 'largo';
  if (/^-?\d+$/.test(x)) return 'entero';
  if (/^-?\d+(\.\d+)?[fF]$/.test(x)) return 'flotante';
  if (/^-?\d+(\.\d+)?[dD]?$/.test(x)) return 'decimal';
  return null;
}

/** true si un texto del codigo intermedio es un valor escrito tal cual (no un nombre). */
const esLiteral = (x) => tipoDeLiteral(x) !== null;

/**
 * Un valor escrito tal cual, como se escribe en Java:
 *   verdadero -> true       falso -> false
 *   010 -> 10               (en SwordByte 010 es diez; en Java seria un octal)
 * Los textos y los caracteres ya vienen escritos como en Java desde la fase 4.
 */
function literalJava (x) {
  if (x === 'verdadero') return 'true';
  if (x === 'falso') return 'false';
  const entero = /^(-?)0+(\d+)([lL]?)$/.exec(x);
  if (entero) return entero[1] + entero[2] + entero[3];
  return x;
}

/** Lo que devuelve cada funcion nativa de SwordByte. */
const NATIVAS = {
  aleatorio: 'entero',
  potencia: 'decimal',
  redondear: 'entero',
  logaritmo: 'decimal',
  logaritmo10: 'decimal',
  seno: 'decimal',
  coseno: 'decimal',
  longitud: 'entero',
  imprimir: 'vacio',
  imprimirLn: 'vacio',
  imprimirF: 'vacio',
  equipo: 'vacio',
  limpiar: 'vacio',
  esperar: 'vacio'
};

/** Las nativas que solo calculan un valor: no imprimen, no fallan y siempre dan lo mismo. */
const NATIVAS_PURAS = ['potencia', 'redondear', 'logaritmo10', 'seno', 'coseno'];

/** perimetro.circulo, area.triangulo...: las de geometria. */
const esGeometrica = (f) => /^(perimetro|area|volumen)\./.test(f);

module.exports = {
  tipoJava,
  valorInicial,
  promover,
  tipoDeLiteral,
  esLiteral,
  literalJava,
  esNumerico,
  esEnteroT,
  esArreglo,
  elementoDe,
  NATIVAS,
  NATIVAS_PURAS,
  esGeometrica
};

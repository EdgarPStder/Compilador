/**
 * PalabrasReservadas.js
 * Diccionario de todas las palabras reservadas del lenguaje SwordByte.
 *
 * Cada palabra se asocia a su descripcion, que es la que aparece en la tabla
 * de tokens. El analizador lexico no las distingue mientras lee: todas siguen
 * el camino del identificador y aqui se decide que son al final.
 */

const { TiposToken } = require('../comun/TiposToken');

/** Tipos de dato del lenguaje. */
const TIPOS_DATO = {
  logico: 'Valor verdadero o falso',
  byte: 'Entero de 8 bits',
  caracter: 'Un carácter Unicode de 16 bits',
  corto: 'Entero de 16 bits',
  entero: 'Entero de 32 bits',
  largo: 'Entero de 64 bits',
  flotante: 'Punto flotante de 32 bits',
  decimal: 'Punto flotante de 64 bits',
  cadena: 'Secuencia de caracteres',
  vacio: 'Sin valor de retorno'
};

/** Palabras reservadas que NO son tipos de dato. */
const RESERVADAS = {
  // Estructura del programa
  clase: 'Declara la clase del programa',
  clasePrincipal: 'Punto de entrada del programa',
  equipo: 'Imprime los datos del equipo',

  // Declaraciones
  Constante: 'Declara una constante',
  Arreglo: 'Declara un arreglo unidimensional',
  matriz: 'Declara una matriz bidimensional',

  // Salida
  imprimir: 'Imprime sin salto de línea',
  imprimirLn: 'Imprime con salto de línea',
  imprimirF: 'Imprime con formato',

  // Entrada
  leer: 'Lee un valor desde el teclado',

  // Decisión
  si: 'Estructura de decisión',
  sinoSi: 'Decisión alternativa encadenada',
  sino: 'Bloque alternativo',

  // Selección múltiple
  opcion: 'Selección múltiple',
  caso: 'Caso de la selección múltiple',
  romper: 'Sale de la estructura',
  porDefecto: 'Caso por defecto',

  // Ciclos
  para: 'Ciclo con contador',
  mientras: 'Ciclo con condición previa',
  hacer: 'Ciclo con condición posterior',

  // Funciones
  funcion: 'Declara una función',
  retornar: 'Devuelve un valor y termina la función',

  // Manejo de errores
  intentar: 'Bloque que puede fallar',
  capturar: 'Bloque que atiende el error',
  Error: 'Tipo de error capturado',

  // Utilidades de consola
  limpiar: 'Limpia la consola',
  esperar: 'Pausa la ejecución en milisegundos',

  // Funciones nativas
  longitud: 'Tamaño de una cadena o arreglo',
  aleatorio: 'Entero aleatorio en un rango',
  potencia: 'Base elevada a un exponente',
  raiz: 'Raíz cuadrada, o raíz n-ésima con dos argumentos',
  raizCuadrada: 'Raíz cuadrada',
  raizCubica: 'Raíz cúbica',
  redondear: 'Redondea al entero más cercano',
  logaritmo: 'Logaritmo natural o con base',
  logaritmo10: 'Logaritmo base 10',
  seno: 'Seno de un ángulo en radianes',
  coseno: 'Coseno de un ángulo en radianes',
  convertir: 'Convierte un valor a otro tipo',

  // Geometría
  perimetro: 'Perímetro de una figura',
  area: 'Área de una figura',
  volumen: 'Volumen de un cuerpo',

  // Parámetro vacío de equipo()
  Null: 'Marca de lista de parámetros vacía'
};

/** Figuras validas despues de perimetro. / area. / volumen. */
const FIGURAS = {
  perimetro: { circulo: 1, cuadrado: 1, rectangulo: 2, triangulo: 3 },
  area: { circulo: 1, cuadrado: 1, rectangulo: 2, triangulo: 2 },
  volumen: { cubo: 1, esfera: 1, cilindro: 2, cono: 2, prisma: 2, piramide: 2 }
};

/** Literales logicos. */
const LITERALES_LOGICOS = ['verdadero', 'falso'];

/**
 * Operadores logicos escritos con palabra. Cada operador admite la forma en
 * espanol y la inglesa, ademas de los simbolos && || ! que el analizador
 * lexico reconoce aparte.
 */
const OPERADORES_PALABRA = ['Y', 'AND', 'O', 'OR', 'NO', 'NOT'];

/**
 * El lenguaje esta basado en Java, pero con sus propias palabras. Si alguien
 * escribe la de Java por costumbre, el analizador sintactico no la reconoce
 * como instruccion y dice cual es la de SwordByte.
 *
 *   break;   ->   'break' es de Java. En SwordByte se escribe 'romper'.
 */
const EQUIVALENTES_JAVA = {
  // Tipos
  int: 'entero',
  double: 'decimal',
  float: 'flotante',
  long: 'largo',
  short: 'corto',
  char: 'caracter',
  boolean: 'logico',
  String: 'cadena',
  void: 'vacio',
  // Valores
  true: 'verdadero',
  false: 'falso',
  null: 'Null',
  // Estructura y declaraciones
  class: 'clase',
  final: 'Constante',
  // Control de flujo
  if: 'si',
  else: 'sino',
  for: 'para',
  while: 'mientras',
  do: 'hacer',
  switch: 'opcion',
  case: 'caso',
  default: 'porDefecto',
  break: 'romper',
  return: 'retornar',
  try: 'intentar',
  catch: 'capturar',
  // Entrada, salida y matematicas
  System: 'imprimir, imprimirLn o imprimirF',
  print: 'imprimir',
  println: 'imprimirLn',
  printf: 'imprimirF',
  Scanner: 'leer',
  Math: 'una función nativa (potencia, raiz, redondear, seno...)'
};

/**
 * Si la palabra es de Java, devuelve como se escribe en SwordByte; si no,
 * null.
 */
function equivalenteJava (palabra) {
  return Object.prototype.hasOwnProperty.call(EQUIVALENTES_JAVA, palabra)
    ? EQUIVALENTES_JAVA[palabra]
    : null;
}

/**
 * Clasifica una palabra ya reconocida por el automata.
 * @param {string} lexema
 * @returns {{tipo:string, descripcion:string}|null} null si es un identificador.
 */
function clasificarPalabra (lexema) {
  if (Object.prototype.hasOwnProperty.call(TIPOS_DATO, lexema)) {
    return { tipo: TiposToken.TIPO_DATO, descripcion: TIPOS_DATO[lexema] };
  }
  if (LITERALES_LOGICOS.indexOf(lexema) !== -1) {
    return { tipo: TiposToken.LIT_LOGICO, descripcion: 'Literal lógico' };
  }
  if (OPERADORES_PALABRA.indexOf(lexema) !== -1) {
    return { tipo: TiposToken.OP_LOGICO, descripcion: 'Operador lógico' };
  }
  if (Object.prototype.hasOwnProperty.call(RESERVADAS, lexema)) {
    return { tipo: TiposToken.PALABRA_RESERVADA, descripcion: RESERVADAS[lexema] };
  }
  return null;
}

module.exports = { FIGURAS, clasificarPalabra, equivalenteJava };

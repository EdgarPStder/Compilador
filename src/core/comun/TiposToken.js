/**
 * TiposToken.js
 * Catalogo de categorias lexicas del lenguaje SwordByte.
 *
 * Cada token producido por el analizador lexico lleva una de estas categorias.
 * La UI las usa para colorear la tabla de tokens y el resaltado del editor.
 */

const TiposToken = {
  // --- Palabras del lenguaje ---
  PALABRA_RESERVADA: 'PALABRA_RESERVADA',
  TIPO_DATO: 'TIPO_DATO',

  // --- Nombres definidos por el programador ---
  IDENTIFICADOR: 'IDENTIFICADOR',

  // --- Literales ---
  LIT_ENTERO: 'LIT_ENTERO',
  LIT_DECIMAL: 'LIT_DECIMAL',
  LIT_CADENA: 'LIT_CADENA',
  LIT_CARACTER: 'LIT_CARACTER',
  LIT_LOGICO: 'LIT_LOGICO',

  // --- Operadores ---
  OP_ARITMETICO: 'OP_ARITMETICO',
  OP_RELACIONAL: 'OP_RELACIONAL',
  OP_LOGICO: 'OP_LOGICO',
  OP_ASIGNACION: 'OP_ASIGNACION',
  OP_INCREMENTO: 'OP_INCREMENTO',

  // --- Signos de puntuacion ---
  DELIMITADOR: 'DELIMITADOR',

  // --- Auxiliares ---
  COMENTARIO: 'COMENTARIO',
  FIN_ARCHIVO: 'FIN_ARCHIVO',
  ERROR: 'ERROR'
};

/** Descripcion legible de cada categoria (se muestra en la interfaz). */
const DescripcionTipos = {
  PALABRA_RESERVADA: 'Palabra reservada del lenguaje',
  TIPO_DATO: 'Tipo de dato',
  IDENTIFICADOR: 'Identificador definido por el usuario',
  LIT_ENTERO: 'Literal entero',
  LIT_DECIMAL: 'Literal decimal / flotante',
  LIT_CADENA: 'Literal de cadena',
  LIT_CARACTER: 'Literal de caracter',
  LIT_LOGICO: 'Literal logico (verdadero / falso)',
  OP_ARITMETICO: 'Operador aritmetico',
  OP_RELACIONAL: 'Operador relacional',
  OP_LOGICO: 'Operador logico',
  OP_ASIGNACION: 'Operador de asignacion',
  OP_INCREMENTO: 'Operador de incremento / decremento',
  DELIMITADOR: 'Delimitador o signo de puntuacion',
  COMENTARIO: 'Comentario',
  FIN_ARCHIVO: 'Marca de fin de archivo',
  ERROR: 'Simbolo no reconocido'
};

module.exports = { TiposToken, DescripcionTipos };

/**
 * TablaLexica.js
 * Convierte la lista de tokens en la tabla de la pestaña "Analizador Léxico":
 *
 *   Lexema   Token                     Descripción
 *   ------   -----------------------   -----------------------------------------
 *   a        identificador             Variable o nombre definido por el usuario
 *   =        operador asignación       Asigna un valor a una variable
 *   24       número entero             Valor numérico entero (24)
 *
 * El analizador lexico ya dice la CATEGORIA de cada token (OP_ARITMETICO,
 * IDENTIFICADOR...). Aqui solo se le pone un nombre mas especifico para la
 * tabla: no es lo mismo "operador suma" que "operador multiplicación", aunque
 * los dos sean aritmeticos.
 */

const { TiposToken } = require('../comun/TiposToken');
const { categoriaDe } = require('./FormatoLexico');

/**
 * Nombre y descripcion de cada simbolo del lenguaje.
 * Los simbolos son pocos y fijos, asi que se escriben uno por uno.
 * Los operadores logicos con palabra (Y, AND, O...) tambien van aqui.
 */
const SIMBOLOS = {
  // --- Aritmeticos ---
  '+': ['operador suma', 'Operación aritmética de suma (también une textos)'],
  '-': ['operador resta', 'Operación aritmética de resta'],
  '*': ['operador multiplicación', 'Operación aritmética de multiplicación'],
  '/': ['operador división', 'Operación aritmética de división'],
  '%': ['operador residuo', 'Residuo de una división entera'],
  '^': ['operador potencia', 'Eleva la base al exponente'],
  '**': ['operador potencia', 'Eleva la base al exponente (igual que ^)'],
  '√': ['operador raíz', 'Raíz cuadrada del valor que le sigue'],
  '++': ['operador incremento', 'Suma 1 a la variable'],
  '--': ['operador decremento', 'Resta 1 a la variable'],

  // --- Asignacion ---
  '=': ['operador asignación', 'Asigna un valor a una variable'],

  // --- Relacionales ---
  '==': ['operador igual que', 'Compara si dos valores son iguales'],
  '!=': ['operador diferente de', 'Compara si dos valores son distintos'],
  '<': ['operador menor que', 'Compara si el primer valor es menor'],
  '>': ['operador mayor que', 'Compara si el primer valor es mayor'],
  '<=': ['operador menor o igual', 'Compara si el primer valor es menor o igual'],
  '>=': ['operador mayor o igual', 'Compara si el primer valor es mayor o igual'],

  // --- Logicos (con simbolo y con palabra) ---
  '&&': ['operador Y lógico', 'Verdadero solo si las dos condiciones lo son'],
  Y: ['operador Y lógico', 'Verdadero solo si las dos condiciones lo son'],
  AND: ['operador Y lógico', 'Verdadero solo si las dos condiciones lo son'],
  '||': ['operador O lógico', 'Verdadero si al menos una condición lo es'],
  O: ['operador O lógico', 'Verdadero si al menos una condición lo es'],
  OR: ['operador O lógico', 'Verdadero si al menos una condición lo es'],
  '!': ['operador negación', 'Invierte el valor de una condición'],
  NO: ['operador negación', 'Invierte el valor de una condición'],
  NOT: ['operador negación', 'Invierte el valor de una condición'],

  // --- Delimitadores ---
  '(': ['paréntesis que abre', 'Inicio de parámetros o de una expresión agrupada'],
  ')': ['paréntesis que cierra', 'Fin de parámetros o de una expresión agrupada'],
  '{': ['llave que abre', 'Inicio de un bloque de instrucciones'],
  '}': ['llave que cierra', 'Fin de un bloque de instrucciones'],
  '[': ['corchete que abre', 'Inicio del índice de un arreglo'],
  ']': ['corchete que cierra', 'Fin del índice de un arreglo'],
  ';': ['punto y coma', 'Fin de una instrucción'],
  ',': ['coma', 'Separa los elementos de una lista'],
  ':': ['dos puntos', 'Separa un caso de sus instrucciones'],
  '.': ['punto', 'Acceso a un miembro, como en area.circulo']
};

/**
 * Nombre del token y su descripcion para un token cualquiera.
 *
 * @param {object} t        Token del analizador lexico.
 * @param {object} contexto { etiqueta, esMiembro, error }
 * @returns {[string, string]} [nombre del token, descripcion]
 */
function nombreYDescripcion (t, contexto) {
  // 1. Un error lexico lleva el mensaje del error como descripcion.
  if (t.tipo === TiposToken.ERROR) {
    return ['error léxico', contexto.error ? contexto.error.mensaje : t.descripcion];
  }

  // 2. Los simbolos tienen su propio nombre en la tabla de arriba.
  if (Object.prototype.hasOwnProperty.call(SIMBOLOS, t.lexema)) {
    return SIMBOLOS[t.lexema];
  }

  // 3. Lo demas se decide por su categoria.
  switch (t.tipo) {
    case TiposToken.IDENTIFICADOR:
      if (contexto.esMiembro) {
        return ['nombre de miembro', 'Nombre que va después de un punto'];
      }
      return ['identificador',
        `Variable o nombre definido por el usuario (${contexto.etiqueta})`];
    case TiposToken.LIT_ENTERO:
      return ['número entero', `Valor numérico entero (${t.lexema})`];
    case TiposToken.LIT_DECIMAL:
      return ['número decimal', `Valor numérico con punto decimal (${t.lexema})`];
    case TiposToken.LIT_CADENA:
      return ['cadena de texto', `Texto entre comillas (${String(t.valor).length} caracteres)`];
    case TiposToken.LIT_CARACTER:
      return ['carácter', 'Un solo carácter entre comillas simples'];
    case TiposToken.LIT_LOGICO:
      return ['valor lógico', t.lexema === 'verdadero' ? 'Valor verdadero' : 'Valor falso'];
    case TiposToken.TIPO_DATO:
      return ['tipo de dato', t.descripcion];
    case TiposToken.PALABRA_RESERVADA:
      return ['palabra reservada', t.descripcion];
    default:
      return [t.tipo.toLowerCase(), t.descripcion];
  }
}

/**
 * Arma las filas de la tabla, una por token, en el orden del codigo.
 *
 * @param {Array} tokens  Tokens del analizador lexico.
 * @param {Array} errores Errores lexicos (ErrorCompilacion).
 * @param {object} mapa  Nombre -> etiqueta idN, de FormatoLexico.
 * @returns {Array<{numero, lexema, token, descripcion, categoria, linea, columna}>}
 */
function construirTablaLexica (tokens, errores, mapa) {
  // Solo los tokens que llegan al analisis: sin comentarios ni fin de archivo.
  const utiles = (tokens || []).filter(
    (t) => t.tipo !== TiposToken.FIN_ARCHIVO && !t.ignorado
  );

  return utiles.map((t, i) => {
    const contexto = {
      etiqueta: (mapa || {})[t.lexema],
      // En "area.circulo" la palabra "circulo" es un miembro, no una variable.
      esMiembro: i > 0 && utiles[i - 1].lexema === '.',
      // El error que se reporto en el mismo lugar que este token
      error: (errores || []).find((e) => e.linea === t.linea && e.columna === t.columna)
    };
    const [token, descripcion] = nombreYDescripcion(t, contexto);

    return {
      numero: i + 1,
      lexema: t.lexema,
      token,
      descripcion,
      // La misma categoria que decide los colores de la salida id1 > id2
      categoria: t.tipo === TiposToken.ERROR ? 'error' : categoriaDe(t),
      linea: t.linea,
      columna: t.columna
    };
  });
}

module.exports = { construirTablaLexica };

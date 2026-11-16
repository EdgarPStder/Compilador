/**
 * AnalizadorLexico.js
 * FASE 1 del compilador SwordByte.
 *
 * Recorre el codigo fuente caracter por caracter y lo agrupa en tokens
 * aplicando un automata finito determinista (AFD).
 *
 * Cada token guarda el estado del AFD en el que fue aceptado (estadoFinal),
 * que es lo que muestra la columna "Estado" de la tabla de tokens. Los 19
 * estados y sus transiciones estan en docs/02-analizador-lexico.md
 */

const { TiposToken, DescripcionTipos } = require('../comun/TiposToken');
const { Token } = require('../comun/Token');
const { ErrorCompilacion, FASES } = require('../comun/ErrorCompilacion');
const { clasificarPalabra } = require('./PalabrasReservadas');

/** Clases de caracteres que reconoce el automata. */
const CLASES = {
  esLetra: (c) => /[A-Za-zÀ-ɏ]/.test(c),
  esDigito: (c) => c >= '0' && c <= '9',
  esGuionBajo: (c) => c === '_',
  esEspacio: (c) => /\s/.test(c),
  esSufijo: (c) => 'fdLFDl'.indexOf(c) !== -1
};

/** Comillas dobles aceptadas (incluye las tipograficas de Word). */
const COMILLAS_DOBLES = ['"', '“', '”'];
/** Comillas simples aceptadas. */
const COMILLAS_SIMPLES = ["'", '‘', '’'];

/** Delimitadores de un solo caracter y su descripcion. */
const DELIMITADORES = {
  '(': 'Inicio de parametros o de expresion',
  ')': 'Fin de parametros o de expresion',
  '{': 'Inicio de bloque',
  '}': 'Fin de bloque',
  '[': 'Inicio de indice de arreglo',
  ']': 'Fin de indice de arreglo',
  ';': 'Fin de instruccion',
  ',': 'Separador de elementos',
  ':': 'Separador de caso',
  '.': 'Acceso a miembro'
};

/** Operadores de dos caracteres. */
const OPERADORES_DOBLES = {
  '==': { tipo: TiposToken.OP_RELACIONAL, desc: 'Igual que' },
  '!=': { tipo: TiposToken.OP_RELACIONAL, desc: 'Diferente de' },
  '<=': { tipo: TiposToken.OP_RELACIONAL, desc: 'Menor o igual que' },
  '>=': { tipo: TiposToken.OP_RELACIONAL, desc: 'Mayor o igual que' },
  '++': { tipo: TiposToken.OP_INCREMENTO, desc: 'Incremento en 1' },
  '--': { tipo: TiposToken.OP_INCREMENTO, desc: 'Decremento en 1' },
  '&&': { tipo: TiposToken.OP_LOGICO, desc: 'Y logico (equivale a Y / AND)' },
  '||': { tipo: TiposToken.OP_LOGICO, desc: 'O logico (equivale a O / OR)' },
  '**': { tipo: TiposToken.OP_ARITMETICO, desc: 'Potencia (equivale a ^)' }
};

/** Simbolos que solo existen duplicados: & y | sueltos son un error. */
const SOLO_DUPLICADOS = {
  '&': "Para el Y logico se escribe '&&', 'Y' o 'AND'.",
  '|': "Para el O logico se escribe '||', 'O' u 'OR'."
};

/** Operadores de un caracter. */
const OPERADORES_SIMPLES = {
  '+': { tipo: TiposToken.OP_ARITMETICO, desc: 'Suma o concatenacion' },
  '-': { tipo: TiposToken.OP_ARITMETICO, desc: 'Resta' },
  '*': { tipo: TiposToken.OP_ARITMETICO, desc: 'Multiplicacion' },
  '/': { tipo: TiposToken.OP_ARITMETICO, desc: 'Division' },
  '%': { tipo: TiposToken.OP_ARITMETICO, desc: 'Residuo de la division' },
  '^': { tipo: TiposToken.OP_ARITMETICO, desc: 'Potencia (equivale a **)' },
  '√': { tipo: TiposToken.OP_ARITMETICO, desc: 'Raiz cuadrada (equivale a raiz)' },
  '<': { tipo: TiposToken.OP_RELACIONAL, desc: 'Menor que' },
  '>': { tipo: TiposToken.OP_RELACIONAL, desc: 'Mayor que' },
  '=': { tipo: TiposToken.OP_ASIGNACION, desc: 'Operador de asignacion' },
  '!': { tipo: TiposToken.OP_LOGICO, desc: 'Negacion logica' }
};

class AnalizadorLexico {
  /**
   * @param {string} fuente Codigo fuente completo en lenguaje SwordByte.
   */
  constructor (fuente) {
    // Algunos editores guardan un BOM al inicio del archivo. No es parte del
    // programa, asi que se quita antes de empezar: si no, seria el primer
    // "simbolo desconocido" de todos los archivos abiertos desde fuera.
    this.fuente = typeof fuente === 'string' ? fuente.replace(/^﻿/, '') : '';
    this.pos = 0;
    this.linea = 1;
    this.columna = 1;

    this.tokens = [];        // tokens utiles (sin comentarios)
    this.todosLosTokens = []; // incluye comentarios, para la tabla visual
    this.errores = [];
    this.numeroToken = 0;
  }

  // ------------------------------------------------------------------
  // Utilidades de bajo nivel
  // ------------------------------------------------------------------

  /** Caracter en la posicion actual (+desplazamiento). */
  _ver (desplazamiento = 0) {
    return this.fuente[this.pos + desplazamiento];
  }

  /** Avanza una posicion actualizando linea y columna. */
  _avanzar () {
    const c = this.fuente[this.pos];
    this.pos++;
    if (c === '\n') {
      this.linea++;
      this.columna = 1;
    } else {
      this.columna++;
    }
    return c;
  }

  /** Crea y guarda un token. */
  _emitir (tipo, lexema, linea, columna, opciones = {}) {
    this.numeroToken++;
    const token = new Token({
      numero: this.numeroToken,
      tipo,
      lexema,
      valor: opciones.valor,
      linea,
      columna,
      estadoFinal: opciones.estadoFinal,
      descripcion: opciones.descripcion || DescripcionTipos[tipo] || '',
      ignorado: !!opciones.ignorado
    });
    this.todosLosTokens.push(token);
    if (!token.ignorado) this.tokens.push(token);
    return token;
  }

  /** Registra un error lexico y continua el analisis. */
  _error (mensaje, linea, columna, extra = {}) {
    this.errores.push(
      new ErrorCompilacion(FASES.LEXICA, mensaje, linea, columna, extra)
    );
  }

  // ------------------------------------------------------------------
  // Proceso principal
  // ------------------------------------------------------------------

  /**
   * Ejecuta el analisis completo.
   * @returns {{tokens:Token[], todosLosTokens:Token[],
   *            errores:ErrorCompilacion[], estadisticas:object}}
   */
  analizar () {
    while (this.pos < this.fuente.length) {
      const c = this._ver();

      // 1. Espacios en blanco: se descartan
      if (CLASES.esEspacio(c)) {
        this._avanzar();
        continue;
      }

      const linea = this.linea;
      const columna = this.columna;

      // 2. Comentarios
      if (c === '/' && (this._ver(1) === '/' || this._ver(1) === '*')) {
        this._leerComentario(linea, columna);
        continue;
      }

      // 3. Identificadores y palabras reservadas
      if (CLASES.esLetra(c) || CLASES.esGuionBajo(c)) {
        this._leerPalabra(linea, columna);
        continue;
      }

      // 4. Numeros
      if (CLASES.esDigito(c)) {
        this._leerNumero(linea, columna);
        continue;
      }

      // 5. Cadenas
      if (COMILLAS_DOBLES.indexOf(c) !== -1) {
        this._leerCadena(linea, columna);
        continue;
      }

      // 6. Caracteres
      if (COMILLAS_SIMPLES.indexOf(c) !== -1) {
        this._leerCaracter(linea, columna);
        continue;
      }

      // 7. Operadores
      const par = c + (this._ver(1) || '');
      if (OPERADORES_DOBLES[par]) {
        this._avanzar();
        this._avanzar();
        const info = OPERADORES_DOBLES[par];
        this._emitir(info.tipo, par, linea, columna, {
          estadoFinal: 'q13',
          descripcion: info.desc
        });
        continue;
      }
      if (OPERADORES_SIMPLES[c]) {
        this._avanzar();
        const info = OPERADORES_SIMPLES[c];
        this._emitir(info.tipo, c, linea, columna, {
          estadoFinal: 'q12',
          descripcion: info.desc
        });
        continue;
      }

      // 8. Delimitadores
      if (DELIMITADORES[c]) {
        this._avanzar();
        this._emitir(TiposToken.DELIMITADOR, c, linea, columna, {
          estadoFinal: 'q14',
          descripcion: DELIMITADORES[c]
        });
        continue;
      }

      // 9. Simbolo desconocido
      this._avanzar();
      this._error(
        `El simbolo '${c}' no pertenece al alfabeto del lenguaje.`,
        linea, columna,
        {
          lexema: c,
          sugerencia: SOLO_DUPLICADOS[c] ||
            'Revisa que no sea un caracter copiado de otro editor.'
        }
      );
      this._emitir(TiposToken.ERROR, c, linea, columna, {
        estadoFinal: 'qE',
        descripcion: 'Simbolo no reconocido'
      });
    }

    // Token centinela de fin de archivo
    this.numeroToken++;
    const eof = new Token({
      numero: this.numeroToken,
      tipo: TiposToken.FIN_ARCHIVO,
      lexema: '<FIN>',
      valor: null,
      linea: this.linea,
      columna: this.columna,
      estadoFinal: 'q0',
      descripcion: 'Fin del codigo fuente'
    });
    this.tokens.push(eof);
    this.todosLosTokens.push(eof);

    return {
      tokens: this.tokens,
      todosLosTokens: this.todosLosTokens,
      errores: this.errores,
      estadisticas: this._estadisticas()
    };
  }

  // ------------------------------------------------------------------
  // Reconocedores por tipo de token
  // ------------------------------------------------------------------

  /** q0 -> q1 : identificadores y palabras reservadas. */
  _leerPalabra (linea, columna) {
    let lexema = '';
    lexema += this._avanzar();

    while (this.pos < this.fuente.length) {
      const c = this._ver();
      if (CLASES.esLetra(c) || CLASES.esDigito(c) || CLASES.esGuionBajo(c)) {
        lexema += this._avanzar();
      } else {
        break;
      }
    }

    const clasificacion = clasificarPalabra(lexema);
    if (clasificacion) {
      this._emitir(clasificacion.tipo, lexema, linea, columna, {
        estadoFinal: 'q1',
        descripcion: clasificacion.descripcion,
        valor: lexema
      });
    } else {
      this._emitir(TiposToken.IDENTIFICADOR, lexema, linea, columna, {
        estadoFinal: 'q1',
        descripcion: 'Identificador definido por el usuario',
        valor: lexema
      });
    }
  }

  /** q0 -> q2 -> (q3 -> q4) -> q5 : literales numericos. */
  _leerNumero (linea, columna) {
    let lexema = '';
    let esDecimal = false;

    lexema += this._avanzar();

    while (this.pos < this.fuente.length && CLASES.esDigito(this._ver())) {
      lexema += this._avanzar();
    }

    // Parte decimal: solo si despues del punto viene un digito
    if (this._ver() === '.' && CLASES.esDigito(this._ver(1))) {
      esDecimal = true;
      lexema += this._avanzar();
      lexema += this._avanzar();
      while (this.pos < this.fuente.length && CLASES.esDigito(this._ver())) {
        lexema += this._avanzar();
      }
    } else if (this._ver() === '.' && !CLASES.esDigito(this._ver(1))) {
      // 5. sin digitos: error claro en vez de dos tokens confusos
      lexema += this._avanzar();
      this._error(
        `El numero '${lexema}' esta incompleto: falta al menos un digito despues del punto.`,
        linea, columna,
        { lexema, sugerencia: `Escribe '${lexema}0' si querias un decimal.` }
      );
      this._emitir(TiposToken.ERROR, lexema, linea, columna, {
        estadoFinal: 'qE',
        descripcion: 'Literal numerico incompleto'
      });
      return;
    }

    // Sufijo f / d / L
    let sufijo = '';
    const siguiente = this._ver();
    if (siguiente && CLASES.esSufijo(siguiente)) {
      const despues = this._ver(1);
      const pegadoAPalabra = despues && (CLASES.esLetra(despues) || CLASES.esDigito(despues) || CLASES.esGuionBajo(despues));
      if (!pegadoAPalabra) {
        sufijo = siguiente;
        lexema += this._avanzar();
      }
    }

    const numerico = parseFloat(lexema.replace(/[fdLFDl]$/, ''));
    const esRealPorSufijo = sufijo === 'f' || sufijo === 'F' || sufijo === 'd' || sufijo === 'D';

    this._emitir(
      esDecimal || esRealPorSufijo ? TiposToken.LIT_DECIMAL : TiposToken.LIT_ENTERO,
      lexema, linea, columna,
      {
        estadoFinal: sufijo ? 'q5' : (esDecimal ? 'q4' : 'q2'),
        valor: numerico,
        descripcion: esDecimal || esRealPorSufijo
          ? 'Literal decimal' + (sufijo ? ` con sufijo '${sufijo}'` : '')
          : 'Literal entero' + (sufijo ? ` con sufijo '${sufijo}'` : '')
      }
    );
  }

  /** q0 -> q6 -> q8 : literales de cadena. */
  _leerCadena (linea, columna) {
    const apertura = this._ver();
    let lexema = '';
    let valor = '';

    lexema += this._avanzar();

    let cerrada = false;
    while (this.pos < this.fuente.length) {
      const c = this._ver();

      if (c === '\n') break; // una cadena no puede cruzar el fin de linea

      if (c === '\\') {
        lexema += this._avanzar();
        const esc = this._ver();
        if (esc === undefined) break;
        lexema += this._avanzar();
        valor += this._interpretarEscape(esc);
        continue;
      }

      if (COMILLAS_DOBLES.indexOf(c) !== -1) {
        lexema += this._avanzar();
        cerrada = true;
        break;
      }

      valor += c;
      lexema += this._avanzar();
    }

    if (!cerrada) {
      this._error(
        'Cadena de texto sin cerrar: falta la comilla doble final.',
        linea, columna,
        { lexema, sugerencia: 'Agrega " al final del texto.' }
      );
      this._emitir(TiposToken.ERROR, lexema, linea, columna, {
        estadoFinal: 'qE',
        descripcion: 'Cadena sin cerrar'
      });
      return;
    }

    this._emitir(TiposToken.LIT_CADENA, lexema, linea, columna, {
      estadoFinal: 'q8',
      valor,
      descripcion: `Literal de cadena (${valor.length} caracteres)`
    });
  }

  /** q0 -> q9 -> q10 -> q11 : literales de caracter. */
  _leerCaracter (linea, columna) {
    let lexema = '';
    let valor = '';

    lexema += this._avanzar();

    if (this._ver() === '\\') {
      lexema += this._avanzar();
      const esc = this._ver();
      if (esc !== undefined) {
        lexema += this._avanzar();
        valor = this._interpretarEscape(esc);
      }
    } else if (this._ver() !== undefined && this._ver() !== '\n') {
      valor = this._ver();
      lexema += this._avanzar();
    }

    if (this._ver() !== undefined && COMILLAS_SIMPLES.indexOf(this._ver()) !== -1) {
      lexema += this._avanzar();
      this._emitir(TiposToken.LIT_CARACTER, lexema, linea, columna, {
        estadoFinal: 'q11',
        valor,
        descripcion: 'Literal de caracter'
      });
    } else {
      this._error(
        'Literal de caracter mal formado: debe contener exactamente un caracter entre comillas simples.',
        linea, columna,
        { lexema, sugerencia: "Ejemplo valido: 'A'" }
      );
      this._emitir(TiposToken.ERROR, lexema, linea, columna, {
        estadoFinal: 'qE',
        descripcion: 'Caracter mal formado'
      });
    }
  }

  /** q12 -> q15 (linea) o q16 -> q17 (bloque). */
  _leerComentario (linea, columna) {
    let lexema = '';
    lexema += this._avanzar();

    if (this._ver() === '/') {
      lexema += this._avanzar();
      while (this.pos < this.fuente.length && this._ver() !== '\n') {
        lexema += this._avanzar();
      }
      this._emitir(TiposToken.COMENTARIO, lexema, linea, columna, {
        estadoFinal: 'q15',
        descripcion: 'Comentario de una linea (se ignora)',
        ignorado: true
      });
      return;
    }

    // Comentario de bloque
    lexema += this._avanzar();
    let cerrado = false;
    while (this.pos < this.fuente.length) {
      if (this._ver() === '*' && this._ver(1) === '/') {
        lexema += this._avanzar();
        lexema += this._avanzar();
        cerrado = true;
        break;
      }
      lexema += this._avanzar();
    }

    if (!cerrado) {
      this._error(
        'Comentario de bloque sin cerrar.',
        linea, columna,
        { lexema: '/*', sugerencia: 'Agrega */ para cerrar el comentario.' }
      );
    }

    this._emitir(TiposToken.COMENTARIO, lexema, linea, columna, {
      estadoFinal: cerrado ? 'q17' : 'qE',
      descripcion: 'Comentario de bloque (se ignora)',
      ignorado: true
    });
  }

  /** Traduce una secuencia de escape a su caracter real. */
  _interpretarEscape (c) {
    const tabla = { n: '\n', t: '\t', r: '\r', '\\': '\\', '"': '"', "'": "'", 0: '\0' };
    return Object.prototype.hasOwnProperty.call(tabla, c) ? tabla[c] : c;
  }

  // ------------------------------------------------------------------
  // Resumen
  // ------------------------------------------------------------------

  _estadisticas () {
    return {
      totalTokens: this.tokens.length - 1, // sin el centinela de fin de archivo
      totalComentarios: this.todosLosTokens.filter((t) => t.ignorado).length,
      totalErrores: this.errores.length,
      totalLineas: this.fuente.length === 0 ? 0 : this.fuente.split('\n').length,
      totalCaracteres: this.fuente.length
    };
  }
}

/** Atajo funcional. */
function analizarLexico (fuente) {
  return new AnalizadorLexico(fuente).analizar();
}

module.exports = { AnalizadorLexico, analizarLexico };

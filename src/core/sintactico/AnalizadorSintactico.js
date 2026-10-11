/**
 * AnalizadorSintactico.js
 * FASE 2 del compilador SwordByte.
 *
 * Analizador descendente recursivo (LL, un token de anticipacion) que:
 *   1. Verifica que la secuencia de tokens respete la gramatica de Gramatica.js.
 *   2. Construye el Arbol de Sintaxis Abstracta (AST).
 *
 * Recuperacion de errores: modo panico. Al fallar una instruccion se reporta el
 * error, se descartan tokens hasta el siguiente ';' o '}' y el analisis sigue,
 * de modo que un programa con varios errores los muestra todos de una vez.
 */

const { TiposToken } = require('../comun/TiposToken');
const { ErrorCompilacion, ErrorSintacticoFatal, FASES } = require('../comun/ErrorCompilacion');
const { nodo, aArbolCompacto, medirArbol } = require('./NodosAST');
const { FIGURAS } = require('../lexico/PalabrasReservadas');

/** Palabras que pueden iniciar una instruccion (para la recuperacion). */
const INICIO_INSTRUCCION = [
  'Constante', 'Arreglo', 'matriz', 'imprimir', 'imprimirLn', 'imprimirF',
  'leer', 'si', 'para', 'mientras', 'hacer', 'opcion', 'intentar', 'retornar',
  'romper', 'equipo', 'limpiar', 'esperar'
];

/** Funciones nativas con su cantidad de argumentos [min, max]. */
const NATIVAS = {
  longitud: [1, 1],
  aleatorio: [2, 2],
  potencia: [2, 2],
  raiz: [1, 2],
  raizCuadrada: [1, 1],
  raizCubica: [1, 1],
  redondear: [1, 1],
  logaritmo: [1, 2],
  logaritmo10: [1, 1],
  seno: [1, 1],
  coseno: [1, 1]
};

class AnalizadorSintactico {
  /**
   * @param {Token[]} tokens Lista de tokens del analizador lexico (sin comentarios).
   */
  constructor (tokens) {
    this.tokens = tokens || [];
    this.i = 0;
    this.errores = [];
    this._guardas = 0;
  }

  // ==================================================================
  // Utilidades sobre el flujo de tokens
  // ==================================================================

  get actual () {
    return this.tokens[this.i] || this.tokens[this.tokens.length - 1];
  }

  ver (k = 0) {
    return this.tokens[this.i + k] || this.tokens[this.tokens.length - 1];
  }

  get finalizado () {
    return this.actual.tipo === TiposToken.FIN_ARCHIVO;
  }

  /** true si el token actual tiene ese lexema exacto. */
  es (lexema) {
    return this.actual.lexema === lexema;
  }

  /** true si el token actual es de ese tipo. */
  esTipo (tipo) {
    return this.actual.tipo === tipo;
  }

  /** Si el token actual coincide con el lexema, lo consume y devuelve true. */
  aceptar (lexema) {
    if (this.es(lexema)) {
      this.consumir();
      return true;
    }
    return false;
  }

  /** Consume el token actual y devuelve el que estaba. */
  consumir () {
    const t = this.actual;
    if (!this.finalizado) this.i++;
    return t;
  }

  /**
   * Exige un lexema concreto. Si no aparece, lanza un error sintactico.
   * @param {string} lexema  Terminal esperado.
   * @param {string} contexto Descripcion de donde se esperaba.
   */
  exigir (lexema, contexto) {
    if (this.es(lexema)) return this.consumir();
    this.fallar(`Falta '${lexema}' ${contexto}.`, lexema);
  }

  /** Exige un token de cierto tipo (IDENTIFICADOR, LIT_ENTERO...). */
  exigirTipo (tipo, descripcion, contexto) {
    if (this.esTipo(tipo)) return this.consumir();
    this.fallar(`Se esperaba ${descripcion} ${contexto}.`, descripcion);
  }

  // ==================================================================
  // Errores
  // ==================================================================

  /** Crea el error, lo guarda y lanza la excepcion de recuperacion. */
  fallar (mensaje, esperado) {
    const t = this.actual;
    const encontrado = t.tipo === TiposToken.FIN_ARCHIVO
      ? 'el final del archivo'
      : `'${t.lexema}'`;

    const err = new ErrorCompilacion(
      FASES.SINTACTICA,
      mensaje,
      t.linea,
      t.columna,
      {
        lexema: t.lexema,
        esperado,
        encontrado,
        sugerencia: this._sugerir(esperado, t)
      }
    );
    this.errores.push(err);
    throw new ErrorSintacticoFatal(err);
  }

  _sugerir (esperado, token) {
    if (esperado === ';') return 'Toda instruccion termina con punto y coma.';
    if (esperado === '}') return 'Revisa que cada { tenga su } correspondiente.';
    if (esperado === ')') return 'Revisa que cada ( tenga su ) correspondiente.';
    if (esperado === 'un identificador' && token.tipo === TiposToken.PALABRA_RESERVADA) {
      return `'${token.lexema}' es una palabra reservada y no puede usarse como nombre.`;
    }
    return null;
  }

  /** Modo panico: descarta tokens hasta un punto seguro para continuar. */
  sincronizar () {
    const inicio = this.i;
    while (!this.finalizado) {
      if (this.actual.lexema === ';') {
        this.i++;
        return;
      }
      if (this.actual.lexema === '}') return;
      if (INICIO_INSTRUCCION.indexOf(this.actual.lexema) !== -1 && this.i > inicio) return;
      if (this.actual.tipo === TiposToken.TIPO_DATO && this.i > inicio) return;
      this.i++;
    }
  }

  // ==================================================================
  // Punto de entrada
  // ==================================================================

  /**
   * Analiza un programa completo: clase nombre { ... }
   * @returns {{ast:object, modo:string, errores:Array, estadisticas:object}}
   */
  analizar () {
    let ast = null;
    try {
      ast = this.programa();
    } catch (e) {
      if (!(e instanceof ErrorSintacticoFatal)) throw e;
      ast = ast || nodo('Programa', this.tokens[0], { nombre: '?', funciones: [], principal: null });
    }

    // Sobra codigo despues de la llave final de la clase
    if (!this.finalizado && this.errores.length === 0) {
      const t = this.actual;
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        `Hay codigo despues del final de la clase: '${t.lexema}'.`,
        t.linea, t.columna,
        { lexema: t.lexema, sugerencia: 'Todo el programa debe estar dentro de clase nombre { }.' }
      ));
    }

    return this._resultado(ast, 'programa');
  }

  /**
   * Analiza una o varias proposiciones sueltas, sin punto y coma:
   *
   *   a > b
   *   a = b + c
   *   a && b || c + f > d
   *
   * Cada renglon es una proposicion. Si hay una sola, ella es la raiz del
   * arbol; si hay varias, cuelgan de un nodo "proposiciones".
   *
   * Una expresion puede seguir en el renglon de abajo si todavia no termina
   * (a = b +  y abajo  c), pero dos expresiones completas en el MISMO renglon
   * son un error:  a = b c  ->  "Sobra 'c'".
   */
  analizarExpresion () {
    const proposiciones = [];
    try {
      proposiciones.push(this.expresion());

      while (!this.finalizado) {
        const anterior = this.tokens[this.i - 1];
        if (this.actual.linea === anterior.linea) {
          this.fallar(
            `Sobra '${this.actual.lexema}' al final de la expresion.`,
            'el final de la expresion'
          );
        }
        proposiciones.push(this.expresion());
      }
    } catch (e) {
      if (!(e instanceof ErrorSintacticoFatal)) throw e;
    }

    let ast = proposiciones[0] || null;
    if (proposiciones.length > 1) {
      ast = nodo('Proposiciones', proposiciones[0], { proposiciones });
    }
    return this._resultado(ast, 'expresion');
  }

  /**
   * Analiza una o varias instrucciones sueltas, sin la clase que las envuelve.
   * Por ejemplo:  entero a = 5;  o  si (a > b) { imprimirLn("mayor"); }
   */
  analizarInstrucciones () {
    let ast = null;
    try {
      ast = this.bloqueInstrucciones();
      if (!this.finalizado) {
        this.fallar(
          `'${this.actual.lexema}' no puede iniciar una instruccion.`,
          'una instruccion'
        );
      }
    } catch (e) {
      if (!(e instanceof ErrorSintacticoFatal)) throw e;
    }

    // Una sola instruccion se muestra como raiz, sin el bloque que la envuelve.
    if (ast && ast.tipo === 'Bloque' && ast.instrucciones.length === 1) {
      ast = ast.instrucciones[0];
    }
    return this._resultado(ast, 'instrucciones');
  }

  /** Arma la respuesta comun de los tres modos de analisis. */
  _resultado (ast, modo) {
    const medida = medirArbol(ast ? aArbolCompacto(ast) : null);

    return {
      ast,
      modo,
      errores: this.errores,
      estadisticas: {
        nodos: medida.nodos,
        profundidad: medida.profundidad,
        totalErrores: this.errores.length,
        funciones: ast && ast.funciones ? ast.funciones.length : 0
      }
    };
  }

  // ==================================================================
  // Estructura del programa
  // ==================================================================

  /** <programa> ::= "clase" IDENT "{" <miembros> "}" */
  programa () {
    const inicio = this.actual;
    this.exigir('clase', 'al inicio del programa');
    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de la clase', 'despues de "clase"');
    this.exigir('{', 'para abrir el cuerpo de la clase');

    const miembros = this.miembros();

    this.exigir('}', 'para cerrar la clase');

    return nodo('Programa', inicio, {
      nombre: nombre.lexema,
      funciones: miembros.funciones,
      principal: miembros.principal
    });
  }

  /** <miembros> ::= { <funcion> } <clasePrincipal> { <funcion> } */
  miembros () {
    const funciones = [];
    let principal = null;

    while (!this.finalizado && !this.es('}')) {
      if (this.es('funcion')) {
        try {
          funciones.push(this.funcion());
        } catch (e) {
          if (!(e instanceof ErrorSintacticoFatal)) throw e;
          this.sincronizarBloque();
        }
      } else if (this.es('clasePrincipal')) {
        if (principal) {
          const t = this.actual;
          this.errores.push(new ErrorCompilacion(
            FASES.SINTACTICA,
            'La clase solo puede tener un bloque clasePrincipal.',
            t.linea, t.columna, { lexema: t.lexema }
          ));
        }
        try {
          const p = this.clasePrincipal();
          if (!principal) principal = p;
        } catch (e) {
          if (!(e instanceof ErrorSintacticoFatal)) throw e;
          this.sincronizarBloque();
        }
      } else {
        const t = this.actual;
        this.errores.push(new ErrorCompilacion(
          FASES.SINTACTICA,
          `Dentro de la clase solo se permiten "funcion" y "clasePrincipal". Se encontro '${t.lexema}'.`,
          t.linea, t.columna,
          { lexema: t.lexema, esperado: 'funcion o clasePrincipal' }
        ));
        this.sincronizarBloque();
      }
    }

    if (!principal && this.errores.length === 0) {
      const t = this.actual;
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        'Falta el bloque clasePrincipal: todo programa debe tener un punto de entrada.',
        t.linea, t.columna,
        { esperado: 'clasePrincipal', sugerencia: 'Agrega clasePrincipal { ... } dentro de la clase.' }
      ));
    }

    return { funciones, principal };
  }

  /** Salta hasta cerrar el bloque actual, para seguir con el siguiente miembro. */
  sincronizarBloque () {
    let nivel = 0;
    while (!this.finalizado) {
      if (this.actual.lexema === '{') nivel++;
      else if (this.actual.lexema === '}') {
        if (nivel === 0) return;
        nivel--;
        this.i++;
        if (nivel === 0) return;
        continue;
      } else if (nivel === 0 && (this.es('funcion') || this.es('clasePrincipal'))) {
        return;
      }
      this.i++;
    }
  }

  /** <clasePrincipal> ::= "clasePrincipal" "{" <instrucciones> "}" */
  clasePrincipal () {
    const inicio = this.actual;
    this.exigir('clasePrincipal', 'para declarar el bloque principal');
    this.exigir('{', 'para abrir clasePrincipal');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar clasePrincipal');
    return nodo('ClasePrincipal', inicio, { cuerpo });
  }

  /** <funcion> ::= "funcion" <tipoRetorno> IDENT "(" [params] ")" "{" ... "}" */
  funcion () {
    const inicio = this.actual;
    this.exigir('funcion', 'para declarar una funcion');

    let tipoRetorno;
    if (this.es('vacio') || this.esTipo(TiposToken.TIPO_DATO)) {
      tipoRetorno = this.consumir().lexema;
    } else {
      this.fallar('Falta el tipo de retorno de la funcion.', 'un tipo o "vacio"');
    }

    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de la funcion', 'despues del tipo de retorno');
    this.exigir('(', 'para abrir la lista de parametros');

    const parametros = [];
    if (!this.es(')')) {
      do {
        parametros.push(this.parametro());
      } while (this.aceptar(','));
    }
    this.exigir(')', 'para cerrar la lista de parametros');
    this.exigir('{', 'para abrir el cuerpo de la funcion');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el cuerpo de la funcion');

    return nodo('Funcion', inicio, {
      nombre: nombre.lexema,
      tipoRetorno,
      parametros,
      cuerpo
    });
  }

  /** <parametros> ::= <tipo> IDENT { "," <tipo> IDENT } */
  parametro () {
    const inicio = this.actual;
    const tipoDato = this.exigirTipo(TiposToken.TIPO_DATO, 'el tipo del parametro', 'en la lista de parametros').lexema;
    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre del parametro', 'despues del tipo');
    return nodo('Parametro', inicio, { tipoDato, nombre: nombre.lexema });
  }

  // ==================================================================
  // Instrucciones
  // ==================================================================

  /** Lee instrucciones hasta encontrar '}' o el fin del archivo. */
  bloqueInstrucciones () {
    const inicio = this.actual;
    const instrucciones = [];
    while (!this.finalizado && !this.es('}') && !this.es('caso') && !this.es('porDefecto')) {
      const antes = this.i;
      try {
        const ins = this.instruccion();
        if (ins) instrucciones.push(ins);
      } catch (e) {
        if (!(e instanceof ErrorSintacticoFatal)) throw e;
        this.sincronizar();
      }
      // Red de seguridad: si no se consumio nada, evitar ciclo infinito
      if (this.i === antes) {
        this.i++;
        if (++this._guardas > 500) break;
      }
    }
    return nodo('Bloque', inicio, { instrucciones });
  }

  /** <instruccion> ::= ... (despacho por el token actual) */
  instruccion () {
    const t = this.actual;

    if (t.tipo === TiposToken.TIPO_DATO && t.lexema !== 'vacio') return this.declaracion();

    switch (t.lexema) {
      case 'Constante': return this.constante();
      case 'Arreglo': return this.arregloOMatriz('Arreglo');
      case 'matriz': return this.arregloOMatriz('matriz');
      case 'imprimir':
      case 'imprimirLn':
      case 'imprimirF': return this.impresion();
      case 'leer': return this.leer();
      case 'equipo': return this.equipo();
      case 'limpiar': return this.limpiar();
      case 'esperar': return this.esperar();
      case 'si': return this.si();
      case 'para': return this.para();
      case 'mientras': return this.mientras();
      case 'hacer': return this.hacerMientras();
      case 'opcion': return this.opcion();
      case 'intentar': return this.intentar();
      case 'retornar': return this.retornar();
      case 'romper': return this.romper();
      case 'funcion':
        this.fallar('Las funciones se declaran dentro de la clase, no dentro de un bloque de instrucciones.', 'una instruccion');
        break;
      default: break;
    }

    // a = b + c;   sumar(1, 2);   i++;   a && b || c;
    if (this.puedeIniciarExpresion(t)) return this.proposicion();

    this.fallar(`'${t.lexema}' no puede iniciar una instruccion.`, 'una instruccion');
  }

  /**
   * true si el token puede ser el primero de una expresion: un nombre, un
   * valor, un parentesis, un operador que va antes (- + √ NO NOT !) o una
   * funcion nativa (raiz, potencia, area...).
   */
  puedeIniciarExpresion (t) {
    if (t.tipo === TiposToken.IDENTIFICADOR) return true;
    if (t.tipo === TiposToken.LIT_ENTERO || t.tipo === TiposToken.LIT_DECIMAL ||
        t.tipo === TiposToken.LIT_CADENA || t.tipo === TiposToken.LIT_CARACTER ||
        t.tipo === TiposToken.LIT_LOGICO) return true;
    if (['(', '-', '+', '√', 'NO', 'NOT', '!'].indexOf(t.lexema) !== -1) return true;
    if (Object.prototype.hasOwnProperty.call(NATIVAS, t.lexema)) return true;
    return ['convertir', 'perimetro', 'area', 'volumen'].indexOf(t.lexema) !== -1;
  }

  /** <declaracion> ::= <tipo> <declarador> { "," <declarador> } ";" */
  declaracion () {
    const inicio = this.actual;
    const tipoDato = this.consumir().lexema;
    const declaradores = [];
    do {
      declaradores.push(this.declarador());
    } while (this.aceptar(','));
    this.exigir(';', 'al final de la declaracion');
    return nodo('Declaracion', inicio, { tipoDato, declaradores });
  }

  /** <declarador> ::= IDENT [ "=" <expresion> ] */
  declarador () {
    const inicio = this.actual;
    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de la variable', 'en la declaracion');
    let valor = null;
    if (this.aceptar('=')) valor = this.expresion();
    return nodo('Declarador', inicio, { nombre: nombre.lexema, valor });
  }

  /** <constante> ::= "Constante" <tipo> IDENT "=" <expresion> ";" */
  constante () {
    const inicio = this.actual;
    this.exigir('Constante', 'para declarar una constante');
    const tipoDato = this.exigirTipo(TiposToken.TIPO_DATO, 'el tipo de la constante', 'despues de "Constante"').lexema;
    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de la constante', 'despues del tipo');
    this.exigir('=', 'porque una constante debe inicializarse');
    const valor = this.expresion();
    this.exigir(';', 'al final de la constante');
    return nodo('Constante', inicio, { tipoDato, nombre: nombre.lexema, valor });
  }

  /**
   * <arreglo> ::= "Arreglo" <tipo> IDENT "[" [e] "]" [ "[" [e] "]" ] [ "=" <inicializador> ] ";"
   * <matriz>  ::= "matriz"  <tipo> IDENT "[" [e] "]" "[" [e] "]" [ "=" <inicializador> ] ";"
   */
  arregloOMatriz (palabra) {
    const inicio = this.actual;
    this.exigir(palabra, 'para declarar una estructura');
    const tipoDato = this.exigirTipo(
      TiposToken.TIPO_DATO, 'el tipo de los elementos', `despues de "${palabra}"`).lexema;
    const nombre = this.exigirTipo(
      TiposToken.IDENTIFICADOR, 'el nombre de la estructura', 'despues del tipo');

    const dimensiones = [];
    this.exigir('[', 'para indicar el tamano de la estructura');
    dimensiones.push(this.es(']') ? null : this.expresion());
    this.exigir(']', 'para cerrar el tamano');

    if (palabra === 'matriz') {
      this.exigir('[', 'porque una matriz necesita dos dimensiones');
      dimensiones.push(this.es(']') ? null : this.expresion());
      this.exigir(']', 'para cerrar la segunda dimension');
    } else if (this.es('[')) {
      this.consumir();
      dimensiones.push(this.es(']') ? null : this.expresion());
      this.exigir(']', 'para cerrar la segunda dimension');
    }

    let valores = null;
    if (this.aceptar('=')) valores = this.inicializador();
    this.exigir(';', 'al final de la declaracion');

    return nodo(palabra === 'matriz' ? 'Matriz' : 'Arreglo', inicio, {
      tipoDato,
      nombre: nombre.lexema,
      dimensiones: dimensiones.filter((d) => d !== null),
      numDimensiones: dimensiones.length,
      valores
    });
  }

  /** <inicializador> ::= "{" [ <valorInicial> { "," <valorInicial> } ] "}" */
  inicializador () {
    const inicio = this.actual;
    this.exigir('{', 'para abrir la lista de valores');
    const elementos = [];
    if (!this.es('}')) {
      do {
        elementos.push(this.es('{') ? this.inicializador() : this.expresion());
      } while (this.aceptar(','));
    }
    this.exigir('}', 'para cerrar la lista de valores');
    return nodo('Inicializador', inicio, { elementos });
  }

  /**
   * <proposicion> ::= <expresion> ";"
   *
   * Una instruccion que empieza como expresion (con un nombre, un valor, un
   * parentesis...) se lee completa y se clasifica por lo que resulto:
   *
   *   a = b + c;          -> Asignacion
   *   i++;                -> IncrementoStmt
   *   sumar(5, 3);        -> ExpresionInstruccion (una llamada)
   *   a && b || c > d;    -> ExpresionInstruccion (una proposicion simple)
   */
  proposicion () {
    const inicio = this.actual;
    const expresion = this.expresion();

    // "a b;" : despues de una variable sola lo que mas seguido falta es el "=".
    const esVariable = expresion.tipo === 'Variable' || expresion.tipo === 'Indexacion';
    if (esVariable && !this.es(';')) {
      this.exigir('=', 'para asignar un valor a la variable');
    }

    // a = b + c;
    if (expresion.tipo === 'Asignacion') {
      this.exigir(';', 'al final de la asignacion');
      return nodo('Asignacion', inicio,
        { operador: '=', destino: expresion.destino, valor: expresion.valor });
    }

    // i++;   tabla[1]--;
    const operando = expresion.operando;
    if (expresion.tipo === 'Postfija' &&
        (operando.tipo === 'Variable' || operando.tipo === 'Indexacion')) {
      this.exigir(';', 'al final de la instruccion');
      return nodo('IncrementoStmt', inicio, { operador: expresion.operador, destino: operando });
    }

    // sumar(5, 3);   a && b || c > d;
    this.exigir(';', expresion.tipo === 'Llamada'
      ? 'al final de la llamada'
      : 'al final de la instruccion');
    return nodo('ExpresionInstruccion', inicio, { expresion });
  }

  /** <destino> ::= IDENT [ "[" e "]" [ "[" e "]" ] ] */
  destino () {
    const inicio = this.actual;
    const nombre = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de una variable', 'en esta posicion');
    const indices = [];
    while (this.es('[')) {
      this.consumir();
      indices.push(this.expresion());
      this.exigir(']', 'para cerrar el indice');
      if (indices.length > 2) break;
    }
    if (indices.length === 0) return nodo('Variable', inicio, { nombre: nombre.lexema });
    return nodo('Indexacion', inicio, { nombre: nombre.lexema, indices });
  }

  // ------------------------------------------------------------------
  // Entrada y salida
  // ------------------------------------------------------------------

  /** <impresion> */
  impresion () {
    const inicio = this.actual;
    const funcion = this.consumir().lexema;
    this.exigir('(', `para abrir los parametros de ${funcion}`);
    const argumentos = [];
    if (!this.es(')')) {
      do {
        argumentos.push(this.expresion());
      } while (this.aceptar(','));
    }
    this.exigir(')', `para cerrar los parametros de ${funcion}`);
    this.exigir(';', 'al final de la instruccion');

    if (funcion === 'imprimirF' && argumentos.length === 0) {
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        'imprimirF necesita al menos la cadena de formato.',
        inicio.linea, inicio.columna,
        { lexema: funcion, sugerencia: 'Ejemplo: imprimirF("Edad: %d", edad);' }
      ));
    }

    return nodo('Impresion', inicio, { funcion, argumentos });
  }

  /** <leer> ::= "leer" "(" <destino> ")" ";" */
  leer () {
    const inicio = this.actual;
    this.exigir('leer', 'para leer del teclado');
    this.exigir('(', 'para abrir el parametro de leer');
    const destino = this.destino();
    this.exigir(')', 'para cerrar el parametro de leer');
    this.exigir(';', 'al final de la instruccion');
    return nodo('Leer', inicio, { destino });
  }

  /** <equipo> ::= "equipo" "(" [ "Null" ] ")" ";" */
  equipo () {
    const inicio = this.actual;
    this.exigir('equipo', 'para mostrar los datos del equipo');
    this.exigir('(', 'para abrir los parametros');
    const conNull = this.aceptar('Null');
    this.exigir(')', 'para cerrar los parametros');
    this.exigir(';', 'al final de la instruccion');
    return nodo('Equipo', inicio, { conNull });
  }

  /** <limpiar> ::= "limpiar" "(" ")" ";" */
  limpiar () {
    const inicio = this.actual;
    this.exigir('limpiar', 'para limpiar la consola');
    this.exigir('(', 'para abrir los parametros');
    this.exigir(')', 'porque limpiar no recibe argumentos');
    this.exigir(';', 'al final de la instruccion');
    return nodo('Limpiar', inicio, {});
  }

  /** <esperar> ::= "esperar" "(" <expresion> ")" ";" */
  esperar () {
    const inicio = this.actual;
    this.exigir('esperar', 'para pausar el programa');
    this.exigir('(', 'para abrir el parametro');
    const milisegundos = this.expresion();
    this.exigir(')', 'para cerrar el parametro');
    this.exigir(';', 'al final de la instruccion');
    return nodo('Esperar', inicio, { milisegundos });
  }

  // ------------------------------------------------------------------
  // Control de flujo
  // ------------------------------------------------------------------

  /** <si> ::= "si" "(" e ")" "{" ... "}" { "sinoSi" ... } [ "sino" ... ] */
  si () {
    const inicio = this.actual;
    this.exigir('si', 'para iniciar la decision');
    this.exigir('(', 'para abrir la condicion');
    const condicion = this.expresion();
    this.exigir(')', 'para cerrar la condicion');
    this.exigir('{', 'para abrir el bloque verdadero');
    const entonces = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el bloque verdadero');

    const ramas = [];
    while (this.es('sinoSi')) ramas.push(this.ramaSinoSi());

    const sino = this.es('sino') ? this.bloqueSino() : null;

    return nodo('Si', inicio, { condicion, entonces, ramas, sino });
  }

  /** "sinoSi" "(" <expresion> ")" "{" <instrucciones> "}" */
  ramaSinoSi () {
    const inicio = this.actual;
    this.consumir();
    this.exigir('(', 'para abrir la condicion de sinoSi');
    const condicion = this.expresion();
    this.exigir(')', 'para cerrar la condicion de sinoSi');
    this.exigir('{', 'para abrir el bloque de sinoSi');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el bloque de sinoSi');
    return nodo('SinoSi', inicio, { condicion, cuerpo });
  }

  /** "sino" "{" <instrucciones> "}" */
  bloqueSino () {
    const inicio = this.actual;
    this.consumir();
    this.exigir('{', 'para abrir el bloque sino');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el bloque sino');
    return nodo('Sino', inicio, { cuerpo });
  }

  /** <para> ::= "para" "(" <inicioPara> ";" e ";" <actualizacion> ")" "{" ... "}" */
  para () {
    const inicio = this.actual;
    this.exigir('para', 'para iniciar el ciclo');
    this.exigir('(', 'para abrir los parametros del ciclo');

    const inicializacion = this.inicioPara();
    this.exigir(';', 'para separar la inicializacion de la condicion');
    const condicion = this.expresion();
    this.exigir(';', 'para separar la condicion de la actualizacion');
    const actualizacion = this.actualizacionPara();

    this.exigir(')', 'para cerrar los parametros del ciclo');
    this.exigir('{', 'para abrir el cuerpo del ciclo');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el cuerpo del ciclo');

    return nodo('Para', inicio, { inicializacion, condicion, actualizacion, cuerpo });
  }

  /** <inicioPara> ::= <tipo> IDENT "=" e  |  <destino> "=" e */
  inicioPara () {
    const inicio = this.actual;

    if (this.esTipo(TiposToken.TIPO_DATO)) {
      const tipoDato = this.consumir().lexema;
      const nombre = this.exigirTipo(
        TiposToken.IDENTIFICADOR, 'el nombre del contador', 'en el ciclo para');
      this.exigir('=', 'para dar el valor inicial al contador');
      const valor = this.expresion();
      return nodo('Declaracion', inicio, {
        tipoDato,
        declaradores: [nodo('Declarador', inicio, { nombre: nombre.lexema, valor })]
      });
    }

    const destino = this.destino();
    this.exigir('=', 'para dar el valor inicial al contador');
    const valor = this.expresion();
    return nodo('Asignacion', inicio, { operador: '=', destino, valor });
  }

  /** <actualizacion> ::= <destino> ( "++" | "--" )  |  <destino> "=" e */
  actualizacionPara () {
    const inicio = this.actual;
    const destino = this.destino();

    if (this.es('++') || this.es('--')) {
      const operador = this.consumir().lexema;
      return nodo('IncrementoStmt', inicio, { operador, destino });
    }

    this.exigir('=', 'para actualizar el contador');
    const valor = this.expresion();
    return nodo('Asignacion', inicio, { operador: '=', destino, valor });
  }

  /** <caso> ::= "caso" <expresion> ":" <instrucciones> */
  caso () {
    const inicio = this.actual;
    this.consumir();
    const valor = this.expresion();
    this.exigir(':', 'despues del valor del caso');
    const cuerpo = this.bloqueInstrucciones();
    return nodo('Caso', inicio, { valor, cuerpo });
  }

  /** <porDefecto> ::= "porDefecto" ":" <instrucciones> */
  porDefecto () {
    const inicio = this.actual;
    this.consumir();
    this.exigir(':', 'despues de porDefecto');
    const cuerpo = this.bloqueInstrucciones();
    return nodo('PorDefecto', inicio, { cuerpo });
  }

  /** <mientras> ::= "mientras" "(" e ")" "{" ... "}" */
  mientras () {
    const inicio = this.actual;
    this.exigir('mientras', 'para iniciar el ciclo');
    this.exigir('(', 'para abrir la condicion');
    const condicion = this.expresion();
    this.exigir(')', 'para cerrar la condicion');
    this.exigir('{', 'para abrir el cuerpo del ciclo');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el cuerpo del ciclo');
    return nodo('Mientras', inicio, { condicion, cuerpo });
  }

  /** <hacer> ::= "hacer" "{" ... "}" "mientras" "(" e ")" ";" */
  hacerMientras () {
    const inicio = this.actual;
    this.exigir('hacer', 'para iniciar el ciclo');
    this.exigir('{', 'para abrir el cuerpo del ciclo');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el cuerpo del ciclo');
    this.exigir('mientras', 'porque hacer siempre lleva su condicion al final');
    this.exigir('(', 'para abrir la condicion');
    const condicion = this.expresion();
    this.exigir(')', 'para cerrar la condicion');
    this.exigir(';', 'al final de hacer/mientras');
    return nodo('HacerMientras', inicio, { cuerpo, condicion });
  }

  /** <opcion> ::= "opcion" "(" e ")" "{" { <caso> } [ <porDefecto> ] "}" */
  opcion () {
    const inicio = this.actual;
    this.exigir('opcion', 'para iniciar la seleccion multiple');
    this.exigir('(', 'para abrir la expresion evaluada');
    const expresion = this.expresion();
    this.exigir(')', 'para cerrar la expresion evaluada');
    this.exigir('{', 'para abrir el cuerpo de opcion');

    const casos = [];
    let porDefecto = null;

    while (!this.finalizado && !this.es('}')) {
      if (this.es('caso')) {
        casos.push(this.caso());
      } else if (this.es('porDefecto')) {
        if (porDefecto) {
          const t = this.actual;
          this.errores.push(new ErrorCompilacion(
            FASES.SINTACTICA,
            'Solo puede haber un bloque porDefecto en cada opcion.',
            t.linea, t.columna, { lexema: t.lexema }
          ));
        }
        const pd = this.porDefecto();
        if (!porDefecto) porDefecto = pd;
      } else {
        this.fallar(
          `Dentro de opcion solo se permiten "caso" y "porDefecto". Se encontro '${this.actual.lexema}'.`,
          'caso o porDefecto'
        );
      }
    }

    this.exigir('}', 'para cerrar opcion');

    if (casos.length === 0) {
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        'La estructura opcion necesita al menos un caso.',
        inicio.linea, inicio.columna,
        { lexema: 'opcion', sugerencia: 'Agrega: caso valor: instrucciones; romper;' }
      ));
    }

    return nodo('Opcion', inicio, { expresion, casos, porDefecto });
  }

  /** <intentar> ::= "intentar" "{" ... "}" "capturar" "(" "Error" IDENT ")" "{" ... "}" */
  intentar () {
    const inicio = this.actual;
    this.exigir('intentar', 'para abrir el bloque protegido');
    this.exigir('{', 'para abrir el bloque intentar');
    const cuerpo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el bloque intentar');
    this.exigir('capturar', 'porque intentar siempre necesita su capturar');
    this.exigir('(', 'para abrir el parametro del error');
    this.exigir('Error', 'como tipo del error capturado');
    const variable = this.exigirTipo(TiposToken.IDENTIFICADOR, 'el nombre de la variable de error', 'despues de "Error"');
    this.exigir(')', 'para cerrar el parametro del error');
    this.exigir('{', 'para abrir el bloque capturar');
    const manejo = this.bloqueInstrucciones();
    this.exigir('}', 'para cerrar el bloque capturar');
    return nodo('Intentar', inicio, { cuerpo, variableError: variable.lexema, manejo });
  }

  /** <retornar> ::= "retornar" [ e ] ";" */
  retornar () {
    const inicio = this.actual;
    this.exigir('retornar', 'para devolver el control');
    let valor = null;
    if (!this.es(';')) valor = this.expresion();
    this.exigir(';', 'al final de retornar');
    return nodo('Retornar', inicio, { valor });
  }

  /** <romper> ::= "romper" ";" */
  romper () {
    const inicio = this.actual;
    this.exigir('romper', 'para salir de la estructura');
    this.exigir(';', 'al final de romper');
    return nodo('Romper', inicio, {});
  }

  // ==================================================================
  // Expresiones
  // ==================================================================

  /**
   * JERARQUIA DE OPERADORES
   *
   * El nivel que se aplica al final es el que queda ARRIBA del arbol, asi que
   * la cadena de llamadas va del grupo mas alto al mas bajo:
   *
   *   1. BOOLEANOS    O / OR / ||        <- hasta arriba del arbol
   *                   Y / AND / &&
   *                   NO / NOT / !       (unario)
   *   2. RELACIONALES == !=
   *                   < <= > >=
   *   3. ARITMETICOS  =                  (asocia a la derecha)
   *                   + -
   *                   * / %
   *                   - + unarios
   *                   ++ --
   *                   ( ) [ ] { }, identificadores y numeros  <- hasta abajo
   *
   * Los parentesis reinician la cadena completa: dentro de "( )" puede ir
   * cualquier expresion, asi que sirven para forzar otro orden.
   */
  expresion () {
    return this.expresionO();
  }

  /** <expresionO> ::= <expresionY> { ( "O" | "OR" | "||" ) <expresionY> } */
  expresionO () {
    let izq = this.expresionY();
    while (this.es('O') || this.es('OR') || this.es('||')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.expresionY();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /** <expresionY> ::= <negacion> { ( "Y" | "AND" | "&&" ) <negacion> } */
  expresionY () {
    let izq = this.negacion();
    while (this.es('Y') || this.es('AND') || this.es('&&')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.negacion();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /**
   * <negacion> ::= ( "NO" | "NOT" | "!" ) <negacion> | <igualdad>
   *
   * La negacion es un operador booleano, asi que vive en el grupo de arriba:
   * "NO a > b" niega toda la comparacion, y "NO a Y b" niega solo la "a"
   * porque el NO se aplica antes que el Y.
   */
  negacion () {
    if (this.es('NO') || this.es('NOT') || this.es('!')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const operando = this.negacion();
      return nodo('Unaria', inicio, { operador: op, operando });
    }
    return this.igualdad();
  }

  /** <igualdad> ::= <relacional> { ("=="|"!=") <relacional> } */
  igualdad () {
    let izq = this.relacional();
    while (this.es('==') || this.es('!=')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.relacional();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /** <relacional> ::= <asignacion> { ("<"|">"|"<="|">=") <asignacion> } */
  relacional () {
    let izq = this.asignacion();
    while (this.es('<') || this.es('>') || this.es('<=') || this.es('>=')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.asignacion();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /**
   * <asignacion> ::= <aditiva> [ "=" <asignacion> ]
   *
   * La asignacion pertenece al grupo aritmetico, asi que queda por DEBAJO de
   * los relacionales y de los booleanos. Asocia a la derecha: "a = b = 5" es
   * "a = (b = 5)".
   *
   * Tratarla como expresion permite analizar un fragmento como
   *   a = b + c > 9 AND d > e
   * sin escribir el punto y coma final.
   */
  asignacion () {
    const izq = this.aditiva();

    if (!this.es('=')) return izq;

    const inicio = this.actual;
    this.consumir();
    const valor = this.asignacion();

    // Solo se puede asignar a una variable o a una posición de un arreglo.
    if (izq.tipo !== 'Variable' && izq.tipo !== 'Indexacion') {
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        'A la izquierda de "=" debe ir una variable.',
        izq.linea, izq.columna,
        {
          esperado: 'una variable',
          sugerencia: 'Ejemplo válido: total = a + b'
        }
      ));
    }

    return nodo('Asignacion', inicio, { operador: '=', destino: izq, valor });
  }

  /** <aditiva> ::= <multiplicativa> { ("+"|"-") <multiplicativa> } */
  aditiva () {
    let izq = this.multiplicativa();
    while (this.es('+') || this.es('-')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.multiplicativa();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /** <multiplicativa> ::= <unaria> { ("*"|"/"|"%") <unaria> } */
  multiplicativa () {
    let izq = this.unaria();
    while (this.es('*') || this.es('/') || this.es('%')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const der = this.unaria();
      izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
    }
    return izq;
  }

  /**
   * <unaria> ::= ( "-" | "+" | "√" ) <unaria> | <potencia>
   *
   * Operadores de un solo operando, escritos antes del valor. La negacion
   * logica NO esta aqui: vive en <negacion>, con los booleanos.
   */
  unaria () {
    if (this.es('-') || this.es('+') || this.es('√')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const operando = this.unaria();
      return nodo('Unaria', inicio, { operador: op, operando });
    }
    return this.potencia();
  }

  /**
   * <potencia> ::= <postfija> [ ( "^" | "**" ) <unaria> ]
   *
   * La potencia queda debajo de la multiplicacion, o sea que se resuelve
   * primero:  2 * 3 ^ 2   es   2 * (3 ^ 2) = 18.
   *
   * Dos detalles que la hacen portarse como en matematicas:
   *
   *   - Se agrupa de derecha a izquierda, por eso el lado derecho vuelve a
   *     empezar desde <unaria>:   2 ^ 3 ^ 2   es   2 ^ (3 ^ 2) = 512.
   *   - El lado izquierdo empieza en <postfija>, sin el menos unario, para
   *     que  -2 ^ 2  sea  -(2 ^ 2) = -4  y no  (-2) ^ 2 = 4.
   *     Ese mismo rodeo deja escribir el exponente negativo:  2 ^ -3.
   */
  potencia () {
    const base = this.postfija();
    if (this.es('^') || this.es('**')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      const exponente = this.unaria();
      return nodo('Binaria', inicio, { operador: op, izquierda: base, derecha: exponente });
    }
    return base;
  }

  /** <postfija> ::= <primaria> [ "++" | "--" ] */
  postfija () {
    const base = this.primaria();
    if (this.es('++') || this.es('--')) {
      const inicio = this.actual;
      const op = this.consumir().lexema;
      return nodo('Postfija', inicio, { operador: op, operando: base });
    }
    return base;
  }

  /** <primaria> ::= <literal> | "(" e ")" | <llamada> | <destino> */
  primaria () {
    const t = this.actual;

    // Literales
    if (t.tipo === TiposToken.LIT_ENTERO || t.tipo === TiposToken.LIT_DECIMAL ||
        t.tipo === TiposToken.LIT_CADENA || t.tipo === TiposToken.LIT_CARACTER ||
        t.tipo === TiposToken.LIT_LOGICO) {
      this.consumir();
      return nodo('Literal', t, { tipoDato: t.tipo, valor: t.valor, lexema: t.lexema });
    }

    // Expresion entre parentesis. Los parentesis no son un nodo del arbol,
    // pero se anota que estaban: la gramatica generada (pestaña 3) los
    // necesita para escribir  exp -> ( exp ).
    if (this.es('(')) {
      this.consumir();
      const e = this.expresion();
      this.exigir(')', 'para cerrar la expresion entre parentesis');
      e.parentesis = true;
      return e;
    }

    // Funciones nativas
    if (Object.prototype.hasOwnProperty.call(NATIVAS, t.lexema)) return this.nativa();
    if (t.lexema === 'convertir') return this.convertir();
    if (t.lexema === 'perimetro' || t.lexema === 'area' || t.lexema === 'volumen') return this.geometrica();

    // Llamada a funcion del usuario o variable
    if (t.tipo === TiposToken.IDENTIFICADOR) {
      if (this.ver(1).lexema === '(') return this.llamadaUsuario();
      return this.destino();
    }

    this.fallar(`Se esperaba un valor, una variable o una expresion. Se encontro '${t.lexema}'.`, 'una expresion');
  }

  /** IDENT "(" [ argumentos ] ")" */
  llamadaUsuario () {
    const inicio = this.actual;
    const nombre = this.consumir().lexema;
    this.exigir('(', 'para abrir los argumentos de la llamada');
    const argumentos = [];
    if (!this.es(')')) {
      do {
        argumentos.push(this.expresion());
      } while (this.aceptar(','));
    }
    this.exigir(')', 'para cerrar los argumentos de la llamada');
    return nodo('Llamada', inicio, { nombre, argumentos });
  }

  /** Funciones nativas con aridad fija. */
  nativa () {
    const inicio = this.actual;
    const nombre = this.consumir().lexema;
    const [min, max] = NATIVAS[nombre];
    this.exigir('(', `para abrir los parametros de ${nombre}`);
    const argumentos = [];
    if (!this.es(')')) {
      do {
        argumentos.push(this.expresion());
      } while (this.aceptar(','));
    }
    this.exigir(')', `para cerrar los parametros de ${nombre}`);

    if (argumentos.length < min || argumentos.length > max) {
      const cuantos = min === max ? `${min}` : `entre ${min} y ${max}`;
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        `${nombre} espera ${cuantos} argumento(s) y recibio ${argumentos.length}.`,
        inicio.linea, inicio.columna,
        { lexema: nombre, esperado: `${cuantos} argumento(s)` }
      ));
    }

    return nodo('Nativa', inicio, { nombre, argumentos });
  }

  /** "convertir" "(" e "," <tipo> ")" */
  convertir () {
    const inicio = this.actual;
    this.exigir('convertir', 'para convertir un valor');
    this.exigir('(', 'para abrir los parametros de convertir');
    const valor = this.expresion();
    this.exigir(',', 'para separar el valor del tipo destino');
    const tipoDestino = this.exigirTipo(TiposToken.TIPO_DATO, 'el tipo destino', 'en convertir').lexema;
    this.exigir(')', 'para cerrar los parametros de convertir');
    return nodo('Convertir', inicio, { valor, tipoDestino });
  }

  /** ("perimetro"|"area"|"volumen") "." <figura> "(" [args] ")" */
  geometrica () {
    const inicio = this.actual;
    const familia = this.consumir().lexema;
    this.exigir('.', `para indicar la figura despues de ${familia}`);

    const tokenFigura = this.actual;
    if (tokenFigura.tipo !== TiposToken.IDENTIFICADOR &&
        tokenFigura.tipo !== TiposToken.PALABRA_RESERVADA) {
      this.fallar(`Se esperaba el nombre de una figura despues de '${familia}.'.`, 'una figura');
    }
    const figura = this.consumir().lexema;

    const validas = FIGURAS[familia] || {};
    if (!Object.prototype.hasOwnProperty.call(validas, figura)) {
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        `'${figura}' no es una figura valida para ${familia}.`,
        tokenFigura.linea, tokenFigura.columna,
        {
          lexema: figura,
          esperado: Object.keys(validas).join(', '),
          sugerencia: `Figuras validas: ${Object.keys(validas).join(', ')}.`
        }
      ));
    }

    this.exigir('(', 'para abrir los parametros de la figura');
    const argumentos = [];
    if (!this.es(')')) {
      do {
        argumentos.push(this.expresion());
      } while (this.aceptar(','));
    }
    this.exigir(')', 'para cerrar los parametros de la figura');

    const esperados = validas[figura];
    if (esperados !== undefined && argumentos.length !== esperados) {
      this.errores.push(new ErrorCompilacion(
        FASES.SINTACTICA,
        `${familia}.${figura} espera ${esperados} argumento(s) y recibio ${argumentos.length}.`,
        inicio.linea, inicio.columna,
        { lexema: figura, esperado: `${esperados} argumento(s)` }
      ));
    }

    return nodo('Geometrica', inicio, { familia, figura, argumentos });
  }
}

/**
 * Analiza los tokens eligiendo el modo adecuado.
 *
 * @param {Array}  tokens Tokens del analizador lexico.
 * @param {string} [modo] 'auto' (por defecto), 'programa', 'expresion' o
 *                        'instrucciones'.
 *
 * En modo 'auto' el modo lo decide elegirModo() con cuatro reglas: un
 * programa completo, instrucciones con punto y coma, o una o varias
 * proposiciones sueltas (una por renglon).
 */
function analizarSintactico (tokens, modo = 'auto') {
  const lista = tokens || [];

  // Sin tokens (archivo vacio o solo comentarios) no hay nada que analizar:
  // no es un error, simplemente no hay arbol.
  const hayCodigo = lista.some((t) => t.tipo !== TiposToken.FIN_ARCHIVO);
  if (!hayCodigo) {
    return {
      ast: null,
      modo: 'vacio',
      errores: [],
      estadisticas: { nodos: 0, profundidad: 0, totalErrores: 0, funciones: 0 }
    };
  }

  const elegido = modo === 'auto' ? elegirModo(lista) : modo;
  const analizador = new AnalizadorSintactico(lista);

  if (elegido === 'programa') return analizador.analizar();
  if (elegido === 'instrucciones') return analizador.analizarInstrucciones();
  return analizador.analizarExpresion();
}

/**
 * Decide que se escribio, mirando los tokens. Son cuatro reglas en orden:
 *
 *   1. Empieza con "clase"                -> un programa completo
 *   2. Empieza con un tipo o con una
 *      palabra que inicia instruccion     -> instrucciones sueltas
 *   3. Contiene ";" o "{"                 -> instrucciones sueltas
 *   4. En cualquier otro caso             -> proposiciones sueltas, una por
 *                                            renglon y sin punto y coma
 *
 * Ejemplos:
 *   clase p { ... }        regla 1
 *   entero a = 5;          regla 2 (empieza con un tipo)
 *   si (a > b) { ... }     regla 2 (empieza con "si")
 *   x = 5;                 regla 3 (lleva punto y coma)
 *   a && b || c > d;       regla 3 (una proposicion simple con punto y coma)
 *   a = b + c > 9 AND d    regla 4
 *   a = b + c              regla 4 (dos proposiciones, una por renglon)
 *   a && b || c + f > d
 *
 * @param {Array} tokens
 * @returns {string} 'programa' | 'instrucciones' | 'expresion'
 */
function elegirModo (tokens) {
  const primero = tokens[0];

  if (primero.lexema === 'clase') return 'programa';

  if (primero.tipo === TiposToken.TIPO_DATO ||
      INICIO_INSTRUCCION.indexOf(primero.lexema) !== -1) {
    return 'instrucciones';
  }

  const tieneSeparadores = tokens.some(
    (t) => t.lexema === ';' || t.lexema === '{');
  if (tieneSeparadores) return 'instrucciones';

  return 'expresion';
}

module.exports = { AnalizadorSintactico, analizarSintactico };

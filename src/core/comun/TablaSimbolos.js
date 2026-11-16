/**
 * TablaSimbolos.js
 * La tabla de simbolos del compilador.
 *
 * Como en el esquema clasico de un compilador, la tabla de simbolos y el
 * manejo de errores (ErrorCompilacion.js) no son de una sola fase: los usan
 * LAS TRES. Por eso viven aqui, en comun/.
 *
 *                 ┌────────────────┐
 *     codigo ───► │  1. Lexico     │ ──┐
 *                 ├────────────────┤   │      ┌─────────────────────┐
 *                 │  2. Sintactico │ ──┼────► │  TABLA DE SIMBOLOS  │
 *                 ├────────────────┤   │      │  MANEJO DE ERRORES  │
 *                 │  3. Semantico  │ ──┘      └─────────────────────┘
 *                 └────────────────┘
 *
 * Que hace cada fase con la tabla:
 *
 *   1. El LEXICO anota cada identificador la primera vez que lo ve y le da su
 *      etiqueta:  edad -> id1. Cuenta cuantas veces aparece.
 *   2. El SINTACTICO usa esas etiquetas para escribir el arbol:  id1 > id2.
 *   3. El SEMANTICO completa cada nombre con lo que es (variable, Constante,
 *      funcion...), su tipo y el ambito donde vive, y con eso revisa que el
 *      codigo tenga sentido.
 *
 * LOS AMBITOS (fase 3). Cada bloque { } abre un ambito nuevo y, al cerrarlo,
 * sus variables dejan de existir, igual que en Java:
 *
 *   clasePrincipal {            ambito "clasePrincipal"
 *     entero a = 1;
 *     si (a > 0) {              ambito "si": aqui se ve la a
 *       entero b = 2;
 *     }
 *     b = 3;                    error: la b ya no existe aqui
 *   }
 *
 * Los ambitos abiertos forman una PILA: el ultimo es el actual, y un nombre
 * se busca del ultimo hacia el primero (de adentro hacia afuera).
 *
 * Las funciones se guardan aparte, porque se pueden llamar desde cualquier
 * parte de la clase, aunque esten declaradas mas abajo.
 */

class TablaSimbolos {
  constructor () {
    // --- Fase 1: los identificadores que aparecen en el codigo ---
    /** [{ etiqueta, nombre, veces, linea, columna, declaraciones }] en orden de aparicion */
    this.identificadores = [];
    /** nombre -> su registro de arriba */
    this.porNombre = new Map();

    // --- Fase 3: lo que declara el programa ---
    /** nombre -> simbolo de cada funcion de la clase */
    this.funciones = new Map();
    /** Los ambitos abiertos: [{ nombre, simbolos: Map(nombre -> simbolo) }] */
    this.pila = [];
    /** Todos los simbolos declarados, en orden */
    this.todos = [];
  }

  // ==================================================================
  // Fase 1 (lexico): los identificadores
  // ==================================================================

  /**
   * Anota un identificador. La primera vez le da la siguiente etiqueta
   * (id1, id2...); las demas solo cuenta que volvio a aparecer.
   * @returns {string} Su etiqueta.
   */
  registrar (nombre, linea, columna) {
    let registro = this.porNombre.get(nombre);
    if (registro) {
      registro.veces++;
      return registro.etiqueta;
    }

    registro = {
      etiqueta: 'id' + (this.identificadores.length + 1),
      nombre,
      veces: 1,
      linea,
      columna,
      declaraciones: []   // lo llena el semantico
    };
    this.porNombre.set(nombre, registro);
    this.identificadores.push(registro);
    return registro.etiqueta;
  }

  /**
   * Fase 2 (sintactico): de cada nombre, su etiqueta. Con esto el arbol
   * se escribe  id1 > id2  en lugar de  a > b.
   * @returns {object} { nombre: 'idN' }
   */
  mapa () {
    const mapa = {};
    this.identificadores.forEach((r) => { mapa[r.nombre] = r.etiqueta; });
    return mapa;
  }

  // ==================================================================
  // Fase 3 (semantico): funciones y ambitos
  // ==================================================================

  /** Anota la clase del programa:  clase ejemplo { ... } */
  declararClase (datos) {
    const simbolo = Object.assign({ categoria: 'clase', ambito: '', usos: 0, asignado: true }, datos);
    this._completar(simbolo);
    return simbolo;
  }

  /**
   * Anota una funcion.
   * @param {object} datos { nombre, tipo, parametros: [tipos], linea, columna }
   */
  declararFuncion (datos) {
    const simbolo = Object.assign(
      { categoria: 'funcion', ambito: 'clase', usos: 0, asignado: true }, datos);
    this.funciones.set(simbolo.nombre, simbolo);
    this._completar(simbolo);
    return simbolo;
  }

  /** La funcion con ese nombre, o null si no existe. */
  buscarFuncion (nombre) {
    return this.funciones.get(nombre) || null;
  }

  /** Abre un ambito nuevo dentro del actual (al entrar a un bloque { }). */
  abrir (nombre) {
    this.pila.push({ nombre, simbolos: new Map() });
  }

  /** Cierra el ambito actual y lo devuelve (al salir de un bloque { }). */
  cerrar () {
    return this.pila.pop();
  }

  /** Nombre del ambito actual con los de afuera:  clasePrincipal › si */
  get ambito () {
    return this.pila.map((a) => a.nombre).join(' › ');
  }

  /**
   * Busca un nombre del ambito actual hacia afuera.
   * @returns {object|null} El simbolo, o null si no esta declarado.
   */
  buscar (nombre) {
    for (let i = this.pila.length - 1; i >= 0; i--) {
      const simbolo = this.pila[i].simbolos.get(nombre);
      if (simbolo) return simbolo;
    }
    return null;
  }

  /** Los nombres que se ven desde el ambito actual (para sugerir parecidos). */
  visibles () {
    const nombres = [];
    this.pila.forEach((a) => a.simbolos.forEach((s) => nombres.push(s.nombre)));
    return nombres.concat(Array.from(this.funciones.keys()));
  }

  /**
   * Anota un nombre en el ambito actual.
   *
   * @param {object} datos
   *   nombre, categoria ('variable' | 'constante' | 'arreglo' | 'matriz' |
   *   'parametro' | 'error'), tipo ('entero', 'decimal[]'...), linea, columna,
   *   asignado (true si ya tiene valor) y, en arreglos, tamanos ([3] o [2, 2]).
   * @returns {object} El simbolo, con su ambito y su contador de usos.
   */
  declarar (datos) {
    const simbolo = Object.assign({ ambito: this.ambito, usos: 0, asignado: false }, datos);
    this.pila[this.pila.length - 1].simbolos.set(simbolo.nombre, simbolo);
    this._completar(simbolo);
    return simbolo;
  }

  /**
   * El semantico completa el registro que hizo el lexico: le agrega esta
   * declaracion (un mismo nombre se puede declarar en ambitos distintos).
   */
  _completar (simbolo) {
    this.todos.push(simbolo);
    const registro = this.porNombre.get(simbolo.nombre);
    if (!registro) return;
    simbolo.etiqueta = registro.etiqueta;
    registro.declaraciones.push({
      categoria: simbolo.categoria,
      tipo: simbolo.tipo,
      ambito: simbolo.ambito,
      linea: simbolo.linea
    });
  }
}

module.exports = { TablaSimbolos };

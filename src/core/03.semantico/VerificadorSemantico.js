/**
 * VerificadorSemantico.js
 * El analisis semantico: revisa que el codigo TENGA SENTIDO.
 *
 * El analizador sintactico ya dijo que el codigo esta BIEN ESCRITO: cada
 * instruccion tiene la forma correcta. Pero algo bien escrito puede no tener
 * sentido:
 *
 *   entero x = "hola";      bien escrito, pero un texto no cabe en un entero
 *   y = 5;                  bien escrito, pero y nunca se declaro
 *   si (x) { }              bien escrito, pero x no es verdadero ni falso
 *
 * Eso es lo que revisa esta fase. Recorre el arbol una vez, de arriba hacia
 * abajo, con dos herramientas:
 *
 *   1. La TABLA DE SIMBOLOS (comun/TablaSimbolos.js), la misma que lleno el
 *      lexico: cada declaracion se anota ahi, y cada vez que se usa un
 *      nombre se busca ahi.
 *   2. La REVISION DE TIPOS: cada expresion calcula su tipo (tipoDe) y se
 *      compara con el que se espera (cabe).
 *
 * Ademas DECORA el arbol: cada expresion se queda con su tipo en
 * n.tipoCalculado. La fase 4 lo usa para escribir las conversiones que Java
 * hace solo (decimal x = 5;  guarda 5.0).
 *
 * Lo que encuentra lo separa en:
 *   - errores:      el codigo no puede ejecutarse asi (en Java no compilaria).
 *   - advertencias: se puede ejecutar, pero algo parece un descuido, como
 *                   una variable que nunca se usa.
 *
 * Las reglas siguen a Java, porque SwordByte se traduce a Java. Y, como en
 * Java, solo se revisan programas completos:  clase nombre { ... }
 */

const { ErrorCompilacion, FASES } = require('../comun/ErrorCompilacion');
const { TablaSimbolos } = require('../comun/TablaSimbolos');
const { textoExpresion } = require('./TextoDeNodo');

// ====================================================================
// Los tipos
// ====================================================================

/** Los tipos numericos, del mas chico al mas grande. */
const NUMERICOS = ['byte', 'corto', 'entero', 'largo', 'flotante', 'decimal'];

/** Los numericos sin parte decimal. */
const ENTEROS = ['byte', 'corto', 'entero', 'largo'];

/**
 * Hasta donde llega cada entero. Un numero escrito tal cual (100) es entero,
 * pero cabe en byte o en corto si esta dentro de su rango:  byte b = 100;
 */
const RANGOS = {
  byte: [-128, 127],
  corto: [-32768, 32767],
  entero: [-2147483648, 2147483647]
};

/** Lo que opcion puede evaluar (lo mismo que el switch de Java). */
const TIPOS_DE_OPCION = ['byte', 'corto', 'entero', 'caracter', 'cadena'];

const LOGICOS = ['Y', 'AND', '&&', 'O', 'OR', '||'];
const NEGACIONES = ['NO', 'NOT', '!'];
const RELACIONALES = ['<', '>', '<=', '>='];

/**
 * Lo que el lexico y el sintactico reconocen (pestañas 1 y 2), pero que el
 * lenguaje no usa. En SwordByte:
 *   - la logica se escribe solo con  Y,  O  y  NO;
 *   - las potencias y las raices se sacan solo con  potencia(base, exponente),
 *     porque una raiz es una potencia con exponente fraccionario:
 *       raiz cuadrada de x = potencia(x, 0.5)    raiz cubica = potencia(x, 1.0 / 3)
 *
 * Cada una dice que se escribe en su lugar.
 */
const NO_SON_DEL_LENGUAJE = {
  '&&': 'El Y lógico se escribe Y:  a > 0 Y b > 0',
  AND: 'El Y lógico se escribe Y:  a > 0 Y b > 0',
  '||': 'El O lógico se escribe O:  a > 0 O b > 0',
  OR: 'El O lógico se escribe O:  a > 0 O b > 0',
  '!': 'La negación se escribe NO:  NO (a > b)',
  NOT: 'La negación se escribe NO:  NO (a > b)',
  '^': 'La potencia se saca con potencia(base, exponente):  potencia(2, 3)',
  '**': 'La potencia se saca con potencia(base, exponente):  potencia(2, 3)',
  '√': 'La raíz es una potencia:  potencia(x, 0.5)  es la raíz cuadrada de x',
  raiz: 'La raíz es una potencia:  potencia(x, 0.5)  es la cuadrada y  potencia(x, 1.0 / n)  la n-ésima',
  raizCuadrada: 'La raíz cuadrada es una potencia:  potencia(x, 0.5)',
  raizCubica: 'La raíz cúbica es una potencia:  potencia(x, 1.0 / 3)'
};

/** Lo que devuelve cada funcion nativa (longitud se revisa aparte). */
const NATIVAS = {
  aleatorio: 'entero',
  potencia: 'decimal',
  raiz: 'decimal',          // las raices no son del lenguaje (ver arriba),
  raizCuadrada: 'decimal',  // pero se dice su tipo para no encadenar mas
  raizCubica: 'decimal',    // errores
  redondear: 'entero',
  logaritmo: 'decimal',
  logaritmo10: 'decimal',
  seno: 'decimal',
  coseno: 'decimal'
};

/**
 * Los formatos de imprimirF y el valor que pide cada uno (como printf de
 * Java):  %d %x %o un entero,  %f %e un decimal,  %c un caracter,
 * %b un logico  y  %s cualquier valor.  %n y %% no piden valor.
 */
const FORMATOS = {
  d: 'entero',
  x: 'entero',
  o: 'entero',
  f: 'decimal',
  e: 'decimal',
  c: 'caracter',
  b: 'logico',
  s: 'cualquiera'
};
const ESPECIFICADOR = /%[-#+ 0,(]*\d*(?:\.\d+)?([a-zA-Z%])/g;

const esNumero = (t) => NUMERICOS.indexOf(t) !== -1;
const esEntero = (t) => ENTEROS.indexOf(t) !== -1;
const esDecimal = (t) => t === 'flotante' || t === 'decimal';
const esArreglo = (t) => t.endsWith('[]');

/** Como se nombra un tipo en los mensajes:  entero[] -> Arreglo entero */
function nombreTipo (t) {
  if (t.endsWith('[][]')) return 'matriz ' + t.slice(0, -4);
  if (t.endsWith('[]')) return 'Arreglo ' + t.slice(0, -2);
  return t;
}

/**
 * El tipo de una operacion entre dos numeros: el mas grande de los dos, y
 * como minimo entero (igual que en Java, donde byte + byte da entero).
 *   entero + decimal -> decimal      byte * corto -> entero
 */
function promover (a, b) {
  const mayor = Math.max(
    NUMERICOS.indexOf(a), NUMERICOS.indexOf(b), NUMERICOS.indexOf('entero'));
  return NUMERICOS[mayor];
}

/**
 * El valor de un numero escrito tal cual (5, -3, 2.5), o null si la
 * expresion no es un numero fijo (x, a + 1, potencia(2, 3)...).
 */
function numeroFijo (n) {
  if (n.tipo === 'Literal' && (n.tipoDato === 'LIT_ENTERO' || n.tipoDato === 'LIT_DECIMAL')) {
    return n.valor;
  }
  if (n.tipo === 'Unaria' && (n.operador === '-' || n.operador === '+')) {
    const v = numeroFijo(n.operando);
    if (v === null) return null;
    return n.operador === '-' ? -v : v;
  }
  return null;
}

/**
 * true si un valor de tipo "origen" se puede guardar en un lugar de tipo
 * "destino". Son tres reglas:
 *
 *   1. Del mismo tipo:                         entero <- entero
 *   2. Un numero en un numerico mas grande:    decimal <- entero
 *      (nunca al reves: un decimal no cabe en un entero)
 *   3. Un entero fijo en byte o corto, si le cabe:   byte b = 100;
 */
function cabe (destino, origen, valor) {
  if (destino === origen) return true;

  if (esNumero(destino) && esNumero(origen) &&
      NUMERICOS.indexOf(origen) <= NUMERICOS.indexOf(destino)) return true;

  const n = numeroFijo(valor);
  const rango = RANGOS[destino];
  return origen === 'entero' && rango !== undefined && n !== null &&
    n >= rango[0] && n <= rango[1];
}

/** Una pista para arreglar unos tipos que no coinciden. */
function sugerenciaDeTipos (destino, origen, valor) {
  if (valor.tipo === 'Geometrica' && esEntero(destino)) {
    return `${valor.familia}.${valor.figura} devuelve decimal: guárdalo en un decimal o usa redondear(...).`;
  }
  if (destino === 'flotante' && origen === 'decimal' && valor.tipo === 'Literal') {
    return `Para un flotante, el número lleva f al final: ${valor.lexema}f`;
  }
  if (esEntero(destino) && esDecimal(origen)) {
    return `Un decimal no cabe en un entero: usa redondear(...) o convertir(..., ${destino}).`;
  }
  if (RANGOS[destino] && esNumero(origen)) {
    return `${destino} solo guarda de ${RANGOS[destino][0]} a ${RANGOS[destino][1]}: ` +
      `usa un tipo más grande o convertir(..., ${destino}).`;
  }
  if (esNumero(destino) && origen === 'cadena') {
    return `Para pasar un texto a número usa convertir(texto, ${destino}).`;
  }
  if (destino === 'cadena') return 'Para pasar un valor a texto usa convertir(valor, cadena).';
  return null;
}

// ====================================================================
// Ayudas sueltas
// ====================================================================

/** Cuantas letras hay que cambiar, poner o quitar para pasar de a a b. */
function distancia (a, b) {
  // fila[j] = distancia entre lo que va de "a" y las primeras j letras de "b"
  let fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const nueva = [i];
    for (let j = 1; j <= b.length; j++) {
      const cambio = a[i - 1] === b[j - 1] ? 0 : 1;
      nueva[j] = Math.min(fila[j] + 1, nueva[j - 1] + 1, fila[j - 1] + cambio);
    }
    fila = nueva;
  }
  return fila[b.length];
}

/**
 * El nombre declarado que mas se parece a uno mal escrito, o null.
 *   Edad -> edad (solo cambian mayusculas)      edda -> edad (2 letras)
 * Los nombres de 3 letras o menos solo se comparan sin mayusculas: entre
 * "x" y "y" hay una letra de diferencia, pero no es un error de dedo.
 */
function parecido (nombre, candidatos) {
  const mismo = candidatos.find((c) => c.toLowerCase() === nombre.toLowerCase());
  if (mismo) return mismo;
  if (nombre.length <= 3) return null;

  let mejor = null;
  let menor = 3;
  candidatos.forEach((c) => {
    const d = distancia(nombre, c);
    if (d < menor) {
      menor = d;
      mejor = c;
    }
  });
  return mejor;
}

/**
 * true si una lista de instrucciones SIEMPRE llega a un retornar, pase lo
 * que pase. Es la regla de Java para "falta el retornar":
 *   - retornar                  -> si
 *   - si ... sino ...           -> si TODAS sus ramas, incluido el sino, retornan
 *   - intentar ... capturar ... -> si las dos partes retornan
 *   - cualquier otra            -> no (un ciclo puede no repetirse ni una vez)
 */
function siempreRetorna (instrucciones) {
  return instrucciones.some((n) => {
    if (n.tipo === 'Retornar') return true;
    if (n.tipo === 'Si') {
      return n.sino !== null &&
        siempreRetorna(n.entonces.instrucciones) &&
        n.ramas.every((r) => siempreRetorna(r.cuerpo.instrucciones)) &&
        siempreRetorna(n.sino.cuerpo.instrucciones);
    }
    if (n.tipo === 'Intentar') {
      return siempreRetorna(n.cuerpo.instrucciones) && siempreRetorna(n.manejo.instrucciones);
    }
    return false;
  });
}

// ====================================================================
// El verificador
// ====================================================================

class VerificadorSemantico {
  /** @param {TablaSimbolos} tabla La tabla de simbolos del compilador. */
  constructor (tabla) {
    this.tabla = tabla;
    this.errores = [];
    this.advertencias = [];

    // Donde va el recorrido (algunas reglas dependen del lugar):
    this.funcionActual = null; // la funcion que se revisa; null en clasePrincipal
    this.ciclos = 0;           // cuantos ciclos rodean a la instruccion (romper)
    this.opciones = 0;         // cuantos opcion rodean a la instruccion (romper)
    this.intentos = 0;         // cuantos intentar la rodean (division entre cero)

    this.sinUso = [];               // variables que nunca se usaron
    this.noDeclarados = new Set();  // nombres ya reportados, para no repetirlos
  }

  error (nodo, mensaje, sugerencia) {
    this.errores.push(new ErrorCompilacion(
      FASES.SEMANTICA, mensaje, nodo.linea, nodo.columna, { sugerencia }));
  }

  advertir (nodo, mensaje, sugerencia) {
    this.advertencias.push(new ErrorCompilacion(
      FASES.SEMANTICA, mensaje, nodo.linea, nodo.columna, { sugerencia }));
  }

  /**
   * Revisa el programa completo.
   * @param {object} ast  Arbol del analizador sintactico (sin errores).
   */
  revisar (ast) {
    this.programa(ast);
    this.avisarSinUso();

    // En el orden del codigo, aunque las funciones se revisen aparte.
    const porLinea = (a, b) => a.linea - b.linea || a.columna - b.columna;
    this.errores.sort(porLinea);
    this.advertencias.sort(porLinea);
  }

  // ------------------------------------------------------------------
  // El programa
  // ------------------------------------------------------------------

  /** clase nombre { funciones y clasePrincipal } */
  programa (n) {
    this.tabla.declararClase({ nombre: n.nombre, tipo: n.nombre, linea: n.linea, columna: n.columna });

    // Paso 1: se anotan TODAS las funciones antes de revisar nada, para poder
    // llamar a una que esta declarada mas abajo (igual que en Java).
    n.funciones.forEach((f) => this.declararFuncion(f));

    // Paso 2: se revisa cada funcion y clasePrincipal, en el orden del codigo.
    const miembros = n.funciones.concat(n.principal ? [n.principal] : []);
    miembros.sort((a, b) => a.linea - b.linea);
    miembros.forEach((m) => {
      if (m.tipo === 'Funcion') this.funcion(m);
      else this.principal(m);
    });
  }

  declararFuncion (f) {
    const previa = this.tabla.buscarFuncion(f.nombre);
    if (previa) {
      this.error(f, `Ya existe una función llamada '${f.nombre}' (línea ${previa.linea}).`,
        'Cada función necesita un nombre distinto.');
      return;
    }
    this.tabla.declararFuncion({
      nombre: f.nombre,
      tipo: f.tipoRetorno,
      parametros: f.parametros.map((p) => p.tipoDato),
      linea: f.linea,
      columna: f.columna
    });
  }

  /** funcion tipo nombre(parametros) { ... } */
  funcion (f) {
    this.funcionActual = f;
    this.tabla.abrir(f.nombre);

    // Los parametros son variables que ya llegan con valor.
    f.parametros.forEach((p) => {
      this.tipoValido(p, p.tipoDato, `El parámetro '${p.nombre}'`);
      this.declararNombre(p, { nombre: p.nombre, categoria: 'parametro', tipo: p.tipoDato, asignado: true });
    });

    this.lista(f.cuerpo.instrucciones);

    if (f.tipoRetorno !== 'vacio' && !siempreRetorna(f.cuerpo.instrucciones)) {
      this.error(f, `La función '${f.nombre}' debe devolver un valor ${f.tipoRetorno} con retornar.`,
        `Agrega al final  retornar valor;  o declárala como  funcion vacio ${f.nombre}(...).`);
    }

    this.cerrarAmbito();
    this.funcionActual = null;
  }

  /** clasePrincipal { ... } */
  principal (p) {
    this.funcionActual = null;
    this.tabla.abrir('clasePrincipal');
    this.lista(p.cuerpo.instrucciones);
    this.cerrarAmbito();
  }

  // ------------------------------------------------------------------
  // Ambitos y nombres
  // ------------------------------------------------------------------

  /** Revisa un bloque { } en su propio ambito. */
  bloque (b, nombre) {
    this.tabla.abrir(nombre);
    this.lista(b.instrucciones);
    this.cerrarAmbito();
  }

  /** Cierra el ambito actual y anota las variables que nunca se usaron. */
  cerrarAmbito () {
    const ambito = this.tabla.cerrar();
    ambito.simbolos.forEach((s) => {
      const seAvisa = s.categoria !== 'parametro' && s.categoria !== 'error';
      if (s.usos === 0 && seAvisa) this.sinUso.push(s);
    });
  }

  /** Las advertencias de lo que se declaro y nunca se uso. */
  avisarSinUso () {
    this.tabla.funciones.forEach((f) => {
      if (f.usos === 0) this.advertir(f, `La función '${f.nombre}' nunca se llama.`);
    });

    // Las variables van juntas en un solo aviso, para no llenar la lista.
    if (this.sinUso.length === 0) return;
    if (this.sinUso.length === 1) {
      const s = this.sinUso[0];
      this.advertir(s, `'${s.nombre}' se declaró y su valor nunca se usa.`, 'Si no hace falta, se puede borrar.');
      return;
    }
    const lista = this.sinUso.map((s) => `${s.nombre} (línea ${s.linea})`).join(', ');
    this.advertir(this.sinUso[0], `Se declararon y su valor nunca se usa: ${lista}.`,
      'Si no hacen falta, se pueden borrar.');
  }

  /**
   * Anota un nombre nuevo en el ambito actual. En Java no se puede repetir el
   * nombre de una variable dentro de la misma funcion, aunque este en un
   * bloque de adentro; aqui tampoco.
   */
  declararNombre (nodo, datos) {
    const previo = this.tabla.buscar(datos.nombre);
    if (previo) {
      this.error(nodo, `'${datos.nombre}' ya está declarada (línea ${previo.linea}).`,
        'Usa otro nombre, o quita el tipo si solo querías darle un valor nuevo.');
      return null;
    }
    return this.tabla.declarar(
      Object.assign({ linea: nodo.linea, columna: nodo.columna }, datos));
  }

  /** vacio no guarda valores: solo sirve como retorno de una funcion. */
  tipoValido (nodo, tipo, quien) {
    if (tipo !== 'vacio') return true;
    this.error(nodo, `${quien} no puede ser de tipo vacio.`,
      'vacio solo se usa como tipo de retorno: funcion vacio nombre() { }');
    return false;
  }

  /** Busca una variable; si no existe lo reporta (una sola vez por nombre). */
  buscarVariable (n) {
    const s = this.tabla.buscar(n.nombre);
    if (s) return s;
    if (this.noDeclarados.has(n.nombre)) return null;
    this.noDeclarados.add(n.nombre);

    if (this.tabla.buscarFuncion(n.nombre)) {
      this.error(n, `'${n.nombre}' es una función, no una variable.`,
        `Para llamarla se escribe ${n.nombre}(...).`);
    } else {
      const otro = parecido(n.nombre, this.tabla.visibles());
      this.error(n, `'${n.nombre}' no está declarada.`, otro
        ? `¿Quisiste decir '${otro}'?`
        : `Declárala antes de usarla, por ejemplo: entero ${n.nombre} = 0;`);
    }
    return null;
  }

  /**
   * Un lugar donde se guarda un valor:  x  o  datos[i].
   *
   * @param {string} uso 'leer' (se usa su valor), 'escribir' (recibe un
   *                     valor) o 'cambiar' (las dos cosas, como en x++).
   * @returns {string|null} El tipo del lugar, o null si hubo un error.
   */
  lugar (n, uso) {
    const s = this.buscarVariable(n);
    if (!s) return null;

    if (uso !== 'leer' && s.categoria === 'constante') {
      this.error(n, `'${s.nombre}' es Constante: su valor no se puede cambiar.`,
        'Si necesitas cambiarlo, declárala como variable (sin Constante).');
    }

    if (uso !== 'escribir') {
      s.usos++;
      // Igual que en Java: no se puede usar una variable que no tiene valor.
      if (!s.asignado && !s.avisado) {
        s.avisado = true;
        this.error(n, `'${s.nombre}' se usa antes de recibir un valor.`,
          `Dale un valor al declararla (${s.tipo} ${s.nombre} = ...;) o con leer(${s.nombre});`);
      }
    }
    if (uso !== 'leer') s.asignado = true;

    if (s.tipo === 'vacio') return null;   // ya se reporto al declararla
    return n.tipo === 'Indexacion' ? this.posicion(n, s) : s.tipo;
  }

  /** datos[i]  o  tabla[i][j]: revisa los indices y da el tipo del elemento. */
  posicion (n, s) {
    const dimensiones = (s.tipo.match(/\[\]/g) || []).length;
    if (dimensiones === 0) {
      this.error(n, `'${s.nombre}' no es un arreglo: no lleva [ ].`);
      return null;
    }
    if (n.indices.length !== dimensiones) {
      this.error(n, `'${s.nombre}' es ${nombreTipo(s.tipo)}: lleva ${dimensiones} índice(s) [ ] ` +
        `y se escribieron ${n.indices.length}.`);
      return null;
    }

    n.indices.forEach((indice, k) => {
      const tipo = this.valor(indice);
      if (tipo && !esEntero(tipo)) {
        this.error(indice, `Un índice debe ser entero, y '${textoExpresion(indice)}' es ${nombreTipo(tipo)}.`);
      }

      // Con un numero fijo se sabe desde ahora si la posicion existe.
      const v = numeroFijo(indice);
      const tamano = s.tamanos ? s.tamanos[k] : null;
      const que = dimensiones === 1 ? 'posiciones' : (k === 0 ? 'renglones' : 'columnas');
      if (v !== null && v < 0) {
        this.error(indice, `Un índice no puede ser negativo (${v}): las posiciones empiezan en 0.`);
      } else if (v !== null && tamano && v >= tamano) {
        this.error(indice, `'${s.nombre}' tiene ${tamano} ${que} (de 0 a ${tamano - 1}): la ${v} no existe.`);
      }
    });

    return s.tipo.replace(/\[\]/g, '');
  }

  /** Revisa que un valor de tipo "origen" se pueda guardar en un "destino". */
  revisarQueCabe (donde, valor, destino, origen, quien) {
    if (origen === null || destino === null || destino === 'vacio') return;
    if (cabe(destino, origen, valor)) return;
    this.error(donde, `Tipos incompatibles: ${quien} es ${nombreTipo(destino)} ` +
      `y el valor es ${nombreTipo(origen)}.`, sugerenciaDeTipos(destino, origen, valor));
  }

  // ------------------------------------------------------------------
  // Instrucciones
  // ------------------------------------------------------------------

  /** Revisa una lista de instrucciones, una tras otra. */
  lista (instrucciones) {
    let despuesDe = null;   // 'retornar' o 'romper', si ya aparecio uno
    let avisado = false;

    instrucciones.forEach((n) => {
      // Lo que va despues de retornar o romper nunca se ejecuta.
      if (despuesDe && !avisado) {
        this.advertir(n, `Esta instrucción nunca se ejecuta: está después de ${despuesDe}.`,
          'Bórrala o muévela antes.');
        avisado = true;
      }
      this.instruccion(n);
      if (n.tipo === 'Retornar') despuesDe = 'retornar';
      if (n.tipo === 'Romper') despuesDe = 'romper';
    });
  }

  instruccion (n) {
    switch (n.tipo) {
      case 'Declaracion': return this.declaracion(n);
      case 'Constante': return this.constante(n);
      case 'Arreglo':
      case 'Matriz': return this.arreglo(n);
      // (por tipoDe, para que la asignacion se quede con su tipo)
      case 'Asignacion': return this.tipoDe(n);
      case 'IncrementoStmt': return this.incremento(n.destino, n.operador);
      // Una llamada sola en su renglon puede ser de una funcion vacio
      case 'ExpresionInstruccion': return this.tipoDe(n.expresion);
      case 'Impresion': return this.impresion(n);
      case 'Leer': return this.leer(n);
      case 'Esperar': return this.esperar(n);
      case 'Si': return this.si(n);
      case 'Para': return this.para(n);
      case 'Mientras': return this.mientras(n);
      case 'HacerMientras': return this.hacer(n);
      case 'Opcion': return this.opcion(n);
      case 'Intentar': return this.intentar(n);
      case 'Retornar': return this.retornar(n);
      case 'Romper': return this.romper(n);
      // equipo(Null); y limpiar(); no tienen nada que revisar
      default: return null;
    }
  }

  /** entero a = 5, b;   (cada nombre es un "declarador") */
  declaracion (n) {
    const valido = this.tipoValido(n, n.tipoDato, 'Una variable');
    n.declaradores.forEach((d) => {
      // Primero el valor: en  entero x = x + 1;  la x todavia no existe.
      if (d.valor) {
        const tipo = this.valor(d.valor);
        if (valido) this.revisarQueCabe(d, d.valor, n.tipoDato, tipo, `'${d.nombre}'`);
      }
      this.declararNombre(d, {
        nombre: d.nombre, categoria: 'variable', tipo: n.tipoDato, asignado: d.valor !== null
      });
    });
  }

  /** Constante decimal IVA = 0.16; */
  constante (n) {
    const valido = this.tipoValido(n, n.tipoDato, `La constante '${n.nombre}'`);
    const tipo = this.valor(n.valor);
    if (valido) this.revisarQueCabe(n, n.valor, n.tipoDato, tipo, `la constante '${n.nombre}'`);
    this.declararNombre(n, { nombre: n.nombre, categoria: 'constante', tipo: n.tipoDato, asignado: true });
  }

  /**
   * Arreglo entero datos[3];
   * matriz entero tabla[2][2] = {{1, 2}, {3, 4}};
   */
  arreglo (n) {
    const valido = this.tipoValido(n, n.tipoDato, `El arreglo '${n.nombre}'`);
    const dimensiones = n.numDimensiones;   // 1 en un arreglo, 2 en una matriz

    // Los tamanos escritos entre [ ]. Los fijos se guardan para revisar
    // despues los indices:  datos[5]  cuando datos tiene 3 posiciones.
    const escritos = n.dimensiones.map((d) => this.tamano(d));
    const tamanos = escritos.length === dimensiones ? escritos : new Array(dimensiones).fill(null);

    if (escritos.length < dimensiones && !n.valores) {
      this.error(n, `'${n.nombre}' no tiene tamaño: escríbelo entre [ ] o dale sus valores.`,
        `Ejemplo: Arreglo ${n.tipoDato} ${n.nombre}[3];`);
    }

    if (n.valores) {
      const cuantos = this.valoresIniciales(n, valido ? n.tipoDato : null);
      for (let i = 0; i < dimensiones; i++) {
        const que = dimensiones === 1 ? 'valores' : (i === 0 ? 'renglones' : 'columnas');
        if (tamanos[i] === null) {
          // Sin tamaño escrito: el tamaño es el numero de valores
          if (cuantos[i] > 0) tamanos[i] = cuantos[i];
        } else if (cuantos[i] !== null && cuantos[i] > tamanos[i]) {
          this.error(n.valores, `En '${n.nombre}' caben ${tamanos[i]} ${que} y se dieron ${cuantos[i]}.`);
        }
      }
    }

    this.declararNombre(n, {
      nombre: n.nombre,
      categoria: dimensiones === 2 ? 'matriz' : 'arreglo',
      tipo: n.tipoDato + '[]'.repeat(dimensiones),
      tamanos,
      asignado: true
    });
  }

  /** Un tamaño entre [ ]: entero y mayor que cero. Devuelve el numero si es fijo. */
  tamano (d) {
    const tipo = this.valor(d);
    if (tipo && !esEntero(tipo)) {
      this.error(d, `El tamaño de un arreglo debe ser entero, y '${textoExpresion(d)}' es ${nombreTipo(tipo)}.`);
    }
    const v = numeroFijo(d);
    if (v !== null && v <= 0) {
      this.error(d, `El tamaño de un arreglo debe ser mayor que cero (se escribió ${v}).`);
    }
    return v !== null && v > 0 && Number.isInteger(v) ? v : null;
  }

  /**
   * Revisa la lista { } de un arreglo o matriz y dice cuantos valores tiene:
   * [3] en un arreglo, [renglones, columnas] en una matriz.
   */
  valoresIniciales (n, tipoElemento) {
    const lista = n.valores.elementos;

    if (n.numDimensiones === 1) {
      lista.forEach((e) => this.elemento(e, tipoElemento, n.nombre));
      return [lista.length];
    }

    // En una matriz, cada renglon va entre { }
    let columnas = null;
    lista.forEach((renglon) => {
      if (renglon.tipo !== 'Inicializador') {
        this.valor(renglon);
        this.error(renglon, `Cada renglón de la matriz '${n.nombre}' va entre { }.`,
          'Ejemplo: {{1, 2}, {3, 4}}');
        return;
      }
      renglon.elementos.forEach((e) => this.elemento(e, tipoElemento, n.nombre));
      columnas = Math.max(columnas || 0, renglon.elementos.length);
    });
    return [lista.length, columnas];
  }

  /** Un valor de la lista { }: debe caber en el tipo del arreglo. */
  elemento (e, tipoElemento, nombre) {
    if (e.tipo === 'Inicializador') {
      this.error(e, `'${nombre}' es de una dimensión: sus valores van sin { } por dentro.`);
      return;
    }
    const tipo = this.valor(e);
    if (tipoElemento) this.revisarQueCabe(e, e, tipoElemento, tipo, `cada valor de '${nombre}'`);
  }

  /** x = valor;   datos[0] = valor;   (tambien dentro de una expresion) */
  asignacion (n) {
    // Primero el valor: en  x = x + 1  se usa la x de antes.
    const tipoValor = this.valor(n.valor);
    const destino = this.lugar(n.destino, 'escribir');
    if (destino === null) return null;
    this.revisarQueCabe(n, n.valor, destino, tipoValor, `'${textoExpresion(n.destino)}'`);
    return destino;
  }

  /** x++;  x--;  suma o resta 1, asi que x debe ser un numero. */
  incremento (destino, operador) {
    if (destino.tipo !== 'Variable' && destino.tipo !== 'Indexacion') {
      this.valor(destino);
      this.error(destino, `${operador} solo se aplica a una variable.`);
      return null;
    }
    const tipo = this.lugar(destino, 'cambiar');
    if (tipo === null) return null;
    if (!esNumero(tipo)) {
      this.error(destino, `${operador} solo funciona con números, y '${textoExpresion(destino)}' es ${nombreTipo(tipo)}.`);
      return null;
    }
    return tipo;
  }

  /** imprimir(valor);   imprimirLn(valor);   imprimirF(formato, valores...); */
  impresion (n) {
    const tipos = n.argumentos.map((a) => this.valor(a));
    if (n.funcion === 'imprimirF') {
      this.imprimirF(n, tipos);
      return;
    }

    // imprimir e imprimirLn muestran un solo valor (imprimirLn puede ir vacio)
    if (n.argumentos.length > 1) {
      this.error(n, `${n.funcion} recibe un solo valor y se le dieron ${n.argumentos.length}.`,
        `Para juntar textos usa +: ${n.funcion}("Total: " + total);`);
    } else if (n.funcion === 'imprimir' && n.argumentos.length === 0) {
      this.error(n, 'imprimir necesita el valor que va a mostrar.', 'Ejemplo: imprimir("Hola");');
    }
  }

  /**
   * imprimirF("Edad: %d, promedio: %.2f", edad, prom);
   * Cada % del formato necesita un valor del tipo que pide.
   */
  imprimirF (n, tipos) {
    if (tipos.length === 0) return;   // el sintactico ya lo reporto
    if (tipos[0] && tipos[0] !== 'cadena') {
      this.error(n.argumentos[0], `El primer valor de imprimirF es el formato y debe ser cadena, ` +
        `pero es ${nombreTipo(tipos[0])}.`, 'Ejemplo: imprimirF("Edad: %d", edad);');
      return;
    }

    // Un formato que se arma al ejecutar (una variable) no se puede revisar antes.
    const formato = n.argumentos[0];
    if (formato.tipo !== 'Literal') return;

    // Los % del formato, en orden:  "Edad: %d, prom: %.2f"  ->  %d, %.2f
    const pedidos = [];
    for (const m of formato.valor.matchAll(ESPECIFICADOR)) {
      const letra = m[1].toLowerCase();
      if (letra === '%' || letra === 'n') continue;
      if (!FORMATOS[letra]) {
        this.error(formato, `'${m[0]}' no es un formato de imprimirF.`,
          'Formatos: %d %f %.2f %s %c %b %x %o %e %n %%');
        return;
      }
      pedidos.push({ texto: m[0], pide: FORMATOS[letra] });
    }

    const valores = n.argumentos.slice(1);
    if (pedidos.length !== valores.length) {
      this.error(n, `El formato pide ${pedidos.length} valor(es) y se dieron ${valores.length}.`,
        'Cada %d, %f, %s… necesita su valor después del formato.');
      return;
    }

    pedidos.forEach((p, i) => {
      const tipo = tipos[i + 1];
      if (tipo === null) return;
      const sirve = p.pide === 'cualquiera' ||
        (p.pide === 'entero' && esEntero(tipo)) ||
        (p.pide === 'decimal' && esDecimal(tipo)) ||
        p.pide === tipo;
      if (sirve) return;

      let sugerencia = 'Para mostrar cualquier valor se usa %s.';
      if (esDecimal(tipo)) sugerencia = 'Para decimales se usa %f (o %.2f).';
      if (esEntero(tipo)) sugerencia = 'Para enteros se usa %d.';
      this.error(valores[i], `${p.texto} pide un valor ${p.pide} y '${textoExpresion(valores[i])}' ` +
        `es ${nombreTipo(tipo)}.`, sugerencia);
    });
  }

  /** leer(x);  guarda en x lo que se escribe con el teclado. */
  leer (n) {
    const tipo = this.lugar(n.destino, 'escribir');
    if (tipo && esArreglo(tipo)) {
      this.error(n.destino, `leer no puede llenar todo '${n.destino.nombre}' de una vez.`,
        `Indica la posición: leer(${n.destino.nombre}[0]);`);
    }
  }

  /** esperar(1000);  los milisegundos son un entero que no es negativo. */
  esperar (n) {
    const tipo = this.valor(n.milisegundos);
    if (tipo && !esEntero(tipo)) {
      this.error(n.milisegundos, `esperar recibe milisegundos enteros, y ` +
        `'${textoExpresion(n.milisegundos)}' es ${nombreTipo(tipo)}.`);
    }
    const v = numeroFijo(n.milisegundos);
    if (v !== null && v < 0) this.error(n.milisegundos, 'esperar no puede recibir un tiempo negativo.');
  }

  /** La condicion de si, sinoSi, mientras, hacer o para: debe ser logica. */
  condicion (n, palabra) {
    const tipo = this.valor(n);
    if (tipo === null || tipo === 'logico') return;
    const sugerencia = n.tipo === 'Asignacion'
      ? 'Para comparar se usa == (con un solo = se guarda un valor).'
      : 'Compara el valor, por ejemplo: (x > 0).';
    this.error(n, `La condición de ${palabra} debe ser lógica (verdadero o falso), ` +
      `y '${textoExpresion(n)}' es ${nombreTipo(tipo)}.`, sugerencia);
  }

  si (n) {
    this.condicion(n.condicion, 'si');
    this.bloque(n.entonces, 'si');
    n.ramas.forEach((r) => {
      this.condicion(r.condicion, 'sinoSi');
      this.bloque(r.cuerpo, 'sinoSi');
    });
    if (n.sino) this.bloque(n.sino.cuerpo, 'sino');
  }

  para (n) {
    // El contador solo existe dentro del ciclo: el ambito se abre antes.
    this.tabla.abrir('para');
    if (n.inicializacion.tipo === 'Declaracion') this.declaracion(n.inicializacion);
    else this.asignacion(n.inicializacion);

    this.condicion(n.condicion, 'para');

    if (n.actualizacion.tipo === 'IncrementoStmt') {
      this.incremento(n.actualizacion.destino, n.actualizacion.operador);
    } else {
      this.asignacion(n.actualizacion);
    }

    this.ciclos++;
    this.lista(n.cuerpo.instrucciones);
    this.ciclos--;
    this.cerrarAmbito();
  }

  mientras (n) {
    this.condicion(n.condicion, 'mientras');
    this.ciclos++;
    this.bloque(n.cuerpo, 'mientras');
    this.ciclos--;
  }

  hacer (n) {
    this.ciclos++;
    this.bloque(n.cuerpo, 'hacer');
    this.ciclos--;
    // La condicion va despues del bloque: ya no ve sus variables.
    this.condicion(n.condicion, 'hacer … mientras');
  }

  /** opcion (x) { caso 1: ... porDefecto: ... } */
  opcion (n) {
    const tipo = this.valor(n.expresion);
    const valido = tipo !== null && TIPOS_DE_OPCION.indexOf(tipo) !== -1;
    if (tipo !== null && !valido) {
      let sugerencia = null;
      if (tipo === 'logico') sugerencia = 'Para verdadero o falso usa si ( ) { } sino { }.';
      if (esDecimal(tipo)) sugerencia = 'Usa redondear(...) o convertir(..., entero).';
      this.error(n.expresion, `opcion no puede evaluar un valor ${nombreTipo(tipo)}: ` +
        'solo entero, caracter o cadena.', sugerencia);
    }

    // Todos los casos comparten un ambito, igual que en el switch de Java.
    const vistos = new Map();   // valor del caso -> linea donde aparecio
    this.tabla.abrir('opcion');
    this.opciones++;
    n.casos.forEach((c) => {
      this.caso(c, valido ? tipo : null, vistos);
      this.lista(c.cuerpo.instrucciones);
    });
    if (n.porDefecto) this.lista(n.porDefecto.cuerpo.instrucciones);
    this.opciones--;
    this.cerrarAmbito();
  }

  /** caso 1:   caso 'a':   caso "hola":   fijo, del tipo de opcion y sin repetirse. */
  caso (c, tipoOpcion, vistos) {
    const valor = c.valor;
    const fijo = valor.tipo === 'Literal' || numeroFijo(valor) !== null;
    const tipo = this.valor(valor);

    if (!fijo) {
      this.error(valor, `El valor de un caso debe ser fijo (5, 'a', "texto"), ` +
        `y '${textoExpresion(valor)}' cambia al ejecutar.`);
      return;
    }
    if (tipoOpcion && tipo && !cabe(tipoOpcion, tipo, valor)) {
      this.error(valor, `El caso ${textoExpresion(valor)} es ${tipo}, pero opcion evalúa un valor ${tipoOpcion}.`);
    }

    const clave = numeroFijo(valor) !== null ? String(numeroFijo(valor)) : valor.lexema;
    if (vistos.has(clave)) {
      this.error(valor, `El caso ${textoExpresion(valor)} está repetido (ya aparece en la línea ${vistos.get(clave)}).`);
    } else {
      vistos.set(clave, valor.linea);
    }
  }

  /** intentar { ... } capturar (Error e) { ... } */
  intentar (n) {
    this.intentos++;
    this.bloque(n.cuerpo, 'intentar');
    this.intentos--;

    // e guarda el error capturado: ya llega con valor.
    this.tabla.abrir('capturar');
    this.declararNombre({ linea: n.lineaError, columna: n.columnaError }, {
      nombre: n.variableError, categoria: 'error', tipo: 'Error', asignado: true
    });
    this.lista(n.manejo.instrucciones);
    this.cerrarAmbito();
  }

  /** retornar;   retornar valor; */
  retornar (n) {
    const f = this.funcionActual;
    const tipo = n.valor ? this.valor(n.valor) : null;

    if (!f) {
      if (n.valor) {
        this.error(n, 'Fuera de una función, retornar va sin valor.',
          'Escribe solo  retornar;  para terminar el programa.');
      }
      return;
    }
    if (f.tipoRetorno === 'vacio') {
      if (n.valor) {
        this.error(n, `La función '${f.nombre}' es vacio: su retornar no lleva valor.`,
          `Quita el valor, o declárala como  funcion ${tipo || 'entero'} ${f.nombre}(...).`);
      }
      return;
    }
    if (!n.valor) {
      this.error(n, `La función '${f.nombre}' debe devolver un valor ${f.tipoRetorno}.`,
        'Escribe el valor:  retornar resultado;');
      return;
    }
    this.revisarQueCabe(n, n.valor, f.tipoRetorno, tipo, `lo que devuelve '${f.nombre}'`);
  }

  romper (n) {
    if (this.ciclos === 0 && this.opciones === 0) {
      this.error(n, 'romper solo puede ir dentro de un ciclo (para, mientras, hacer) o de un caso de opcion.');
    }
  }

  // ------------------------------------------------------------------
  // Expresiones: cada una calcula su tipo
  // ------------------------------------------------------------------

  /**
   * Reporta lo que las pestañas 1 y 2 aceptan pero el lenguaje no usa:
   * &&, ||, !, AND, OR, NOT, ^, **, √ y las funciones de raiz (ver
   * NO_SON_DEL_LENGUAJE). Despues se sigue revisando como si fuera Y, O,
   * NO o potencia, para no encadenar mas errores.
   */
  noEsDelLenguaje (n, palabra) {
    if (!Object.prototype.hasOwnProperty.call(NO_SON_DEL_LENGUAJE, palabra)) return;
    this.error(n, `'${palabra}' no se usa en SwordByte.`, NO_SON_DEL_LENGUAJE[palabra]);
  }

  /**
   * El tipo de una expresion que se usa como VALOR (en una suma, en una
   * condicion, para guardarse...). Una funcion vacio no devuelve nada, asi
   * que no se puede usar como valor.
   */
  valor (n) {
    const tipo = this.tipoDe(n);
    if (tipo === 'vacio') {
      this.error(n, `'${n.nombre}' es vacio: no devuelve ningún valor que se pueda usar aquí.`,
        `Llámala sola en su renglón ( ${n.nombre}(...); ) o declárala con un tipo de retorno.`);
      return null;
    }
    return tipo;
  }

  /**
   * El tipo de una expresion: 'entero', 'cadena', 'decimal[]'... o null si
   * no se puede saber porque adentro ya hubo un error (asi no se reporta
   * dos veces lo mismo).
   *
   * El tipo se anota en el nodo (n.tipoCalculado): el arbol queda
   * "decorado" con los tipos, y asi la fase 4 no tiene que calcularlos otra
   * vez. En una asignacion (x = valor) es el tipo de x.
   */
  tipoDe (n) {
    n.tipoCalculado = this.calcularTipo(n);
    return n.tipoCalculado;
  }

  calcularTipo (n) {
    switch (n.tipo) {
      case 'Literal': return this.literal(n);
      case 'Variable':
      case 'Indexacion': return this.lugar(n, 'leer');
      case 'Binaria': return this.binaria(n);
      case 'Unaria': return this.unaria(n);
      case 'Postfija': return this.incremento(n.operando, n.operador);
      case 'Asignacion': return this.asignacion(n);
      case 'Llamada': return this.llamada(n);
      case 'Nativa': return this.nativa(n);
      case 'Convertir': return this.convertir(n);
      case 'Geometrica': return this.geometrica(n);
      default: return null;
    }
  }

  /** Un valor escrito tal cual. El sufijo cuenta: 8L es largo, 8.5f es flotante. */
  literal (n) {
    switch (n.tipoDato) {
      case 'LIT_ENTERO':
        if (/[lL]$/.test(n.lexema)) return 'largo';
        if (n.valor > RANGOS.entero[1]) {
          this.error(n, `${n.lexema} es demasiado grande para un entero.`,
            `Para un largo agrega L al final: ${n.lexema}L`);
        }
        return 'entero';
      case 'LIT_DECIMAL': return /[fF]$/.test(n.lexema) ? 'flotante' : 'decimal';
      case 'LIT_CADENA': return 'cadena';
      case 'LIT_CARACTER': return 'caracter';
      case 'LIT_LOGICO': return 'logico';
      default: return null;
    }
  }

  /** a + b,  a > b,  a Y b ... */
  binaria (n) {
    const op = n.operador;
    this.noEsDelLenguaje(n, op);   // && || AND OR ^ **
    const izq = this.valor(n.izquierda);
    const der = this.valor(n.derecha);
    const ambos = izq !== null && der !== null;
    const tipos = ambos ? `${nombreTipo(izq)} ${op} ${nombreTipo(der)}` : '';

    // 1. Logicos: unen dos condiciones.   a > 0 Y b > 0
    if (LOGICOS.indexOf(op) !== -1) {
      if (ambos && (izq !== 'logico' || der !== 'logico')) {
        this.error(n, `${op} une condiciones lógicas (verdadero o falso), y ` +
          `'${textoExpresion(n)}' es ${tipos}.`, 'Compara primero cada lado, por ejemplo: a > 0 Y b > 0');
      }
      return 'logico';
    }

    // 2. Igualdad: dos valores del mismo tipo, o dos numeros.
    if (op === '==' || op === '!=') {
      const comparables = izq === der || (esNumero(izq) && esNumero(der));
      if (ambos && !comparables) {
        this.error(n, `No se puede comparar ${tipos}: deben ser del mismo tipo.`,
          'Convierte uno de los dos con convertir(valor, tipo).');
      }
      return 'logico';
    }

    // 3. Relacionales: solo comparan numeros.
    if (RELACIONALES.indexOf(op) !== -1) {
      if (ambos && !(esNumero(izq) && esNumero(der))) {
        this.error(n, `${op} compara números, y '${textoExpresion(n)}' es ${tipos}.`,
          izq === 'cadena' || der === 'cadena' ? 'Las cadenas solo se comparan con == o !=.' : null);
      }
      return 'logico';
    }

    if (!ambos) return null;

    // 4. + con una cadena junta los textos:   "Hola " + nombre
    if (op === '+' && (izq === 'cadena' || der === 'cadena')) return 'cadena';

    // 5. Aritmeticos: + - * / % ^ ** solo con numeros.
    if (!esNumero(izq) || !esNumero(der)) {
      let sugerencia = null;
      if (op === '+') sugerencia = 'Para juntar textos, uno de los dos lados debe ser cadena.';
      if (izq === 'caracter' || der === 'caracter') {
        sugerencia = 'Un caracter no es un número: para usar su código escribe convertir(c, entero).';
      }
      this.error(n, `${op} trabaja con números, y '${textoExpresion(n)}' es ${tipos}.`, sugerencia);
      return null;
    }

    if ((op === '/' || op === '%') && numeroFijo(n.derecha) === 0 && this.intentos === 0) {
      this.advertir(n, `'${textoExpresion(n)}' divide entre cero.`,
        'Con enteros, al ejecutarse lanza un Error: revisa el divisor o ponlo dentro de intentar { } capturar (Error e) { }.');
    }

    // La potencia siempre da decimal (como Math.pow de Java).
    if (op === '^' || op === '**') return 'decimal';
    return promover(izq, der);
  }

  /** -x,  +x,  NO x  (y √x, que no es del lenguaje) */
  unaria (n) {
    const op = n.operador;
    this.noEsDelLenguaje(n, op);   // ! NOT √
    const tipo = this.valor(n.operando);
    const esNegacion = NEGACIONES.indexOf(op) !== -1;
    if (tipo === null) return esNegacion ? 'logico' : null;

    if (esNegacion) {
      if (tipo !== 'logico') {
        this.error(n, `${op} niega una condición lógica, y '${textoExpresion(n.operando)}' es ${nombreTipo(tipo)}.`);
      }
      return 'logico';
    }

    if (!esNumero(tipo)) {
      this.error(n, `${op} trabaja con números, y '${textoExpresion(n.operando)}' es ${nombreTipo(tipo)}.`);
      return null;
    }

    if (op === '√') return 'decimal';
    return promover(tipo, 'entero');
  }

  /** sumar(5, 3): la funcion debe existir y recibir los valores que pide. */
  llamada (n) {
    const tipos = n.argumentos.map((a) => this.valor(a));
    const f = this.tabla.buscarFuncion(n.nombre);

    if (!f) {
      if (this.tabla.buscar(n.nombre)) {
        this.error(n, `'${n.nombre}' es una variable, no una función.`);
      } else {
        const otra = parecido(n.nombre, Array.from(this.tabla.funciones.keys()));
        this.error(n, `La función '${n.nombre}' no está declarada.`, otra
          ? `¿Quisiste decir '${otra}'?`
          : 'Declárala dentro de la clase:  funcion tipo nombre(...) { }');
      }
      return null;
    }

    f.usos++;
    if (tipos.length !== f.parametros.length) {
      this.error(n, `'${n.nombre}' recibe ${f.parametros.length} valor(es) y se le dieron ${tipos.length}.`,
        `Se declaró como  ${n.nombre}(${f.parametros.join(', ')}).`);
      return f.tipo;
    }

    n.argumentos.forEach((a, i) => {
      const pide = f.parametros[i];
      if (tipos[i] === null || pide === 'vacio' || cabe(pide, tipos[i], a)) return;
      this.error(a, `El valor ${i + 1} de '${n.nombre}' debe ser ${pide}, y ` +
        `'${textoExpresion(a)}' es ${nombreTipo(tipos[i])}.`, sugerenciaDeTipos(pide, tipos[i], a));
    });
    return f.tipo;
  }

  /** raiz(16), aleatorio(1, 6), longitud(datos)... */
  nativa (n) {
    this.noEsDelLenguaje(n, n.nombre);   // raiz raizCuadrada raizCubica
    const tipos = n.argumentos.map((a) => this.valor(a));

    // longitud mide una cadena o un arreglo
    if (n.nombre === 'longitud') {
      const tipo = tipos[0];
      if (tipo && tipo !== 'cadena' && !esArreglo(tipo)) {
        this.error(n, `longitud mide una cadena o un arreglo, y '${textoExpresion(n.argumentos[0])}' ` +
          `es ${nombreTipo(tipo)}.`);
      }
      return 'entero';
    }

    // Todas las demas trabajan con numeros
    n.argumentos.forEach((a, i) => {
      if (tipos[i] && !esNumero(tipos[i])) {
        this.error(a, `${n.nombre} trabaja con números, y '${textoExpresion(a)}' es ${nombreTipo(tipos[i])}.`,
          tipos[i] === 'cadena' ? 'Para pasar un texto a número usa convertir(texto, decimal).' : null);
      }
    });

    // Con numeros fijos se pueden revisar algunas cosas desde ahora
    const fijos = n.argumentos.map(numeroFijo);
    switch (n.nombre) {
      case 'aleatorio':
        n.argumentos.forEach((a, i) => {
          if (tipos[i] && esDecimal(tipos[i])) {
            this.error(a, 'aleatorio da un entero entre dos enteros: el mínimo y el máximo deben ser enteros.');
          }
        });
        if (fijos[0] !== null && fijos[1] !== null && fijos[0] > fijos[1]) {
          this.error(n, `En aleatorio(${fijos[0]}, ${fijos[1]}) el mínimo es mayor que el máximo.`,
            `Escríbelos al revés: aleatorio(${fijos[1]}, ${fijos[0]}).`);
        }
        break;
      case 'potencia':
        // La raiz de un numero negativo no tiene resultado real:
        // potencia(-4, 0.5) seria la raiz cuadrada de -4.
        if (fijos[0] !== null && fijos[0] < 0 && fijos[1] !== null && !Number.isInteger(fijos[1])) {
          this.error(n, `No existe la raíz de un número negativo: potencia(${fijos[0]}, ${fijos[1]}).`);
        }
        break;
      case 'logaritmo':
      case 'logaritmo10':
        fijos.forEach((v, i) => {
          if (v !== null && v <= 0) {
            this.error(n.argumentos[i], `El logaritmo solo existe para números mayores que cero (se dio ${v}).`);
          }
        });
        if (n.nombre === 'logaritmo' && n.argumentos.length === 2 && fijos[0] === 1) {
          this.error(n.argumentos[0], 'La base de un logaritmo no puede ser 1.');
        }
        break;
      default:
        break;
    }
    return NATIVAS[n.nombre];
  }

  /**
   * convertir(valor, tipo): pasa un valor a otro tipo.
   *   a cadena      cualquier valor                convertir(5, cadena)
   *   a un numero   un numero, una cadena o un caracter   convertir("22", entero)
   *   a logico      una cadena o un logico          convertir("verdadero", logico)
   *   a caracter    un caracter, una cadena o un entero
   */
  convertir (n) {
    const destino = n.tipoDestino;
    const origen = this.valor(n.valor);
    if (!this.tipoValido(n, destino, 'Un valor convertido')) return null;
    if (origen === null) return destino;

    let permitido = false;
    if (destino === 'cadena') permitido = !esArreglo(origen);
    else if (esNumero(destino)) permitido = esNumero(origen) || origen === 'cadena' || origen === 'caracter';
    else if (destino === 'logico') permitido = origen === 'logico' || origen === 'cadena';
    else if (destino === 'caracter') permitido = origen === 'caracter' || origen === 'cadena' || esEntero(origen);

    if (!permitido) {
      this.error(n, `No se puede convertir ${nombreTipo(origen)} a ${destino}.`,
        origen === 'logico' ? 'Un lógico solo se convierte a cadena.' : null);
      return destino;
    }

    // Un texto escrito tal cual se puede revisar desde ahora:  convertir("hola", entero)
    if (n.valor.tipo === 'Literal' && origen === 'cadena') {
      const texto = n.valor.valor.trim();
      const comillas = `"${n.valor.valor}"`;
      if (esEntero(destino) && !/^[-+]?\d+$/.test(texto)) {
        this.error(n.valor, `${comillas} no es un número entero: no se puede convertir a ${destino}.`);
      } else if (esDecimal(destino) && !/^[-+]?(\d+(\.\d*)?|\.\d+)$/.test(texto)) {
        this.error(n.valor, `${comillas} no es un número: no se puede convertir a ${destino}.`);
      } else if (destino === 'logico' && texto !== 'verdadero' && texto !== 'falso') {
        this.error(n.valor, `${comillas} no es verdadero ni falso: no se puede convertir a logico.`);
      } else if (destino === 'caracter' && n.valor.valor.length !== 1) {
        this.error(n.valor, `${comillas} no es un solo carácter: no se puede convertir a caracter.`);
      }
    }
    return destino;
  }

  /**
   * perimetro.figura(...), area.figura(...), volumen.figura(...)
   * Las medidas son numeros mayores que cero y el resultado es decimal.
   */
  geometrica (n) {
    const figura = `${n.familia}.${n.figura}`;

    const medidas = n.argumentos.map((a) => {
      const tipo = this.valor(a);
      if (tipo && !esNumero(tipo)) {
        this.error(a, `Las medidas de ${figura} son números, y '${textoExpresion(a)}' es ${nombreTipo(tipo)}.`);
      }
      const v = numeroFijo(a);
      if (v !== null && v <= 0) {
        this.error(a, `Una medida de ${figura} debe ser mayor que cero (se dio ${v}).`);
      }
      return v;
    });

    // Un triangulo solo existe si cada lado es menor que la suma de los otros dos.
    const fijas = medidas.length === 3 && medidas.every((v) => v !== null && v > 0);
    if (figura === 'perimetro.triangulo' && fijas) {
      const [a, b, c] = medidas;
      if (a + b <= c || a + c <= b || b + c <= a) {
        this.error(n, `Los lados ${a}, ${b} y ${c} no forman un triángulo.`,
          'Cada lado debe ser menor que la suma de los otros dos.');
      }
    }
    return 'decimal';
  }
}

/**
 * Revisa el sentido de un programa.
 * @param {object} ast            Arbol del programa (sin errores sintacticos).
 * @param {TablaSimbolos} [tabla] La tabla de simbolos del compilador.
 * @returns {{errores: Array, advertencias: Array, tabla: TablaSimbolos}}
 */
function verificar (ast, tabla = new TablaSimbolos()) {
  const verificador = new VerificadorSemantico(tabla);
  verificador.revisar(ast);
  return {
    errores: verificador.errores,
    advertencias: verificador.advertencias,
    tabla: verificador.tabla
  };
}

module.exports = { verificar, cabe, promover };

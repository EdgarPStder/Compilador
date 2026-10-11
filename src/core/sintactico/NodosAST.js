/**
 * NodosAST.js
 * Constructores de los nodos del Arbol de Sintaxis Abstracta (AST) y utilidades
 * para convertirlo en una estructura dibujable por la interfaz.
 *
 * Cada nodo es un objeto plano con:
 *   tipo     : nombre del nodo (coincide con la regla de la gramatica)
 *   linea    : linea del codigo fuente donde inicia
 *   columna  : columna donde inicia
 *   ...campos propios del nodo
 */

/** Crea un nodo con posicion tomada de un token. */
function nodo (tipo, token, campos = {}) {
  return Object.assign(
    {
      tipo,
      linea: token ? token.linea : 0,
      columna: token ? token.columna : 0
    },
    campos
  );
}

/** Campos que nunca se muestran como hijos en el arbol visual. */
const CAMPOS_META = ['tipo', 'linea', 'columna'];

/** true si el valor es un nodo del AST. */
function esNodo (v) {
  return v !== null && typeof v === 'object' && typeof v.tipo === 'string' && 'linea' in v;
}

/**
 * Etiqueta corta para el arbol dibujado: una sola pieza de informacion por
 * nodo, como en los arboles sintacticos de los libros.
 *
 *   a > b   ->      >
 *                 /   \
 *              id1     id2
 *
 * @param {object} n     Nodo del AST.
 * @param {object} mapa  Equivalencias nombre -> idN del analisis lexico.
 */
function etiquetaCompacta (n, mapa = {}) {
  const id = (nombre) => mapa[nombre] || nombre;

  switch (n.tipo) {
    case 'Programa': return 'clase ' + n.nombre;
    case 'ClasePrincipal': return 'clasePrincipal';
    case 'Funcion': return 'funcion ' + n.nombre;
    case 'Parametro': return n.tipoDato + ' ' + id(n.nombre);
    case 'Bloque': return 'bloque';

    case 'Declaracion': return n.tipoDato;
    case 'Declarador': return id(n.nombre);
    case 'Constante': return 'Constante ' + n.tipoDato;
    case 'Arreglo': return 'Arreglo ' + n.tipoDato;
    case 'Matriz': return 'matriz ' + n.tipoDato;
    case 'Inicializador': return '{ }';

    case 'Asignacion': return '=';
    case 'IncrementoStmt': return n.operador;
    case 'Binaria': return n.operador;
    case 'Unaria': return n.operador;
    case 'Postfija': return n.operador;

    // Los números se muestran igual que en la salida léxica: num(9)
    case 'Literal':
      return (n.tipoDato === 'LIT_ENTERO' || n.tipoDato === 'LIT_DECIMAL')
        ? `num(${n.lexema})`
        : n.lexema;
    case 'Variable': return id(n.nombre);
    case 'Indexacion': return id(n.nombre) + '[ ]';

    case 'Llamada': return id(n.nombre) + '( )';
    case 'Nativa': return n.nombre + '( )';
    case 'Geometrica': return n.familia + '.' + n.figura;
    case 'Convertir': return 'convertir a ' + n.tipoDestino;

    case 'Impresion': return n.funcion;
    case 'Leer': return 'leer';
    case 'Equipo': return 'equipo';
    case 'Limpiar': return 'limpiar';
    case 'Esperar': return 'esperar';

    case 'Si': return 'si';
    case 'SinoSi': return 'sinoSi';
    case 'Sino': return 'sino';
    case 'Para': return 'para';
    case 'Mientras': return 'mientras';
    case 'HacerMientras': return 'hacer';
    case 'Opcion': return 'opcion';
    case 'Caso': return 'caso';
    case 'PorDefecto': return 'porDefecto';
    case 'Intentar': return 'intentar';
    case 'Retornar': return 'retornar';
    case 'Romper': return 'romper';
    case 'ExpresionInstruccion': return 'llamada';
    case 'Proposiciones': return 'proposiciones';

    default: return n.tipo;
  }
}

/**
 * Categoría de un operador según su símbolo. Es la misma clasificación que
 * usa la salida léxica, para que un operador tenga el mismo color en los dos
 * paneles: lógicos en azul, relacionales en rojo, aritméticos en negro.
 */
const OPERADORES_LOGICOS = ['&&', '||', '!', 'Y', 'O', 'NO', 'AND', 'OR', 'NOT'];
const OPERADORES_RELACIONALES = ['==', '!=', '<', '>', '<=', '>='];
// El "=" pertenece al grupo aritmetico, igual que en la jerarquia del lenguaje.
const OPERADORES_ARITMETICOS = ['=', '+', '-', '*', '/', '%', '++', '--',
  '^', '**', '√'];

function categoriaOperador (simbolo) {
  if (OPERADORES_LOGICOS.indexOf(simbolo) !== -1) return 'logico';
  if (OPERADORES_RELACIONALES.indexOf(simbolo) !== -1) return 'relacional';
  if (OPERADORES_ARITMETICOS.indexOf(simbolo) !== -1) return 'aritmetico';
  return 'operador';
}

/** Familia de un nodo, para darle color en el dibujo. */
function familiaNodo (n) {
  const tipo = n.tipo;

  if (['Binaria', 'Unaria', 'Postfija', 'Asignacion', 'IncrementoStmt'].indexOf(tipo) !== -1) {
    return categoriaOperador(n.operador);
  }
  if (['Variable', 'Indexacion', 'Declarador', 'Parametro'].indexOf(tipo) !== -1) {
    return 'identificador';
  }
  if (tipo === 'Literal') return 'literal';
  if (['Llamada', 'Nativa', 'Geometrica', 'Convertir', 'Impresion', 'Leer',
    'Equipo', 'Limpiar', 'Esperar'].indexOf(tipo) !== -1) {
    return 'llamada';
  }
  if (['Si', 'SinoSi', 'Sino', 'Para', 'Mientras', 'HacerMientras', 'Opcion',
    'Caso', 'PorDefecto', 'Intentar', 'Retornar', 'Romper'].indexOf(tipo) !== -1) {
    return 'control';
  }
  return 'estructura';
}

/**
 * Convierte el AST en el arbol que dibuja la interfaz:
 *   { etiqueta, familia, tipoNodo, linea, columna, hijos: [...] }
 */
function aArbolCompacto (n, mapa = {}) {
  if (!esNodo(n)) return null;

  // Una proposicion simple con punto y coma (a && b || c;) se dibuja
  // directamente con su expresion: el nodo que la envuelve no dice nada mas.
  // Las llamadas (sumar(1, 2);) conservan su nodo "llamada".
  if (n.tipo === 'ExpresionInstruccion' && n.expresion && n.expresion.tipo !== 'Llamada') {
    return aArbolCompacto(n.expresion, mapa);
  }

  const hijos = [];
  for (const clave of Object.keys(n)) {
    if (CAMPOS_META.indexOf(clave) !== -1) continue;
    const valor = n[clave];

    if (Array.isArray(valor)) {
      for (const item of valor) {
        const hijo = aArbolCompacto(item, mapa);
        if (hijo) hijos.push(hijo);
      }
    } else if (esNodo(valor)) {
      const hijo = aArbolCompacto(valor, mapa);
      if (hijo) hijos.push(hijo);
    }
  }

  return {
    etiqueta: etiquetaCompacta(n, mapa),
    familia: familiaNodo(n),
    tipoNodo: n.tipo,
    linea: n.linea,
    columna: n.columna,
    hijos
  };
}

/** Cuenta nodos totales y profundidad maxima de un arbol dibujable. */
function medirArbol (arbol) {
  if (!arbol) return { nodos: 0, profundidad: 0 };
  let nodos = 1;
  let profundidad = 1;
  for (const h of arbol.hijos) {
    const m = medirArbol(h);
    nodos += m.nodos;
    profundidad = Math.max(profundidad, m.profundidad + 1);
  }
  return { nodos, profundidad };
}

module.exports = {
  nodo,
  etiquetaCompacta,
  categoriaOperador,
  aArbolCompacto,
  medirArbol,
  esNodo
};

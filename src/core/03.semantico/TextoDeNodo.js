/**
 * TextoDeNodo.js
 * Vuelve a escribir un nodo del arbol (AST) como codigo.
 *
 * Lo usa la gramatica generada para decir DE DONDE salio cada produccion:
 *
 *   exp -> exp / exp        en el codigo:  b5 / 20
 *   inst -> si ( exp ) { inst }            si (edad >= 18) { … }
 *
 * Las instrucciones con bloque se recortan con "{ … }" para que el ejemplo
 * quepa en un renglon.
 */

/** Operadores que se escriben con palabra: llevan espacio despues (NO a). */
const OPERADORES_PALABRA = ['Y', 'AND', 'O', 'OR', 'NO', 'NOT'];

/** Una expresion como codigo:  a = b + c > 9 */
function textoExpresion (n) {
  if (!n) return '';
  const lista = (xs) => xs.map(textoExpresion).join(', ');
  let t;

  switch (n.tipo) {
    case 'Literal': t = n.lexema; break;
    case 'Variable': t = n.nombre; break;
    case 'Indexacion':
      t = n.nombre + n.indices.map((i) => `[${textoExpresion(i)}]`).join('');
      break;
    case 'Binaria':
      t = `${textoExpresion(n.izquierda)} ${n.operador} ${textoExpresion(n.derecha)}`;
      break;
    case 'Unaria':
      t = OPERADORES_PALABRA.indexOf(n.operador) !== -1
        ? `${n.operador} ${textoExpresion(n.operando)}`
        : `${n.operador}${textoExpresion(n.operando)}`;
      break;
    case 'Postfija': t = `${textoExpresion(n.operando)}${n.operador}`; break;
    case 'Asignacion': t = `${textoExpresion(n.destino)} = ${textoExpresion(n.valor)}`; break;
    case 'Llamada':
    case 'Nativa': t = `${n.nombre}(${lista(n.argumentos)})`; break;
    case 'Convertir': t = `convertir(${textoExpresion(n.valor)}, ${n.tipoDestino})`; break;
    case 'Geometrica': t = `${n.familia}.${n.figura}(${lista(n.argumentos)})`; break;
    default: t = n.tipo;
  }

  return n.parentesis ? `(${t})` : t;
}

/** Una instruccion como codigo, con su punto y coma y el bloque recortado. */
function textoInstruccion (n) {
  if (!n) return '';
  const e = textoExpresion;
  const lista = (xs) => xs.map(e).join(', ');

  switch (n.tipo) {
    case 'Declaracion':
      return `${n.tipoDato} ${n.declaradores
        .map((d) => (d.valor ? `${d.nombre} = ${e(d.valor)}` : d.nombre)).join(', ')};`;
    case 'Constante': return `Constante ${n.tipoDato} ${n.nombre} = ${e(n.valor)};`;
    case 'Arreglo': return `Arreglo ${n.tipoDato} ${n.nombre}[…];`;
    case 'Matriz': return `matriz ${n.tipoDato} ${n.nombre}[…][…];`;
    case 'Asignacion': return `${e(n.destino)} = ${e(n.valor)};`;
    case 'IncrementoStmt': return `${e(n.destino)}${n.operador};`;
    case 'ExpresionInstruccion': return `${e(n.expresion)};`;
    case 'Impresion': return `${n.funcion}(${lista(n.argumentos)});`;
    case 'Leer': return `leer(${e(n.destino)});`;
    case 'Equipo': return n.conNull ? 'equipo(Null);' : 'equipo();';
    case 'Limpiar': return 'limpiar();';
    case 'Esperar': return `esperar(${e(n.milisegundos)});`;
    case 'Si': return `si (${e(n.condicion)}) { … }` +
      (n.ramas.length > 0 ? ' sinoSi (…) { … }' : '') + (n.sino ? ' sino { … }' : '');
    case 'Para': return 'para (…) { … }';
    case 'Mientras': return `mientras (${e(n.condicion)}) { … }`;
    case 'HacerMientras': return `hacer { … } mientras (${e(n.condicion)});`;
    case 'Opcion': return `opcion (${e(n.expresion)}) { … }`;
    case 'Caso': return `caso ${e(n.valor)}: …`;
    case 'PorDefecto': return 'porDefecto: …';
    case 'Intentar': return `intentar { … } capturar (Error ${n.variableError}) { … }`;
    case 'Retornar': return n.valor ? `retornar ${e(n.valor)};` : 'retornar;';
    case 'Romper': return 'romper;';
    case 'Funcion': return `funcion ${n.tipoRetorno} ${n.nombre}(…) { … }`;
    case 'ClasePrincipal': return 'clasePrincipal { … }';
    case 'Programa': return `clase ${n.nombre} { … }`;
    default: return textoExpresion(n);
  }
}

module.exports = { textoExpresion, textoInstruccion };

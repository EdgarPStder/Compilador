/**
 * ejecutar.js
 * Pruebas automaticas del compilador, sin dependencias externas.
 *
 *   npm run pruebas
 */

const fs = require('fs');
const path = require('path');
const { compilar } = require('../src/core/Compilador');
const { analizarLexico } = require('../src/core/01.lexico/AnalizadorLexico');

let pasadas = 0;
let falladas = 0;
const fallos = [];

function prueba (nombre, fn) {
  try {
    fn();
    pasadas++;
    console.log(`  \x1b[32mOK\x1b[0m   ${nombre}`);
  } catch (e) {
    falladas++;
    fallos.push({ nombre, mensaje: e.message });
    console.log(`  \x1b[31mFALLA\x1b[0m ${nombre}`);
    console.log(`        ${e.message}`);
  }
}

function igual (obtenido, esperado, contexto) {
  if (obtenido !== esperado) {
    throw new Error(`${contexto || ''} esperado: ${esperado}, obtenido: ${obtenido}`);
  }
}

function verdadero (condicion, mensaje) {
  if (!condicion) throw new Error(mensaje || 'se esperaba verdadero');
}

function grupo (titulo) {
  console.log(`\n\x1b[1m${titulo}\x1b[0m`);
}

// =====================================================================
grupo('Analizador lexico');

prueba('reconoce palabras reservadas y tipos', () => {
  const r = analizarLexico('clase entero si mientras');
  igual(r.tokens[0].tipo, 'PALABRA_RESERVADA');
  igual(r.tokens[1].tipo, 'TIPO_DATO');
  igual(r.tokens[2].tipo, 'PALABRA_RESERVADA');
  igual(r.tokens[3].tipo, 'PALABRA_RESERVADA');
});

prueba('distingue identificadores de palabras reservadas', () => {
  const r = analizarLexico('entero miVariable123');
  igual(r.tokens[0].tipo, 'TIPO_DATO');
  igual(r.tokens[1].tipo, 'IDENTIFICADOR');
  igual(r.tokens[1].lexema, 'miVariable123');
});

prueba('reconoce literales numericos con y sin sufijo', () => {
  const r = analizarLexico('20 3.1416 8.5f 3.14d 8000000L');
  igual(r.tokens[0].tipo, 'LIT_ENTERO');
  igual(r.tokens[1].tipo, 'LIT_DECIMAL');
  igual(r.tokens[2].tipo, 'LIT_DECIMAL');
  igual(r.tokens[3].tipo, 'LIT_DECIMAL');
  igual(r.tokens[4].tipo, 'LIT_ENTERO');
  igual(r.tokens[4].valor, 8000000);
});

prueba('reconoce cadenas, caracteres y logicos', () => {
  const r = analizarLexico('"Hola mundo" \'A\' verdadero falso');
  igual(r.tokens[0].tipo, 'LIT_CADENA');
  igual(r.tokens[0].valor, 'Hola mundo');
  igual(r.tokens[1].tipo, 'LIT_CARACTER');
  igual(r.tokens[1].valor, 'A');
  igual(r.tokens[2].tipo, 'LIT_LOGICO');
  igual(r.tokens[3].tipo, 'LIT_LOGICO');
});

prueba('reconoce operadores simples y dobles', () => {
  const r = analizarLexico('+ - * / % == != <= >= ++ -- = < > Y O NO');
  const lexemas = r.tokens.map((t) => t.lexema).slice(0, 17);
  igual(lexemas.join(' '), '+ - * / % == != <= >= ++ -- = < > Y O NO');
  igual(r.tokens[5].tipo, 'OP_RELACIONAL');
  igual(r.tokens[9].tipo, 'OP_INCREMENTO');
  igual(r.tokens[14].tipo, 'OP_LOGICO');
});

prueba('ignora comentarios de linea y de bloque', () => {
  const r = analizarLexico('entero a; // comentario\n/* bloque\nmultilinea */ entero b;');
  const comentarios = r.todosLosTokens.filter((t) => t.ignorado);
  igual(comentarios.length, 2);
  verdadero(r.tokens.every((t) => t.tipo !== 'COMENTARIO'), 'no deben llegar al parser');
});

prueba('detecta cadena sin cerrar', () => {
  const r = analizarLexico('cadena x = "sin cerrar;');
  igual(r.errores.length, 1);
  verdadero(r.errores[0].mensaje.includes('sin cerrar'), 'mensaje incorrecto');
});

prueba('detecta simbolo fuera del alfabeto', () => {
  const r = analizarLexico('entero a = 5 @ 3;');
  igual(r.errores.length, 1);
  igual(r.errores[0].lexema, '@');
});

prueba('detecta numero decimal incompleto', () => {
  const r = analizarLexico('decimal x = 4.;');
  igual(r.errores.length, 1);
  verdadero(r.errores[0].mensaje.includes('incompleto'), 'mensaje incorrecto');
});

prueba('calcula linea y columna correctamente', () => {
  const r = analizarLexico('entero a;\nentero b;\n  entero c;');
  const c = r.tokens.find((t) => t.lexema === 'c');
  igual(c.linea, 3);
  igual(c.columna, 10);
});

prueba('cada token guarda el estado del AFD donde se acepto', () => {
  const r = analizarLexico('entero x = 10;');
  igual(r.tokens[0].estadoFinal, 'q1', 'palabra reservada:');
  igual(r.tokens[2].estadoFinal, 'q12', 'operador:');
  igual(r.tokens[3].estadoFinal, 'q2', 'entero:');
  igual(r.tokens[4].estadoFinal, 'q14', 'delimitador:');
});

// =====================================================================
grupo('Analizador sintactico');

function compilarTexto (txt) { return compilar(txt); }

prueba('acepta el programa minimo', () => {
  const r = compilarTexto('clase p { clasePrincipal { } }');
  igual(r.errores.length, 0, 'errores:');
  igual(r.sintactico.ast.tipo, 'Programa');
  igual(r.sintactico.ast.nombre, 'p');
});

prueba('exige la palabra clase al inicio', () => {
  const r = compilarTexto('programa p { clasePrincipal { } }');
  verdadero(r.errores.length > 0, 'debio reportar error');
});

prueba('exige el bloque clasePrincipal', () => {
  const r = compilarTexto('clase p { }');
  verdadero(r.errores.some((e) => e.mensaje.includes('clasePrincipal')), 'falta el aviso');
});

prueba('detecta punto y coma faltante', () => {
  const r = compilarTexto('clase p { clasePrincipal { entero a = 5 } }');
  verdadero(r.errores.some((e) => e.esperado === ';'), 'no detecto el punto y coma');
});

prueba('analiza declaraciones multiples', () => {
  const r = compilarTexto('clase p { clasePrincipal { entero x, y, z; } }');
  igual(r.errores.length, 0);
  const decl = r.sintactico.ast.principal.cuerpo.instrucciones[0];
  igual(decl.declaradores.length, 3);
});

prueba('respeta la precedencia de operadores', () => {
  const r = compilarTexto('clase p { clasePrincipal { entero a = 2 + 3 * 4; } }');
  igual(r.errores.length, 0);
  const valor = r.sintactico.ast.principal.cuerpo.instrucciones[0].declaradores[0].valor;
  igual(valor.operador, '+');
  igual(valor.derecha.operador, '*', 'la multiplicacion debe quedar mas abajo');
});

prueba('analiza si / sinoSi / sino', () => {
  const r = compilarTexto(
    'clase p { clasePrincipal { si (1 > 0) { } sinoSi (2 > 1) { } sino { } } }');
  igual(r.errores.length, 0);
  const si = r.sintactico.ast.principal.cuerpo.instrucciones[0];
  igual(si.tipo, 'Si');
  igual(si.ramas.length, 1);
  verdadero(si.sino !== null, 'falta el bloque sino');
});

prueba('analiza los tres ciclos', () => {
  const r = compilarTexto(`clase p { clasePrincipal {
    para (entero i = 0; i < 3; i++) { }
    mientras (1 > 0) { }
    hacer { } mientras (1 > 0);
  } }`);
  igual(r.errores.length, 0);
  const ins = r.sintactico.ast.principal.cuerpo.instrucciones;
  igual(ins[0].tipo, 'Para');
  igual(ins[1].tipo, 'Mientras');
  igual(ins[2].tipo, 'HacerMientras');
});

prueba('analiza opcion con casos y porDefecto', () => {
  const r = compilarTexto(`clase p { clasePrincipal {
    opcion (3) { caso 1: romper; caso 2: romper; porDefecto: imprimirLn("otro"); }
  } }`);
  igual(r.errores.length, 0);
  const op = r.sintactico.ast.principal.cuerpo.instrucciones[0];
  igual(op.casos.length, 2);
  verdadero(op.porDefecto !== null, 'falta porDefecto');
});

prueba('rechaza opcion sin casos', () => {
  const r = compilarTexto('clase p { clasePrincipal { opcion (3) { } } }');
  verdadero(r.errores.some((e) => e.mensaje.includes('al menos un caso')), 'no aviso');
});

prueba('analiza funciones con parametros y retorno', () => {
  const r = compilarTexto(
    'clase p { funcion entero f(entero a, cadena b) { retornar a; } clasePrincipal { } }');
  igual(r.errores.length, 0);
  const f = r.sintactico.ast.funciones[0];
  igual(f.nombre, 'f');
  igual(f.tipoRetorno, 'entero');
  igual(f.parametros.length, 2);
});

prueba('analiza intentar / capturar', () => {
  const r = compilarTexto(
    'clase p { clasePrincipal { intentar { } capturar (Error e) { } } }');
  igual(r.errores.length, 0);
  igual(r.sintactico.ast.principal.cuerpo.instrucciones[0].tipo, 'Intentar');
});

prueba('exige capturar despues de intentar', () => {
  const r = compilarTexto('clase p { clasePrincipal { intentar { } } }');
  verdadero(r.errores.some((e) => e.esperado === 'capturar'), 'no exigio capturar');
});

prueba('analiza arreglos y matrices', () => {
  const r = compilarTexto(`clase p { clasePrincipal {
    Arreglo entero datos[3];
    Arreglo cadena n[] = {"a", "b"};
    matriz entero t[2][2] = {{1, 2}, {3, 4}};
  } }`);
  igual(r.errores.length, 0);
  const ins = r.sintactico.ast.principal.cuerpo.instrucciones;
  igual(ins[0].tipo, 'Arreglo');
  igual(ins[2].tipo, 'Matriz');
  igual(ins[2].numDimensiones, 2);
});

prueba('valida la aridad de las funciones nativas', () => {
  const r = compilarTexto('clase p { clasePrincipal { entero a = aleatorio(1); } }');
  verdadero(r.errores.some((e) => e.mensaje.includes('aleatorio')), 'no valido la aridad');
});

prueba('valida las figuras geometricas', () => {
  const ok = compilarTexto('clase p { clasePrincipal { decimal a = area.circulo(5); } }');
  igual(ok.errores.length, 0);
  const mal = compilarTexto('clase p { clasePrincipal { decimal a = area.dodecaedro(5); } }');
  verdadero(mal.errores.some((e) => e.mensaje.includes('no es una figura valida')), 'no valido');
});

prueba('recupera el analisis y reporta varios errores', () => {
  const r = compilarTexto(`clase p { clasePrincipal {
    entero a = 1
    entero b = 2
    entero c = 3
  } }`);
  verdadero(r.errores.length >= 2, `se esperaban varios errores, hubo ${r.errores.length}`);
});

prueba('el arbol se puede recorrer y medir', () => {
  const r = compilarTexto('clase p { clasePrincipal { entero a = 1 + 2; } }');
  const arbol = r.sintactico.arbol;
  verdadero(arbol && arbol.etiqueta === 'clase p', 'raiz incorrecta');
  verdadero(r.sintactico.estadisticas.nodos > 5, 'faltan nodos');
  verdadero(r.sintactico.estadisticas.profundidad > 3, 'falta profundidad');
});

// =====================================================================
grupo('Salida del analisis lexico (id1, id2...)');

prueba('a > b produce id1 > id2', () => {
  const r = compilar('a > b');
  igual(r.lexico.salida, 'id1 > id2');
  igual(r.errores.length, 0);
});

prueba('el mismo identificador recibe siempre la misma etiqueta', () => {
  const r = compilar('a + a + b');
  igual(r.lexico.salida, 'id1 + id1 + id2');
  igual(r.lexico.identificadores.length, 2);
  igual(r.lexico.identificadores[0].veces, 2);
});

prueba('los numeros se muestran como num(valor)', () => {
  igual(compilar('entero edad = 20;').lexico.salida, 'entero id1 = num(20);');
  igual(compilar('x = 3.5;').lexico.salida, 'id1 = num(3.5);');
  igual(compilar('a > 9').lexico.salida, 'id1 > num(9)');
});

prueba('un nombre despues de un punto es miembro, no variable', () => {
  const r = compilar('decimal r = area.circulo(5);');
  igual(r.lexico.salida, 'decimal id1 = area.circulo(num(5));');
  igual(r.lexico.identificadores.length, 1);
});

prueba('las llamadas van pegadas y las estructuras de control separadas', () => {
  igual(compilar('imprimirLn("Hola");').lexico.salida, 'imprimirLn("Hola");');
  igual(compilar('si (a > b) { }').lexico.salida, 'si (id1 > id2) { }');
  igual(compilar('t[1][2] = 0;').lexico.salida, 'id1[num(1)][num(2)] = num(0);');
});

prueba('la salida respeta las lineas del codigo', () => {
  const r = compilar('entero a = 1;\nentero b = 2;');
  igual(r.lexico.lineas.length, 2);
  igual(r.lexico.lineas[0].texto, 'entero id1 = num(1);');
  igual(r.lexico.lineas[1].texto, 'entero id2 = num(2);');
});

// =====================================================================
grupo('Analisis de fragmentos y arbol dibujable');

prueba('una expresion suelta se analiza sin envolverla en una clase', () => {
  const r = compilar('a > b');
  igual(r.sintactico.modo, 'expresion');
  igual(r.errores.length, 0);
});

prueba('el arbol de a > b tiene la forma pedida', () => {
  const a = compilar('a > b').sintactico.arbol;
  igual(a.etiqueta, '>', 'raiz:');
  igual(a.hijos.length, 2);
  igual(a.hijos[0].etiqueta, 'id1', 'rama izquierda:');
  igual(a.hijos[1].etiqueta, 'id2', 'rama derecha:');
  igual(a.familia, 'relacional');
  igual(a.hijos[0].familia, 'identificador');
});

prueba('la precedencia se ve en la forma del arbol', () => {
  const a = compilar('2 + 3 * 4').sintactico.arbol;
  igual(a.etiqueta, '+');
  igual(a.hijos[0].etiqueta, 'num(2)');
  igual(a.hijos[1].etiqueta, '*', 'la multiplicacion va mas abajo:');
});

prueba('una instruccion sin la clase es un error, como en Java', () => {
  const r = compilar('entero a = 5;');
  igual(r.sintactico.modo, 'instrucciones');
  igual(r.errores.length, 1);
  verdadero(r.errores[0].mensaje.startsWith('Falta la clase'), r.errores[0].mensaje);
  igual(r.errores[0].linea, 1);
  // Aun asi se revisan las instrucciones: los demas errores tambien salen
  igual(r.sintactico.arbol.etiqueta, 'entero');
  igual(compilar('entero a = 5\nimprimirLn(a);').errores.length, 2, 'falta la clase y el ;');
});

prueba('clasePrincipal o una funcion sin la clase tambien la piden', () => {
  ['clasePrincipal { entero a = 5; }', 'funcion vacio f() { }'].forEach((fuente) => {
    const e = compilar(fuente).errores[0];
    verdadero(e && e.mensaje.startsWith('Falta la clase'), `${fuente}: ${e && e.mensaje}`);
  });
});

prueba('el punto y coma que falta se marca al final de su renglon', () => {
  const e = compilar('clase p { clasePrincipal {\n  entero a = 5\n  imprimirLn(a);\n} }').errores[0];
  igual(e.mensaje, "Falta ';' al final de la declaracion.");
  igual(e.linea, 2, 'el renglon donde falta:');
  igual(e.columna, 15, 'justo despues del 5:');
});

prueba('un programa completo sigue analizandose como programa', () => {
  const r = compilar('clase p { clasePrincipal { entero a = 1; } }');
  igual(r.sintactico.modo, 'programa');
  igual(r.errores.length, 0);
  verdadero(r.sintactico.arbol.etiqueta.indexOf('clase p') !== -1, 'raiz incorrecta');
});

prueba('un fragmento mal escrito reporta el error', () => {
  const r = compilar('a > ');
  verdadero(r.errores.length > 0, 'debio reportar un error');
});

prueba('se puede pedir solo la fase lexica', () => {
  const r = compilar('a > b', { soloLexico: true });
  igual(r.lexico.salida, 'id1 > id2');
  igual(r.sintactico, null, 'no debe ejecutar la fase 2:');
});

prueba('el modo se puede forzar', () => {
  igual(compilar('a > b', { modo: 'expresion' }).sintactico.modo, 'expresion');
  igual(compilar('entero a = 1;', { modo: 'instrucciones' }).sintactico.modo, 'instrucciones');
  verdadero(compilar('a > b', { modo: 'programa' }).errores.length > 0,
    'en modo programa debe exigir la clase');
});

prueba('varias proposiciones sueltas, una por renglon', () => {
  const r = compilar('a = b + c\na && b || c + f > d');
  igual(r.errores.length, 0, 'no debe haber errores:');
  igual(r.sintactico.arbol.etiqueta, 'proposiciones');
  igual(r.sintactico.arbol.hijos.map((h) => h.etiqueta).join(' '), '= ||');
});

prueba('una expresion puede seguir en el renglon de abajo', () => {
  const r = compilar('a = b +\n    c');
  igual(r.errores.length, 0, 'no debe haber errores:');
  igual(r.sintactico.arbol.etiqueta, '=', 'es una sola proposicion');
});

prueba('dos expresiones en el mismo renglon siguen siendo un error', () => {
  verdadero(compilar('a = b + c d').errores[0].mensaje.includes("Sobra 'd'"));
});

/** Un codigo dentro de clase y clasePrincipal, en el mismo renglon. */
function enClase (...renglones) {
  return `clase prueba { clasePrincipal { ${renglones.join(' ')} } }`;
}

prueba('solo se reconocen las instrucciones del lenguaje', () => {
  // Igual que en Java, una expresion sola con punto y coma no es instruccion
  ['a > b;', 'a;', 'a && b || c + f > d;', 'raiz(16);'].forEach((fuente) => {
    const r = compilar(enClase(fuente));
    verdadero(r.errores.some((e) => e.mensaje.includes('no es una instruccion del lenguaje')),
      `${fuente} deberia marcar error`);
  });
});

prueba('las palabras de Java dicen cual es la de SwordByte', () => {
  const casos = {
    'break;': 'romper',
    'int x = 5;': 'entero',
    'printf("Hola");': 'imprimirF',
    'x = true;': 'verdadero',
    'para (int i = 0; i < 3; i++) { }': 'entero'
  };
  Object.keys(casos).forEach((fuente) => {
    const e = compilar(enClase(fuente)).errores[0];
    verdadero(e && e.mensaje.includes('no es una palabra de SwordByte') &&
      e.sugerencia.includes(casos[fuente]), `${fuente}: ${e && e.mensaje} / ${e && e.sugerencia}`);
  });
});

prueba('las instrucciones de siempre se siguen reconociendo', () => {
  const ast = compilar(enClase('i++; sumar(5, 3); a[1] = 2;')).sintactico.ast;
  igual(ast.principal.cuerpo.instrucciones.map((i) => i.tipo).join(' '),
    'IncrementoStmt ExpresionInstruccion Asignacion');
  verdadero(compilar(enClase('a b;')).errores[0].mensaje.includes("Falta '='"),
    'a b; debe seguir pidiendo el =');
});

// =====================================================================
grupo('Operadores logicos, relacionales y aritmeticos');

prueba('los tres operadores logicos admiten sus tres formas', () => {
  // O / OR / ||   ,   Y / AND / &&   ,   NO / NOT / !
  for (const o of ['O', 'OR', '||']) {
    igual(compilar(`a ${o} b`).errores.length, 0, `con ${o}:`);
    igual(compilar(`a ${o} b`).sintactico.arbol.familia, 'logico', `con ${o}:`);
  }
  for (const y of ['Y', 'AND', '&&']) {
    igual(compilar(`a ${y} b`).errores.length, 0, `con ${y}:`);
    igual(compilar(`a ${y} b`).sintactico.arbol.familia, 'logico', `con ${y}:`);
  }
  for (const no of ['NO', 'NOT', '!']) {
    igual(compilar(`${no} a`).errores.length, 0, `con ${no}:`);
    igual(compilar(`${no} a`).sintactico.arbol.familia, 'logico', `con ${no}:`);
  }
});

prueba('los seis relacionales se reconocen', () => {
  for (const op of ['==', '!=', '<', '<=', '>', '>=']) {
    const r = compilar(`a ${op} b`);
    igual(r.errores.length, 0, `con ${op}:`);
    igual(r.sintactico.arbol.etiqueta, op);
    igual(r.sintactico.arbol.familia, 'relacional', `con ${op}:`);
  }
});

prueba('cada categoria de operador lleva su color', () => {
  igual(compilar('a + b').sintactico.arbol.familia, 'aritmetico');
  igual(compilar('a > b').sintactico.arbol.familia, 'relacional');
  igual(compilar('a Y b').sintactico.arbol.familia, 'logico');
  // El "=" pertenece al grupo aritmetico, igual que en la jerarquia
  igual(compilar('a = b').sintactico.arbol.familia, 'aritmetico');
});

prueba('la salida lexica marca la categoria de cada token', () => {
  const piezas = compilar('a + b > 9 AND verdadero').lexico.lineas[0].piezas;
  const porTexto = {};
  piezas.forEach((p) => { porTexto[p.texto] = p.categoria; });
  igual(porTexto['+'], 'aritmetico');
  igual(porTexto['>'], 'relacional');
  igual(porTexto.AND, 'logico');
  igual(porTexto.verdadero, 'logico');
  igual(porTexto['num(9)'], 'numero');
  igual(porTexto.id1, 'identificador');
});

prueba('la jerarquia es booleanos, luego relacionales, luego aritmeticos', () => {
  //   a = b + c > 9 AND d > e OR f <= 30
  //
  //                    OR                 <- booleanos
  //                 /      \
  //              AND        <=            <- relacionales
  //            /     \     /    \
  //           >       >  id6  num(30)
  //         /   \   /   \
  //        =  num(9) id4 id5              <- aritmeticos
  //      /   \
  //    id1    +
  //         /   \
  //       id2   id3
  const or = compilar('a = b + c > 9 AND d > e OR f <= 30').sintactico.arbol;

  igual(or.etiqueta, 'OR', 'hasta arriba va el booleano:');
  igual(or.familia, 'logico');

  const and = or.hijos[0];
  igual(and.etiqueta, 'AND', 'el AND va debajo del OR:');
  igual(and.familia, 'logico');

  const mayor = and.hijos[0];
  igual(mayor.etiqueta, '>', 'debajo de los booleanos van los relacionales:');
  igual(mayor.familia, 'relacional');

  const asignacion = mayor.hijos[0];
  igual(asignacion.etiqueta, '=', 'el igual pertenece al grupo aritmetico:');
  igual(asignacion.familia, 'aritmetico');

  const suma = asignacion.hijos[1];
  igual(suma.etiqueta, '+', 'hasta abajo van los aritmeticos:');
  igual(suma.hijos[0].etiqueta, 'id2');
  igual(suma.hijos[1].etiqueta, 'id3');
});

prueba('los parentesis cambian el orden', () => {
  // Sin parentesis el AND queda arriba del relacional
  const sin = compilar('a > b AND c').sintactico.arbol;
  igual(sin.etiqueta, 'AND');
  igual(sin.hijos[0].etiqueta, '>');

  // Con parentesis el relacional pasa a quedar arriba
  const con = compilar('a > (b AND c)').sintactico.arbol;
  igual(con.etiqueta, '>', 'el parentesis sube el relacional:');
  igual(con.hijos[1].etiqueta, 'AND');

  // Y tambien fuerzan el orden entre aritmeticos
  const agrupado = compilar('(2 + 3) * 4').sintactico.arbol;
  igual(agrupado.etiqueta, '*');
  igual(agrupado.hijos[0].etiqueta, '+');
});

prueba('la potencia queda debajo de la multiplicacion', () => {
  //   2 * 3 ^ 2                *
  //                          /     //                     num(2)    ^        <- la potencia se resuelve primero
  //                             /     //                        num(3)  num(2)
  const a = compilar('2 * 3 ^ 2').sintactico.arbol;
  igual(a.etiqueta, '*', 'arriba queda la multiplicacion:');
  igual(a.hijos[1].etiqueta, '^', 'la potencia cuelga debajo:');

  // Lo mismo con la division y el residuo
  igual(compilar('8 / 2 ^ 2').sintactico.arbol.etiqueta, '/');
  igual(compilar('9 % 2 ^ 3').sintactico.arbol.etiqueta, '%');

  // Y por encima de ella siguen la suma y la resta
  const b = compilar('1 + 2 ^ 3').sintactico.arbol;
  igual(b.etiqueta, '+');
  igual(b.hijos[1].etiqueta, '^');
});

prueba('** es lo mismo que ^', () => {
  const a = compilar('2 ** 3').sintactico.arbol;
  igual(a.etiqueta, '**');
  igual(a.familia, 'aritmetico', 'la potencia se pinta de negro:');
  igual(a.hijos[0].etiqueta, 'num(2)');
  igual(a.hijos[1].etiqueta, 'num(3)');

  // Se pueden mezclar las dos formas en la misma expresion
  igual(compilar('2 ^ 3 ** 2').errores.length, 0);
});

prueba('la potencia se agrupa de derecha a izquierda', () => {
  //   2 ^ 3 ^ 2   es   2 ^ (3 ^ 2)
  const a = compilar('2 ^ 3 ^ 2').sintactico.arbol;
  igual(a.etiqueta, '^');
  igual(a.hijos[0].etiqueta, 'num(2)');
  igual(a.hijos[1].etiqueta, '^', 'la segunda potencia cuelga a la derecha:');
});

prueba('el menos y la potencia se llevan como en matematicas', () => {
  //   -2 ^ 2   es   -(2 ^ 2) = -4,  no  (-2) ^ 2 = 4
  const a = compilar('-2 ^ 2').sintactico.arbol;
  igual(a.etiqueta, '-', 'el menos abarca toda la potencia:');
  igual(a.hijos[0].etiqueta, '^');

  //   2 ^ -3   el exponente si puede ser negativo
  const b = compilar('2 ^ -3').sintactico.arbol;
  igual(b.etiqueta, '^');
  igual(b.hijos[1].etiqueta, '-', 'el exponente negativo cuelga a la derecha:');
});

prueba('la raiz se escribe con el simbolo o con la funcion', () => {
  // El simbolo es un operador de un solo operando
  const s = compilar('√16').sintactico.arbol;
  igual(s.etiqueta, '√');
  igual(s.familia, 'aritmetico', 'la raiz se pinta de negro:');
  igual(s.hijos[0].etiqueta, 'num(16)');
  igual(compilar('√16 + 2').lexico.salida, '√num(16) + num(2)',
    'el simbolo va pegado a su valor:');

  // Las funciones aceptan uno o dos argumentos
  igual(compilar('raiz(9)').errores.length, 0, 'raiz(9):');
  igual(compilar('raiz(27, 3)').errores.length, 0, 'raiz(27, 3):');
  igual(compilar('raizCuadrada(9)').errores.length, 0, 'raizCuadrada(9):');
  igual(compilar('raizCubica(27)').errores.length, 0, 'raizCubica(27):');
});

prueba('la raiz tambien queda debajo de la multiplicacion', () => {
  //   √16 * 2          *
  //                  /     //                 √    num(2)
  const a = compilar('√16 * 2').sintactico.arbol;
  igual(a.etiqueta, '*', 'arriba queda la multiplicacion:');
  igual(a.hijos[0].etiqueta, '√', 'la raiz cuelga debajo:');

  // Se puede combinar con el menos unario
  igual(compilar('-√16').sintactico.arbol.etiqueta, '-');
});

prueba('la negacion es booleana: niega la comparacion completa', () => {
  // NO a > b  =  NO (a > b)
  const n = compilar('NO a > b').sintactico.arbol;
  igual(n.etiqueta, 'NO');
  igual(n.hijos[0].etiqueta, '>', 'la negacion abarca toda la comparacion:');

  // Pero el NO se aplica antes que el Y:  NO a Y b  =  (NO a) Y b
  const y = compilar('NO a Y b').sintactico.arbol;
  igual(y.etiqueta, 'Y');
  igual(y.hijos[0].etiqueta, 'NO', 'el NO queda debajo del Y:');
  igual(y.hijos[1].etiqueta, 'id2');
});

prueba('una asignacion se analiza sin punto y coma', () => {
  const r = compilar('a = b + c > 9 AND d > e OR f <= 30');
  igual(r.errores.length, 0, 'errores:');
  igual(r.sintactico.modo, 'expresion');
  igual(r.lexico.salida, 'id1 = id2 + id3 > num(9) AND id4 > id5 OR id6 <= num(30)');
});

prueba('la asignacion asocia a la derecha', () => {
  const a = compilar('a = b = 5').sintactico.arbol;
  igual(a.etiqueta, '=');
  igual(a.hijos[0].etiqueta, 'id1');
  igual(a.hijos[1].etiqueta, '=', 'la segunda asignacion cuelga a la derecha:');
});

prueba('no se puede asignar a algo que no es variable', () => {
  const r = compilar('5 = a');
  verdadero(r.errores.some((e) => e.mensaje.includes('debe ir una variable')),
    'no aviso del destino invalido');
});

// =====================================================================
grupo('Reporte que se guarda');

const { construirReporte, extraerCodigoFuente, arbolATexto } =
  require('../src/core/Reporte');
const { integrantesOrdenados, MATERIA } = require('../src/core/comun/Equipo');

function reporteDe (fuente, nombre) {
  return construirReporte(compilar(fuente), { nombrePrograma: nombre || 'prueba.bs' });
}

prueba('el encabezado trae los datos de la materia y del equipo', () => {
  const r = reporteDe('a > b', 'ejemplo.bs');
  verdadero(r.includes('ejemplo.bs'), 'falta el nombre del programa');
  verdadero(r.includes('SwordByte'), 'falta el nombre del equipo');
  verdadero(r.includes(MATERIA.nombre), 'falta la materia');
  verdadero(r.includes(`${MATERIA.grado}° ${MATERIA.grupo}`), 'falta grado y grupo');
  verdadero(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}/.test(r), 'falta la fecha y hora');
});

prueba('el encabezado lista a los seis integrantes', () => {
  const r = reporteDe('a > b');
  integrantesOrdenados().forEach((p) => {
    verdadero(r.includes(`${p.apellidos} ${p.nombres}`), `falta ${p.apellidos}`);
  });
});

prueba('el reporte trae las tres secciones', () => {
  const r = reporteDe('a > b');
  verdadero(r.includes('1. CÓDIGO FUENTE'), 'falta el codigo fuente');
  verdadero(r.includes('2. ANÁLISIS LÉXICO'), 'falta el analisis lexico');
  verdadero(r.includes('3. ANÁLISIS SINTÁCTICO'), 'falta el analisis sintactico');
  verdadero(r.includes('id1 > id2'), 'falta la salida lexica');
  verdadero(r.includes('id1 = a'), 'faltan las equivalencias');
});

prueba('el reporte escribe el arbol en texto', () => {
  const r = reporteDe('a = b + c > 9 AND d > e OR f <= 30');
  verdadero(r.includes('OR'), 'falta la raiz del arbol');
  verdadero(r.includes('├──') && r.includes('└──'), 'faltan las ramas del arbol');
});

prueba('el reporte sigue siendo un programa valido', () => {
  const fuente = 'clase p { clasePrincipal { entero a = 5; } }';
  const r = reporteDe(fuente);
  // Todo lo que no es codigo va en comentarios, asi que al compilar el
  // reporte completo se obtiene el mismo resultado que con el fuente solo.
  const deReporte = compilar(r);
  igual(deReporte.errores.length, 0, 'el reporte no deberia dar errores:');
  igual(deReporte.lexico.salida, compilar(fuente).lexico.salida);
});

prueba('al abrirlo se recupera solo el codigo fuente', () => {
  const fuente = 'a = b + c > 9 AND d > e OR f <= 30';
  const r = reporteDe(fuente);
  igual(extraerCodigoFuente(r), fuente);
});

prueba('guardar dos veces no anida reportes', () => {
  const fuente = 'a > b';
  const primero = reporteDe(fuente);
  const segundo = construirReporte(compilar(extraerCodigoFuente(primero)), {});
  igual(extraerCodigoFuente(segundo), fuente);
  igual((segundo.match(/1\. CÓDIGO FUENTE/g) || []).length, 1, 'secciones repetidas:');
});

prueba('un archivo sin marcas se abre tal cual', () => {
  igual(extraerCodigoFuente('entero a = 5;'), 'entero a = 5;');
});

prueba('el arbol en texto lleva el mismo orden que el dibujado', () => {
  // a > b  ->   >
  //             ├── id1
  //             └── id2
  const lineas = arbolATexto(compilar('a > b').sintactico.arbol);
  igual(lineas[0], '>', 'la raiz va sola en el primer renglon');
  verdadero(lineas[1].endsWith('id1'), 'id1 va primero (rama izquierda)');
  verdadero(lineas[2].endsWith('id2'), 'id2 va despues (rama derecha)');
  verdadero(lineas[2].startsWith('└──'), 'el ultimo hijo cierra la rama');
});

prueba('el arbol de un programa completo cabe a lo ancho', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '03-control.bs'), 'utf8');
  const lineas = arbolATexto(compilar(fuente).sintactico.arbol);
  verdadero(lineas[0].startsWith('clase'), 'la raiz va en el primer renglon');
  const ancho = Math.max(...lineas.map((l) => l.length));
  verdadero(ancho <= 110, `el arbol deberia caber a lo ancho, mide ${ancho}`);
});

prueba('un BOM al inicio no rompe el analisis', () => {
  const r = compilar('﻿a > b');
  igual(r.errores.length, 0, 'el BOM no deberia dar error:');
  igual(r.lexico.salida, 'id1 > id2');
});

// =====================================================================
grupo('Tabla lexica (pestaña 1)');

prueba('cada token lleva su nombre y su descripcion', () => {
  const tabla = compilar('a = b + c * 24').lexico.tabla;
  igual(tabla.length, 7, 'renglones:');
  igual(tabla.map((f) => f.token).join(','),
    'identificador,operador asignación,identificador,operador suma,' +
    'identificador,operador multiplicación,número entero');
  igual(tabla[6].descripcion, 'Valor numérico entero (24)');
});

prueba('el identificador dice su etiqueta id1, id2...', () => {
  const tabla = compilar('a > b').lexico.tabla;
  verdadero(tabla[0].descripcion.endsWith('(id1)'), tabla[0].descripcion);
  verdadero(tabla[2].descripcion.endsWith('(id2)'), tabla[2].descripcion);
});

prueba('los operadores logicos con palabra tienen el mismo nombre que su simbolo', () => {
  const tabla = compilar('a AND b && c Y d').lexico.tabla;
  igual(tabla[1].token, 'operador Y lógico');
  igual(tabla[3].token, 'operador Y lógico');
  igual(tabla[5].token, 'operador Y lógico');
});

prueba('un error lexico sale en la tabla con su mensaje', () => {
  const r = compilar('entero a = 4.;');
  const fila = r.lexico.tabla.find((f) => f.categoria === 'error');
  verdadero(fila, 'no aparecio la fila del error');
  igual(fila.token, 'error léxico');
  igual(fila.descripcion, r.lexico.errores[0].mensaje);
});

prueba('los comentarios no salen en la tabla', () => {
  igual(compilar('a // comentario').lexico.tabla.length, 1);
});

// =====================================================================
grupo('Analizador semantico: que el codigo tenga sentido (pestaña 3)');

const { reglaATexto, claseDeCaracter } = require('../src/core/03.semantico/AnalizadorSemantico');
const { TablaSimbolos } = require('../src/core/comun/TablaSimbolos');

/** El resultado semantico de un codigo. */
function semanticoDe (fuente) {
  return compilar(fuente).semantico;
}

/**
 * Un programa con ese codigo: si no trae su clase, se mete dentro de
 * clase prueba { clasePrincipal { ... } }, en el mismo renglon (asi los
 * numeros de renglon no cambian).
 */
function programaDe (codigo) {
  return codigo.startsWith('clase ') ? codigo : enClase(codigo);
}

/** Los mensajes de error semantico de un codigo, juntos en un texto. */
function mensajesDe (codigo) {
  return semanticoDe(programaDe(codigo)).errores.map((e) => e.mensaje).join(' / ');
}

/** Revisa que un codigo no tenga errores semanticos. */
function sinErrores (codigo) {
  const s = semanticoDe(programaDe(codigo));
  igual(s.estado, 'analizado', `estado de "${codigo}":`);
  igual(s.errores.length, 0, `"${codigo}" no deberia tener errores: ${mensajesDe(codigo)} /`);
}

/** Revisa que un codigo tenga un error que diga "parte". */
function conError (codigo, parte) {
  const errores = mensajesDe(codigo);
  verdadero(errores.includes(parte), `"${codigo}" deberia decir «${parte}», dice: ${errores || '(nada)'}`);
}

prueba('como en Java, sin la clase no hay analisis semantico', () => {
  // Una expresion suelta: falta la clase
  ['a = b + c', 'a1 = b5 / 20', 'a && b || c + f > d', 'a = b + c\nx > y'].forEach((fuente) => {
    const s = semanticoDe(fuente);
    igual(s.estado, 'sin-clase', `"${fuente}":`);
    verdadero(s.errores[0].mensaje.startsWith('Falta la clase'), s.errores[0].mensaje);
    igual(s.reglas.length, 0, 'sin gramatica:');
  });
  // Instrucciones sueltas: el sintactico ya dice que falta la clase
  const s = semanticoDe('a1 = b5 / 20;');
  igual(s.estado, 'errores-previos');
  verdadero(s.errores[0].mensaje.startsWith('Falta la clase'), s.errores[0].mensaje);
});

prueba('con errores lexicos o sintacticos no revisa nada y dice por que', () => {
  const s = semanticoDe(enClase('entero = 5;'));
  igual(s.estado, 'errores-previos');
  igual(s.correcto, false);
  igual(s.reglas.length, 0);
  verdadero(s.errores.length > 0 && s.errores[0].fase === 'Sintáctica', 'debe traer los errores sintacticos');
});

prueba('sin codigo no hay nada que revisar', () => {
  const s = semanticoDe('');
  igual(s.estado, 'vacio');
  verdadero(s.vacio, 'debe marcarse vacio');
  igual(s.errores.length, 0);
});

prueba('todos los ejemplos correctos tienen sentido y generan su gramatica', () => {
  const dir = path.join(__dirname, '..', 'ejemplos');
  fs.readdirSync(dir).filter((f) => !f.includes('error')).forEach((f) => {
    const s = semanticoDe(fs.readFileSync(path.join(dir, f), 'utf8'));
    igual(s.errores.length, 0, `${f} tiene errores semanticos: ${s.errores.map((e) => e.mensaje).join(' / ')} /`);
    verdadero(s.correcto && s.reglas[0].regla === 'prop', `${f} no genero su gramatica`);
  });
});

prueba('un nombre se declara antes de usarse', () => {
  conError('y = 5;', "'y' no está declarada");
  conError('saludar();', "La función 'saludar' no está declarada");
  sinErrores('entero y;\ny = 5;\nimprimirLn(y);');
});

prueba('si un nombre esta mal escrito sugiere el parecido', () => {
  const e = semanticoDe(enClase('entero edad = 3;\nimprimirLn(Edad);')).errores[0];
  igual(e.sugerencia, "¿Quisiste decir 'edad'?");
  igual(e.linea, 2);
});

prueba('un nombre no se repite dentro de la misma funcion', () => {
  conError('entero x = 1;\nentero x = 2;', "'x' ya está declarada (línea 1)");
  conError('para (entero i = 0; i < 3; i++) { entero i = 2; }', "'i' ya está declarada");
  // Dos ciclos seguidos si pueden usar el mismo contador
  sinErrores('para (entero i = 0; i < 3; i++) { imprimirLn(i); }\npara (entero i = 0; i < 3; i++) { imprimirLn(i); }');
});

prueba('lo que se declara en un bloque no existe afuera', () => {
  conError('si (verdadero) { entero t = 1; }\nt = 2;', "'t' no está declarada");
});

prueba('el valor que se guarda debe caber en el tipo', () => {
  conError('entero x = "hola";', "Tipos incompatibles: 'x' es entero y el valor es cadena");
  conError('entero a = 2.5;', "'a' es entero y el valor es decimal");
  conError('byte b = 200;', "'b' es byte y el valor es entero");
  conError('cadena n = 5;', "'n' es cadena y el valor es entero");
  sinErrores('decimal d = 5;\nimprimirLn(d);');           // un entero cabe en un decimal
  sinErrores('byte b = 100;\nimprimirLn(b);');            // 100 cabe en un byte
  sinErrores('largo l = 8000000L;\nimprimirLn(l);');
  const flotante = semanticoDe(enClase('flotante f = 8.5;')).errores[0];
  igual(flotante.sugerencia, 'Para un flotante, el número lleva f al final: 8.5f');
  sinErrores('flotante f = 8.5f;\nimprimirLn(f);');
});

prueba('las condiciones deben ser logicas', () => {
  conError('entero x = 5;\nsi (x) { imprimirLn(x); }', 'La condición de si debe ser lógica');
  conError('entero x = 5;\nmientras (x + 1) { x++; }', 'La condición de mientras debe ser lógica');
  const asignacion = semanticoDe(enClase('entero x = 5;\nsi (x = 5) { imprimirLn(x); }')).errores[0];
  verdadero(asignacion.sugerencia.includes('=='), 'debe sugerir ==');
});

prueba('cada operador revisa el tipo de sus lados', () => {
  conError('cadena s = "a";\nentero n = s * 2;', "* trabaja con números, y 's * 2' es cadena * entero");
  conError('logico l = 5 > "a";', '> compara números');
  conError('logico l = 5 Y verdadero;', 'Y une condiciones lógicas');
  conError('logico l = NO 5;', 'NO niega una condición lógica');
  conError('cadena n = "Ana";\nlogico l = n == 5;', 'No se puede comparar cadena == entero');
  sinErrores('cadena s = "Total: " + 5;\nimprimirLn(s);');   // + con una cadena junta textos
  sinErrores('entero a = 2;\ndecimal b = a * 1.5;\nimprimirLn(b);');
});

prueba('en el lenguaje la logica es Y, O, NO y las potencias son potencia()', () => {
  const noSeUsan = {
    'logico l = 1 > 0 && verdadero;': '&&',
    'logico l = 1 > 0 || verdadero;': '||',
    'logico l = !verdadero;': '!',
    'logico l = 1 > 0 AND verdadero;': 'AND',
    'logico l = 1 > 0 OR verdadero;': 'OR',
    'logico l = NOT verdadero;': 'NOT',
    'decimal p = 2 ^ 3;': '^',
    'decimal p = 2 ** 3;': '**',
    'decimal r = √16;': '√',
    'decimal r = raiz(16);': 'raiz',
    'decimal r = raizCuadrada(16);': 'raizCuadrada',
    'decimal r = raizCubica(27);': 'raizCubica'
  };
  Object.keys(noSeUsan).forEach((codigo) => {
    conError(codigo, `'${noSeUsan[codigo]}' no se usa en SwordByte.`);
    // En las pestañas 1 y 2 si se reconocen: no son errores lexicos ni sintacticos
    igual(compilar(enClase(codigo)).errores.length, 0, `${codigo} en la pestaña 2:`);
  });
  // Cada uno dice que se escribe en su lugar
  igual(semanticoDe(enClase('logico l = 1 > 0 && verdadero;')).errores[0].sugerencia,
    'El Y lógico se escribe Y:  a > 0 Y b > 0');
  verdadero(semanticoDe(enClase('decimal r = raiz(16);')).errores[0].sugerencia.includes('potencia(x, 0.5)'),
    'la raiz se saca con potencia');
  // Lo que si es del lenguaje
  sinErrores('logico l = 1 > 0 Y NO (2 > 3) O falso;\nimprimirLn(l);');
  sinErrores('decimal r = potencia(27, 1.0 / 3) + potencia(2, 10);\nimprimirLn(r);');
  conError('decimal r = potencia(-4, 0.5);', 'No existe la raíz de un número negativo');
});

prueba('una Constante no cambia de valor', () => {
  conError('Constante decimal PI = 3.14;\nPI = 3;', "'PI' es Constante: su valor no se puede cambiar");
  conError('Constante entero MAX = 3;\nMAX++;', "'MAX' es Constante");
});

prueba('una variable se usa despues de recibir un valor', () => {
  conError('entero x;\nimprimirLn(x);', "'x' se usa antes de recibir un valor");
  sinErrores('entero x;\nleer(x);\nimprimirLn(x);');
  sinErrores('entero x;\nx = 4;\nimprimirLn(x);');
});

prueba('los arreglos revisan tamaño, indices y valores', () => {
  conError('Arreglo entero d[3];\nd[3] = 1;', "'d' tiene 3 posiciones (de 0 a 2): la 3 no existe");
  conError('Arreglo entero d[3];\nd[-1] = 1;', 'Un índice no puede ser negativo');
  conError('Arreglo entero d[3];\nd[1.5] = 1;', 'Un índice debe ser entero');
  conError('Arreglo entero d[0];', 'El tamaño de un arreglo debe ser mayor que cero');
  conError('Arreglo entero d[] = {1, 2, "tres"};', "cada valor de 'd' es entero y el valor es cadena");
  conError('Arreglo entero d[2] = {1, 2, 3};', "En 'd' caben 2 valores y se dieron 3");
  conError('matriz entero m[2][2];\nimprimirLn(m[0]);', 'lleva 2 índice(s) [ ] y se escribieron 1');
  conError('entero x = 1;\nimprimirLn(x[0]);', "'x' no es un arreglo");
  sinErrores('matriz entero m[2][2] = {{1, 2}, {3, 4}};\nimprimirLn(m[1][1]);');
});

prueba('las funciones existen, reciben lo que piden y devuelven su tipo', () => {
  const fuente = [
    'clase p {',
    '  funcion entero doble(entero n) { entero r = n * 2; }',
    '  funcion vacio hola() { retornar 5; }',
    '  clasePrincipal {',
    '    entero x = doble(2, 3);',
    '    entero y = hola();',
    '    entero z = doble("a");',
    '    imprimirLn(x + y + z);',
    '    dobel(2);',
    '  }',
    '}'].join('\n');
  conError(fuente, "La función 'doble' debe devolver un valor entero con retornar");
  conError(fuente, "La función 'hola' es vacio: su retornar no lleva valor");
  conError(fuente, "'doble' recibe 1 valor(es) y se le dieron 2");
  conError(fuente, "'hola' es vacio: no devuelve ningún valor");
  conError(fuente, "El valor 1 de 'doble' debe ser entero");
  conError(fuente, "La función 'dobel' no está declarada");
  // Una funcion se puede llamar aunque este declarada mas abajo
  sinErrores('clase p {\n  clasePrincipal { imprimirLn(cuadrado(3)); }\n' +
    '  funcion entero cuadrado(entero n) { retornar n * n; }\n}');
  // Si todas las ramas retornan, no falta el retornar
  sinErrores('clase p {\n  funcion entero signo(entero n) { si (n > 0) { retornar 1; } sino { retornar -1; } }\n' +
    '  clasePrincipal { imprimirLn(signo(3)); }\n}');
});

prueba('romper y retornar solo van donde tienen sentido', () => {
  conError('romper;', 'romper solo puede ir dentro de un ciclo');
  conError('retornar 5;', 'Fuera de una función, retornar va sin valor');
  sinErrores('entero i = 0;\nmientras (i < 3) { i++; si (i == 2) { romper; } }');
});

prueba('la geometria: medidas positivas, triangulos posibles y resultado decimal', () => {
  conError('decimal a = area.circulo(-5);', 'Una medida de area.circulo debe ser mayor que cero');
  conError('decimal a = perimetro.triangulo(1, 2, 10);', 'Los lados 1, 2 y 10 no forman un triángulo');
  conError('decimal v = volumen.cubo("x");', 'Las medidas de volumen.cubo son números');
  const entero = semanticoDe(enClase('entero a = area.circulo(5);')).errores[0];
  verdadero(entero.sugerencia.includes('area.circulo devuelve decimal'), entero.sugerencia);
  sinErrores('decimal r = 2.5;\ndecimal a = area.circulo(r);\nimprimirLn(a);');
  sinErrores('decimal p = perimetro.triangulo(3, 4, 5);\nimprimirLn(p);');
});

prueba('imprimirF revisa sus formatos', () => {
  conError('imprimirF("Edad: %d, prom: %.2f", 5, 8);', "%.2f pide un valor decimal y '8' es entero");
  conError('imprimirF("Edad: %d", 5, 6);', 'El formato pide 1 valor(es) y se dieron 2');
  conError('imprimirF("%q", 5);', "'%q' no es un formato de imprimirF");
  conError('imprimirLn("a", "b");', 'imprimirLn recibe un solo valor');
  sinErrores('imprimirF("%s tiene %d años y mide %.2f%n", "Ana", 20, 1.65);');
});

prueba('las funciones nativas y convertir revisan sus valores', () => {
  conError('entero n = convertir("hola", entero);', '"hola" no es un número entero');
  conError('entero n = convertir(verdadero, entero);', 'No se puede convertir logico a entero');
  conError('entero r = aleatorio(6, 1);', 'el mínimo es mayor que el máximo');
  conError('decimal l = logaritmo(0);', 'El logaritmo solo existe para números mayores que cero');
  conError('entero n = longitud(5);', 'longitud mide una cadena o un arreglo');
  conError('entero r = redondear("4.7");', 'redondear trabaja con números');
  sinErrores('entero n = convertir("22", entero);\nimprimirLn(n);');
});

prueba('opcion: un tipo que se pueda evaluar y casos sin repetir', () => {
  conError('decimal d = 2.5;\nopcion (d) { caso 1: romper; }', 'opcion no puede evaluar un valor decimal');
  const repetidos = 'entero d = 2;\nopcion (d) { caso 1: romper; caso 1: romper; caso "a": romper; }';
  conError(repetidos, 'El caso 1 está repetido');
  conError(repetidos, 'El caso "a" es cadena, pero opcion evalúa un valor entero');
});

prueba('las advertencias: sin usar, codigo que no corre y division entre cero', () => {
  const avisos = (codigo) => semanticoDe(programaDe(codigo)).advertencias.map((a) => a.mensaje).join(' / ');
  verdadero(avisos('entero x = 5;').includes("'x' se declaró y su valor nunca se usa"), avisos('entero x = 5;'));
  verdadero(avisos('entero i = 0;\nmientras (i < 3) { i++; romper; imprimirLn(i); }')
    .includes('nunca se ejecuta: está después de romper'), 'codigo inalcanzable');
  verdadero(avisos('entero x = 10 / 0;\nimprimirLn(x);').includes('divide entre cero'), 'division entre cero');
  // Dentro de intentar, dividir entre cero es a proposito
  igual(avisos('intentar { entero x = 10 / 0; imprimirLn(x); } capturar (Error e) { imprimirLn("Error: " + e); }'), '');
  // Las advertencias no son errores
  sinErrores('entero x = 10 / 0;\nimprimirLn(x);');
});

prueba('la tabla de simbolos la comparten las tres fases', () => {
  const r = compilar(enClase('entero edad = 3;\nimprimirLn(edad);'));
  const ids = r.lexico.identificadores;
  // 1. El lexico anoto cada identificador con su etiqueta
  igual(ids.map((i) => `${i.etiqueta}=${i.nombre}`).join(' '), 'id1=prueba id2=edad');
  igual(ids[1].veces, 2, 'veces que aparece edad:');
  // 2. El sintactico usa esas etiquetas en el arbol
  verdadero(JSON.stringify(r.sintactico.arbol).includes('"etiqueta":"id2"'), 'el arbol dice id2');
  // 3. El semantico completo cada nombre con lo que es, su tipo y su ambito
  const edad = ids[1].declaraciones[0];
  igual(`${edad.categoria} ${edad.tipo} ${edad.ambito} ${edad.linea}`, 'variable entero clasePrincipal 1');
  igual(ids[0].declaraciones[0].categoria, 'clase');
});

prueba('la tabla de simbolos guarda los ambitos de cada nombre', () => {
  const fuente = fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '05-completo.bs'), 'utf8');
  const ids = compilar(fuente).lexico.identificadores;
  const de = (nombre) => ids.find((i) => i.nombre === nombre).declaraciones[0];
  igual(de('areaCirculo').categoria, 'funcion');
  igual(de('radio').categoria, 'parametro');
  igual(de('radio').ambito, 'areaCirculo');
  igual(de('datos').tipo, 'entero[]');
  igual(de('tabla').tipo, 'entero[][]');
  igual(de('division').ambito, 'clasePrincipal › intentar');
  igual(de('e').categoria, 'error');

  // La pila de ambitos: se busca de adentro hacia afuera
  const t = new TablaSimbolos();
  t.abrir('clasePrincipal');
  t.declarar({ nombre: 'a', categoria: 'variable', tipo: 'entero' });
  t.abrir('si');
  igual(t.ambito, 'clasePrincipal › si');
  igual(t.buscar('a').tipo, 'entero', 'desde adentro se ve la de afuera:');
  t.declarar({ nombre: 'b', categoria: 'variable', tipo: 'cadena' });
  t.cerrar();
  igual(t.buscar('b'), null, 'al cerrar el bloque, b ya no existe:');
});

// =====================================================================
grupo('Analizador semantico: la gramatica del codigo (pestaña 3)');

/** La gramatica de un programa, una regla por renglon:  exp → id | num */
function gramaticaDe (codigo) {
  const s = semanticoDe(programaDe(codigo));
  if (s.estado !== 'analizado') throw new Error(`no se genero la gramatica (${s.estado})`);
  return s.reglas.map((r) => reglaATexto(r));
}

/** La regla con ese nombre, o '' si no salio. */
function reglaDe (codigo, nombre) {
  return gramaticaDe(codigo).find((r) => r.startsWith(nombre + ' →')) || '';
}

prueba('genera la gramatica del ejemplo del pizarron (a1 = b5 / 20;)', () => {
  igual(gramaticaDe('clase p { clasePrincipal { a1 = b5 / 20; } }').join(' / '),
    'prop → clase id { principal } / principal → clasePrincipal { inst } / inst → id = exp ; / ' +
    'exp → id | num | exp / exp / id → let ( dig )* / num → dig ( dig )* / dig → 0-9 / let → a-z');
});

prueba('la gramatica sale aunque haya errores semanticos', () => {
  // a1 y b5 no estan declaradas, pero el codigo esta bien escrito
  const s = semanticoDe(enClase('a1 = b5 / 20;'));
  igual(s.correcto, false);
  verdadero(s.reglas.length > 0, 'debe traer la gramatica');
});

prueba('solo salen las alternativas que aparecen en el codigo', () => {
  igual(reglaDe('x = a + b;', 'exp'), 'exp → id | exp + exp');
  verdadero(!gramaticaDe('x = a + b;').some((r) => r.includes('exp * exp')), 'no hay multiplicaciones');
});

prueba('los parentesis aparecen como exp → ( exp )', () => {
  verdadero(reglaDe('x = (a + b) * c;', 'exp').includes('( exp )'), reglaDe('x = (a + b) * c;', 'exp'));
});

prueba('cada instruccion es una alternativa de inst', () => {
  igual(reglaDe('entero edad = 20;', 'inst'), 'inst → tipo id = exp ;');
  igual(reglaDe('entero edad = 20;', 'tipo'), 'tipo → entero');
  igual(reglaDe('a = 1; i++;', 'inst'), 'inst → id ++ ; | id = exp ;');
});

prueba('tres o mas iguales se escriben con repeticion ( )*', () => {
  igual(reglaDe('a = 1; b = 2; c = 3;', 'principal'), 'principal → clasePrincipal { inst ( inst )* }');
  igual(reglaDe('imprimir(a, b, c);', 'inst'), 'inst → imprimir ( exp ( , exp )* ) ;');
});

prueba('las estructuras de control llevan sus bloques', () => {
  igual(reglaDe('si (a > 1) { romper; } sino { romper; }', 'inst'),
    'inst → romper ; | si ( exp ) { inst } sino { inst }');
  igual(reglaDe('opcion (a) { caso 1: imprimir("Hola"); romper; }', 'rama'),
    'rama → caso exp : inst inst');
});

prueba('un programa completo empieza con la clase', () => {
  const fuente = 'clase p { clasePrincipal { entero a = 5; } }';
  igual(reglaDe(fuente, 'prop'), 'prop → clase id { principal }');
  igual(reglaDe(fuente, 'principal'), 'principal → clasePrincipal { inst }');
});

prueba('las reglas van de arriba hacia abajo y al final los caracteres', () => {
  const reglas = gramaticaDe('opcion (a) { caso 1: imprimir("Hola"); romper; }').map((r) => r.split(' →')[0]);
  igual(reglas.join(','), 'prop,principal,inst,exp,rama,id,num,cadena,TEXTO,dig,LET,let');
});

prueba('el identificador usa solo las clases de caracteres que aparecen', () => {
  igual(reglaDe('clase a { clasePrincipal { b = 1; } }', 'id'), 'id → let');
  igual(reglaDe('clase p { clasePrincipal { miVariable2 = 1; } }', 'id'), 'id → let ( let | LET | dig )*');
  igual(reglaDe('clase _p { clasePrincipal { _x = 1; } }', 'id'), 'id → _ ( let )*');
});

prueba('el texto de una cadena dice sus clases de caracteres', () => {
  igual(reglaDe('imprimir("Hola mundo!");', 'TEXTO'), 'TEXTO → ( LET | let | simb )*');
  igual(reglaDe('imprimir("Hola mundo!");', 'simb'), 'simb → ␣ | !');
});

prueba('la ñ y los acentos cuentan como letras', () => {
  igual(claseDeCaracter('ñ'), 'let');
  igual(claseDeCaracter('Á'), 'LET');
  igual(reglaDe('clase p { clasePrincipal { año = 1; } }', 'let'), 'let → a-z | ñ');
});

prueba('cada produccion dice de que parte del codigo salio', () => {
  const exp = semanticoDe(enClase('a1 = b5 / 20;')).reglas.find((r) => r.regla === 'exp');
  const division = exp.alternativas.find((a) => a.texto === 'exp / exp');
  igual(division.ejemplo, 'b5 / 20');
});

prueba('los terminales y los no terminales se distinguen', () => {
  const prop = semanticoDe(enClase('romper;')).reglas[0].alternativas[0];
  igual(prop.simbolos[0].clase, 'terminal');      // clase
  igual(prop.simbolos[1].clase, 'no-terminal');   // id
});

// =====================================================================
grupo('Generador de codigo Java (Compila)');

/** El Java de un programa, o '' si no se pudo generar. */
function javaDe (fuente) {
  const r = compilar(fuente);
  return r.java && r.java.ok ? r.java.codigo : '';
}

prueba('un programa correcto genera una clase Java completa', () => {
  const java = javaDe(enClase('imprimirLn("Hola");'));
  verdadero(java.includes('public class prueba {'), 'debe abrir la clase');
  verdadero(java.includes('public static void main (String[] args) {'), 'debe abrir main');
  verdadero(java.includes('System.out.println("Hola");'), 'debe imprimir');
  verdadero(java.trimEnd().endsWith('}'), 'debe cerrar la clase');
});

prueba('los tipos y las impresiones se traducen a Java', () => {
  const java = javaDe(enClase(
    'entero a = 2;', 'decimal b = 3.5;', 'logico c = verdadero;', 'cadena s = "hola";',
    'imprimir(s);', 'imprimirLn(a);', 'imprimirF("%d", a);'));
  ['int a = 2;', 'double b = 3.5;', 'boolean c = true;', 'String s = "hola";',
    'System.out.print(s);', 'System.out.println(a);', 'System.out.printf("%d", a);']
    .forEach((parte) => verdadero(java.includes(parte), `falta: ${parte}`));
});

prueba('los operadores logicos y la comparacion de cadenas', () => {
  const java = javaDe(enClase(
    'entero a = 1; entero b = 2; logico c = verdadero;',
    'cadena s = "x"; cadena t = "y";',
    'si (a > 1 Y b < 2 O NO c) { imprimirLn(a); }',
    'logico igual = s == t;', 'logico distinto = s != t;'));
  verdadero(java.includes('(a > 1) && (b < 2)') && java.includes('|| (!c)'), 'logicos:');
  verdadero(java.includes('java.util.Objects.equals(s, t)'), 'cadenas con equals:');
  verdadero(java.includes('(!java.util.Objects.equals(s, t))'), 'cadenas distintas:');
});

prueba('las funciones, los arreglos y los ciclos se traducen', () => {
  const java = javaDe(
    'clase demo { funcion entero doble (entero x) { retornar x * 2; } ' +
    'clasePrincipal { entero n = doble(4); Arreglo entero datos[3]; ' +
    'para (entero i = 0; i < 3; i++) { datos[i] = i; } ' +
    'imprimirLn(longitud(datos)); } }');
  ['public static int doble (int x) {', 'return (x * 2);', 'int[] datos = new int[3];',
    'for (int i = 0; (i < 3); i++) {', '(datos).length']
    .forEach((parte) => verdadero(java.includes(parte), `falta: ${parte}`));
});

prueba('las funciones nativas y la geometria usan Math', () => {
  const java = javaDe(enClase(
    'decimal r = area.circulo(2.0);', 'decimal p = perimetro.triangulo(3.0, 4.0, 5.0);',
    'decimal pot = potencia(2.0, 3.0);', 'entero red = redondear(4.6);',
    'cadena s = convertir(5, cadena);', 'entero n = convertir("22", entero);',
    'imprimirLn(aleatorio(1, 10));'));
  ['(Math.PI * 2.0 * 2.0)', '(3.0 + 4.0 + 5.0)', 'Math.pow(2.0, 3.0)',
    '((int) Math.round(4.6))', 'String.valueOf(5)', 'Integer.parseInt("22")',
    '__aleatorio(1, 10)', 'private static int __aleatorio']
    .forEach((parte) => verdadero(java.includes(parte), `falta: ${parte}`));
});

prueba('leer usa Scanner y equipo imprime a los integrantes', () => {
  const java = javaDe(enClase('entero n = 0;', 'leer(n);', 'equipo();'));
  verdadero(java.includes('import java.util.Scanner;'), 'debe importar Scanner');
  verdadero(java.includes('__entrada.nextInt()'), 'debe leer un entero');
  verdadero(java.includes('System.out.println("Equipo: " + "SwordByte");'), 'equipo:');
  verdadero(java.includes('Avalos Castillo'), 'integrantes:');
});

prueba('sin programa completo o con errores no se genera Java', () => {
  igual(compilar('a = b + c').java.ok, false, 'expresion suelta:');
  igual(compilar('entero a = "x";').java.ok, false, 'codigo con error:');
  const r = compilar(enClase('imprimirLn("Hola");'));
  igual(r.java.nombreClase, 'prueba', 'el nombre de la clase:');
});



const { erroresParaMarcar } = require('../src/core/Compilador');
const { resaltarCodigo } = require('../src/core/01.lexico/ResaltadoCodigo');

/** Los pedazos de codigo que quedan subrayados en rojo. */
function subrayados (fuente, pestana) {
  const html = resaltarCodigo(fuente, erroresParaMarcar(fuente, pestana));
  return (html.match(/class="[^"]*j-marca[^"]*">[^<]*/g) || []).map((s) => s.split('>')[1]);
}

prueba('cada pestaña marca los errores de su fase y de las anteriores', () => {
  const fuente = enClase('entero a = "x"; imprimirLn(a); x = 4.;');
  igual(subrayados(fuente, 'lexico').join(' '), '4.', 'pestaña 1, solo el lexico:');
  igual(subrayados(fuente.replace('4.', '4'), 'sintactico').join(' '), '', 'pestaña 2, sin errores sintacticos:');
  igual(subrayados(fuente.replace('4.', '4'), 'semantico').join(' '), 'a x', 'pestaña 3, los semanticos:');
});

prueba('el codigo sin clase se marca desde su primera palabra', () => {
  igual(subrayados('entero a = 5;', 'sintactico').join(' '), 'entero');
  igual(subrayados('a = b + c', 'sintactico').join(' '), '', 'una expresion suelta si vale en la pestaña 2');
  igual(subrayados('a = b + c', 'semantico').join(' '), 'a', 'pero no en la pestaña 3');
});

prueba('el punto y coma que falta se marca en lo ultimo del renglon', () => {
  igual(subrayados('clase p { clasePrincipal {\n  entero a = 5\n  imprimirLn(a);\n} }', 'sintactico').join(' '), '5');
});

prueba('subrayar no cambia el texto', () => {
  const fuente = enClase('entero a = "x"; imprimirLn(a);');
  const html = resaltarCodigo(fuente, erroresParaMarcar(fuente, 'semantico'));
  const texto = html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  igual(texto, fuente);
});

// =====================================================================
grupo('Reporte visual (HTML)');

const { construirReporteHTML, extraerDatosHTML } = require('../src/core/ReporteHTML');
const { contenidoParaGuardar, leerArchivoGuardado } = require('../src/core/ArchivoGuardado');

prueba('el reporte es una pagina web con las cuatro secciones', () => {
  const html = construirReporteHTML(compilar('a > b'), { nombrePrograma: 'x.html' });
  verdadero(html.startsWith('<!DOCTYPE html>'), 'no empieza como pagina web');
  ['Código fuente', 'Análisis léxico', 'Análisis sintáctico', 'Análisis semántico']
    .forEach((t) => verdadero(html.includes(t), 'falta la seccion ' + t));
  verdadero(html.includes(MATERIA.nombre), 'falta la materia');
  integrantesOrdenados().forEach((p) =>
    verdadero(html.includes(`${p.apellidos} ${p.nombres}`), `falta ${p.apellidos}`));
});

prueba('el reporte dibuja el arbol y la tabla de tokens', () => {
  const html = construirReporteHTML(compilar('a > b'));
  verdadero(html.includes('<ul class="arbol">'), 'falta el arbol');
  verdadero(html.includes('operador mayor que'), 'falta la tabla de tokens');
});

prueba('al abrirlo se recupera el codigo y la pestaña', () => {
  const fuente = 'a = b + c > 9 AND d > e OR f <= 30';
  const html = construirReporteHTML(compilar(fuente), { pestana: 'sintactico' });
  const datos = extraerDatosHTML(html);
  igual(datos.codigo, fuente);
  igual(datos.pestana, 'sintactico');
});

prueba('el codigo con < > & y </script> no rompe la pagina', () => {
  const fuente = 'si (a < b && c > d) { imprimirLn("</script><b>hola</b>"); }';
  const html = construirReporteHTML(compilar(fuente));
  igual((html.match(/<\/script>/g) || []).length, 1, 'cierres de script:');
  verdadero(!html.includes('<b>hola</b>'), 'el codigo no debe quedar como HTML');
  igual(extraerDatosHTML(html).codigo, fuente);
});

prueba('la extension decide el formato al guardar', () => {
  const r = compilar('a > b');
  igual(contenidoParaGuardar(r, 'reporte.html').formato, 'html');
  igual(contenidoParaGuardar(r, 'reporte.bs').formato, 'bs');
});

prueba('se pueden volver a abrir los dos formatos y el codigo suelto', () => {
  const fuente = 'a > b';
  const r = compilar(fuente);
  igual(leerArchivoGuardado(contenidoParaGuardar(r, 'x.html').contenido).codigo, fuente);
  igual(leerArchivoGuardado(contenidoParaGuardar(r, 'x.bs').contenido).codigo, fuente);
  igual(leerArchivoGuardado(fuente).codigo, fuente);
});

prueba('una pagina web ajena no se abre como codigo', () => {
  const r = leerArchivoGuardado('<!DOCTYPE html><html><body>hola</body></html>');
  igual(r.ok, false);
});

prueba('los dos reportes traen el analisis semantico', () => {
  const r = compilar('clase p {\nclasePrincipal {\nentero b5 = 4;\nentero a1 = b5 / 20;\n' +
    'imprimirLn(a1);\ncadena c = a1;\n}\n}');
  const texto = contenidoParaGuardar(r, 'x.bs').contenido;
  verdadero(texto.includes('4. ANÁLISIS SEMÁNTICO'), 'falta la seccion 4');
  verdadero(texto.includes('Errores semánticos (1):'), 'falta el error semantico');
  verdadero(texto.includes("'c' es cadena y el valor es entero"), 'falta el mensaje del error');
  verdadero(!texto.includes('Tabla de símbolos'), 'la tabla de simbolos ya no va en la seccion 4');
  verdadero(texto.includes('prop      → clase id { principal }'), 'falta la regla prop en el .bs');
  verdadero(texto.includes('          | exp / exp'), 'las alternativas van alineadas bajo la flecha');
  const html = contenidoParaGuardar(r, 'x.html').contenido;
  verdadero(html.includes('<table class="gramatica">'), 'falta la gramatica en el .html');
  verdadero(!html.includes('simbolos'), 'la tabla de simbolos ya no va en el .html');
  verdadero(html.includes('1 error semántico'), 'falta el error en el .html');
  verdadero(html.includes('j-marca'), 'el error se subraya en el codigo del .html');
});

prueba('el archivo se llama igual que la clase, como en Java', () => {
  const { nombreDelArchivo } = require('../src/core/ArchivoGuardado');
  igual(nombreDelArchivo(compilar('clase ejemplo { clasePrincipal { } }')), 'ejemplo');
  igual(nombreDelArchivo(compilar(fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '03-control.bs'), 'utf8'))),
    'control');
  igual(nombreDelArchivo(compilar('a > b')), 'analisis', 'sin clase:');
});

// =====================================================================
grupo('Programas de ejemplo');

const dirEjemplos = path.join(__dirname, '..', 'ejemplos');
if (fs.existsSync(dirEjemplos)) {
  for (const archivo of fs.readdirSync(dirEjemplos).filter((f) => f.endsWith('.bs'))) {
    const fuente = fs.readFileSync(path.join(dirEjemplos, archivo), 'utf8');
    const esperaErrores = archivo.includes('error');
    prueba(`${archivo} ${esperaErrores ? '(debe fallar)' : '(debe compilar)'}`, () => {
      const r = compilar(fuente);
      if (esperaErrores) {
        verdadero(r.errores.length > 0, 'se esperaban errores y no hubo');
      } else {
        igual(r.errores.length, 0,
          `errores inesperados:\n${r.errores.map((e) => '        ' + e.texto).join('\n')}\n`);
      }
    });
  }
}

// =====================================================================
grupo('Robustez');

prueba('no falla con programa vacio', () => {
  const r = compilar('');
  verdadero(Array.isArray(r.errores), 'debe devolver una lista de errores');
});

prueba('con solo comentarios no hay error ni arbol', () => {
  const r = compilar('// nada mas que un comentario\n');
  igual(r.errores.length, 0, 'un comentario no es un error:');
  igual(r.sintactico.modo, 'vacio');
  igual(r.sintactico.arbol, null);
});

prueba('no entra en ciclo infinito con basura', () => {
  const r = compilar('}}}{{{;;;,,,)))(((');
  verdadero(r.errores.length > 0, 'debe reportar errores');
});

prueba('acepta comillas tipograficas de Word', () => {
  const r = compilar('clase p { clasePrincipal { imprimirLn(“Hola”); } }');
  igual(r.errores.length, 0, 'las comillas curvas deben aceptarse');
});

// =====================================================================
console.log(`\n${'='.repeat(58)}`);
console.log(`  \x1b[32m${pasadas} pasadas\x1b[0m   \x1b[31m${falladas} falladas\x1b[0m`);
console.log('='.repeat(58));
if (falladas > 0) {
  console.log('\nResumen de fallas:');
  fallos.forEach((f) => console.log(`  - ${f.nombre}: ${f.mensaje}`));
}
process.exit(falladas === 0 ? 0 : 1);

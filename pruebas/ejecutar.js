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
function enClase (cuerpo) {
  return `clase prueba { clasePrincipal { ${cuerpo} } }`;
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
grupo('Errores subrayados mientras se escribe');

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
grupo('Codigo intermedio: codigo de tres direcciones (fase 4)');

/** El resultado de la fase 4 para unas instrucciones dentro de clasePrincipal. */
function intermedioDe (codigo) {
  return compilar(programaDe(codigo)).intermedio;
}

/**
 * Las instrucciones de tres direcciones de un codigo, juntas en un texto, sin
 * las de inicio y fin de clasePrincipal (que salen siempre).
 */
function tresDe (codigo) {
  const ci = intermedioDe(codigo);
  if (ci.estado !== 'generado') throw new Error(`no se genero (${ci.estado}): ${ci.errores.map((e) => e.mensaje).join(' / ')}`);
  return ci.instrucciones
    .filter((i) => !/^(funcion|fin) clasePrincipal/.test(i.texto))
    .map((i) => i.texto).join(' / ');
}

prueba('a = b + c * d se traduce con temporales, como en el libro', () => {
  igual(tresDe('entero b = 1, c = 2, d = 3;\nentero a = b + c * d;'),
    'b = 1 / c = 2 / d = 3 / t1 = c * d / t2 = b + t1 / a = t2');
});

prueba('cada instruccion es tambien un cuadruplo (operador, arg1, arg2, resultado)', () => {
  const ci = intermedioDe('entero b = 1, c = 2, d = 3;\nentero a = b + c * d;');
  const t1 = ci.instrucciones.find((i) => i.texto === 't1 = c * d');
  igual(`${t1.op} ${t1.arg1} ${t1.arg2} ${t1.resultado}`, '* c d t1');
  const copia = ci.instrucciones.find((i) => i.texto === 'a = t2');
  igual(`${copia.op}|${copia.arg1}|${copia.arg2}|${copia.resultado}`, '=|t2||a');
  igual(ci.instrucciones.map((i) => i.numero).join(','),
    ci.instrucciones.map((_, k) => k + 1).join(','), 'numeradas en orden:');
  igual(ci.temporales, 2);
});

prueba('la jerarquia y los parentesis deciden el orden', () => {
  igual(tresDe('entero a = 2;\nentero x = (a + 3) * -a;'),
    'a = 2 / t1 = a + 3 / t2 = - a / t3 = t1 * t2 / x = t3');
  igual(tresDe('entero x = 2 + 3 * 4;'), 't1 = 3 * 4 / t2 = 2 + t1 / x = t2');
});

prueba('si y sino saltan con etiquetas', () => {
  igual(tresDe('entero a = 1;\nsi (a > 0) { a = 2; } sino { a = 3; }'),
    'a = 1 / t1 = a > 0 / ifFalse t1 goto L1 / a = 2 / goto L2 / L1: / a = 3 / L2:');
  // Sin sino no hace falta saltar al final
  igual(tresDe('entero a = 1;\nsi (a > 0) { a = 2; }'),
    'a = 1 / t1 = a > 0 / ifFalse t1 goto L1 / a = 2 / L1:');
});

prueba('mientras, hacer y para regresan a su etiqueta de inicio', () => {
  igual(tresDe('entero i = 0;\nmientras (i < 3) { i++; }'),
    'i = 0 / L1: / t1 = i < 3 / ifFalse t1 goto L2 / i = i + 1 / goto L1 / L2:');
  igual(tresDe('entero i = 0;\nhacer { i++; } mientras (i < 3);'),
    'i = 0 / L1: / i = i + 1 / t1 = i < 3 / if t1 goto L1');
  igual(tresDe('para (entero i = 0; i < 5; i++) { si (i == 2) { romper; } }'),
    'i = 0 / L1: / t1 = i < 5 / ifFalse t1 goto L3 / t2 = i == 2 / ifFalse t2 goto L2 / ' +
    'goto L3 / L2: / i = i + 1 / goto L1 / L3:');
});

prueba('opcion compara cada caso y romper salta a la salida', () => {
  igual(tresDe('entero d = 2;\nopcion (d) { caso 1: imprimirLn(1); romper; porDefecto: imprimirLn(0); }'),
    'd = 2 / if d == 1 goto L1 / goto L2 / L1: / param 1 / call imprimirLn, 1 / goto L3 / ' +
    'L2: / param 0 / call imprimirLn, 1 / L3:');
});

prueba('Y y O tienen corto circuito; NO es una operacion de un valor', () => {
  igual(tresDe('logico l = 1 > 0 Y 2 > 1;'),
    't1 = 1 > 0 / t2 = t1 / ifFalse t2 goto L1 / t3 = 2 > 1 / t2 = t3 / L1: / l = t2');
  igual(tresDe('logico l = 1 > 0 O 2 > 1;'),
    't1 = 1 > 0 / t2 = t1 / if t2 goto L1 / t3 = 2 > 1 / t2 = t3 / L1: / l = t2');
  igual(tresDe('logico l = NO verdadero;'), 't1 = NO verdadero / l = t1');
});

prueba('las funciones: param, call y return', () => {
  const ci = compilar('clase p {\n  funcion entero doble(entero n) { retornar n * 2; }\n' +
    '  clasePrincipal { entero x = doble(4); imprimirLn(x); }\n}').intermedio;
  igual(ci.instrucciones.map((i) => i.texto).join(' / '),
    'funcion doble(n) / t1 = n * 2 / return t1 / fin doble / funcion clasePrincipal() / ' +
    'param 4 / t2 = call doble, 1 / x = t2 / param x / call imprimirLn, 1 / fin clasePrincipal');
});

prueba('arreglos y matrices: reservar, leer y escribir por posicion', () => {
  igual(tresDe('Arreglo entero d[] = {5, 6};\nmatriz entero m[2][3];\nentero i = 1;\nm[i][2] = d[1];'),
    'reservar d, 2 / d[0] = 5 / d[1] = 6 / t1 = 2 * 3 / reservar m, t1 / i = 1 / ' +
    't2 = i * 3 / t3 = t2 + 2 / t4 = d[1] / m[t3] = t4');
});

prueba('leer, convertir, geometria e incrementos', () => {
  igual(tresDe('decimal r;\nleer(r);\ndecimal a = area.circulo(r);\nentero n = convertir("5", entero);'),
    'leer r / param r / t1 = call area.circulo, 1 / a = t1 / t2 = (entero) "5" / n = t2');
  igual(tresDe('entero x = 5;\nentero y = x++;'), 'x = 5 / t1 = x / x = x + 1 / y = t1');
});

prueba('intentar y capturar', () => {
  igual(tresDe('intentar { entero x = 10 / 0; imprimirLn(x); } capturar (Error e) { imprimirLn(e); }'),
    'intentar L1 / t1 = 10 / 0 / x = t1 / param x / call imprimirLn, 1 / finIntentar / goto L2 / ' +
    'L1: / capturar e / param e / call imprimirLn, 1 / L2:');
});

prueba('cada grupo dice de que renglon del programa sale', () => {
  const ci = intermedioDe('entero b = 1, c = 2, d = 3;\nentero a = b + c * d;');
  const t1 = ci.instrucciones.find((i) => i.texto === 't1 = c * d');
  igual((t1.comentarios || []).join(), 'entero a = b + c * d;');
  igual(t1.linea, 2);
  // Las instrucciones del mismo renglon que van despues ya no repiten el comentario
  verdadero(!ci.instrucciones.find((i) => i.texto === 't2 = b + t1').comentarios, 'sin comentario repetido');
});

prueba('los temporales y las etiquetas no chocan con los nombres del programa', () => {
  igual(tresDe('entero t1 = 2;\nentero L1 = t1 * 3;\nsi (L1 > 0) { imprimirLn(L1); }'),
    't1 = 2 / tt1 = t1 * 3 / L1 = tt1 / tt2 = L1 > 0 / ifFalse tt2 goto LL1 / ' +
    'param L1 / call imprimirLn, 1 / LL1:');
});

prueba('sin un programa correcto no se genera', () => {
  const sinClase = compilar('a = b + c').intermedio;
  igual(sinClase.estado, 'errores-previos');
  verdadero(sinClase.errores[0].mensaje.startsWith('Falta la clase'), sinClase.errores[0].mensaje);
  const conError = intermedioDe('entero x = "hola";');
  igual(conError.estado, 'errores-previos');
  verdadero(/Tipos incompatibles/.test(conError.errores[0].mensaje), 'el error semantico');
  igual(compilar('').intermedio.estado, 'vacio');
  // Las advertencias no lo impiden
  igual(intermedioDe('entero x = 5;').estado, 'generado');
});

prueba('todos los ejemplos correctos generan su codigo y sus saltos llegan a una etiqueta', () => {
  const dir = path.join(__dirname, '..', 'ejemplos');
  fs.readdirSync(dir).filter((f) => !f.includes('error')).forEach((f) => {
    const ci = compilar(fs.readFileSync(path.join(dir, f), 'utf8')).intermedio;
    igual(ci.estado, 'generado', `${f}:`);
    const definidas = ci.instrucciones.filter((i) => i.op === 'etiqueta').map((i) => i.resultado);
    igual(new Set(definidas).size, definidas.length, `${f}, etiquetas repetidas:`);
    ci.instrucciones.filter((i) => ['goto', 'if', 'ifFalse', 'if==', 'intentar'].includes(i.op))
      .forEach((i) => verdadero(definidas.includes(i.resultado), `${f}: ${i.texto} salta a una etiqueta que no existe`));
    igual(ci.etiquetas, definidas.length, `${f}, cuenta de etiquetas:`);
  });
});

prueba('una variable con el mismo nombre y otro tipo en otro bloque se renombra (x_2)', () => {
  // Para la fase 6: en Java cada variable tiene un solo tipo
  igual(tresDe('entero a;\nleer(a);\nsi (a > 0) { entero x = a; imprimirLn(x); } sino { cadena x = "no"; imprimirLn(x); }'),
    'leer a / t1 = a > 0 / ifFalse t1 goto L1 / x = a / param x / call imprimirLn, 1 / goto L2 / ' +
    'L1: / x_2 = "no" / param x_2 / call imprimirLn, 1 / L2:');
  // Con el mismo tipo se queda el mismo nombre
  verdadero(!tresDe('si (verdadero) { entero x = 1; imprimirLn(x); }\nsi (falso) { entero x = 2; imprimirLn(x); }').includes('x_2'),
    'se renombro una variable del mismo tipo');
});

prueba('romper dentro de intentar sale primero del intentar (finIntentar)', () => {
  igual(tresDe('para (entero i = 0; i < 3; i++) { intentar { si (i == 1) { romper; } imprimirLn(i); } ' +
    'capturar (Error e) { imprimirLn("e"); } }'),
  'i = 0 / L1: / t1 = i < 3 / ifFalse t1 goto L5 / intentar L3 / t2 = i == 1 / ifFalse t2 goto L2 / ' +
    'finIntentar / goto L5 / L2: / param i / call imprimirLn, 1 / finIntentar / goto L4 / ' +
    'L3: / capturar e / param "e" / call imprimirLn, 1 / L4: / i = i + 1 / goto L1 / L5:');
});

prueba('los textos con comillas de Word quedan con comillas normales', () => {
  igual(tresDe('imprimirLn(“Hola”);'), 'param "Hola" / call imprimirLn, 1');
  igual(tresDe('cadena c = "a\\tb";\nimprimirLn(c);'), 'c = "a\\tb" / param c / call imprimirLn, 1');
});

prueba('la fase 4 entrega la clase y los simbolos de cada funcion (para la fase 6)', () => {
  const ci = compilar('clase p {\n  funcion entero doble(entero n) { entero r = n * 2; retornar r; }\n' +
    '  clasePrincipal { matriz entero m[2][3]; cadena s = "x"; imprimirLn(doble(4)); }\n}').intermedio;
  igual(ci.clase, 'p');
  igual(JSON.stringify(ci.simbolos),
    '[{"nombre":"doble","tipoRetorno":"entero","parametros":["n"],"variables":{"n":"entero","r":"entero"},"columnas":{}},' +
    '{"nombre":"clasePrincipal","tipoRetorno":"vacio","parametros":[],"variables":{"m":"entero[][]","s":"cadena"},"columnas":{"m":"3"}}]');
});

// =====================================================================
grupo('Optimizacion del codigo intermedio (fase 5)');

const { ejecutarIntermedio } = require('./interprete-intermedio');
const { programaAlAzar } = require('./programas-al-azar');

/** El resultado de la fase 5 para unas instrucciones dentro de clasePrincipal. */
function optimizadoDe (codigo) {
  return compilar(programaDe(codigo)).optimizacion;
}

/** Las instrucciones optimizadas juntas en un texto (sin el inicio y fin de clasePrincipal). */
function optDe (codigo) {
  const o = optimizadoDe(codigo);
  if (o.estado !== 'optimizado') throw new Error(`no se optimizo (${o.estado})`);
  return o.instrucciones
    .filter((i) => !/^(funcion|fin) clasePrincipal/.test(i.texto))
    .map((i) => i.texto).join(' / ');
}

/** Cuantas veces se aplico cada optimizacion:  { plegado: 2, muerto: 1 } */
function vecesDe (codigo) {
  const veces = {};
  optimizadoDe(codigo).porOptimizacion.forEach((o) => { veces[o.clave] = o.veces; });
  return veces;
}

/**
 * Ejecuta un programa antes y despues de optimizar: los dos deben imprimir
 * exactamente lo mismo. Devuelve lo que imprime.
 */
function mismaSalida (fuente, entradas = []) {
  const r = compilar(fuente);
  igual(r.intermedio.estado, 'generado', 'el codigo intermedio:');
  const antes = ejecutarIntermedio(r.intermedio.instrucciones, { entradas });
  const despues = ejecutarIntermedio(r.optimizacion.instrucciones, { entradas });
  igual(despues, antes, 'lo que imprime cambio al optimizar:');
  verdadero(r.optimizacion.instrucciones.length <= r.optimizacion.antes, 'el codigo optimizado crecio');
  return antes;
}

prueba('plegado y propagacion de constantes: lo que ya se sabe se calcula desde ahora', () => {
  igual(optDe('entero x = 2 * 3 + 4;\nimprimirLn(x);'), 'param 10 / call imprimirLn, 1');
  igual(optDe('entero b = 2;\nentero a = b * 3;\nimprimirLn(a);'), 'param 6 / call imprimirLn, 1');
  const veces = vecesDe('entero b = 2;\nentero a = b * 3;\nimprimirLn(a);');
  verdadero(veces.plegado > 0 && veces.propagacion > 0 && veces.muerto > 0, JSON.stringify(veces));
  igual(optDe('cadena c = "Hola " + "tú";\nimprimirLn(c);'), 'param "Hola tú" / call imprimirLn, 1');
  igual(optDe('entero n = 16;\nimprimirLn("Total: " + n);'), 'param "Total: 16" / call imprimirLn, 1');
  // Un decimal no se pasa a texto desde ahora: Java escribe algunos distinto
  verdadero(optDe('imprimirLn("x" + 2.5);').includes('"x" + 2.5'), 'se paso un decimal a texto');
  igual(optDe('logico l = NO (3 > 2);\nimprimirLn(l);'), 'param falso / call imprimirLn, 1');
});

prueba('los enteros se dividen como en Java, y un decimal guarda 5.0', () => {
  igual(optDe('imprimirLn(7 / 2);'), 'param 3 / call imprimirLn, 1');
  igual(optDe('imprimirLn(7.0 / 2);'), 'param 3.5 / call imprimirLn, 1');
  // La fase 4 escribe la conversion que Java hace sola, y la fase 5 la calcula
  igual(tresDe('decimal x = 5;\nimprimirLn(x / 2);'), 'x = (decimal) 5 / t1 = x / 2 / param t1 / call imprimirLn, 1');
  igual(optDe('decimal x = 5;\nimprimirLn(x / 2);'), 'param 2.5 / call imprimirLn, 1');
  igual(mismaSalida(programaDe('decimal x = 5;\nimprimirLn(x / 2);\nimprimirLn(x);')), '2.5\n5.0\n');
});

prueba('no se calcula lo que debe fallar al ejecutarse', () => {
  const opt = optDe('intentar { entero x = 10 / 0; imprimirLn(x); } capturar (Error e) { imprimirLn("error"); }');
  verdadero(opt.includes('x = 10 / 0'), opt);
  igual(mismaSalida(programaDe('intentar { entero x = 10 / 0; imprimirLn(x); } capturar (Error e) { imprimirLn("error"); }')),
    'error\n');
  // Un entero que ya no cabe tampoco se calcula
  verdadero(optDe('entero a = 2147483647;\nimprimirLn(a + 1);').includes('2147483647 + 1'), 'se calculo un entero que no cabe');
});

prueba('propagacion de copias: el calculo va directo a la variable', () => {
  igual(optDe('entero a;\nleer(a);\nentero b = a + 1;\nimprimirLn(b);'),
    'leer a / b = a + 1 / param b / call imprimirLn, 1');
  igual(optDe('entero a;\nleer(a);\nentero b = a;\nimprimirLn(b * 3);'),
    'leer a / t1 = a * 3 / param t1 / call imprimirLn, 1');
});

prueba('subexpresiones comunes: lo que ya se calculo no se vuelve a calcular', () => {
  igual(optDe('entero a, b;\nleer(a);\nleer(b);\nentero c = a * b + a * b;\nimprimirLn(c);'),
    'leer a / leer b / t1 = a * b / c = t1 + t1 / param c / call imprimirLn, 1');
  // Si a cambia en medio, ya no es lo mismo
  igual(optDe('entero a, b;\nleer(a);\nleer(b);\nentero c = a * b;\na = a + 1;\nentero d = a * b;\nimprimirLn(c + d);'),
    'leer a / leer b / c = a * b / a = a + 1 / d = a * b / t4 = c + d / param t4 / call imprimirLn, 1');
});

prueba('simplificacion algebraica y reduccion de fuerza', () => {
  igual(optDe('entero a;\nleer(a);\nimprimirLn(a * 1 - 0);'), 'leer a / param a / call imprimirLn, 1');
  igual(optDe('entero a;\nleer(a);\nimprimirLn(a * 2);'), 'leer a / t1 = a + a / param t1 / call imprimirLn, 1');
  igual(vecesDe('entero a;\nleer(a);\nimprimirLn(a * 2);').fuerza, 1);
  // a + 0 se queda: con una cadena, + junta textos ("a" + 0 es "a0")
  verdadero(optDe('cadena s;\nleer(s);\nimprimirLn(s + 0);').includes('s + 0'), 'se quito un + 0');
});

prueba('codigo muerto: lo que nadie usa se quita, pero las llamadas se quedan', () => {
  igual(optDe('entero a = 5;\nentero b = 7;\nimprimirLn(b);'), 'param 7 / call imprimirLn, 1');
  igual(optDe('entero d = aleatorio(1, 6);'), 'param 1 / param 6 / call aleatorio, 2');
  igual(vecesDe('entero d = aleatorio(1, 6);').muerto, 1);
});

prueba('saltos: una condicion que ya se sabe deja un solo camino', () => {
  igual(optDe('si (3 > 2) { imprimirLn("si"); } sino { imprimirLn("no"); }'), 'param "si" / call imprimirLn, 1');
  igual(optDe('entero d = 2;\nopcion (d) { caso 1: imprimirLn("uno"); caso 2: imprimirLn("dos"); romper; porDefecto: imprimirLn("otro"); }'),
    'param "dos" / call imprimirLn, 1');
  const veces = vecesDe('si (3 > 2) { imprimirLn("si"); } sino { imprimirLn("no"); }');
  verdadero(veces.saltos > 0 && veces.inalcanzable > 0, JSON.stringify(veces));
});

prueba('saltos: un if que solo brinca un goto se voltea', () => {
  const o = optimizadoDe('entero i;\nleer(i);\nmientras (i < 9) { si (i == 5) { romper; } i++; }');
  const textos = o.instrucciones.map((i) => i.texto);
  verdadero(textos.includes('if t2 goto L3'), textos.join(' / '));
  verdadero(!textos.includes('goto L3'), 'el goto de romper ya no hace falta');
});

prueba('codigo inalcanzable: lo que va despues de retornar', () => {
  const r = compilar('clase p {\n  funcion entero f(entero n) { retornar n; imprimirLn(n); }\n' +
    '  clasePrincipal { imprimirLn(f(2)); }\n}');
  igual(r.optimizacion.instrucciones.slice(0, 3).map((i) => i.texto).join(' / '), 'funcion f(n) / return n / fin f');
});

prueba('los ciclos se respetan: despues de una etiqueta ya no se sabe lo que vale', () => {
  igual(optDe('entero i = 0;\nmientras (i < 3) { i++; }\nimprimirLn(i);'),
    'i = 0 / L1: / t1 = i < 3 / ifFalse t1 goto L2 / i = i + 1 / goto L1 / L2: / param i / call imprimirLn, 1');
  igual(mismaSalida(programaDe('entero i = 0;\nmientras (i < 3) { i++; }\nimprimirLn(i);')), '3\n');
});

prueba('cada cambio queda anotado, con el antes y el despues', () => {
  const o = optimizadoDe('entero x = 2 * 3;\nimprimirLn(x);');
  const plegado = o.cambios.find((c) => c.optimizacion === 'plegado');
  igual(`${plegado.nombre}: ${plegado.antes} -> ${plegado.despues}`, 'Plegado de constantes: t1 = 2 * 3 -> t1 = 6');
  igual(plegado.linea, 1);
  igual(o.antes, compilar(programaDe('entero x = 2 * 3;\nimprimirLn(x);')).intermedio.instrucciones.length);
  igual(o.instrucciones.map((i) => i.numero).join(','), o.instrucciones.map((_, k) => k + 1).join(','), 'numeradas:');
  // Cada instruccion recuerda su numero en la fase 4 y lo que se le hizo
  const param = o.instrucciones.find((i) => i.op === 'param');
  igual(param.original, 4);
  igual(param.optimizaciones.join(), 'propagacion');
  // El renglon de las instrucciones quitadas pasa a la siguiente
  igual(param.comentarios.join(' | '), 'entero x = 2 * 3; | imprimirLn(x);');
});

prueba('los temporales con otro prefijo tambien se optimizan', () => {
  igual(optDe('entero t1;\nleer(t1);\nentero a = t1 + 1;\nimprimirLn(a * 1);'),
    'leer t1 / a = t1 + 1 / param a / call imprimirLn, 1');
});

prueba('sin codigo intermedio no hay optimizacion', () => {
  igual(compilar('').optimizacion.estado, 'vacio');
  const sinClase = compilar('a = b + c').optimizacion;
  igual(sinClase.estado, 'errores-previos');
  verdadero(sinClase.errores[0].mensaje.startsWith('Falta la clase'), sinClase.errores[0].mensaje);
  igual(optimizadoDe('entero x = "hola";').estado, 'errores-previos');
});

prueba('los ejemplos imprimen lo mismo antes y despues de optimizar', () => {
  const dir = path.join(__dirname, '..', 'ejemplos');
  fs.readdirSync(dir).filter((f) => !f.includes('error')).forEach((f) => {
    const fuente = fs.readFileSync(path.join(dir, f), 'utf8');
    verdadero(mismaSalida(fuente, ['5']).length > 0, `${f} no imprimio nada`);
    // Todos sus saltos siguen llegando a una etiqueta
    const o = compilar(fuente).optimizacion;
    const etiquetas = o.instrucciones.filter((i) => i.op === 'etiqueta').map((i) => i.resultado);
    o.instrucciones.filter((i) => ['goto', 'if', 'ifFalse', 'if==', 'intentar'].includes(i.op))
      .forEach((i) => verdadero(etiquetas.includes(i.resultado), `${f}: ${i.texto} salta a una etiqueta que no existe`));
    igual(o.etiquetas, etiquetas.length, `${f}, cuenta de etiquetas:`);
  });
  // El ejemplo 3 tiene sus valores fijos: casi todas sus decisiones se resuelven
  const control = compilar(fs.readFileSync(path.join(dir, '03-control.bs'), 'utf8')).optimizacion;
  verdadero(control.instrucciones.length < control.antes / 2, `${control.antes} -> ${control.instrucciones.length}`);
});

prueba('programas con trampas imprimen lo mismo antes y despues de optimizar', () => {
  const casos = [
    // opcion sin romper sigue con el siguiente caso
    ['entero d = 2;\nopcion (d) { caso 1: imprimirLn("uno"); caso 2: imprimirLn("dos"); caso 3: imprimirLn("tres"); romper; porDefecto: imprimirLn("otro"); }',
      'dos\ntres\n'],
    // Y, O y NO con corto circuito
    ['entero a = 5;\nlogico l = a > 3 Y a < 10;\nlogico m = a < 0 O a == 5;\nsi (l Y NO m) { imprimirLn("x"); } sino { imprimirLn("y"); }', 'y\n'],
    // ciclos anidados con romper
    ['entero suma = 0;\npara (entero i = 1; i <= 4; i++) { para (entero j = 1; j <= 4; j++) { si (j > i) { romper; } suma = suma + i * j; } }\nimprimirLn(suma);',
      '65\n'],
    // arreglos y matrices
    ['Arreglo entero d[] = {4, 5, 6};\nmatriz entero m[2][2] = {{1, 2}, {3, 4}};\nentero s = d[0] + d[2] * m[1][1];\nd[1] = s;\nimprimirLn(d[1]);',
      '28\n'],
    // textos
    ['cadena c = "Hola" + " " + "mundo";\nimprimirLn(c + 1);', 'Hola mundo1\n'],
    // hacer se ejecuta una vez aunque la condicion sea falsa
    ['entero x = 0;\nhacer { x = x + 2; } mientras (x < 0);\nimprimirLn(x);', '2\n'],
    // un lugar que no existe se captura
    ['Arreglo entero d[2];\nentero k = 5;\nintentar { d[k] = 1; imprimirLn("no"); } capturar (Error e) { imprimirLn("fuera"); }', 'fuera\n'],
    // enteros y decimales mezclados
    ['decimal p = 10;\nentero k = 4;\ndecimal r = p / k;\nimprimirLn(r);\nimprimirLn(k / 3 * 1.5);', '2.5\n1.5\n'],
    ['decimal total = 0;\npara (entero i = 1; i <= 3; i++) { total = total + i / 2; }\nimprimirLn(total);', '2.0\n'],
    // x++ devuelve el valor de antes
    ['entero x = 5;\nentero y = x++ + x;\nimprimirLn(y);', '11\n'],
    ['entero a = 7;\nentero b = -a;\nentero c = -(-3);\nimprimirLn(b * c);', '-21\n'],
    ['cadena t = "22";\nentero n = convertir(t, entero) + 1;\nimprimirLn(n);\nimprimirLn(convertir(n, decimal));', '23\n23.0\n'],
    ['entero i = 0;\nmientras (verdadero) { i++; si (i == 3) { romper; } }\nimprimirLn(i);', '3\n']
  ];
  casos.forEach(([codigo, esperado]) => igual(mismaSalida(programaDe(codigo)), esperado, codigo + '\n       '));

  // Con funciones: los valores se convierten al tipo de cada parametro y de lo que devuelve
  igual(mismaSalida('clase p {\n  funcion decimal mitad(entero n) { retornar n / 2; }\n' +
    '  funcion decimal prom(decimal a, decimal b) { retornar (a + b) / 2; }\n' +
    '  clasePrincipal { imprimirLn(mitad(7)); imprimirLn(prom(3, 4)); }\n}'), '3.0\n3.5\n');
  // Con lo que se escribe en leer
  igual(mismaSalida(programaDe('entero n;\nleer(n);\nsi (n % 2 == 0) { imprimirLn("par"); } sino { imprimirLn("impar"); }'), ['7']),
    'impar\n');
});

prueba('las funciones que solo calculan se quitan si nadie usa su valor', () => {
  igual(optDe('decimal p = potencia(2, 3);\nentero r = redondear(2.6);\nimprimirLn("fin");'),
    'param "fin" / call imprimirLn, 1');
  const quitada = optimizadoDe('decimal p = potencia(2, 3);').cambios.find((c) => c.optimizacion === 'muerto');
  igual(quitada.antes, 'param 2  ·  param 3  ·  p = call potencia, 2');
  // Las que hacen algo (imprimir, leer, aleatorio) se quedan
  igual(optDe('entero d = aleatorio(1, 6);'), 'param 1 / param 6 / call aleatorio, 2');
});

prueba('un valor que se pisa antes de usarse no se guarda', () => {
  igual(optDe('entero a;\nleer(a);\nentero b = a + 1;\nb = a * 3;\nimprimirLn(b);'),
    'leer a / b = a * 3 / param b / call imprimirLn, 1');
  // Dentro de intentar si se guarda: si algo falla, capturar puede usarlo
  const conIntentar = optDe('entero a;\nleer(a);\nentero b = 0;\nintentar { b = 1; b = 10 / a; } ' +
    'capturar (Error e) { imprimirLn(b); }\nimprimirLn(b);');
  verdadero(conIntentar.includes('b = 1'), conIntentar);
  igual(mismaSalida(programaDe('entero a;\nleer(a);\nentero b = 0;\nintentar { b = 1; b = 10 / a; } ' +
    'capturar (Error e) { imprimirLn(b); }\nimprimirLn(b);'), ['0']), '1\n1\n');
});

prueba('los textos iguales y convertir con valores fijos se calculan desde ahora', () => {
  igual(optDe('logico l = "a" == "a";\nlogico m = "a" == "b";\nimprimirLn(l);\nimprimirLn(m);'),
    'param verdadero / call imprimirLn, 1 / param falso / call imprimirLn, 1');
  igual(optDe('imprimirLn(convertir("42", decimal));\nimprimirLn(convertir(3.9, entero));\nimprimirLn(convertir(" 7 ", entero));'),
    'param 42.0 / call imprimirLn, 1 / param 3 / call imprimirLn, 1 / param 7 / call imprimirLn, 1');
  // Un texto que no es numero se queda: debe fallar al ejecutarse
  igual(optDe('cadena t = "hola";\nimprimirLn(convertir(t, entero));'), 't1 = (entero) "hola" / param t1 / call imprimirLn, 1');
});

prueba('una division entre un numero fijo distinto de cero ya no puede fallar: si nadie la usa se quita', () => {
  // a / 2 se quita; a / a se queda, porque si a vale 0 debe fallar
  igual(optDe('entero a;\nleer(a);\nentero b = a / 2;\nentero c = a / a;\nimprimirLn("fin");'),
    'leer a / c = a / a / param "fin" / call imprimirLn, 1');
});

prueba('programas al azar imprimen lo mismo antes y despues de optimizar', () => {
  // pruebas/programas-al-azar.js escribe programas correctos que siempre
  // terminan, con ciclos, opcion, funciones, arreglos, intentar...
  for (let semilla = 1; semilla <= 80; semilla++) {
    const { fuente, entradas } = programaAlAzar(semilla);
    try {
      mismaSalida(fuente, entradas);
    } catch (e) {
      throw new Error(`con la semilla ${semilla}: ${e.message}`);
    }
  }
});

// =====================================================================
grupo('Codigo objeto: Java (fase 6)');

const { spawnSync } = require('child_process');
const os = require('os');
const { generarCodigoObjeto } = require('../src/core/06.objeto/GeneradorJava');

const dirDeEjemplos = path.join(__dirname, '..', 'ejemplos');

/** El resultado de la fase 6 para unas instrucciones dentro de clasePrincipal. */
function objetoDe (codigo) {
  return compilar(programaDe(codigo)).objeto;
}

/** Los renglones de un metodo de Java, sin sangria y juntos:  int n = 0; / for (...) { / ... */
function metodoDe (codigo, encabezado = 'public static void main(') {
  const o = objetoDe(codigo);
  if (o.estado !== 'generado') throw new Error(`no se genero (${o.estado}): ${o.errores.map((e) => e.mensaje).join(' / ')}`);
  const renglones = o.codigo.split('\n');
  const inicio = renglones.findIndex((r) => r.includes(encabezado));
  let fin = inicio + 1;
  for (let abiertas = 1; fin < renglones.length; fin++) {
    abiertas += (renglones[fin].match(/\{/g) || []).length - (renglones[fin].match(/\}/g) || []).length;
    if (abiertas === 0) break;
  }
  return renglones.slice(inicio + 1, fin).map((r) => r.trim()).join(' / ');
}

prueba('el programa se traduce a una clase de Java con su main', () => {
  const o = objetoDe('entero n;\nleer(n);\nimprimirLn(n);');
  igual(o.estado, 'generado');
  igual(`${o.clase} ${o.archivo} ${o.metodos}`, 'prueba prueba.java 1');
  verdadero(o.codigo.startsWith('import java.util.Scanner;\n'), 'falta el import del Scanner');
  verdadero(o.codigo.includes('public class prueba {'), 'falta la clase');
  verdadero(o.codigo.includes(' * Compilar:  javac -encoding UTF-8 prueba.java'), 'falta como compilarlo');
  verdadero(o.codigo.includes('static Scanner entrada = new Scanner(System.in);'), 'falta el Scanner');
  igual(metodoDe('entero n;\nleer(n);\nimprimirLn(n);'), 'int n = entrada.nextInt(); / System.out.println(n);');
  // Sin leer no hace falta el Scanner
  verdadero(!objetoDe('imprimirLn("Hola");').codigo.includes('Scanner'), 'sobra el Scanner');
  igual(o.instrucciones, compilar(programaDe('entero n;\nleer(n);\nimprimirLn(n);')).optimizacion.instrucciones.length);
});

prueba('los saltos se vuelven otra vez for, while y do-while', () => {
  igual(metodoDe('entero n;\nleer(n);\nentero s = 0;\npara (entero i = 1; i <= n; i++) { s = s + i; }\nimprimirLn(s);'),
    'int n = entrada.nextInt(); / int s = 0; / for (int i = 1; i <= n; i++) { / s = s + i; / } / System.out.println(s);');
  // Ciclos anidados: cada variable se declara en su propio for
  igual(metodoDe('entero n;\nleer(n);\npara (entero i = 1; i <= n; i++) { para (entero j = 1; j <= i; j++) { ' +
    'imprimir(j); } imprimirLn(""); }'),
  'int n = entrada.nextInt(); / for (int i = 1; i <= n; i++) { / for (int j = 1; j <= i; j++) { / ' +
    'System.out.print(j); / } / System.out.println(""); / }');
  igual(metodoDe('entero i;\nleer(i);\nmientras (i < 10) { i = i * 2; }\nimprimirLn(i);'),
    'int i = entrada.nextInt(); / while (i < 10) { / i = i + i; / } / System.out.println(i);');
  igual(metodoDe('entero x;\nleer(x);\nhacer { x = x - 3; } mientras (x > 0);\nimprimirLn(x);'),
    'int x = entrada.nextInt(); / do { / x = x - 3; / } while (x > 0); / System.out.println(x);');
  igual(metodoDe('entero a;\nleer(a);\nsi (a > 0) { imprimirLn("si"); } sino { imprimirLn("no"); }'),
    'int a = entrada.nextInt(); / if (a > 0) { / System.out.println("si"); / } else { / System.out.println("no"); / }');
});

prueba('opcion se vuelve switch, e intentar un try-catch', () => {
  igual(metodoDe('entero d;\nleer(d);\nopcion (d) { caso 1: imprimirLn("uno"); romper; caso 2: imprimirLn("dos"); romper; ' +
    'porDefecto: imprimirLn("otro"); }'),
  'int d = entrada.nextInt(); / switch (d) { / case 1: / System.out.println("uno"); / break; / ' +
    'case 2: / System.out.println("dos"); / break; / default: / System.out.println("otro"); / }');
  igual(metodoDe('entero a;\nleer(a);\nintentar { imprimirLn(10 / a); } capturar (Error e) { imprimirLn("error"); }'),
    'int a = entrada.nextInt(); / try { / System.out.println(10 / a); / } catch (Exception e) { / System.out.println("error"); / }');
});

prueba('Y y O vuelven a ser && y ||, y x++ vuelve a ser x++', () => {
  igual(metodoDe('entero a, b;\nleer(a);\nleer(b);\nsi (a > 0 Y b > 0 O a == b) { imprimirLn("si"); }'),
    'int a = entrada.nextInt(); / int b = entrada.nextInt(); / if (a > 0 && b > 0 || a == b) { / System.out.println("si"); / }');
  igual(metodoDe('entero x;\nleer(x);\nentero y = x++ + x;\nimprimirLn(y);'),
    'int x = entrada.nextInt(); / int y = x++ + x; / System.out.println(y);');
});

prueba('los arreglos llevan su lista de valores y las matrices son renglones seguidos', () => {
  igual(metodoDe('Arreglo entero d[] = {4, 5, 6};\nentero k;\nleer(k);\nd[1] = d[0] + k;\nimprimirLn(d[1]);'),
    'int[] d = {4, 5, 6}; / int k = entrada.nextInt(); / d[1] = d[0] + k; / System.out.println(d[1]);');
  igual(metodoDe('matriz entero m[2][3];\nentero i;\nleer(i);\nm[i][2] = 7;\nimprimirLn(m[i][2]);'),
    'int[] m = new int[6];   // matriz de 3 columnas: m[i][j] es m[i * 3 + j] / int i = entrada.nextInt(); / ' +
    'int t3 = i * 3 + 2; / m[t3] = 7; / System.out.println(m[t3]);');
});

prueba('los textos se comparan con equals y leer usa el Scanner segun el tipo', () => {
  igual(metodoDe('cadena s;\nleer(s);\nsi (s == "hola") { imprimirLn("saludo"); }'),
    'String s = entrada.next(); / if (s.equals("hola")) { / System.out.println("saludo"); / }');
  igual(metodoDe('cadena t;\nleer(t);\nentero n = convertir(t, entero);\nimprimirLn(n * 2);'),
    'String t = entrada.next(); / int n = Integer.parseInt(t.trim()); / System.out.println(n + n);');
  verdadero(metodoDe('decimal r;\nleer(r);\nimprimirLn(r);').startsWith('double r = entrada.nextDouble();'), 'leer decimal');
});

prueba('las funciones se vuelven metodos static', () => {
  const fuente = 'clase p {\n  funcion entero doble(entero n) { retornar n * 2; }\n' +
    '  funcion vacio saluda(cadena q) { imprimirLn("Hola " + q); }\n' +
    '  clasePrincipal { entero x; leer(x); saluda("Ana"); imprimirLn(doble(x)); }\n}';
  igual(objetoDe(fuente).metodos, 3);
  igual(metodoDe(fuente, 'static int doble(int n)'), 'return n + n;');
  igual(metodoDe(fuente, 'static void saluda(String q)'), 'System.out.println("Hola " + q);');
  igual(metodoDe(fuente), 'int x = entrada.nextInt(); / saluda("Ana"); / System.out.println(doble(x));');
});

prueba('lo que Java no trae tal cual va en funciones de apoyo', () => {
  const o = objetoDe('entero n;\nleer(n);\nimprimirLn(aleatorio(1, n));\nesperar(10);\nimprimirLn(logaritmo(2, n));');
  igual(o.apoyo.join(), 'aleatorio,esperar,logaritmo');
  verdadero(o.codigo.includes('static int aleatorio(long minimo, long maximo) {'), 'falta aleatorio');
  verdadero(o.codigo.includes('Thread.sleep(milisegundos);'), 'falta esperar');
  verdadero(o.codigo.includes('return Math.log(numero) / Math.log(base);'), 'falta logaritmo');
  igual(metodoDe('decimal r;\nleer(r);\nimprimirLn(area.circulo(r));\nimprimirLn(potencia(r, 2));\nimprimirLn(redondear(r));'),
    'double r = entrada.nextDouble(); / System.out.println(area.circulo(r)); / System.out.println(Math.pow(r, 2)); / ' +
    'System.out.println((int) Math.round(r));');
  // Solo se escriben las figuras que se usan
  const figuras = objetoDe('decimal r;\nleer(r);\nimprimirLn(area.circulo(r));').codigo;
  verdadero(figuras.includes('static class area {') && figuras.includes('return Math.PI * radio * radio;'), 'falta area.circulo');
  verdadero(!figuras.includes('static class volumen'), 'sobra volumen');
  igual(objetoDe('imprimirLn("Hola");').apoyo.length, 0);
});

prueba('los nombres que en Java son palabras reservadas llevan _', () => {
  igual(metodoDe('entero new;\nleer(new);\nimprimirLn(new * 3);'), 'int new_ = entrada.nextInt(); / System.out.println(new_ * 3);');
});

prueba('cada renglon de Java sabe de que linea del programa sale y lleva sus colores', () => {
  const o = compilar('clase p {\n  clasePrincipal {\n    entero n;\n    leer(n);\n' +
    '    para (entero i = 0; i < n; i++) {\n      imprimirLn("i: " + i);\n    }\n  }\n}').objeto;
  const para = o.lineas.find((l) => l.texto.trim().startsWith('for ('));
  igual(para.linea, 5);
  verdadero(para.html.includes('<span class="j-control">for</span>'), para.html);
  verdadero(para.html.includes('<span class="j-tipo">int</span>'), para.html);
  const imprime = o.lineas.find((l) => l.texto.includes('println'));
  igual(imprime.linea, 6);
  verdadero(imprime.html.includes('<span class="j-cadena">&quot;i: &quot;</span>') ||
    imprime.html.includes('<span class="j-cadena">"i: "</span>'), imprime.html);
  igual(o.lineas.map((l) => l.texto).join('\n') + '\n', o.codigo);
});

prueba('sin un programa correcto no se genera', () => {
  igual(compilar('').objeto.estado, 'vacio');
  const sinClase = compilar('a = b + c').objeto;
  igual(sinClase.estado, 'errores-previos');
  verdadero(sinClase.errores[0].mensaje.startsWith('Falta la clase'), sinClase.errores[0].mensaje);
  igual(objetoDe('entero x = "hola";').estado, 'errores-previos');
});

prueba('todos los ejemplos correctos se traducen', () => {
  fs.readdirSync(dirDeEjemplos).filter((f) => !f.includes('error')).forEach((f) => {
    const o = compilar(fs.readFileSync(path.join(dirDeEjemplos, f), 'utf8')).objeto;
    igual(o.estado, 'generado', `${f}:`);
    verdadero(o.codigo.includes(`public class ${o.clase} {`) && o.codigo.includes('public static void main(String[] args) {'),
      `${f}: falta la clase o el main`);
  });
});

/**
 * Traduce los programas a Java, los compila con javac y los ejecuta (todos en
 * una sola maquina virtual, con pruebas/EjecutarJava.java). Devuelve los que
 * imprimieron algo distinto de lo que dice el interprete del codigo de tres
 * direcciones.
 */
function compilarYEjecutarJava (programas) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swordbyte-java-'));
  try {
    programas.forEach((p) => {
      fs.writeFileSync(path.join(dir, p.objeto.archivo), p.objeto.codigo);
      fs.writeFileSync(path.join(dir, p.objeto.clase + '.in'), p.entradas.join('\n') + '\n');
    });
    const javac = spawnSync('javac', ['-encoding', 'UTF-8', '-nowarn', '-d', dir,
      path.join(__dirname, 'EjecutarJava.java'), ...programas.map((p) => path.join(dir, p.objeto.archivo))],
    { encoding: 'utf8' });
    if (javac.status !== 0) throw new Error('javac encontro errores:\n' + javac.stderr.split('\n').slice(0, 12).join('\n'));
    const java = spawnSync('java', ['-cp', dir, 'EjecutarJava', ...programas.map((p) => p.objeto.clase)],
      { cwd: dir, encoding: 'utf8', timeout: 120000 });
    if (java.status !== 0) throw new Error('java no termino: ' + java.stderr);
    return programas.filter((p) => fs.readFileSync(path.join(dir, p.objeto.clase + '.out'), 'utf8') !== p.esperado);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const hayJavac = !spawnSync('javac', ['-version'], { encoding: 'utf8' }).error;

if (!hayJavac) {
  console.log('  \x1b[33mOMITIDA\x1b[0m el Java compila con javac e imprime lo mismo (no se encontro javac)');
} else {
  prueba('el Java de los ejemplos y de 60 programas al azar compila con javac e imprime lo mismo', () => {
    const programas = [];
    const agregar = (fuente, entradas, nombre, sinOptimizar) => {
      // Cada programa con su propia clase: todos se compilan juntos
      const r = compilar(fuente.replace(/\bclase\s+\w+/, `clase ${nombre}`));
      igual(r.intermedio.estado, 'generado', `${nombre}:`);
      // La fase 6 no depende de la 5: tambien se traduce el codigo sin optimizar
      const objeto = sinOptimizar
        ? generarCodigoObjeto(Object.assign({}, r.optimizacion, { instrucciones: r.intermedio.instrucciones }))
        : r.objeto;
      igual(objeto.estado, 'generado', `${nombre}:`);
      const esperado = ejecutarIntermedio(r.optimizacion.instrucciones, { entradas });
      programas.push({ nombre, objeto, entradas, esperado });
    };
    fs.readdirSync(dirDeEjemplos).filter((f) => !f.includes('error')).forEach((f, k) =>
      agregar(fs.readFileSync(path.join(dirDeEjemplos, f), 'utf8'), Array(20).fill('5'), `ejemplo${k + 1}`));
    for (let semilla = 1; semilla <= 60; semilla++) {
      const { fuente, entradas } = programaAlAzar(semilla);
      agregar(fuente, entradas, `azar${semilla}`);
      if (semilla <= 20) agregar(fuente, entradas, `sinOptimizar${semilla}`, true);
    }
    const distintos = compilarYEjecutarJava(programas);
    igual(distintos.map((p) => p.nombre).join(', '), '', 'imprimieron algo distinto:');
  });
}

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

prueba('los dos reportes traen el codigo intermedio', () => {
  const r = compilar(fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '04-funciones.bs'), 'utf8'));
  const texto = contenidoParaGuardar(r, 'x.bs').contenido;
  verdadero(texto.includes('5. CÓDIGO INTERMEDIO (TRES DIRECCIONES)'), 'falta la seccion 5');
  verdadero(texto.includes('//      t1 = a + b'), 'falta el codigo de tres direcciones');
  verdadero(texto.includes('//  // retornar a + b;'), 'falta el renglon del programa');
  igual(compilar(texto).errores.length, 0, 'el reporte sigue siendo un programa valido:');
  const html = contenidoParaGuardar(r, 'x.html').contenido;
  verdadero(html.includes('<h2><span>5</span> Código intermedio</h2>'), 'falta la seccion 5 en el .html');
  verdadero(html.includes('<table class="tabla cuadruplos">'), 'faltan los cuadruplos');
  verdadero(html.includes('t1 = a + b'), 'falta el codigo de tres direcciones en el .html');
});

prueba('los dos reportes traen el codigo optimizado', () => {
  const r = compilar(fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '03-control.bs'), 'utf8'));
  const texto = contenidoParaGuardar(r, 'x.bs').contenido;
  verdadero(texto.includes('6. CÓDIGO INTERMEDIO OPTIMIZADO'), 'falta la seccion 6');
  verdadero(texto.includes(`De ${r.optimizacion.antes} instrucciones a ${r.optimizacion.instrucciones.length}`),
    'falta el resumen');
  verdadero(texto.includes('Plegado de constantes:  t1 = 20 >= 18  ->  t1 = verdadero'), 'falta la lista de cambios');
  igual(compilar(texto).errores.length, 0, 'el reporte sigue siendo un programa valido:');
  const html = contenidoParaGuardar(r, 'x.html').contenido;
  verdadero(html.includes('<h2><span>6</span> Código optimizado</h2>'), 'falta la seccion 6 en el .html');
  verdadero(html.includes('<table class="tabla cambios">'), 'faltan los cambios en el .html');
  verdadero(html.includes('<tr class="cambiada">'), 'faltan las instrucciones que cambiaron');
  verdadero(html.includes('<b>31 instrucciones</b>'), 'falta la tarjeta de la optimizacion');
  // Se puede guardar desde la pestaña 5 y volver a ella
  igual(leerArchivoGuardado(contenidoParaGuardar(r, 'x.html', { pestana: 'optimizacion' }).contenido).pestana,
    'optimizacion');
});

prueba('los dos reportes traen el codigo Java', () => {
  const r = compilar(fs.readFileSync(path.join(__dirname, '..', 'ejemplos', '03-control.bs'), 'utf8'));
  const texto = contenidoParaGuardar(r, 'x.bs').contenido;
  verdadero(texto.includes('7. CÓDIGO OBJETO (JAVA)'), 'falta la seccion 7');
  verdadero(texto.includes(`control.java: ${r.objeto.lineas.length} renglones de Java y 1 método,`), 'falta el resumen');
  verdadero(texto.includes('//  public class control {'), 'falta el codigo Java');
  // El Java va en comentarios: el reporte sigue siendo un programa valido
  igual(compilar(texto).errores.length, 0, 'el reporte sigue siendo un programa valido:');
  const html = contenidoParaGuardar(r, 'x.html').contenido;
  verdadero(html.includes('<h2><span>7</span> Código objeto (Java)</h2>'), 'falta la seccion 7 en el .html');
  verdadero(html.includes('<span class="j-control">for</span>'), 'falta el Java con colores');
  verdadero(html.includes('<b>control.java</b>'), 'falta la tarjeta del codigo objeto');
  igual(leerArchivoGuardado(contenidoParaGuardar(r, 'x.html', { pestana: 'objeto' }).contenido).pestana, 'objeto');
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

/**
 * ejecutar.js
 * Pruebas automaticas del compilador, sin dependencias externas.
 *
 *   npm run pruebas
 */

const fs = require('fs');
const path = require('path');
const { compilar } = require('../src/core/Compilador');
const { analizarLexico } = require('../src/core/lexico/AnalizadorLexico');

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

prueba('una instruccion suelta se analiza sin la clase', () => {
  const r = compilar('entero a = 5;');
  igual(r.sintactico.modo, 'instrucciones');
  igual(r.errores.length, 0);
  igual(r.sintactico.arbol.etiqueta, 'entero');
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

prueba('una proposicion simple con punto y coma es una instruccion', () => {
  const r = compilar('a = b + c;\na && b || c + f > d;');
  igual(r.errores.length, 0, 'no debe haber errores:');
  igual(r.sintactico.modo, 'instrucciones');
  // Se dibuja directo con su expresion, sin un nodo que la envuelva
  igual(r.sintactico.arbol.hijos.map((h) => h.etiqueta).join(' '), '= ||');
});

prueba('las instrucciones de siempre se siguen reconociendo', () => {
  const ast = compilar('i++; sumar(5, 3); a[1] = 2;').sintactico.ast;
  igual(ast.instrucciones.map((i) => i.tipo).join(' '),
    'IncrementoStmt ExpresionInstruccion Asignacion');
  verdadero(compilar('a b;').errores[0].mensaje.includes("Falta '='"),
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
grupo('Analizador semantico: la gramatica del codigo (pestaña 3)');

const { reglaATexto, claseDeCaracter } = require('../src/core/semantico/AnalizadorSemantico');

/** La gramatica de un codigo, una regla por renglon:  exp → id | num */
function gramaticaDe (fuente) {
  const s = compilar(fuente).semantico;
  if (!s.correcto) throw new Error('no se genero la gramatica: ' + s.errores.map((e) => e.mensaje).join(' / '));
  return s.reglas.map((r) => reglaATexto(r));
}

/** La regla con ese nombre, o '' si no salio. */
function reglaDe (fuente, nombre) {
  return gramaticaDe(fuente).find((r) => r.startsWith(nombre + ' →')) || '';
}

prueba('genera la gramatica del ejemplo del pizarron (a1 = b5 / 20)', () => {
  igual(gramaticaDe('a1 = b5 / 20').join(' / '),
    'prop → id = exp / exp → id | num | exp / exp / id → let ( dig )* / ' +
    'num → dig ( dig )* / dig → 0-9 / let → a-z');
});

prueba('solo salen las alternativas que aparecen en el codigo', () => {
  const exp = reglaDe('a + b', 'exp');
  igual(exp, 'exp → id');
  verdadero(!gramaticaDe('a + b').some((r) => r.includes('*')), 'no hay multiplicaciones');
});

prueba('los parentesis aparecen como exp → ( exp )', () => {
  verdadero(reglaDe('(a + b) * c', 'exp').includes('( exp )'), reglaDe('(a + b) * c', 'exp'));
});

prueba('una instruccion suelta es la proposicion', () => {
  igual(reglaDe('entero edad = 20;', 'prop'), 'prop → tipo id = exp ;');
  igual(reglaDe('entero edad = 20;', 'tipo'), 'tipo → entero');
});

prueba('las proposiciones del usuario: asignacion y expresion', () => {
  igual(gramaticaDe('a = b + c').join(' / '),
    'prop → id = exp / exp → id | exp + exp / id → let / let → a-z');
  igual(reglaDe('a && b || c +f > d', 'prop'), 'prop → exp || exp');
  igual(reglaDe('a && b || c +f > d', 'exp'), 'exp → id | exp && exp | exp + exp | exp > exp');
  igual(reglaDe('a', 'prop'), 'prop → id');
});

prueba('varias proposiciones, una por renglon: props → prop prop', () => {
  const fuente = 'a = b + c\na && b || c + f > d';
  igual(reglaDe(fuente, 'props'), 'props → prop prop');
  igual(reglaDe(fuente, 'prop'), 'prop → id = exp | exp || exp');
  igual(compilar(fuente).semantico.modo, 'proposiciones');
});

prueba('varias instrucciones con punto y coma: cada una es una prop', () => {
  igual(reglaDe('a = 1; b = 2; c = 3;', 'props'), 'props → prop ( prop )*');
  igual(reglaDe('a = 1; x > y;', 'prop'), 'prop → id = exp ; | exp > exp ;');
});

prueba('tres o mas iguales se escriben con repeticion ( )*', () => {
  igual(reglaDe('imprimir(a, b, c);', 'prop'), 'prop → imprimir ( exp ( , exp )* ) ;');
});

prueba('las estructuras de control llevan sus bloques', () => {
  igual(reglaDe('si (a > 1) { romper; } sino { romper; }', 'prop'),
    'prop → si ( exp ) { inst } sino { inst }');
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
  igual(reglas.join(','), 'prop,exp,rama,inst,id,num,cadena,TEXTO,dig,LET,let');
});

prueba('el identificador usa solo las clases de caracteres que aparecen', () => {
  igual(reglaDe('a', 'id'), 'id → let');
  igual(reglaDe('miVariable2', 'id'), 'id → let ( let | LET | dig )*');
  igual(reglaDe('_x', 'id'), 'id → _ ( let )*');
});

prueba('el texto de una cadena dice sus clases de caracteres', () => {
  igual(reglaDe('imprimir("Hola mundo!");', 'TEXTO'), 'TEXTO → ( LET | let | simb )*');
  igual(reglaDe('imprimir("Hola mundo!");', 'simb'), 'simb → ␣ | !');
});

prueba('la ñ y los acentos cuentan como letras', () => {
  igual(claseDeCaracter('ñ'), 'let');
  igual(claseDeCaracter('Á'), 'LET');
  igual(reglaDe('año', 'let'), 'let → a-z | ñ');
});

prueba('cada produccion dice de que parte del codigo salio', () => {
  const exp = compilar('a1 = b5 / 20').semantico.reglas.find((r) => r.regla === 'exp');
  const division = exp.alternativas.find((a) => a.texto === 'exp / exp');
  igual(division.ejemplo, 'b5 / 20');
});

prueba('los terminales y los no terminales se distinguen', () => {
  const prop = compilar('si (a) { romper; }').semantico.reglas[0].alternativas[0];
  igual(prop.simbolos[0].clase, 'terminal');      // si
  igual(prop.simbolos[2].clase, 'no-terminal');   // exp
});

prueba('con errores no hay gramatica, y se dice por que', () => {
  const s = compilar('entero = 5;').semantico;
  igual(s.correcto, false);
  igual(s.reglas.length, 0);
  verdadero(s.errores.length > 0, 'debe traer los errores');
});

prueba('sin codigo no hay gramatica ni errores', () => {
  const s = compilar('').semantico;
  verdadero(s.vacio, 'debe marcarse vacio');
  igual(s.errores.length, 0);
});

prueba('todos los ejemplos correctos generan su gramatica', () => {
  const dir = path.join(__dirname, '..', 'ejemplos');
  fs.readdirSync(dir).filter((f) => !f.includes('error')).forEach((f) => {
    const s = compilar(fs.readFileSync(path.join(dir, f), 'utf8')).semantico;
    verdadero(s.correcto && s.reglas[0].regla === 'prop', `${f} no genero su gramatica`);
  });
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

prueba('los dos reportes traen la gramatica generada', () => {
  const r = compilar('a1 = b5 / 20');
  const texto = contenidoParaGuardar(r, 'x.bs').contenido;
  verdadero(texto.includes('4. ANÁLISIS SEMÁNTICO: GRAMÁTICA DEL CÓDIGO'), 'falta la seccion 4');
  verdadero(texto.includes('prop → id = exp'), 'falta la regla prop en el .bs');
  verdadero(texto.includes('    | exp / exp'), 'las alternativas van alineadas bajo la flecha');
  const html = contenidoParaGuardar(r, 'x.html').contenido;
  verdadero(html.includes('<table class="gramatica">'), 'falta la gramatica en el .html');
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

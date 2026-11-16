/**
 * Gramatica.js
 * Gramatica libre de contexto de SwordByte expresada en EBNF, como dato.
 *
 * El analizador NO lee este archivo para funcionar: las reglas ya estan
 * escritas como funciones dentro de AnalizadorSintactico.js. Este archivo es
 * la especificacion de referencia y de aqui sale, con la herramienta
 * herramientas/generar-gramatica.js, el documento docs/04-gramatica-ebnf.md.
 *
 * Notacion:
 *   <x>      no terminal        "x"   terminal literal
 *   [ x ]    opcional           { x } cero o mas repeticiones
 *   x | y    alternativa
 */

const GRAMATICA = [
  {
    grupo: 'Estructura del programa',
    reglas: [
      { nombre: 'programa', ebnf: '<programa> ::= "clase" IDENT "{" <miembros> "}"' },
      { nombre: 'proposiciones', ebnf: '<proposiciones> ::= <expresion> { <expresion> }       (una por renglon, sin ";")' },
      { nombre: 'miembros', ebnf: '<miembros> ::= { <funcion> } <clasePrincipal> { <funcion> }' },
      { nombre: 'clasePrincipal', ebnf: '<clasePrincipal> ::= "clasePrincipal" "{" <instrucciones> "}"' },
      { nombre: 'funcion', ebnf: '<funcion> ::= "funcion" <tipoRetorno> IDENT "(" [ <parametros> ] ")" "{" <instrucciones> "}"' },
      { nombre: 'tipoRetorno', ebnf: '<tipoRetorno> ::= <tipo> | "vacio"' },
      { nombre: 'parametros', ebnf: '<parametros> ::= <tipo> IDENT { "," <tipo> IDENT }' },
      { nombre: 'tipo', ebnf: '<tipo> ::= "logico" | "byte" | "caracter" | "corto" | "entero" | "largo" | "flotante" | "decimal" | "cadena"' }
    ]
  },
  {
    grupo: 'Instrucciones',
    reglas: [
      {
        nombre: 'instrucciones',
        ebnf: '<instrucciones> ::= { <instruccion> }'
      },
      {
        nombre: 'instruccion',
        ebnf: [
          '<instruccion> ::= <declaracion>  | <constante> | <arreglo>  | <matriz>',
          '                | <proposicion>  | <impresion> | <si>       | <para>',
          '                | <mientras>     | <hacer>     | <opcion>   | <leer>',
          '                | <intentar>     | <retornar>  | <romper>'
        ].join('\n')
      },
      { nombre: 'declaracion', ebnf: '<declaracion> ::= <tipo> <declarador> { "," <declarador> } ";"' },
      { nombre: 'declarador', ebnf: '<declarador> ::= IDENT [ "=" <expresion> ]' },
      { nombre: 'constante', ebnf: '<constante> ::= "Constante" <tipo> IDENT "=" <expresion> ";"' },
      { nombre: 'arreglo', ebnf: '<arreglo> ::= "Arreglo" <tipo> IDENT "[" [ <expresion> ] "]" [ "[" [ <expresion> ] "]" ] [ "=" <inicializador> ] ";"' },
      { nombre: 'matriz', ebnf: '<matriz> ::= "matriz" <tipo> IDENT "[" [ <expresion> ] "]" "[" [ <expresion> ] "]" [ "=" <inicializador> ] ";"' },
      { nombre: 'inicializador', ebnf: '<inicializador> ::= "{" [ <valorInicial> { "," <valorInicial> } ] "}"' },
      { nombre: 'valorInicial', ebnf: '<valorInicial> ::= <expresion> | <inicializador>' },
      {
        nombre: 'proposicion',
        ebnf: [
          '<proposicion> ::= <destino> "=" <expresion> ";"',
          '                | <destino> ( "++" | "--" ) ";"',
          '                | IDENT "(" [ <argumentos> ] ")" ";"'
        ].join('\n')
      },
      { nombre: 'destino', ebnf: '<destino> ::= IDENT [ "[" <expresion> "]" [ "[" <expresion> "]" ] ]' }
    ]
  },
  {
    grupo: 'Entrada y salida',
    reglas: [
      { nombre: 'impresion', ebnf: '<impresion> ::= ( "imprimir" | "imprimirLn" ) "(" [ <expresion> ] ")" ";"  |  "imprimirF" "(" <expresion> { "," <expresion> } ")" ";"' },
      { nombre: 'leer', ebnf: '<leer> ::= "leer" "(" <destino> ")" ";"' },
      { nombre: 'equipo', ebnf: '<equipo> ::= "equipo" "(" [ "Null" ] ")" ";"' },
      { nombre: 'limpiar', ebnf: '<limpiar> ::= "limpiar" "(" ")" ";"' },
      { nombre: 'esperar', ebnf: '<esperar> ::= "esperar" "(" <expresion> ")" ";"' }
    ]
  },
  {
    grupo: 'Control de flujo',
    reglas: [
      {
        nombre: 'si',
        ebnf: [
          '<si> ::= "si" "(" <expresion> ")" "{" <instrucciones> "}"',
          '         { "sinoSi" "(" <expresion> ")" "{" <instrucciones> "}" }',
          '         [ "sino" "{" <instrucciones> "}" ]'
        ].join('\n')
      },
      { nombre: 'para', ebnf: '<para> ::= "para" "(" <inicioPara> ";" <expresion> ";" <actualizacion> ")" "{" <instrucciones> "}"' },
      { nombre: 'inicioPara', ebnf: '<inicioPara> ::= <tipo> IDENT "=" <expresion>  |  IDENT "=" <expresion>' },
      { nombre: 'actualizacion', ebnf: '<actualizacion> ::= IDENT ( "++" | "--" )  |  IDENT "=" <expresion>' },
      { nombre: 'mientras', ebnf: '<mientras> ::= "mientras" "(" <expresion> ")" "{" <instrucciones> "}"' },
      { nombre: 'hacer', ebnf: '<hacer> ::= "hacer" "{" <instrucciones> "}" "mientras" "(" <expresion> ")" ";"' },
      {
        nombre: 'opcion',
        ebnf: [
          '<opcion> ::= "opcion" "(" <expresion> ")" "{" { <caso> } [ <porDefecto> ] "}"',
          '<caso>   ::= "caso" <literal> ":" <instrucciones>',
          '<porDefecto> ::= "porDefecto" ":" <instrucciones>'
        ].join('\n')
      },
      { nombre: 'intentar', ebnf: '<intentar> ::= "intentar" "{" <instrucciones> "}" "capturar" "(" "Error" IDENT ")" "{" <instrucciones> "}"' },
      { nombre: 'retornar', ebnf: '<retornar> ::= "retornar" [ <expresion> ] ";"' },
      { nombre: 'romper', ebnf: '<romper> ::= "romper" ";"' }
    ]
  },
  {
    grupo: 'Expresiones (arriba del arbol los booleanos, abajo los aritmeticos)',
    reglas: [
      { nombre: 'expresion', ebnf: '<expresion> ::= <expresionO>' },

      // --- Grupo 1: booleanos (quedan hasta arriba del arbol) ---
      {
        nombre: 'expresionO',
        ebnf: '<expresionO> ::= <expresionY> { ( "O" | "OR" | "||" ) <expresionY> }'
      },
      {
        nombre: 'expresionY',
        ebnf: '<expresionY> ::= <negacion> { ( "Y" | "AND" | "&&" ) <negacion> }'
      },
      {
        nombre: 'negacion',
        ebnf: '<negacion> ::= ( "NO" | "NOT" | "!" ) <negacion>  |  <igualdad>'
      },

      // --- Grupo 2: relacionales ---
      { nombre: 'igualdad', ebnf: '<igualdad> ::= <relacional> { ( "==" | "!=" ) <relacional> }' },
      { nombre: 'relacional', ebnf: '<relacional> ::= <asignacion> { ( "<" | ">" | "<=" | ">=" ) <asignacion> }' },

      // --- Grupo 3: aritmeticos (quedan hasta abajo del arbol) ---
      { nombre: 'asignacion', ebnf: '<asignacion> ::= <aditiva> [ "=" <asignacion> ]' },
      { nombre: 'aditiva', ebnf: '<aditiva> ::= <multiplicativa> { ( "+" | "-" ) <multiplicativa> }' },
      { nombre: 'multiplicativa', ebnf: '<multiplicativa> ::= <unaria> { ( "*" | "/" | "%" ) <unaria> }' },
      {
        nombre: 'unaria',
        ebnf: '<unaria> ::= ( "-" | "+" | "√" ) <unaria>  |  <potencia>'
      },
      {
        nombre: 'potencia',
        ebnf: '<potencia> ::= <postfija> [ ( "^" | "**" ) <unaria> ]'
      },
      { nombre: 'postfija', ebnf: '<postfija> ::= <primaria> [ "++" | "--" ]' },
      {
        nombre: 'primaria',
        ebnf: [
          '<primaria> ::= <literal>',
          '             | "(" <expresion> ")"',
          '             | <llamada>',
          '             | <destino>'
        ].join('\n')
      },
      { nombre: 'literal', ebnf: '<literal> ::= ENTERO | DECIMAL | CADENA | CARACTER | "verdadero" | "falso"' }
    ]
  },
  {
    grupo: 'Llamadas y funciones nativas',
    reglas: [
      { nombre: 'llamada', ebnf: '<llamada> ::= <nativa> | IDENT "(" [ <argumentos> ] ")"' },
      { nombre: 'argumentos', ebnf: '<argumentos> ::= <expresion> { "," <expresion> }' },
      {
        nombre: 'nativa',
        ebnf: [
          '<nativa> ::= "longitud"   "(" <expresion> ")"',
          '           | "aleatorio"  "(" <expresion> "," <expresion> ")"',
          '           | "potencia"   "(" <expresion> "," <expresion> ")"',
          '           | "raiz"       "(" <expresion> [ "," <expresion> ] ")"',
          '           | "raizCuadrada" "(" <expresion> ")"',
          '           | "raizCubica" "(" <expresion> ")"',
          '           | "redondear"  "(" <expresion> ")"',
          '           | "logaritmo"  "(" <expresion> [ "," <expresion> ] ")"',
          '           | "logaritmo10" "(" <expresion> ")"',
          '           | "seno"       "(" <expresion> ")"',
          '           | "coseno"     "(" <expresion> ")"',
          '           | "convertir"  "(" <expresion> "," <tipo> ")"',
          '           | <geometrica>'
        ].join('\n')
      },
      {
        nombre: 'geometrica',
        ebnf: [
          '<geometrica> ::= ( "perimetro" | "area" | "volumen" ) "." <figura> "(" [ <argumentos> ] ")"',
          '<figura> ::= "circulo" | "cuadrado" | "rectangulo" | "triangulo"',
          '           | "cubo" | "esfera" | "cilindro" | "cono" | "prisma" | "piramide"'
        ].join('\n')
      }
    ]
  }
];

module.exports = { GRAMATICA };

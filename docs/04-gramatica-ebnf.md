# Gramática formal de SwordByte

Gramática libre de contexto del lenguaje en notación **EBNF**. Es la
especificación que implementa
[`AnalizadorSintactico.js`](../src/core/02.sintactico/AnalizadorSintactico.js):
cada no terminal de esta lista es un método con el mismo nombre en esa clase.

> Este archivo se genera a partir de
> [`src/core/02.sintactico/Gramatica.js`](../src/core/02.sintactico/Gramatica.js),
> así que el documento y el código nunca se desincronizan.

## Notación

| Símbolo | Significado |
|---|---|
| `<x>` | no terminal |
| `"x"` | terminal literal (token) |
| `[ x ]` | opcional: cero o una vez |
| `{ x }` | repetición: cero o más veces |
| `x \| y` | alternativa |
| `IDENT` | token de categoría `IDENTIFICADOR` |
| `ENTERO`, `DECIMAL`, `CADENA`, `CARACTER` | tokens literales |

## Símbolo inicial

```ebnf
<programa>
```

Para revisar fragmentos sin escribir la clase, el analizador también acepta
como inicio una lista de instrucciones (`<instrucciones>`, cada una con su
`;`) o una o varias proposiciones sueltas (`<proposiciones>`, una por renglón y
sin `;`). Cuál se usa lo decide `elegirModo()`; ver
[03 — Analizador sintáctico](03-analizador-sintactico.md).

## Producciones

### Estructura del programa

```ebnf
<programa> ::= "clase" IDENT "{" <miembros> "}"
<proposiciones> ::= <expresion> { <expresion> }       (una por renglon, sin ";")
<miembros> ::= { <funcion> } <clasePrincipal> { <funcion> }
<clasePrincipal> ::= "clasePrincipal" "{" <instrucciones> "}"
<funcion> ::= "funcion" <tipoRetorno> IDENT "(" [ <parametros> ] ")" "{" <instrucciones> "}"
<tipoRetorno> ::= <tipo> | "vacio"
<parametros> ::= <tipo> IDENT { "," <tipo> IDENT }
<tipo> ::= "logico" | "byte" | "caracter" | "corto" | "entero" | "largo" | "flotante" | "decimal" | "cadena"
```

### Instrucciones

```ebnf
<instrucciones> ::= { <instruccion> }
<instruccion> ::= <declaracion>  | <constante> | <arreglo>  | <matriz>
                | <proposicion>  | <impresion> | <si>       | <para>
                | <mientras>     | <hacer>     | <opcion>   | <leer>
                | <intentar>     | <retornar>  | <romper>
<declaracion> ::= <tipo> <declarador> { "," <declarador> } ";"
<declarador> ::= IDENT [ "=" <expresion> ]
<constante> ::= "Constante" <tipo> IDENT "=" <expresion> ";"
<arreglo> ::= "Arreglo" <tipo> IDENT "[" [ <expresion> ] "]" [ "[" [ <expresion> ] "]" ] [ "=" <inicializador> ] ";"
<matriz> ::= "matriz" <tipo> IDENT "[" [ <expresion> ] "]" "[" [ <expresion> ] "]" [ "=" <inicializador> ] ";"
<inicializador> ::= "{" [ <valorInicial> { "," <valorInicial> } ] "}"
<valorInicial> ::= <expresion> | <inicializador>
<proposicion> ::= <destino> "=" <expresion> ";"
                | <destino> ( "++" | "--" ) ";"
                | IDENT "(" [ <argumentos> ] ")" ";"
<destino> ::= IDENT [ "[" <expresion> "]" [ "[" <expresion> "]" ] ]
```

### Entrada y salida

```ebnf
<impresion> ::= ( "imprimir" | "imprimirLn" ) "(" [ <expresion> ] ")" ";"  |  "imprimirF" "(" <expresion> { "," <expresion> } ")" ";"
<leer> ::= "leer" "(" <destino> ")" ";"
<equipo> ::= "equipo" "(" [ "Null" ] ")" ";"
<limpiar> ::= "limpiar" "(" ")" ";"
<esperar> ::= "esperar" "(" <expresion> ")" ";"
```

### Control de flujo

```ebnf
<si> ::= "si" "(" <expresion> ")" "{" <instrucciones> "}"
         { "sinoSi" "(" <expresion> ")" "{" <instrucciones> "}" }
         [ "sino" "{" <instrucciones> "}" ]
<para> ::= "para" "(" <inicioPara> ";" <expresion> ";" <actualizacion> ")" "{" <instrucciones> "}"
<inicioPara> ::= <tipo> IDENT "=" <expresion>  |  IDENT "=" <expresion>
<actualizacion> ::= IDENT ( "++" | "--" )  |  IDENT "=" <expresion>
<mientras> ::= "mientras" "(" <expresion> ")" "{" <instrucciones> "}"
<hacer> ::= "hacer" "{" <instrucciones> "}" "mientras" "(" <expresion> ")" ";"
<opcion> ::= "opcion" "(" <expresion> ")" "{" { <caso> } [ <porDefecto> ] "}"
<caso>   ::= "caso" <literal> ":" <instrucciones>
<porDefecto> ::= "porDefecto" ":" <instrucciones>
<intentar> ::= "intentar" "{" <instrucciones> "}" "capturar" "(" "Error" IDENT ")" "{" <instrucciones> "}"
<retornar> ::= "retornar" [ <expresion> ] ";"
<romper> ::= "romper" ";"
```

### Expresiones (arriba del arbol los booleanos, abajo los aritmeticos)

```ebnf
<expresion> ::= <expresionO>
<expresionO> ::= <expresionY> { ( "O" | "OR" | "||" ) <expresionY> }
<expresionY> ::= <negacion> { ( "Y" | "AND" | "&&" ) <negacion> }
<negacion> ::= ( "NO" | "NOT" | "!" ) <negacion>  |  <igualdad>
<igualdad> ::= <relacional> { ( "==" | "!=" ) <relacional> }
<relacional> ::= <asignacion> { ( "<" | ">" | "<=" | ">=" ) <asignacion> }
<asignacion> ::= <aditiva> [ "=" <asignacion> ]
<aditiva> ::= <multiplicativa> { ( "+" | "-" ) <multiplicativa> }
<multiplicativa> ::= <unaria> { ( "*" | "/" | "%" ) <unaria> }
<unaria> ::= ( "-" | "+" | "√" ) <unaria>  |  <potencia>
<potencia> ::= <postfija> [ ( "^" | "**" ) <unaria> ]
<postfija> ::= <primaria> [ "++" | "--" ]
<primaria> ::= <literal>
             | "(" <expresion> ")"
             | <llamada>
             | <destino>
<literal> ::= ENTERO | DECIMAL | CADENA | CARACTER | "verdadero" | "falso"
```

### Llamadas y funciones nativas

```ebnf
<llamada> ::= <nativa> | IDENT "(" [ <argumentos> ] ")"
<argumentos> ::= <expresion> { "," <expresion> }
<nativa> ::= "longitud"   "(" <expresion> ")"
           | "aleatorio"  "(" <expresion> "," <expresion> ")"
           | "potencia"   "(" <expresion> "," <expresion> ")"
           | "raiz"       "(" <expresion> [ "," <expresion> ] ")"
           | "raizCuadrada" "(" <expresion> ")"
           | "raizCubica" "(" <expresion> ")"
           | "redondear"  "(" <expresion> ")"
           | "logaritmo"  "(" <expresion> [ "," <expresion> ] ")"
           | "logaritmo10" "(" <expresion> ")"
           | "seno"       "(" <expresion> ")"
           | "coseno"     "(" <expresion> ")"
           | "convertir"  "(" <expresion> "," <tipo> ")"
           | <geometrica>
<geometrica> ::= ( "perimetro" | "area" | "volumen" ) "." <figura> "(" [ <argumentos> ] ")"
<figura> ::= "circulo" | "cuadrado" | "rectangulo" | "triangulo"
           | "cubo" | "esfera" | "cilindro" | "cono" | "prisma" | "piramide"
```

## Propiedades de la gramática

| Propiedad | Estado |
|---|---|
| Recursividad por la izquierda | eliminada (los niveles de expresión usan repetición `{ }`) |
| Factorización por la izquierda | aplicada (cada alternativa se distingue por su primer token) |
| Tokens de anticipación | 1 |
| Clase | LL(1) sobre los constructos implementados |
| Ambigüedad del `sino` colgante | resuelta: los bloques siempre llevan llaves |

## Conjuntos PRIMEROS de las alternativas principales

| No terminal | PRIMEROS |
|---|---|
| `<instruccion>` | tipos de dato, `Constante`, `Arreglo`, `matriz`, `imprimir`, `imprimirLn`, `imprimirF`, `leer`, `equipo`, `limpiar`, `esperar`, `si`, `para`, `mientras`, `hacer`, `opcion`, `intentar`, `retornar`, `romper`, y los PRIMEROS de `<expresion>` (para `<proposicion>`) |
| `<expresion>` | IDENT, ENTERO, DECIMAL, CADENA, CARACTER, `verdadero`, `falso`, `(`, `-`, `+`, `√`, `NO`, `NOT`, `!`, nombres de funciones nativas |
| `<primaria>` | ENTERO, DECIMAL, CADENA, CARACTER, `verdadero`, `falso`, `(`, IDENT, nombres de funciones nativas |
| `<miembros>` | `funcion`, `clasePrincipal` |
| `<tipoRetorno>` | tipos de dato, `vacio` |

Como ninguna alternativa comparte su primer token con otra, basta un token de
anticipación y no hace falta retroceso.

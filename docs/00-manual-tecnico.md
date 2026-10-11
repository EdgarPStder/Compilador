# Manual técnico — Compilador SwordByte

**Equipo SwordByte** · Grado 9, Grupo F
Programación de Sistemas de Base II
Ingeniería en Sistemas Computacionales
Universidad Autónoma de Tamaulipas — Unidad Académica Multidisciplinaria Mante

Integrantes (orden alfabético por apellidos):

| # | Integrante |
|---|---|
| 1 | Avalos Castillo Armando de Jesús |
| 2 | Borjas Arias Ronaldo Antonio |
| 3 | Pesina Santander Edgar Gael |
| 4 | Ramos Antonio Saqueo |
| 5 | Vazquez Romo Marco Antonio |
| 6 | Verlage Aceves Axel Aram |

---

## Índice

**[Cómo leer este manual](#cómo-leer-este-manual)**

**[Parte I — Panorama](#parte-i--panorama)**
1. [Qué es este proyecto](#1-qué-es-este-proyecto)
2. [Qué es un compilador y qué parte construimos](#2-qué-es-un-compilador-y-qué-parte-construimos)
3. [El recorrido completo de un programa](#3-el-recorrido-completo-de-un-programa)

**[Parte II — El lenguaje SwordByte](#parte-ii--el-lenguaje-swordbyte)**
4. [SwordByte de un vistazo](#4-swordbyte-de-un-vistazo)
5. [Alfabeto y palabras reservadas](#5-alfabeto-y-palabras-reservadas)
6. [La jerarquía de operadores](#6-la-jerarquía-de-operadores)

**[Parte III — Arquitectura](#parte-iii--arquitectura)**
7. [Mapa del proyecto](#7-mapa-del-proyecto)
8. [Las piezas y cómo se comunican](#8-las-piezas-y-cómo-se-comunican)
9. [Las estructuras de datos comunes](#9-las-estructuras-de-datos-comunes)

**[Parte IV — Fase 1: Análisis léxico](#parte-iv--fase-1-análisis-léxico)**
10. [Qué hace y qué produce](#10-qué-hace-y-qué-produce)
11. [El autómata finito determinista (AFD)](#11-el-autómata-finito-determinista-afd)
12. [La salida `id1 > num(9)`](#12-la-salida-id1--num9)
12 bis. [La tabla de tokens de la pestaña 1](#12-bis-la-tabla-de-tokens-de-la-pestaña-1)
13. [Los errores léxicos](#13-los-errores-léxicos)

**[Parte V — Fase 2: Análisis sintáctico](#parte-v--fase-2-análisis-sintáctico)**
14. [Qué hace y qué produce](#14-qué-hace-y-qué-produce)
15. [Descenso recursivo: la idea](#15-descenso-recursivo-la-idea)
16. [Las herramientas del parser](#16-las-herramientas-del-parser)
17. [Los tres modos de análisis](#17-los-tres-modos-de-análisis)
18. [La jerarquía, codificada en la gramática](#18-la-jerarquía-codificada-en-la-gramática)
19. [El árbol de sintaxis abstracta (AST)](#19-el-árbol-de-sintaxis-abstracta-ast)
20. [Recuperación de errores: modo pánico](#20-recuperación-de-errores-modo-pánico)

**[Parte V bis — El analizador semántico](#parte-v-bis--el-analizador-semántico)**
20 bis. [Qué hace: la gramática del código](#20-bis-qué-hace-la-gramática-del-código)
20 ter. [Cómo genera la gramática](#20-ter-cómo-genera-la-gramática)

**[Parte VI — La aplicación](#parte-vi--la-aplicación)**
21. [La ventana y sus tres pestañas](#21-la-ventana-y-sus-tres-pestañas)
22. [El dibujo del árbol](#22-el-dibujo-del-árbol)
23. [El zoom y la vista por ramas](#23-el-zoom-y-la-vista-por-ramas)
24. [El reporte visual (.html)](#24-el-reporte-visual-html)
24 bis. [El reporte en texto (.bs)](#24-bis-el-reporte-en-texto-bs)

**[Parte VII — Operación](#parte-vii--operación)**
25. [Pruebas](#25-pruebas)
26. [Empaquetado y distribución](#26-empaquetado-y-distribución)
27. [Cómo extender el compilador](#27-cómo-extender-el-compilador)
28. [Limitaciones conocidas](#28-limitaciones-conocidas)

**[Apéndices](#apéndices)**
- [A — Categorías de token](#apéndice-a--categorías-de-token)
- [B — Comandos](#apéndice-b--comandos)
- [C — Glosario](#apéndice-c--glosario)
- [D — Los demás documentos](#apéndice-d--los-demás-documentos)

---

## Cómo leer este manual

Va **de lo general a lo particular**. Si sólo tienes cinco minutos, lee las
partes I y II. Si vas a modificar el código, lee todo.

| Parte | De qué trata | Para quién |
|---|---|---|
| **I. Panorama** | Qué es un compilador y qué hace el nuestro | Todos |
| **II. El lenguaje** | Cómo se escribe SwordByte | Todos |
| **III. Arquitectura** | Cómo está organizado el código | Quien vaya a modificarlo |
| **IV. Análisis léxico** | La fase 1, por dentro | Quien vaya a modificarla |
| **V. Análisis sintáctico** | La fase 2, por dentro | Quien vaya a modificarla |
| **V bis. Análisis semántico** | La pestaña 3, por dentro | Quien vaya a modificarla |
| **VI. La aplicación** | Las pestañas, el árbol, los reportes | Quien toque la interfaz |
| **VII. Operación** | Pruebas, empaquetado, cómo extender | Mantenimiento |
| **Apéndices** | Tablas de consulta rápida | Consulta |

**Convención:** los nombres de archivo aparecen como enlaces, por ejemplo
[`AnalizadorLexico.js`](../src/core/lexico/AnalizadorLexico.js). Los bloques de
código con fondo gris son código real del proyecto, no pseudocódigo.

---
---

# PARTE I — PANORAMA

## 1. Qué es este proyecto

Es un **compilador** para un lenguaje de programación propio llamado
**SwordByte**, escrito en JavaScript y entregado como una aplicación de
escritorio para Windows.

En una frase: **le das código y te dice si está bien escrito, mostrándote el
proceso paso a paso.** La aplicación tiene tres pestañas, una por analizador,
que trabajan sobre el mismo código.

| | |
|---|---|
| **Lenguaje que compila** | SwordByte (archivos `.bs`) |
| **Lenguaje destino** | Java |
| **Lenguaje en que está escrito** | JavaScript (Node.js + Electron) |
| **Analizadores (pestañas)** | 1. Léxico · 2. Léxico-sintáctico · 3. Semántico |
| **Qué hace cada uno** | 1, la tabla de tokens; 2, la salida `id1 > id2` y el árbol; 3, la gramática del código. Los tres con el mismo lenguaje y las mismas reglas |
| **Entregable** | `.exe` portable e instalador para Windows |
| **Dependencias del compilador** | Ninguna. JavaScript puro |

Esa última fila es importante: **el compilador no usa ninguna librería**. Ni
para el léxico, ni para la gramática, ni para dibujar el árbol. Todo está
escrito a mano, que es justo lo que pide la materia.

---

## 2. Qué es un compilador y qué parte construimos

Un compilador traduce un programa de un lenguaje a otro. No lo hace de un
jalón: lo hace en **fases**, y cada fase recibe lo que produjo la anterior.

```
   Código fuente
        │
        ▼
 ┌──────────────────┐
 │ 1. LÉXICO        │  parte el texto en piezas (tokens)
 └──────────────────┘
        │  tokens
        ▼
 ┌──────────────────┐
 │ 2. SINTÁCTICO    │  revisa que las piezas formen frases válidas
 └──────────────────┘   y arma el árbol
        │  árbol (AST)
        ▼
 ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
 │ 3. SEMÁNTICO     │  ┐
 ├ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  │
 │ 4. CÓDIGO INTERM.│  ├─ fuera del alcance de esta entrega
 ├ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  │
 │ 5. OPTIMIZACIÓN  │  │
 ├ ─ ─ ─ ─ ─ ─ ─ ─ ─┤  │
 │ 6. GENERACIÓN    │  ┘
 └ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
        │
        ▼
    Código Java
```

**Este proyecto implementa las fases 1 y 2 para el lenguaje SwordByte**, y
sobre ellas un **analizador semántico** que, dado cualquier código del
lenguaje, **genera su gramática**: las reglas que producen exactamente ese
código (ver la [Parte V bis](#parte-v-bis--el-analizador-semántico)). No valida
tipos ni variables declaradas. Las fases 4 a 6 no están: ni el código ni las
carpetas, porque código vacío que nadie usa sólo estorba al leer.

### La diferencia entre las fases, con una analogía

Piensa en la oración *"el gato come pescado"*:

| Fase | Qué revisa | En la oración | En el código |
|---|---|---|---|
| **Léxica** | Que cada **palabra** exista | ¿"gato" es una palabra? Sí | ¿`mientras` existe en el lenguaje? Sí |
| **Sintáctica** | Que las palabras formen una **frase válida** | *"gato el pescado come"* tiene palabras válidas pero está mal armada | `si (a > b` tiene tokens válidos pero falta el `)` |
| **Semántica** (pestaña 3) | **De qué reglas** está hecha la frase | *oración → sujeto verbo complemento* | `a1 = b5 / 20` está hecho de `prop → id = exp` y `exp → exp / exp` |

Por eso un error léxico y uno sintáctico son cosas distintas:

```swordbyte
entero a = 5 @ 3;     // error LÉXICO:    '@' no existe en el lenguaje
entero a = 5          // error SINTÁCTICO: falta el ';'
```

---

## 3. El recorrido completo de un programa

Vamos a seguir la expresión `a > b` de principio a fin. Es el ejemplo más chico
que muestra las dos fases.

### Paso 1 — Entra el texto

El usuario escribe en la caja de la aplicación:

```
a > b
```

Para la computadora esto no son tres cosas: son **cinco caracteres**,
`a`, espacio, `>`, espacio, `b`. Nada más.

### Paso 2 — El análisis léxico lo parte en tokens

[`AnalizadorLexico.js`](../src/core/lexico/AnalizadorLexico.js) recorre el texto
carácter por carácter y agrupa lo que va junto:

| # | Lexema | Categoría | Línea | Columna | Estado del AFD |
|---|---|---|---|---|---|
| 1 | `a` | IDENTIFICADOR | 1 | 1 | q1 |
| 2 | `>` | OP_RELACIONAL | 1 | 3 | q12 |
| 3 | `b` | IDENTIFICADOR | 1 | 5 | q1 |
| 4 | `<FIN>` | FIN_ARCHIVO | 1 | 6 | q0 |

### Paso 3 — Se numeran los identificadores

[`FormatoLexico.js`](../src/core/lexico/FormatoLexico.js) reescribe el código
sustituyendo cada nombre por una etiqueta `idN`, que es la salida clásica del
análisis léxico:

```
Código fuente:    a > b
Salida léxica:    id1 > id2
```

### Paso 4 — El análisis sintáctico arma el árbol

[`AnalizadorSintactico.js`](../src/core/sintactico/AnalizadorSintactico.js)
recibe los tokens y verifica que formen algo válido. Como lo logra, construye el
**árbol de sintaxis abstracta (AST)**:

```
          >
        /   \
     id1     id2
```

### Paso 5 — Se muestra en las tres pestañas

Con el mismo resultado se llenan las tres pestañas a la vez:

- **Pestaña 1:** la tabla de tokens (`a` → identificador, `>` → operador mayor
  que, `b` → identificador).
- **Pestaña 2:** [`arbol.js`](../src/ui/js/arbol.js) convierte el árbol en un
  SVG y lo pinta con colores según la categoría de cada nodo.
- **Pestaña 3:** la gramática del código: `prop → exp > exp`, `exp → id`,
  `id → let`, `let → a-z`.

### El mismo recorrido, en una sola llamada

Todo lo anterior son cinco archivos, pero desde afuera es **una sola función**:

```js
const { compilar } = require('./src/core/Compilador');
const resultado = compilar('a > b');

resultado.ok                  // true
resultado.lexico.salida       // 'id1 > id2'
resultado.lexico.tabla        // [{ lexema: 'a', token: 'identificador', ... }, ...]
resultado.sintactico.arbol    // { etiqueta: '>', hijos: [...] }
resultado.semantico.reglas    // [{ regla: 'prop', alternativas: [...] }, ...]
resultado.errores             // []  (sólo errores de SwordByte)
```

Esa función está en [`Compilador.js`](../src/core/Compilador.js) y es **el único
punto de entrada** al compilador. Nada fuera de `src/core/` llama directamente
al léxico, al sintáctico o al semántico.

---
---

# PARTE II — EL LENGUAJE SWORDBYTE

## 4. SwordByte de un vistazo

Es un lenguaje con **sintaxis en español** y estructura parecida a Java. Todo
programa vive dentro de una clase y necesita exactamente un bloque
`clasePrincipal`, que es por donde empieza a correr.

```swordbyte
clase miPrograma {

    funcion entero sumar(entero a, entero b) {
        retornar a + b;
    }

    clasePrincipal {
        entero x = 10;
        entero y = 20;

        si (x < y) {
            imprimirLn("x es menor");
        } sino {
            imprimirLn("y es menor o igual");
        }

        imprimirLn(sumar(x, y));
    }
}
```

Equivalencias con Java:

| SwordByte | Java |
|---|---|
| `clase nombre { }` | `class nombre { }` |
| `clasePrincipal { }` | `public static void main(String[] args) { }` |
| `entero x = 10;` | `int x = 10;` |
| `imprimirLn(x);` | `System.out.println(x);` |
| `si (...) { } sino { }` | `if (...) { } else { }` |
| `mientras (...) { }` | `while (...) { }` |
| `funcion entero f() { }` | `int f() { }` |

La lista completa está en
[01 — Especificación del lenguaje](01-especificacion-del-lenguaje.md).

---

## 5. Alfabeto y palabras reservadas

### 5.1 El alfabeto

Son los caracteres que el compilador acepta. Cualquier otro produce un error
léxico.

| Grupo | Caracteres |
|---|---|
| Letras | `A`–`Z`, `a`–`z`, vocales acentuadas y `ñ` |
| Dígitos | `0`–`9` |
| Guion bajo | `_` |
| Operadores | `+ - * / % ^ ** √ = == != < > <= >= ++ -- ! && \|\|` |
| Delimitadores | `( ) { } [ ] ; , : .` |
| Comillas | `" '` (también las tipográficas `" " ' '` que pega Word) |
| Espacios | espacio, tabulador, salto de línea |

> **Detalle práctico:** aceptar las comillas tipográficas evita el error más
> frecuente al copiar código desde Word, donde `"Hola"` se convierte solo en
> `"Hola"`. Lo mismo con el BOM que algunos editores guardan al inicio del
> archivo: se quita antes de empezar.

### 5.2 Palabras reservadas

Hay **53 palabras reservadas**: 10 tipos de dato y 43 del resto del lenguaje.
Están todas en un solo diccionario,
[`PalabrasReservadas.js`](../src/core/lexico/PalabrasReservadas.js), cada una con
la descripción que aparece al pasar el mouse en la aplicación.

**Tipos de dato (10)**

| Palabra | Java | Qué guarda |
|---|---|---|
| `logico` | `boolean` | `verdadero` o `falso` |
| `byte` | `byte` | entero de 8 bits |
| `caracter` | `char` | un carácter |
| `corto` | `short` | entero de 16 bits |
| `entero` | `int` | entero de 32 bits |
| `largo` | `long` | entero de 64 bits |
| `flotante` | `float` | decimal de 32 bits |
| `decimal` | `double` | decimal de 64 bits |
| `cadena` | `String` | texto |
| `vacio` | `void` | nada (sólo para funciones) |

**El resto, por grupos**

| Grupo | Palabras |
|---|---|
| Estructura | `clase`, `clasePrincipal`, `funcion`, `retornar`, `equipo` |
| Declaración | `Constante`, `Arreglo`, `matriz` |
| Salida | `imprimir`, `imprimirLn`, `imprimirF` |
| Entrada | `leer` |
| Decisión | `si`, `sinoSi`, `sino` |
| Selección múltiple | `opcion`, `caso`, `porDefecto`, `romper` |
| Ciclos | `para`, `mientras`, `hacer` |
| Errores | `intentar`, `capturar`, `Error` |
| Consola | `limpiar`, `esperar` |
| Matemáticas | `longitud`, `aleatorio`, `potencia`, `raiz`, `raizCuadrada`, `raizCubica`, `redondear`, `logaritmo`, `logaritmo10`, `seno`, `coseno`, `convertir` |
| Geometría | `perimetro`, `area`, `volumen` |
| Lógicos con palabra | `Y`, `AND`, `O`, `OR`, `NO`, `NOT` |
| Literales lógicos | `verdadero`, `falso` |
| Auxiliar | `Null` |

> **Cómo las reconoce el compilador:** el autómata **no** distingue palabras
> reservadas mientras lee. Todas siguen el mismo camino que un identificador, y
> al terminar de leer la palabra se consulta el diccionario. Si está, es
> reservada; si no está, es un identificador. Esto evita tener un autómata con
> un camino por cada palabra, que sería enorme e imposible de mantener.

---

## 6. La jerarquía de operadores

Esta sección es el corazón conceptual del proyecto, porque la jerarquía es lo
que le da **forma al árbol**.

### 6.1 La regla

**Lo que se aplica al final queda arriba del árbol.**

Suena al revés, pero es lo correcto: en `2 + 3 * 4` primero se multiplica y al
final se suma, así que el `+` queda arriba y el `*` colgando debajo.

```
       +          ← se aplica AL FINAL, va arriba
     /   \
 num(2)   *       ← se aplica PRIMERO, va abajo
        /   \
   num(3)  num(4)
```

### 6.2 Los tres grupos

| Grupo | Operadores (de menor a mayor prioridad) | Dónde queda | Color |
|---|---|---|---|
| **1. Booleanos** | `O` `OR` `\|\|` → `Y` `AND` `&&` → `NO` `NOT` `!` | hasta arriba | azul |
| **2. Relacionales** | `==` `!=` → `<` `<=` `>` `>=` | en medio | rojo |
| **3. Aritméticos** | `=` → `+` `-` → `*` `/` `%` → `-` `+` `√` unarios → `^` `**` → `++` `--` → `( )` `[ ]`, `id`, `num` | hasta abajo | negro |

Cada operador lógico admite **tres formas equivalentes** y todas producen
exactamente el mismo nodo:

| Operación | Español | Inglés | Símbolo |
|---|---|---|---|
| Y lógico | `Y` | `AND` | `&&` |
| O lógico | `O` | `OR` | `\|\|` |
| Negación | `NO` | `NOT` | `!` |

### 6.3 Potencia y raíz

Van **por debajo** de `*` `/` `%`, o sea que se resuelven primero:
`2 * 3 ^ 2` es `2 * (3 ^ 2) = 18`.

| Operación | Formas de escribirla |
|---|---|
| Potencia | `2 ^ 10` · `2 ** 10` · `potencia(2, 10)` |
| Raíz cuadrada | `√16` · `raiz(16)` · `raizCuadrada(16)` |
| Raíz n-ésima | `raiz(27, 3)` |
| Raíz cúbica | `raizCubica(27)` |

Dos detalles que las hacen portarse como en matemáticas:

- **Agrupa a la derecha:** `2 ^ 3 ^ 2` es `2 ^ (3 ^ 2) = 512`, no `(2^3)^2 = 64`.
- **El menos la envuelve:** `-2 ^ 2` es `-(2 ^ 2) = -4`, no `(-2)^2 = 4`.
  Y como consecuencia el exponente sí puede ser negativo: `2 ^ -3`.

> Para escribir `√` en Windows: `Alt` + `251` en el teclado numérico. Si no lo
> tienes a la mano, `raiz(16)` hace exactamente lo mismo.

### 6.4 El ejemplo completo

`a = b + c > 9 AND d > e OR f <= 30`

```
                    OR                     ← 1. BOOLEANOS
                 /      \
              AND        <=                ← 2. RELACIONALES
            /     \     /    \
           >       >  id6  num(30)
         /   \   /   \
        =  num(9) id4 id5                  ← 3. ARITMÉTICOS
      /   \
    id1    +
         /   \
       id2   id3
```

Tres cosas que vale la pena notar en ese árbol:

1. **El `OR` está hasta arriba** aunque sea lo último que uno escribe pensando.
   Es el operador de menor prioridad, así que es el último en aplicarse.
2. **El `=` es aritmético**, así que queda *debajo* del `>`. Esto significa que
   `a = b + c > 9` se agrupa como `(a = (b + c)) > 9`.
3. **No hace falta punto y coma.** Una expresión suelta se analiza tal cual,
   porque la asignación es una expresión y no una instrucción.

### 6.5 Los paréntesis

Reinician la jerarquía: dentro de `( )` cabe cualquier expresión, así que sirven
para forzar otro orden.

| Expresión | Raíz del árbol | Por qué |
|---|---|---|
| `a > b AND c` | `AND` | el AND es booleano, va arriba |
| `a > (b AND c)` | `>` | el paréntesis baja el AND |
| `2 + 3 * 4` | `+` | el `*` tiene más prioridad |
| `(2 + 3) * 4` | `*` | el paréntesis baja el `+` |

### 6.6 Asociatividad

| Operadores | Asocia hacia | Ejemplo |
|---|---|---|
| `=` | derecha | `a = b = 5` es `a = (b = 5)` |
| `^` `**` | derecha | `2 ^ 3 ^ 2` es `2 ^ (3 ^ 2)` |
| Los demás binarios | izquierda | `10 - 3 - 2` es `(10 - 3) - 2` |
| Unarios `-` `+` `√` `NO` | derecha | `- - a` es `-(-a)` |

---
---

# PARTE III — ARQUITECTURA

## 7. Mapa del proyecto

```
Compilador/
│
├── package.json                 Configuración del proyecto y del empaquetado
├── README.md                    Punto de entrada de la documentación
│
├── docs/                        DOCUMENTACIÓN
│   ├── 00-manual-tecnico.md         (este archivo)
│   ├── 01-especificacion-del-lenguaje.md
│   ├── 02-analizador-lexico.md
│   ├── 03-analizador-sintactico.md
│   ├── 04-gramatica-ebnf.md         (generado, no se edita a mano)
│   ├── 05-arquitectura.md
│   ├── 06-manual-de-usuario.md
│   ├── 07-mantenimiento.md
│   ├── 08-analizador-semantico.md
│   └── capturas/                    Imágenes de la aplicación
│
├── src/
│   ├── core/                    EL COMPILADOR (JavaScript puro)
│   │   ├── Compilador.js             Une los tres análisis en una llamada
│   │   ├── ReporteHTML.js            El reporte visual (.html) y su lectura
│   │   ├── Reporte.js                El reporte en texto (.bs)
│   │   ├── ArchivoGuardado.js        Elige el formato al guardar y lee al abrir
│   │   │
│   │   ├── comun/                    Piezas compartidas
│   │   │   ├── Token.js                  estructura de un token
│   │   │   ├── TiposToken.js             catálogo de categorías léxicas
│   │   │   ├── Equipo.js                 datos del equipo y de la materia
│   │   │   └── ErrorCompilacion.js       formato uniforme de errores
│   │   │
│   │   ├── lexico/              FASE 1
│   │   │   ├── AnalizadorLexico.js       recorre el fuente y produce tokens
│   │   │   ├── FormatoLexico.js          la salida id1 > num(9) y sus colores
│   │   │   ├── TablaLexica.js            la tabla Lexema | Token | Descripción
│   │   │   └── PalabrasReservadas.js     diccionario del lenguaje
│   │   │
│   │   ├── sintactico/          FASE 2
│   │   │   ├── AnalizadorSintactico.js   descenso recursivo y AST
│   │   │   ├── Gramatica.js              gramática EBNF como dato
│   │   │   └── NodosAST.js               nodos del AST y árbol dibujable
│   │   │
│   │   └── semantico/           PESTAÑA 3
│   │       ├── AnalizadorSemantico.js    genera la gramática del código
│   │       └── TextoDeNodo.js            vuelve a escribir un nodo como código
│   │
│   └── ui/                      INTERFAZ GRÁFICA
│       ├── index.html                encabezado, pestañas y los tres paneles
│       ├── css/estilos.css           una sola paleta para las tres pestañas
│       ├── img/                      logos UAT, UAMM e ISC
│       └── js/
│           ├── dom.js                ayudas: errores, notas, insignias
│           ├── equipo.js             ventana emergente del equipo
│           ├── salir.js              ventana de Fuga / Salir / Termina
│           ├── arbol.js              dibuja el árbol, el zoom y las ramas
│           ├── pestanas.js           cambia de pestaña sin borrar nada
│           ├── panel-lexico.js       pinta la pestaña 1
│           ├── panel-sintactico.js   pinta la pestaña 2
│           ├── panel-semantico.js    pinta la pestaña 3
│           └── app.js                código compartido, botones, menú, archivos
│
├── electron/                    APLICACIÓN DE ESCRITORIO
│   ├── main.js                       proceso principal: ventana, menú, IPC
│   ├── preload.js                    puente seguro hacia la interfaz
│   └── logos.js                      achica los logos para el reporte .html
│
├── ejemplos/                    7 programas .bs de demostración
├── pruebas/
│   ├── ejecutar.js                   118 pruebas del compilador
│   └── verificar-ui.js               109 comprobaciones sobre la ventana real
├── herramientas/
│   ├── generar-icono.js              genera el icono de la app
│   └── generar-gramatica.js          regenera docs/04 desde Gramatica.js
├── salida/                      Donde caen los reportes guardados
└── dist/                        Los .exe generados
```

### La regla que ordena todo

**`src/core/` no sabe que existe una interfaz gráfica.**

Es JavaScript puro, sin `require('electron')`, sin `document`, sin `window`. Se
puede usar desde Node, desde una prueba o desde otra aplicación. Eso tiene dos
consecuencias prácticas:

1. Las **118 pruebas del compilador corren sin abrir ninguna ventana**, en menos
   de un segundo.
2. Si algún día se quisiera una versión web o de línea de comandos, `src/core/`
   se reusa tal cual.

---

## 8. Las piezas y cómo se comunican

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Proceso principal (Node)   │        │  Renderizado (navegador)     │
│                             │        │                              │
│  electron/main.js           │        │  src/ui/  (sin acceso a Node)│
│   · crea la ventana         │        │   · index.html               │
│   · arma el menú            │        │   · app.js y pestanas.js     │
│   · abre y guarda archivos  │        │   · panel-*.js y arbol.js    │
│   · llama a src/core/       │        │   · equipo.js y salir.js     │
└──────────────┬──────────────┘        └───────────────┬──────────────┘
               │                                       │
               │          electron/preload.js          │
               └──────────────  IPC  ──────────────────┘
                         window.api.analizar(...)
```

### Por qué están separados

Por seguridad. La ventana corre con `contextIsolation: true` y
`nodeIntegration: false`, es decir, **el código de la interfaz no puede tocar el
disco duro**. Si pudiera, cualquier cosa que se pegara en la caja de código
podría, en teoría, leer o borrar archivos.

Todo lo que la interfaz necesita del sistema pasa por un puente explícito,
[`preload.js`](../electron/preload.js), que expone exactamente estas funciones y
ni una más:

| Función expuesta | Qué hace |
|---|---|
| `window.api.analizar(fuente, opciones)` | Compila y devuelve el resultado de los tres análisis |
| `window.api.equipo()` | Devuelve los datos del equipo |
| `window.api.abrirArchivo()` | Abre el diálogo de abrir; devuelve el código y, si es un reporte `.html`, su pestaña |
| `window.api.leerArchivo(texto)` | Lo mismo, para un archivo soltado sobre la ventana |
| `window.api.guardarReporte(fuente, pestana)` | Abre el diálogo de guardar (`.html` o `.bs`) |
| `window.api.verReporte()` | Abre en el navegador el último reporte `.html` |
| `window.api.salir()` | Cierra la aplicación (la interfaz ya preguntó) |

Más `window.api.alMenu(manejador)`, que recibe las órdenes del menú superior.

### El flujo de un clic en "Análisis Léxico-Sintáctico"

```
1. app.js            botón → this.analizar('sintactico', 'ambos')
                     copia el código de la pestaña 2 a las otras dos
2. preload.js        window.api.analizar(fuente, {})
3. IPC               canal 'compilador:analizar'
4. main.js           compilar(fuente, opciones)
5. Compilador.js     léxico → tabla → sintáctico → semántico
6.                   devuelve un objeto plano
7. IPC (de regreso)  el objeto viaja serializado como JSON
8. app.js            panelLexico.pintar(r)            → pestaña 1
                     panelSintactico.pintar(r, que)   → pestaña 2
                     panelSemantico.pintar(r)         → pestaña 3
```

El paso 8 llena **las tres pestañas** con el mismo resultado. Por eso, al
cambiar de pestaña, el análisis ya está ahí.

> **Por qué el resultado debe ser un objeto plano:** lo que viaja por IPC se
> serializa a JSON. Si el compilador devolviera instancias de clases con
> métodos, los métodos se perderían en el viaje. Por eso `ErrorCompilacion`
> tiene un método `toJSON()` y el compilador lo llama antes de devolver.

---

## 9. Las estructuras de datos comunes

Son las dos piezas que atraviesan todo el compilador.

### 9.1 `Token` — la unidad léxica

Definido en [`Token.js`](../src/core/comun/Token.js). Es lo que produce la fase 1
y consume la fase 2.

```js
{
  numero: 1,                    // consecutivo, base 1
  tipo: 'IDENTIFICADOR',        // categoría (ver TiposToken)
  lexema: 'a',                  // el texto exacto del código fuente
  valor: 'a',                   // el valor ya interpretado
  linea: 1,                     // dónde empieza
  columna: 1,
  estadoFinal: 'q1',            // estado del autómata en que se aceptó
  descripcion: 'Identificador definido por el usuario',
  ignorado: false               // true en comentarios: no llegan al parser
}
```

La diferencia entre `lexema` y `valor` importa:

| Código | `lexema` | `valor` |
|---|---|---|
| `42` | `"42"` (texto) | `42` (número) |
| `3.5f` | `"3.5f"` | `3.5` |
| `"Hola\n"` | `"\"Hola\\n\""` con comillas y la barra | `Hola` + salto de línea real |

El `lexema` sirve para mostrar y para reportar errores con exactitud; el `valor`
sirve para trabajar con el dato.

### 9.2 `ErrorCompilacion` — el formato único de error

Definido en [`ErrorCompilacion.js`](../src/core/comun/ErrorCompilacion.js). **Los
tres analizadores construyen el mismo tipo de objeto** (con `fase` igual a
`Léxica`, `Sintáctica` o `Semántica`), así que la interfaz los pinta con un
solo pedazo de código.

```js
{
  fase: 'Sintáctica',
  mensaje: "Falta ';' al final de la declaración.",
  linea: 3,
  columna: 22,
  lexema: '}',
  esperado: ';',
  encontrado: "'}'",
  sugerencia: 'Toda instrucción termina con punto y coma.'
}
```

El campo `sugerencia` es el que convierte un error en algo útil. Se calcula en
`_sugerir()` según lo que se esperaba:

| Se esperaba | Sugerencia |
|---|---|
| `;` | *Toda instrucción termina con punto y coma.* |
| `}` | *Revisa que cada `{` tenga su `}` correspondiente.* |
| `)` | *Revisa que cada `(` tenga su `)` correspondiente.* |
| un identificador, y llegó una palabra reservada | *`mientras` es una palabra reservada y no puede usarse como nombre.* |

---
---

# PARTE IV — FASE 1: ANÁLISIS LÉXICO

## 10. Qué hace y qué produce

**Entra:** el código fuente como una sola cadena de texto.
**Sale:** una lista de tokens, una lista de errores y unas estadísticas.

```js
const { analizarLexico } = require('./src/core/lexico/AnalizadorLexico');
const r = analizarLexico('entero a = 5;');

r.tokens          // [Token, Token, ...] sin comentarios, con el centinela <FIN>
r.todosLosTokens  // igual pero CON los comentarios
r.errores         // [ErrorCompilacion, ...]
r.estadisticas    // { totalTokens, totalComentarios, totalErrores,
                  //   totalLineas, totalCaracteres }
```

Dos decisiones de diseño que conviene entender:

**1. Los comentarios se guardan aparte, no se tiran.** Se marcan con
`ignorado: true` y van a `todosLosTokens` pero no a `tokens`. El parser nunca los
ve, y aun así las estadísticas pueden contarlos.

**2. Siempre se emite un centinela `<FIN>`.** Es un token de tipo `FIN_ARCHIVO`
al final de la lista. Gracias a él, el parser nunca tiene que preguntar "¿ya se
acabó el arreglo?" antes de mirar el token actual: siempre hay uno. Esto elimina
una familia entera de errores de índice fuera de rango.

---

## 11. El autómata finito determinista (AFD)

El analizador léxico es, formalmente, un **AFD de 19 estados**: `q0` a `q17` más
el estado de error `qE`.

### 11.1 Los estados

| Estado | Significa |
|---|---|
| `q0` | Inicio. Se está decidiendo qué se va a leer |
| `q1` | Identificador o palabra reservada terminada |
| `q2` | Entero terminado |
| `q3` | Se leyó el punto decimal, faltan dígitos |
| `q4` | Decimal terminado |
| `q5` | Número con sufijo `f` / `d` / `L` terminado |
| `q6` | Dentro de una cadena |
| `q7` | Dentro de una cadena, después de una barra invertida |
| `q8` | Cadena cerrada |
| `q9`, `q10` | Leyendo un literal de carácter |
| `q11` | Carácter cerrado |
| `q12` | Operador de un carácter |
| `q13` | Operador de dos caracteres |
| `q14` | Delimitador |
| `q15` | Comentario de línea |
| `q16` | Dentro de un comentario de bloque |
| `q17` | Comentario de bloque cerrado |
| `qE` | Error |

Cada token guarda el estado en que fue aceptado, en su campo `estadoFinal`.

### 11.2 Las transiciones

```
Identificadores y palabras reservadas
  q0 --letra o _--> q1 --letra, dígito o _--> q1

Números
  q0 --dígito--> q2 --dígito--> q2
  q2 --punto--> q3 --dígito--> q4 --dígito--> q4
  q2 o q4 --f d L--> q5
  q3 sin dígito después --> qE      (5. está incompleto)

Cadenas
  q0 --comilla doble--> q6 --cualquiera--> q6
  q6 --barra invertida--> q7 --cualquiera--> q6
  q6 --comilla doble--> q8
  q6 --fin de línea--> qE           (cadena sin cerrar)

Caracteres
  q0 --comilla simple--> q9 --cualquiera--> q10 --comilla simple--> q11

Operadores
  q0 --+ - * / % ^ √ = < > !--> q12
  q12 --segundo símbolo--> q13      (==, !=, <=, >=, ++, --, &&, ||, **)

Delimitadores
  q0 --( ) { } [ ] ; , : .--> q14

Comentarios
  q12 --segunda barra--> q15 ...hasta fin de línea
  q12 --asterisco--> q16 ...hasta "*/"--> q17
```

### 11.3 Cómo se traduce el autómata a código

El bucle principal de `analizar()` es el estado `q0`: mira el primer carácter y
decide a qué reconocedor entregarle el trabajo.

```js
while (this.pos < this.fuente.length) {
  const c = this._ver();

  if (CLASES.esEspacio(c)) { this._avanzar(); continue; }     // se descarta
  if (c === '/' && (this._ver(1) === '/' || this._ver(1) === '*')) {
    this._leerComentario(linea, columna); continue;           // → q15 / q16
  }
  if (CLASES.esLetra(c) || CLASES.esGuionBajo(c)) {
    this._leerPalabra(linea, columna); continue;              // → q1
  }
  if (CLASES.esDigito(c)) { this._leerNumero(...); continue; } // → q2..q5
  // ... cadenas, caracteres, operadores, delimitadores
  // si nada coincide: error léxico y se sigue
}
```

**El orden de esos `if` importa.** Los comentarios se revisan antes que los
operadores porque `/` puede empezar los dos: `/` solo es división, pero `//` y
`/*` son comentarios. Si se revisaran al revés, un comentario se leería como una
división seguida de basura.

### 11.4 Tres reconocedores que vale la pena ver

**Números — el caso del punto solitario**

Lo interesante es qué hace con `5.` (un punto sin dígitos después):

```js
if (this._ver() === '.' && CLASES.esDigito(this._ver(1))) {
  // 5.3  → es un decimal, se sigue leyendo
} else if (this._ver() === '.' && !CLASES.esDigito(this._ver(1))) {
  // 5.   → error claro, en vez de emitir dos tokens confusos
  this._error(`El numero '${lexema}' esta incompleto: falta al menos
               un digito despues del punto.`, ...);
}
```

Sin ese `else if`, `5.` produciría un token `5` y un token `.`, y el error
aparecería hasta la fase sintáctica con un mensaje mucho peor.

**Números — el sufijo pegado a una palabra**

`10L` es un entero largo, pero ¿qué pasa con `10Lista`? El código lo distingue:

```js
const despues = this._ver(1);
const pegadoAPalabra = despues && (CLASES.esLetra(despues) || ...);
if (!pegadoAPalabra) { sufijo = siguiente; lexema += this._avanzar(); }
```

Si después del sufijo viene más letra, no era un sufijo.

**Cadenas — no pueden cruzar el fin de línea**

```js
if (c === '\n') break;   // una cadena no puede cruzar el fin de linea
```

Esto es a propósito. Si se permitiera, una comilla que se olvidó cerrar se
comería el resto del archivo y el error aparecería a 40 líneas de distancia del
problema real.

---

## 12. La salida `id1 > num(9)`

Es la salida clásica del análisis léxico y la produce
[`FormatoLexico.js`](../src/core/lexico/FormatoLexico.js).

### 12.1 Las reglas

1. Cada identificador se sustituye por `id1`, `id2`, `id3`… **en orden de
   aparición**. El mismo nombre conserva siempre su etiqueta.
2. Cada número se envuelve como `num(valor)`.
3. Cada pieza lleva su categoría, para que la interfaz sepa de qué color
   pintarla.

```
Código fuente:  a = b + a * 2
Salida léxica:  id1 = id2 + id1 * num(2)
                                 ^^^ la misma 'a' vuelve a ser id1
```

### 12.2 El caso del punto

Un nombre escrito después de un punto es un **miembro**, no una variable:

```js
const esMiembro = (i) => i > 0 && utiles[i - 1].lexema === '.';
```

Por eso en `area.circulo(5)` la palabra `circulo` no se numera. Si se numerara,
aparecería como `area.id1(num(5))`, que es engañoso: `circulo` no es una
variable del programa.

### 12.3 Los espacios

Todo el espaciado lo decide una sola función, `llevaEspacioAntes()`. Por omisión
**sí** va espacio; sólo se quita en tres casos:

```js
function llevaEspacioAntes (anterior, actual) {
  // 1. Es el primero de la linea: no hay nada de que separarlo.
  if (anterior === null) return false;

  // 2. Uno de los dos se pega al otro por lo que es.
  if (SE_PEGAN_ATRAS.indexOf(actual.lexema) !== -1) return false;
  if (SE_PEGAN_ADELANTE.indexOf(anterior.lexema) !== -1) return false;

  // 3. Un "(" o un "[" se pega al nombre del que cuelga:
  //      leer(x)    tabla[1]    tabla[1][2]    longitud(a)
  //    menos cuando ese nombre es una palabra de control:
  //      si (a > b)    mientras (a > b)
  if (actual.lexema === '(' || actual.lexema === '[') {
    if (anterior.tipo === TiposToken.IDENTIFICADOR) return false;
    if (anterior.lexema === ')' || anterior.lexema === ']') return false;
    if (anterior.tipo === TiposToken.PALABRA_RESERVADA) {
      return PALABRAS_DE_CONTROL.indexOf(anterior.lexema) !== -1;
    }
  }

  return true;
}
```

El resultado es que la salida se lee como código bien escrito:

```
si (id1 > id2) { imprimirLn("hola"); }
id1[num(1)][num(2)] = longitud(id2) + area.circulo(num(5));
```

### 12.4 Los colores

| Categoría | Qué incluye | Color |
|---|---|---|
| `logico` | `Y AND && · O OR \|\| · NO NOT !` y `verdadero` / `falso` | azul |
| `relacional` | `== != < <= > >=` | rojo |
| `aritmetico` | `+ - * / % ^ ** √ ++ --` y el `=` | negro |
| `numero` | `num(9)`, `num(3.5)` | ámbar |
| `identificador` | `id1`, `id2`… | morado |
| `reservada`, `texto`, `normal` | el resto | color de texto |

> **El `=` va con los aritméticos** aunque tenga su propia categoría de token
> (`OP_ASIGNACION`). Es coherente con la jerarquía: la asignación pertenece al
> grupo aritmético, así que se pinta de negro igual que ellos.

---

## 12 bis. La tabla de tokens de la pestaña 1

La pestaña 1 muestra los mismos tokens, pero como tabla: un renglón por token
con su **lexema**, su **token** y su **descripción**. La arma
[`TablaLexica.js`](../src/core/lexico/TablaLexica.js) y llega lista en
`resultado.lexico.tabla`:

```js
compilar('a = b + c * 24').lexico.tabla
// [
//   { numero: 1, lexema: 'a',  token: 'identificador',
//     descripcion: 'Variable o nombre definido por el usuario (id1)',
//     categoria: 'identificador', linea: 1, columna: 1 },
//   { numero: 2, lexema: '=',  token: 'operador asignación', ... },
//   ...
//   { numero: 7, lexema: '24', token: 'número entero',
//     descripcion: 'Valor numérico entero (24)', categoria: 'numero', ... }
// ]
```

El analizador léxico ya sabe la **categoría** de cada token (`OP_ARITMETICO`),
pero para la tabla hace falta un nombre más específico: no es lo mismo
*operador suma* que *operador multiplicación*. El nombre se decide en tres
reglas, en este orden:

1. Un token de **error** lleva como descripción el mensaje de su error.
2. Los **símbolos** (`+`, `==`, `(`, `;`, y también `Y` `AND` `O` `OR` `NO`
   `NOT`) se buscan en la tabla `SIMBOLOS`, que tiene su nombre y su
   descripción escritos uno por uno.
3. Lo demás se decide por su categoría: `IDENTIFICADOR` → *identificador*
   (con su etiqueta `idN`), `LIT_ENTERO` → *número entero* (con su valor),
   las palabras reservadas con la descripción de `PalabrasReservadas.js`…

La `categoria` es la misma de `FormatoLexico.js`, así que el nombre del token
se pinta del mismo color en la pestaña 1 que en la 2.

---

## 13. Los errores léxicos

| Error | Ejemplo | Mensaje |
|---|---|---|
| Símbolo fuera del alfabeto | `entero y = 10 @ 5;` | *El simbolo '@' no pertenece al alfabeto del lenguaje.* |
| Número incompleto | `decimal x = 4.;` | *El numero '4.' esta incompleto: falta al menos un digito despues del punto.* |
| Cadena sin cerrar | `imprimirLn("Hola);` | *Cadena de texto sin cerrar: falta la comilla doble final.* |
| Carácter mal formado | `caracter c = 'AB';` | *Literal de caracter mal formado: debe contener exactamente un caracter entre comillas simples.* |
| Comentario sin cerrar | `/* nota` | *Comentario de bloque sin cerrar.* |
| `&` o `\|` solitario | `a & b` | *El simbolo '&' no pertenece…* + *Para el Y logico se escribe '&&', 'Y' o 'AND'.* |

### La regla de oro: nunca parar en el primer error

Cuando el analizador encuentra algo que no reconoce:

1. Registra el error.
2. **Emite un token de tipo `ERROR`** con ese carácter.
3. Avanza una posición y **sigue analizando**.

Así, un archivo con cinco errores muestra los cinco de una vez, no el primero y
"vuelve a intentar". Es lo que hace útil al compilador en la práctica.

El token `ERROR` cumple una segunda función: mantiene alineadas las posiciones
para que los errores siguientes sigan reportando la línea y columna correctas.
Antes de pasar a la fase 2, esos tokens se filtran:

```js
const limpios = lex.tokens.filter((t) => t.tipo !== TiposToken.ERROR);
```

Si no se filtraran, un solo `@` provocaría además un error sintáctico falso.

---
---

# PARTE V — FASE 2: ANÁLISIS SINTÁCTICO

## 14. Qué hace y qué produce

**Entra:** la lista de tokens (sin comentarios y sin los de tipo `ERROR`).
**Sale:** el AST, el modo de análisis usado, los errores y las estadísticas.

```js
const { analizarSintactico } = require('./src/core/sintactico/AnalizadorSintactico');
const r = analizarSintactico(tokens, 'auto');

r.ast            // el árbol de sintaxis abstracta
r.modo           // 'programa' | 'instrucciones' | 'expresion' | 'vacio'
r.errores        // [ErrorCompilacion, ...]
r.estadisticas   // { nodos, profundidad, totalErrores, funciones }
```

---

## 15. Descenso recursivo: la idea

El analizador es de **descenso recursivo con un token de anticipación** (LL(1)).
La idea es simple y elegante:

> **Cada regla de la gramática se convierte en un método. Si la regla A usa la
> regla B, el método A llama al método B.**

La regla:

```
<si> ::= "si" "(" <expresion> ")" "{" <instrucciones> "}"
```

se vuelve, casi palabra por palabra:

```js
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
```

**Esta correspondencia uno a uno es la razón de elegir descenso recursivo para
un proyecto escolar.** Se puede leer la gramática y el código lado a lado y
verificar que coinciden, sin necesidad de un generador de parsers.

---

## 16. Las herramientas del parser

Todos los métodos se apoyan en seis funciones pequeñas. Entenderlas es entender
el 80 % del archivo.

| Método | Qué hace | Falla si… |
|---|---|---|
| `ver(k)` | Mira el token `k` posiciones adelante, **sin consumirlo** | nunca |
| `es(lexema)` | ¿El token actual es ese lexema? | nunca |
| `esTipo(tipo)` | ¿El token actual es de esa categoría? | nunca |
| `aceptar(lexema)` | Si coincide, lo consume y devuelve `true` | nunca |
| `consumir()` | Devuelve el token actual y avanza | nunca |
| `exigir(lexema, contexto)` | Consume ese lexema, o **lanza un error** | no coincide |

La diferencia entre `aceptar` y `exigir` es la diferencia entre **opcional** y
**obligatorio**:

```js
this.exigir('(', 'la condicion del si');   // obligatorio: si no está, error
if (this.aceptar('sino')) { ... }          // opcional: si no está, no pasa nada
```

Y `fallar(mensaje, esperado)` construye el `ErrorCompilacion`, lo guarda y
**lanza una excepción** `ErrorSintacticoFatal` para abortar la producción actual.

---

## 17. Los tres modos de análisis

No siempre se quiere escribir un programa completo para revisar una idea. El
analizador acepta tres formas de entrada:

| Modo | Entrada | Ejemplo |
|---|---|---|
| `programa` | clase completa | `clase p { clasePrincipal { ... } }` |
| `instrucciones` | una o varias instrucciones sueltas, cada una con su `;` | `entero a = 5;` · `a && b \|\| c;` |
| `expresion` | una o varias proposiciones sueltas, una por renglón y sin `;` | `a > b` · `a = b + c` |

En el modo `expresion`, varias proposiciones (una por renglón) cuelgan de un
nodo `proposiciones`. En el modo `instrucciones`, una expresión seguida de `;`
(`a && b || c;`) también es una instrucción: la lee `proposicion()`, que
después la clasifica como asignación, incremento, llamada o proposición simple.

El modo lo decide `elegirModo()` mirando el texto **antes** de analizarlo, con
cuatro reglas en orden:

| # | Si… | Modo |
|---|---|---|
| 1 | el primer token es `clase` | `programa` |
| 2 | el primer token es un tipo (`entero`, `cadena`…) o una palabra que empieza instrucción (`si`, `para`, `imprimirLn`…) | `instrucciones` |
| 3 | en algún lado hay un `;` o un `{` | `instrucciones` |
| 4 | en cualquier otro caso | `expresion` (una o varias proposiciones) |

```js
function elegirModo (tokens) {
  const primero = tokens[0];
  if (primero.lexema === 'clase') return 'programa';
  if (primero.tipo === TiposToken.TIPO_DATO ||
      INICIO_INSTRUCCION.indexOf(primero.lexema) !== -1) return 'instrucciones';
  const tieneSeparadores = tokens.some((t) => t.lexema === ';' || t.lexema === '{');
  if (tieneSeparadores) return 'instrucciones';
  return 'expresion';
}
```

La **regla 3** es la que atrapa los casos que no empiezan con palabra reservada,
como `x = 5;` o `tabla[0] = 1;`: el punto y coma delata que es una instrucción y
no una expresión suelta.

> **Por qué elegir de entrada, en vez de probar los tres modos:** una versión
> anterior probaba los tres y se quedaba con el que "llegó más lejos". Funcionaba,
> pero corría el analizador hasta tres veces y el mensaje de error que salía era
> el del intento más largo, no el del modo correcto. Con `elegirModo()` el
> analizador corre una sola vez y el mensaje es el adecuado:
>
> | Entrada | Regla | Mensaje |
> |---|---|---|
> | `5 = a` | 4 → `expresion` | *A la izquierda de "=" debe ir una variable* |
> | `entero a = 5` | 2 → `instrucciones` | *Falta ';' al final de la declaración* |

**Detalle de presentación:** cuando el fragmento es una sola instrucción, el
nodo `Bloque` que la envuelve se descarta y la instrucción queda como raíz del
árbol. Sin eso, `entero a = 5;` mostraría un nodo `bloque` sobrante encima.

---

## 18. La jerarquía, codificada en la gramática

Aquí está la parte más importante de la fase 2.

**La precedencia no se programa con tablas ni con números de prioridad: está
codificada en la forma de la gramática.** Cada nivel es un método que llama al
siguiente, y el nivel que se aplica al final es el que queda arriba del árbol.

### 18.1 La cadena de llamadas

```
expresion → expresionO → expresionY → negacion      grupo 1: BOOLEANOS
          → igualdad   → relacional                 grupo 2: RELACIONALES
          → asignacion → aditiva → multiplicativa
          → unaria     → potencia → postfija
          → primaria                                grupo 3: ARITMÉTICOS
```

Son **13 niveles**. Cuando se llama a `expresion()` con `a > b`, la llamada baja
los 13 niveles hasta `primaria()`, que lee `a`; al regresar, `relacional()` ve el
`>`, lo consume, y vuelve a bajar por el lado derecho para leer `b`.

### 18.2 El patrón de cada nivel binario

Todos los niveles binarios tienen exactamente la misma forma:

```js
/** <expresionO> ::= <expresionY> { ( "O" | "OR" | "||" ) <expresionY> } */
expresionO () {
  let izq = this.expresionY();                 // 1. baja al siguiente nivel
  while (this.es('O') || this.es('OR') || this.es('||')) {
    const inicio = this.actual;
    const op = this.consumir().lexema;         // 2. consume el operador
    const der = this.expresionY();             // 3. vuelve a bajar
    izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
  }                                            // 4. el nodo nuevo envuelve al anterior
  return izq;
}
```

El `while` es lo que da **asociatividad izquierda**: en `10 - 3 - 2`, la primera
vuelta arma `(10 - 3)` y la segunda lo envuelve en `((10 - 3) - 2)`.

### 18.3 Las tres excepciones al patrón

**La negación (`negacion`)** es unaria y recursiva a la derecha:

```js
negacion () {
  if (this.es('NO') || this.es('NOT') || this.es('!')) {
    const op = this.consumir().lexema;
    const operando = this.negacion();          // se llama a sí misma
    return nodo('Unaria', inicio, { operador: op, operando });
  }
  return this.igualdad();
}
```

Como está en el grupo booleano pero **debajo** del `Y`, se obtiene el
comportamiento correcto: `NO a > b` niega toda la comparación, pero `NO a Y b`
sigue siendo `(NO a) Y b`.

**La asignación (`asignacion`)** asocia a la derecha y valida el destino:

```js
asignacion () {
  const izq = this.aditiva();
  if (!this.es('=')) return izq;

  const inicio = this.actual;
  this.consumir();
  const valor = this.asignacion();      // ← recursiva: asocia a la derecha

  // Solo se puede asignar a una variable o a una posición de un arreglo.
  if (izq.tipo !== 'Variable' && izq.tipo !== 'Indexacion') {
    this.errores.push(new ErrorCompilacion(
      FASES.SINTACTICA,
      'A la izquierda de "=" debe ir una variable.',
      izq.linea, izq.columna,
      { esperado: 'una variable', sugerencia: 'Ejemplo válido: total = a + b' }
    ));
  }
  ...
}
```

Por eso `5 = a` da un mensaje claro en vez de uno genérico.

Nótese que aquí **no** se usa `fallar()`: el error se registra y el análisis
continúa. Es a propósito. El fragmento se entiende perfectamente —alguien quiso
asignar algo—, así que se reporta el problema y se sigue armando el árbol, en
vez de abortar y perder el resto de la información.

**La potencia (`potencia`)** asocia a la derecha y tiene un rodeo deliberado:

```js
potencia () {
  const base = this.postfija();                // ← empieza en postfija, NO en unaria
  if (this.es('^') || this.es('**')) {
    const op = this.consumir().lexema;
    const exponente = this.unaria();           // ← el lado derecho sí sube a unaria
    return nodo('Binaria', inicio, { operador: op, izquierda: base, derecha: exponente });
  }
  return base;
}
```

Ese cruce entre `postfija` y `unaria` es lo que hace que la potencia se comporte
como en matemáticas:

| Expresión | Por qué |
|---|---|
| `-2 ^ 2` = `-(2^2)` = **-4** | el lado izquierdo empieza en `postfija`, así que el `-` se queda fuera y envuelve toda la potencia |
| `2 ^ -3` es válido | el lado derecho sube a `unaria`, que sí acepta el menos |
| `2 ^ 3 ^ 2` = `2^(3^2)` = **512** | el lado derecho vuelve a pasar por `potencia`, así que agrupa a la derecha |

### 18.4 Los paréntesis

`primaria()` vuelve a llamar a `expresion()` al abrir un paréntesis:

```js
if (this.es('(')) {
  this.consumir();
  const e = this.expresion();     // ← se reinicia la cadena completa de 13 niveles
  this.exigir(')', 'para cerrar la expresion entre parentesis');
  return e;
}
```

Eso es todo lo que hace falta para que los paréntesis funcionen. Dentro de `( )`
cabe cualquier expresión, incluidos operadores de menor prioridad, y por eso
`a > (b AND c)` deja el `>` arriba.

---

## 19. El árbol de sintaxis abstracta (AST)

### 19.1 Qué es

Cada nodo es un **objeto plano** de JavaScript con tres campos fijos más los
suyos propios:

```js
{
  tipo: 'Binaria',       // nombre del nodo, coincide con la gramática
  linea: 1,              // dónde empieza en el código fuente
  columna: 3,
  operador: '>',         // ← campos propios de este tipo de nodo
  izquierda: { ... },
  derecha: { ... }
}
```

Los construye la función `nodo()` de
[`NodosAST.js`](../src/core/sintactico/NodosAST.js), que copia la línea y la
columna desde un token.

### 19.2 Del AST al árbol dibujable

El AST tiene más información de la que conviene mostrar. `aArbolCompacto()` lo
convierte en algo que se puede dibujar:

```js
{
  etiqueta: '>',          // el texto que va dentro del recuadro
  familia: 'relacional',  // decide el color
  tipoNodo: 'Binaria',    // se muestra al pasar el mouse
  linea: 1, columna: 3,
  hijos: [ ... ]
}
```

La conversión tiene un truco que vale la pena entender: **no lleva una lista de
qué campos son hijos**. Recorre todos los campos del nodo y se queda con los que
resultan ser nodos:

```js
for (const clave of Object.keys(n)) {
  if (CAMPOS_META.indexOf(clave) !== -1) continue;   // salta tipo/linea/columna
  const valor = n[clave];
  if (Array.isArray(valor)) {
    for (const item of valor) { ... }                // listas de hijos
  } else if (esNodo(valor)) { ... }                  // un solo hijo
}
```

La ventaja práctica: **al agregar un tipo de nodo nuevo no hay que tocar esta
función**. Se dibuja solo.

### 19.3 Las etiquetas

`etiquetaCompacta()` decide qué texto lleva cada nodo. La regla es **una sola
pieza de información por nodo**, como en los árboles de los libros:

| Tipo de nodo | Etiqueta | Ejemplo |
|---|---|---|
| `Binaria`, `Unaria`, `Postfija` | el operador | `>`, `+`, `√` |
| `Asignacion` | `=` | |
| `Literal` numérico | `num(valor)` | `num(9)` |
| `Variable` | su etiqueta `idN` | `id1` |
| `Programa` | `clase` + nombre | `clase miPrograma` |
| `Funcion` | `funcion` + nombre | `funcion sumar` |
| `Llamada`, `Nativa` | nombre + `( )` | `raiz( )` |
| `Si`, `Mientras`, `Para`… | la palabra | `si` |

Nótese que los números se muestran como `num(9)`, **igual que en la salida
léxica**. Es intencional: los dos paneles hablan el mismo idioma.

### 19.4 Los colores, en un solo lugar

La familia de cada nodo la decide `familiaNodo()`, que para los operadores
delega en `categoriaOperador()`:

```js
const OPERADORES_LOGICOS = ['&&', '||', '!', 'Y', 'O', 'NO', 'AND', 'OR', 'NOT'];
const OPERADORES_RELACIONALES = ['==', '!=', '<', '>', '<=', '>='];
// El "=" pertenece al grupo aritmetico, igual que en la jerarquia del lenguaje.
const OPERADORES_ARITMETICOS = ['=', '+', '-', '*', '/', '%', '++', '--',
  '^', '**', '√'];
```

Esa es la **única** lista de operadores por categoría del lado del árbol, y es la
misma clasificación que usa la salida léxica. Por eso un `>` sale rojo en los dos
paneles sin que la interfaz sepa nada de operadores.

---

## 20. Recuperación de errores: modo pánico

Igual que en la fase léxica, la regla es **nunca parar en el primer error**. La
técnica se llama *modo pánico* y funciona así:

1. Una producción falla y lanza `ErrorSintacticoFatal`.
2. El bucle de instrucciones **atrapa** la excepción.
3. Llama a `sincronizar()`, que descarta tokens hasta un punto seguro.
4. Sigue analizando desde ahí.

```js
while (!this.finalizado && !this.es('}') && ...) {
  const antes = this.i;
  try {
    const ins = this.instruccion();
    if (ins) instrucciones.push(ins);
  } catch (e) {
    if (!(e instanceof ErrorSintacticoFatal)) throw e;
    this.sincronizar();                     // ← se recupera y continúa
  }
  // Red de seguridad: si no se consumio nada, evitar ciclo infinito
  if (this.i === antes) {
    this.i++;
    if (++this._guardas > 500) break;
  }
}
```

### Qué es un "punto seguro"

`sincronizar()` avanza hasta encontrar alguno de estos:

| Punto de sincronización | Por qué es seguro |
|---|---|
| Un `;` | termina la instrucción rota; se consume y se sigue con la siguiente |
| Un `}` | cierra el bloque; **no** se consume, lo consume quien abrió el bloque |
| Una palabra que empieza instrucción (`si`, `para`, `imprimirLn`…) | empieza algo nuevo |
| Un tipo de dato (`entero`, `cadena`…) | empieza una declaración |

### La red de seguridad

El `if (this.i === antes)` con el contador `_guardas` es una protección contra
ciclos infinitos: si una vuelta completa del bucle no consumió ni un solo token,
se fuerza un avance. Sin eso, un archivo con basura podría dejar la aplicación
colgada. Está cubierto por la prueba *"no entra en ciclo infinito con basura"*.

### El resultado

Un programa con varios errores los reporta de una sola pasada:

```swordbyte
clase demo {
    clasePrincipal {
        entero a = 5          // ← falta ';'
        cadena = "hola";      // ← falta el nombre de la variable
        imprimirLn(a;         // ← falta ')'
    }
}
```

```
Línea 4:  Falta ';' al final de la declaracion.
Línea 5:  Falta ')' para cerrar los parametros de imprimirLn.
```

**Dos errores, no tres.** Vale la pena entender por qué, porque es el
comportamiento normal del modo pánico y no un defecto:

1. El primer error se detecta en la línea 4, cuando el parser esperaba el `;` de
   `entero a = 5` y se encontró con `cadena`.
2. `sincronizar()` arranca justo ahí y avanza buscando un punto seguro. El
   primero que encuentra es el `;` del final de la línea 4.
3. En el camino se tragó `cadena = "hola"`, así que ese error nunca se reportó.

Es el precio conocido de la recuperación por modo pánico: **puede ocultar un
error que esté entre el error detectado y el siguiente punto de
sincronización**. A cambio evita el problema contrario, que es mucho peor: sin
recuperación, el parser reportaría el error de la línea 4 y se detendría, y el
de la línea 5 no aparecería nunca.

Al corregir el primer error y volver a analizar, el segundo sale a la luz. En la
práctica se trabaja así: corregir, volver a analizar, repetir.

---
---

# PARTE V bis — EL ANALIZADOR SEMÁNTICO

## 20 bis. Qué hace: la gramática del código

La pestaña 3 recibe **cualquier código del lenguaje** y escribe la gramática
que lo produce. Es lo mismo que se hizo en el pizarrón con `a1 = b5 / 20`:

```
prop → id = exp
exp  → id | num | exp / exp
id   → let ( dig )*
num  → dig ( dig )*
dig  → 0-9
let  → a-z
```

Trabaja con **el mismo lenguaje y las mismas reglas** que las otras pestañas:
no lee el código por su cuenta, sino que recorre el árbol que armó el
analizador sintáctico (que a su vez usa los tokens del léxico). Por eso acepta
exactamente lo que acepta la pestaña 2, y si el código tiene errores léxicos o
sintácticos **no genera nada**: muestra los errores para corregirlos primero.

El código está en
[`AnalizadorSemantico.js`](../src/core/semantico/AnalizadorSemantico.js) y el
detalle completo, con más ejemplos, en
[08 — Analizador semántico](08-analizador-semantico.md).

---

## 20 ter. Cómo genera la gramática

**Paso 1 — Cada nodo aporta su forma.** El generador recorre el árbol y, por
cada nodo, agrega una alternativa a una regla con la forma en que se escribió.
Las partes que son otra cosa se cambian por su no terminal:

```js
case 'Binaria': return [exp(n.izquierda), T(n.operador), exp(n.derecha)];
//   b5 / 20   ->   exp → exp / exp
```

`T()` es un terminal (se escribe tal cual) y `exp()` registra el hijo como otra
alternativa de `exp` y devuelve el no terminal. Hay un `case` por cada tipo de
instrucción (`formaInstruccion()`) y por cada tipo de expresión
(`formaExpresion()`). Las alternativas repetidas se guardan una sola vez, así
que sólo salen **las que aparecen en el código**.

La raíz es `prop`: la forma de la expresión o de la instrucción si es una
sola, o `clase id { … }` si es un programa completo. Si son **varias
proposiciones** (una por renglón, o con `;`), arriba va `props → prop prop …` y
cada una aporta su forma como alternativa de `prop`:
`a = b + c` y `a && b || c + f > d` dan `prop → id = exp | exp || exp`.

**Paso 2 — Las palabras y los caracteres.** Mientras recorre, el generador
anota los nombres, números y textos que encuentra. Al final escribe sus reglas
**sólo con los caracteres que se usaron**: `a1` y `b5` dan `id → let ( dig )*`;
un texto `"Hola mundo"` da `TEXTO → ( LET | let | simb )*` y `simb → ␣`.

**Paso 3 — El orden.** `prop` va primero; luego las reglas de estructura de
arriba hacia abajo (cada una después de la primera que la nombra); luego las
palabras (`tipo`, `id`, `num`, `cadena`, `TEXTO`…) y al final los caracteres
(`dig`, `LET`, `let`, `simb`). Dentro de una regla, las alternativas cortas
primero: `exp → id | num | exp / exp`, como en el pizarrón.

**Lo que devuelve.** Cada regla trae sus alternativas, y cada alternativa sus
símbolos con su clase (`terminal`, `no-terminal`, `meta` para `( )* | [ ]` y
`rango` para `0-9`), su texto y un **ejemplo**: el pedazo de código del que
salió, que la pestaña muestra al pasar el mouse. El ejemplo lo escribe
[`TextoDeNodo.js`](../src/core/semantico/TextoDeNodo.js), que vuelve a
escribir un nodo del árbol como código.

Para escribir `exp → ( exp )` y `equipo ( Null ) ;`, el analizador sintáctico
anota en el árbol dos datos que antes descartaba: `parentesis: true` en una
expresión que iba entre paréntesis y `conNull` en `equipo`. Son datos sueltos,
no nodos, así que el árbol dibujado no cambia.

---
---

# PARTE VI — LA APLICACIÓN

## 21. La ventana y sus tres pestañas

Hasta arriba van las tres pestañas. Debajo, la pestaña activa, **cada una con
su propio diseño**: sus logos, sus botones y sus cuadros van donde los pide su
diseño. Lo que comparten es el estilo (la paleta, los botones, las cajas).

```
 (1) Analizador Léxico   (2) Analizador Léxico-Sintáctico   (3) Analizador Semántico

 PESTAÑA 1                          PESTAÑA 2                         PESTAÑA 3
┌──────────────────────────────┐   ┌──────────────────────────────┐  ┌──────────────────────────────┐
│[UAT]  Ing. en Sistemas  [UAMM]│   │    [UAT]   [UAMM]   [ISC]    │  │[UAT] │ Prog. de Sistemas│Limp. │
│       Analizador Léxico       │   ├────────┬─────────────────────┤  │      │ de Base II       │Anal. │
│  Grupo : 9° F | Equipo : ...  │   │Limpiar │ Código Fuente       │  │[UAMM]│ Analizador Sem.  │      │
├─────────────────────┬────────┤   │An. Léx.│ Análisis Léxico     │  │      │ Código para      │      │
│ Código Fuente :     │Realizar│   │An. Sin.│ Análisis Sintáctico │  │[ISC] │ analizar:        │Equipo│
│ Resultados Análisis:│Guardar │   │A. L-S  │ (el árbol)          │  │      │ Análisis semánt. │      │
│ Lexema|Token|Descr. │Borrar  │   │        │                     │  │      │ del código dado: │      │
│ ✓ Análisis complet. │Fuga    │   │Equipo  │                     │  │      │ prop → id = exp  │      │
├─────────────────────┴────────┤   │Salir   │                     │  │      │ ...              │Term. │
│ Equipo SwordByte — UAT/UAMMC │   └────────┴─────────────────────┘  └──────┴──────────────────┴──────┘
└──────────────────────────────┘
```

| Pestaña | Diseño | Botones |
|---|---|---|
| **1 · Analizador Léxico** | El de la captura: UAT, título y UAMM en un recuadro arriba; código y tabla *Lexema · Token · Descripción*; pie con el equipo | A la derecha: Realizar Análisis · Guardar · Borrar · Fuga |
| **2 · Analizador Léxico-Sintáctico** | El anterior, sin cambios: los tres logos arriba; código, salida `id1 > id2` y árbol | A la izquierda: Limpiar · Análisis Léxico · Análisis Sintáctico · Análisis Léxico-Sintáctico · Equipo · Salir |
| **3 · Analizador Semántico** | El del pizarrón: los tres logos en columna a la izquierda; título; código para analizar; análisis del código dado | A la derecha, repartidos: Limpieza · Analiza · Equipo · Termina |

En el HTML cada panel trae su propio encabezado
(`.encabezado-lexico`, `.encabezado`, `.logos-columna`). Los textos que
dependen del equipo llevan `data-dato="equipo"`, `"grupo"`, `"carrera"` o
`"materia"`, y [`app.js`](../src/ui/js/app.js) los llena con los datos de
[`Equipo.js`](../src/core/comun/Equipo.js).

La aplicación **abre en blanco y en la pestaña 1**.

### 21.1 Un solo código para las tres pestañas

Cada pestaña tiene su propio cuadro de código, pero los tres llevan siempre lo
mismo. [`app.js`](../src/ui/js/app.js) los guarda en un objeto y, cuando uno
cambia, copia su texto a los otros dos:

```js
this.editores = {
  lexico: document.getElementById('lex-codigo'),
  sintactico: document.getElementById('codigo'),
  semantico: document.getElementById('sem-codigo')
};

_copiarCodigoDesde (origen) {
  Object.values(this.editores).forEach((editor) => {
    if (editor !== origen) editor.value = origen.value;
  });
}
```

Al analizar desde cualquier pestaña se compila una vez y el resultado se pinta
en los tres paneles. Cambiar de pestaña sólo esconde un panel y muestra otro
(`.panel` vs `.panel.activo` en el CSS), así que **nada se borra al cambiar**:
la fila marcada, la rama abierta del árbol y el zoom siguen ahí al regresar.

### 21.2 La ventana de salida

Fuga, Salir, Termina y `Ctrl+Q` abren la misma ventana
([`salir.js`](../src/ui/js/salir.js)): el nombre del equipo, sus seis
integrantes y la pregunta *¿Quieres salir del compilador?*, con **Cancelar**
(que recibe el foco) y **Sí, salir**. La lista de integrantes la llena la misma
función que la ventana *Equipo*, `llenarIntegrantes()`, con los datos de
[`Equipo.js`](../src/core/comun/Equipo.js).

---

## 22. El dibujo del árbol

[`arbol.js`](../src/ui/js/arbol.js) dibuja el árbol como SVG, con la raíz arriba
y los hijos colgando.

### 22.1 El algoritmo de acomodo

Es el método clásico en dos tiempos:

```js
const colocar = (n, nivel) => {
  n.y = MARGEN + nivel * ALTO_NIVEL;          // la altura la da el nivel

  if (n.hijos.length === 0) {
    n.x = cursor + n.ancho / 2;               // 1. las hojas, de izq. a der.
    cursor += n.ancho + HUECO;
    return;
  }

  n.hijos.forEach((h) => colocar(h, nivel + 1));

  const primero = n.hijos[0];
  const ultimo = n.hijos[n.hijos.length - 1];
  n.x = (primero.x + ultimo.x) / 2;           // 2. los padres, centrados
};
```

1. **Las hojas se colocan primero**, de izquierda a derecha, llevando un cursor.
2. **Cada nodo interno se centra** sobre el primero y el último de sus hijos.

Más un ajuste: si el nodo padre es más ancho que el hueco que dejan sus hijos, el
cursor se corre para que no se encime con el siguiente subárbol.

### 22.2 Las medidas

| Constante | Valor | Qué controla |
|---|---|---|
| `ALTO_NODO` | 32 px | alto del recuadro |
| `ALTO_NIVEL` | 76 px | separación vertical entre niveles |
| `HUECO` | 18 px | separación horizontal mínima entre hojas |
| `MARGEN` | 26 px | margen del dibujo |
| `ANCHO_CARACTER` | 8 px | ancho de un carácter monoespaciado |

---

## 23. El zoom y la vista por ramas

Hay **dos formas** de ver el árbol de cerca, y son distintas.

### 23.1 Zoom general

Los botones `−` / `+` / **Ajustar**, o `Ctrl` + rueda del mouse, agrandan todo el
dibujo entre el 30 % y el 300 %.

Técnicamente: se cambian el `width` y el `height` del SVG **dejando fijo el
`viewBox`**. Así la imagen escala de verdad y las barras de desplazamiento se
ajustan solas.

```js
this.dibujo.svg.setAttribute('width', this.dibujo.ancho * this.zoom);
this.dibujo.svg.setAttribute('height', this.dibujo.alto * this.zoom);
```

### 23.2 Ver una rama de cerca

Ésta es la más útil con árboles grandes: **un clic en cualquier nodo con hijos
deja en pantalla sólo esa rama**, ya agrandada para llenar el ancho.

La clase `VistaArbol` guarda un **camino**: la lista de nodos desde la raíz hasta
la rama que está en pantalla.

```
camino = [ OR ]            → se ve todo el árbol
camino = [ OR, AND ]       → se ve solo la rama AND, más grande
camino = [ OR, AND, > ]    → se ve solo la rama >, más grande todavía
```

Arriba del cuadro aparece ese camino como botones, y cada uno regresa a su
altura:

```
Viendo la rama:  [ Árbol completo ]  ›  [ AND ]
```

**Cómo se calcula el tamaño al abrir una rama:**

```js
_zoomQueLlenaElAncho () {
  const disponible = this.dibujo.lienzo.clientWidth - 32;
  return Math.max(1, disponible / this.dibujo.ancho);
}
```

Se mide **sólo el ancho**, porque a lo alto el cuadro se puede desplazar. Y el
`Math.max(1, ...)` garantiza que una rama abierta nunca se vea más chica de lo
que estaba dentro del árbol completo.

Los nodos que se pueden abrir llevan la clase `con-rama`, que les pone el cursor
de lupa. La raíz no se puede abrir, porque ya se está viendo completa.

---

## 24. El reporte visual (.html)

Al guardar (`Ctrl+S`, *Archivo → Guardar reporte* o el botón **Guardar** de la
pestaña 1), lo que sale **no** es sólo el código: es un reporte completo. El
diálogo ofrece dos formatos y el primero es el **reporte visual**, una página
web que arma [`ReporteHTML.js`](../src/core/ReporteHTML.js):

![Reporte visual](capturas/reporte.png)

### 24.1 Por qué una página web

| Lo que se quería | Cómo lo resuelve |
|---|---|
| Algo más visual que un `.txt` | Los colores de la aplicación, la tabla de tokens, el árbol dibujado y la gramática generada |
| Que se pueda entregar | Es **un solo archivo**: los estilos y los logos (achicados por [`electron/logos.js`](../electron/logos.js)) van adentro. Se abre en cualquier navegador y se imprime o pasa a PDF con `Ctrl+P` |
| Que se pueda volver a usar | Lleva el código guardado en un bloque de datos que el compilador lee al abrirlo |

### 24.2 Las partes

1. **Encabezado**: los logos, la materia, el equipo y el grupo, y de qué pestaña
   se guardó.
2. **Ficha**: programa, equipo, los seis integrantes, materia, grado y grupo,
   carrera, institución, unidad, fecha y hora. A la derecha, una tarjeta por
   análisis (verde o roja).
3. **1. Código fuente**, con los renglones numerados.
4. **2. Análisis léxico**: la salida `id1 > id2` en colores, los
   identificadores y la tabla de tokens.
5. **3. Análisis sintáctico**: el árbol dibujado o los errores. El árbol son
   listas `<ul>` anidadas; las ramas las dibuja el CSS (bordes de los
   `::before` y `::after` de cada `<li>`), así que no hace falta JavaScript.
   Abajo, desplegable, el mismo árbol en texto con sangría.
6. **4. Análisis semántico**: la gramática generada del código, con los
   terminales subrayados como en la pestaña 3.

La página **no lleva JavaScript**: sólo HTML y CSS. Todo texto que viene del
código pasa por `esc()`, para que un `<b>` escrito en el código se vea como
texto y no como negritas.

### 24.3 Volver a abrir un reporte

En el `<head>` va un bloque de datos que el navegador no ejecuta ni muestra:

```html
<script type="application/json" id="datos-swordbyte">
{"formato":"reporte-swordbyte","version":1,"pestana":"semantico",
 "programa":"analisis.html","fecha":"2026-10-06T19:36:45.000Z",
 "codigo":"a1 = b5 / 20"}
</script>
```

Al abrir un archivo (con `Ctrl+O` o soltándolo sobre la ventana),
[`ArchivoGuardado.js`](../src/core/ArchivoGuardado.js) decide qué es **por su
contenido**, no por su extensión:

| El archivo… | Se hace |
|---|---|
| trae el bloque `datos-swordbyte` | se recupera el código y se regresa a la pestaña guardada |
| es otra página web | error: *no es un reporte del compilador* |
| es un reporte `.bs` | se recupera el código entre las marcas `INICIO` / `FIN` |
| es cualquier otro texto | se abre tal cual |

Dentro del bloque, `<`, `>` y `&` se escriben como `\u003c`, `\u003e` y
`\u0026`. Así, un `</script>` escrito en el código no puede cerrar el bloque
antes de tiempo, y `JSON.parse` los regresa a su forma normal al leerlo.

---

## 24 bis. El reporte en texto (.bs)

Si en el diálogo se elige *Reporte en texto (.bs)*, se guarda el reporte de
siempre, armado por [`Reporte.js`](../src/core/Reporte.js), ahora con una
cuarta sección con la gramática generada.

### 24 bis.1 Las secciones

```
// ==========================================================================
//  C O M P I L A D O R   S W O R D B Y T E
//  Reporte de análisis léxico, sintáctico y semántico
// ==========================================================================
//  Programa .......... ejemplo.bs
//  Equipo ............ SwordByte
//  Autores ........... Avalos Castillo Armando de Jesús
//                      Borjas Arias Ronaldo Antonio
//                      Pesina Santander Edgar Gael
//                      Ramos Antonio Saqueo
//                      Vazquez Romo Marco Antonio
//                      Verlage Aceves Axel Aram
//  Materia ........... Programación de Sistemas de Base II
//  Grado y grupo ..... 9° F
//  Carrera ........... Ingeniería en Sistemas Computacionales
//  Institución ....... Universidad Autónoma de Tamaulipas
//  Unidad ............ Unidad Académica Multidisciplinaria Mante
//  Fecha y hora ...... 27/09/2026 13:33:10
//  Resultado ......... Análisis correcto, sin errores
// ==========================================================================

// --------------------------------------------------------------------------
//  1. CÓDIGO FUENTE
// --------------------------------------------------------------------------

// >>>>> INICIO DEL CODIGO FUENTE
a = b + c > 9 AND d > e OR f <= 30
// <<<<< FIN DEL CODIGO FUENTE

// --------------------------------------------------------------------------
//  2. ANÁLISIS LÉXICO
// --------------------------------------------------------------------------

//  id1 = id2 + id3 > num(9) AND id4 > id5 OR id6 <= num(30)
//
//  Identificadores (6):
//     id1 = a   (aparece 1 vez)
//     id2 = b   (aparece 1 vez)
//     ...
//
//  Tokens: 15   Líneas: 1   Caracteres: 34   Comentarios: 0
//  Errores léxicos: 0   Tiempo: 1 ms

// --------------------------------------------------------------------------
//  3. ANÁLISIS SINTÁCTICO
// --------------------------------------------------------------------------

//  Árbol sintáctico:
//
//  OR
//  ├── AND
//  │   ├── >
//  │   │   ├── =
//  ...
//
//  Nodos: 15   Profundidad: 6   Modo de análisis: expresion
//  Errores sintácticos: 0   Tiempo: 1 ms

// --------------------------------------------------------------------------
//  4. ANÁLISIS SEMÁNTICO: GRAMÁTICA DEL CÓDIGO
// --------------------------------------------------------------------------

//  Gramática generada del código dado (6 reglas):
//
//  prop → exp OR exp
//  exp  → id
//       | num
//       | exp + exp
//  ...
```

El campo **Resultado** del encabezado dice de un vistazo si el análisis salió
limpio o cuántos errores hubo (léxicos y sintácticos), sin tener que bajar a
las secciones.

### 24 bis.2 El truco del formato

**Todo lo que no es código va en comentarios `//`.** Eso significa que el reporte
**sigue siendo un programa SwordByte válido**, y tiene tres consecuencias
prácticas:

1. Se puede volver a abrir en el compilador y analizar de nuevo.
2. Se entrega como evidencia sin necesidad de dos archivos.
3. No se puede "romper" al abrirlo por error.

Y para que guardar dos veces no anide reportes, `extraerCodigoFuente()` usa las
marcas `>>>>> INICIO` / `<<<<< FIN` para recuperar únicamente el código:

```js
const MARCA_INICIO = '// >>>>> INICIO DEL CODIGO FUENTE';
const MARCA_FIN = '// <<<<< FIN DEL CODIGO FUENTE';
```

Si un archivo no tiene esas marcas, se abre tal cual (es un `.bs` normal).

### 24 bis.3 Por qué el árbol va con sangría

En el reporte el árbol **no** se dibuja con ramas, sino como lista con sangría:

```
OR
├── AND
│   ├── >
│   │   ├── id1
│   │   └── num(9)
│   └── >
└── <=
```

La razón es de ancho. Un dibujo con ramas de un programa completo mide cientos
de caracteres a lo ancho y se rompe al abrirlo en el Bloc de notas. La lista con
sangría del ejemplo más grande del proyecto mide **53 caracteres**, así que cabe
en cualquier editor. Se lee igual: de arriba hacia abajo y de izquierda a
derecha.

---
---

# PARTE VII — OPERACIÓN

## 25. Pruebas

Hay dos suites, y son complementarias.

| Comando | Qué hace | Cuántas |
|---|---|---|
| `npm run pruebas` | Prueba el compilador sin abrir ventana | 118 |
| `npm run pruebas:ui` | Abre la aplicación de verdad y la revisa | 109 |

### 25.1 Las pruebas del compilador

No usan ninguna librería: el archivo trae su propio `prueba()`, `igual()` y
`verdadero()`, en unas 30 líneas. Corren en menos de un segundo.

Cubren:

- El autómata y cada tipo de token
- Los errores léxicos, uno por uno
- La salida `id1` / `num()` y el espaciado
- **La jerarquía de operadores**, verificando la forma exacta del árbol
- Los tres modos de análisis
- La recuperación de errores
- La tabla de tokens de la pestaña 1
- El analizador semántico: que el ejemplo del pizarrón dé la gramática del
  pizarrón, cada tipo de instrucción, las listas, el orden de las reglas, los
  caracteres, los errores y que todos los ejemplos generen su gramática
- Los dos reportes y su ida y vuelta, incluido código con `<`, `&` y
  `</script>`
- Que los 7 ejemplos compilen
- Robustez: programa vacío, basura, BOM, comillas de Word

### 25.2 Las comprobaciones de interfaz

Abren una ventana de Electron real, hacen clic en los botones de verdad y leen el
DOM resultante. Verifican, entre otras cosas:

- Que los tres logos carguen
- Que los botones estén en la columna izquierda, en orden
- Que **el equipo salga ordenado alfabéticamente por apellidos**
- Que los colores por categoría sean los correctos
- Que el `OR` quede hasta arriba del árbol
- Que el zoom y la vista por ramas funcionen
- Que las tres pestañas compartan el código y el resultado, y que **cambiar de
  pestaña no borre nada**
- Que cada pestaña tenga sus logos y sus botones donde los pide su diseño
- La tabla de tokens, la gramática generada (y que con errores no se genere) y
  la ventana de Fuga (Cancelar no sale, *Sí, salir* sí)
- Que el reporte `.html` traiga sus secciones y sus logos, y que al **volver a
  abrirlo** (o soltarlo sobre la ventana) regrese el código y la pestaña

Con `npm run capturas` hacen lo mismo pero además guardan las imágenes de
`docs/capturas/`, así que **la documentación nunca queda con capturas viejas**.

---

## 26. Empaquetado y distribución

```bash
npm run dist          # portable + instalador
npm run dist:portable # sólo el portable
```

Produce dos archivos en `dist/`:

| Archivo | Cómo se usa |
|---|---|
| `CompiladorSwordByte-1.0.0-portable.exe` | Doble clic. No instala nada |
| `CompiladorSwordByte-1.0.0-instalador.exe` | Instala, crea acceso directo y desinstalador |

### Dos detalles del empaquetado

**1. La documentación viaja aparte.** En `package.json`:

```json
"extraResources": [
  { "from": "docs", "to": "docs" },
  { "from": "README.md", "to": "docs/README.md" }
]
```

Va como recurso externo y no dentro del `app.asar` porque una carpeta dentro de
un `.asar` **no se puede abrir con el explorador de archivos**, y el menú
*Ayuda → Documentación del proyecto* hace justo eso. El código lo resuelve así:

```js
return app.isPackaged
  ? path.join(process.resourcesPath, 'docs')
  : path.join(RAIZ, 'docs');
```

**2. Cada target tiene su propio `artifactName`.** Poner `${target}` en un solo
nombre no funciona: esa variable no está definida y el instalador sale con un
nombre roto.

---

## 27. Cómo extender el compilador

Tres recetas para los cambios más probables.

### 27.1 Agregar una palabra reservada

1. Agregarla al diccionario de
   [`PalabrasReservadas.js`](../src/core/lexico/PalabrasReservadas.js) con su
   descripción.
2. Si empieza una instrucción, agregarla a `INICIO_INSTRUCCION` en el parser
   (para la recuperación de errores) y al `switch` de `instruccion()`.
3. Escribir el método de su producción.
4. Agregar la regla a [`Gramatica.js`](../src/core/sintactico/Gramatica.js) y
   correr `npm run gramatica`.
5. Agregar una prueba.

### 27.2 Agregar un operador

Ejemplo real: así se agregaron `^` y `**`.

| Paso | Archivo | Qué se hizo |
|---|---|---|
| 1 | `AnalizadorLexico.js` | `'^'` a `OPERADORES_SIMPLES`, `'**'` a `OPERADORES_DOBLES` |
| 2 | `AnalizadorSintactico.js` | método `potencia()` nuevo, insertado entre `unaria` y `postfija` |
| 3 | `NodosAST.js` | los símbolos a `OPERADORES_ARITMETICOS` (para el color) |
| 4 | `Gramatica.js` | la regla EBNF, y `npm run gramatica` |
| 5 | `pruebas/ejecutar.js` | pruebas de precedencia y asociatividad |
| 6 | `docs/` | las cuatro tablas de jerarquía |

**El paso 2 es el que decide la precedencia.** Insertar el nivel más abajo en la
cadena = más prioridad.

### 27.3 Agregar una función nativa

1. La palabra al diccionario de `PalabrasReservadas.js`.
2. El nombre y su rango de argumentos a `NATIVAS` en el parser:
   ```js
   const NATIVAS = {
     longitud: [1, 1],      // [mínimo, máximo]
     raiz: [1, 2],
     ...
   };
   ```
3. La regla a `Gramatica.js` y `npm run gramatica`.

La validación de argumentos ya es automática: si el número no cabe en el rango,
sale *"raiz espera entre 1 y 2 argumento(s) y recibio 3."*

---

## 28. Limitaciones conocidas

Vale la pena tenerlas claras, porque son preguntas probables en la revisión.

| Limitación | Por qué |
|---|---|
| No valida tipos (`entero a = "hola";` pasa) | La pestaña 3 genera la gramática del código; validar tipos sería otra parte del análisis semántico que no se pidió |
| No detecta variables sin declarar | Mismo motivo |
| La gramática generada describe **este** código, no todo el lenguaje | Es lo que se pide: sólo salen las alternativas y los caracteres que aparecen. La gramática completa del lenguaje está en [04 — Gramática EBNF](04-gramatica-ebnf.md) |
| No genera código Java | Es la fase 6 |
| No ejecuta el programa | Un compilador traduce; ejecutar es otra cosa |
| Sólo Windows | El empaquetado está configurado para `.exe`. El compilador en sí es multiplataforma |

### Una decisión que documentamos aparte

El documento de instrucciones de la materia muestra en un lugar la forma
`asignar(edad, 20)` y en otros la forma `variable = valor;`. **Implementamos sólo
la segunda**, por consistencia con el resto del lenguaje y con Java, que es el
lenguaje destino.

---
---

# APÉNDICES

## Apéndice A — Categorías de token

Las 17 categorías de
[`TiposToken.js`](../src/core/comun/TiposToken.js):

| Categoría | Qué incluye |
|---|---|
| `PALABRA_RESERVADA` | `clase`, `si`, `mientras`… |
| `TIPO_DATO` | `entero`, `cadena`, `logico`… |
| `IDENTIFICADOR` | nombres definidos por el programador |
| `LIT_ENTERO` | `42`, `10L` |
| `LIT_DECIMAL` | `3.5`, `2.0f` |
| `LIT_CADENA` | `"Hola"` |
| `LIT_CARACTER` | `'A'` |
| `LIT_LOGICO` | `verdadero`, `falso` |
| `OP_ARITMETICO` | `+ - * / % ^ ** √` |
| `OP_RELACIONAL` | `== != < > <= >=` |
| `OP_LOGICO` | `&& \|\| ! Y O NO AND OR NOT` |
| `OP_ASIGNACION` | `=` |
| `OP_INCREMENTO` | `++ --` |
| `DELIMITADOR` | `( ) { } [ ] ; , : .` |
| `COMENTARIO` | `//` y `/* */` |
| `FIN_ARCHIVO` | el centinela `<FIN>` |
| `ERROR` | símbolo no reconocido |

---

## Apéndice B — Comandos

| Comando | Qué hace |
|---|---|
| `npm start` | Abre la aplicación desde el código |
| `npm run pruebas` | 118 pruebas del compilador |
| `npm run pruebas:ui` | 109 comprobaciones sobre la ventana real |
| `npm run capturas` | Igual que la anterior + regenera `docs/capturas/` |
| `npm run gramatica` | Regenera `docs/04-gramatica-ebnf.md` |
| `npm run icono` | Regenera el icono de la aplicación |
| `npm run dist` | Genera el portable y el instalador |

---

## Apéndice C — Glosario

| Término | Qué significa |
|---|---|
| **AFD** | Autómata Finito Determinista. Máquina de estados que reconoce texto. "Determinista" = desde cada estado, cada carácter lleva a un solo estado |
| **Token** | La pieza mínima con significado: una palabra, un número, un operador |
| **Lexema** | El texto exacto de un token tal como aparece en el código |
| **AST** | Árbol de Sintaxis Abstracta. La estructura que representa el programa |
| **EBNF** | Notación para escribir gramáticas. `[ x ]` opcional, `{ x }` cero o más |
| **LL(1)** | Analizador que lee de izquierda a derecha con **1** token de anticipación |
| **Descenso recursivo** | Técnica donde cada regla de la gramática es una función |
| **Modo pánico** | Recuperación de errores: descartar tokens hasta un punto seguro |
| **Precedencia** | Qué operador se aplica primero |
| **Asociatividad** | Hacia qué lado agrupa un operador cuando se repite |
| **IPC** | Inter-Process Communication. Cómo hablan los dos procesos de Electron |
| **SVG** | Formato de imagen vectorial. Con él se dibuja el árbol |
| **Análisis semántico** | En la pestaña 3: escribir la gramática de la que está hecho el código dado |
| **Producción** | Una regla de la gramática: `exp → exp / exp` dice que una expresión puede ser dos expresiones con `/` en medio |
| **Terminal** | Símbolo que aparece tal cual en el código, como `si`, `(` o `;` |
| **No terminal** | El nombre de otra regla, como `exp` o `id`: se sustituye por alguna de sus alternativas |

---

## Apéndice D — Los demás documentos

| Documento | De qué trata |
|---|---|
| [01 — Especificación del lenguaje](01-especificacion-del-lenguaje.md) | Alfabeto, palabras reservadas, tipos y cada instrucción con su equivalente en Java |
| [02 — Analizador léxico](02-analizador-lexico.md) | El AFD estado por estado, con más detalle |
| [03 — Analizador sintáctico](03-analizador-sintactico.md) | Cada producción del parser, con más detalle |
| [04 — Gramática EBNF](04-gramatica-ebnf.md) | Las 52 reglas completas (generado) |
| [05 — Arquitectura](05-arquitectura.md) | Decisiones de diseño y estructura |
| [06 — Manual de usuario](06-manual-de-usuario.md) | Cómo usar la aplicación |
| [07 — Mantenimiento](07-mantenimiento.md) | Tareas de mantenimiento paso a paso |
| [08 — Analizador semántico](08-analizador-semantico.md) | Cómo se genera la gramática del código, con más ejemplos |

---

*Equipo SwordByte — Programación de Sistemas de Base II — Grado 9, Grupo F*

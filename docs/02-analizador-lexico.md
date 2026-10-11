# Fase 1 — Analizador léxico

El analizador léxico (*scanner*) es la primera fase del compilador. Lee el
código fuente **carácter por carácter** y lo agrupa en **tokens**: las palabras
mínimas con significado del lenguaje.

Archivos:

- [`src/core/lexico/AnalizadorLexico.js`](../src/core/lexico/AnalizadorLexico.js) — el análisis
- [`src/core/lexico/PalabrasReservadas.js`](../src/core/lexico/PalabrasReservadas.js) — diccionario del lenguaje
- [`src/core/lexico/FormatoLexico.js`](../src/core/lexico/FormatoLexico.js) — la salida `id1 > id2`
- [`src/core/comun/Token.js`](../src/core/comun/Token.js) — estructura de un token
- [`src/core/comun/TiposToken.js`](../src/core/comun/TiposToken.js) — categorías léxicas

---

## 1. Qué entra y qué sale

```
"entero edad = 20;"
        │
        ▼
┌───────────────────┐
│ Analizador léxico │
└───────────────────┘
        │
        ▼
[TIPO_DATO "entero"] [IDENTIFICADOR "edad"] [OP_ASIGNACION "="]
[LIT_ENTERO "20"] [DELIMITADOR ";"] [FIN_ARCHIVO]
```

Además de los tokens, esta fase entrega:

| Salida | Para qué sirve |
|---|---|
| `tokens` | lista que consume el analizador sintáctico (sin comentarios) |
| `salida` | el código reescrito: `id1 > id2` (ver sección 5 bis) |
| `lineas` | lo mismo, línea por línea, para mostrarlo numerado |
| `identificadores` | equivalencias `id1 = a`, con cuántas veces aparece cada una |
| `mapaIdentificadores` | `{ a: 'id1', b: 'id2' }`, que también usa el árbol |
| `errores` | errores léxicos con línea, columna y sugerencia |
| `estadisticas` | tokens, comentarios, errores, líneas y caracteres |

---

## 2. Estructura de un token

```js
{
  numero: 7,                    // consecutivo
  tipo: 'IDENTIFICADOR',        // categoría léxica
  lexema: 'edad',               // texto exacto del código
  valor: 'edad',                // valor ya interpretado
  linea: 3, columna: 12,        // posición (base 1)
  estadoFinal: 'q1',            // estado del AFD donde se aceptó
  descripcion: 'Identificador definido por el usuario',
  ignorado: false               // true en comentarios
}
```

---

## 3. Categorías léxicas

| Categoría | Ejemplos |
|---|---|
| `PALABRA_RESERVADA` | `clase`, `si`, `mientras`, `imprimirLn` |
| `TIPO_DATO` | `entero`, `cadena`, `decimal` |
| `IDENTIFICADOR` | `edad`, `miVariable123` |
| `LIT_ENTERO` | `20`, `8000000L` |
| `LIT_DECIMAL` | `3.1416`, `8.5f` |
| `LIT_CADENA` | `"Hola"` |
| `LIT_CARACTER` | `'A'` |
| `LIT_LOGICO` | `verdadero`, `falso` |
| `OP_ARITMETICO` | `+ - * / % ^ ** √` |
| `OP_RELACIONAL` | `== != < > <= >=` |
| `OP_LOGICO` | `Y O NO !` |
| `OP_ASIGNACION` | `=` |
| `OP_INCREMENTO` | `++ --` |
| `DELIMITADOR` | `( ) { } [ ] ; , : .` |
| `COMENTARIO` | `// ...`, `/* ... */` |
| `FIN_ARCHIVO` | centinela al final |
| `ERROR` | símbolo no reconocido |

---

## 4. El autómata finito determinista

El reconocimiento se describe con un **AFD de 19 estados**, que es lo que
implementa
[`AnalizadorLexico.js`](../src/core/lexico/AnalizadorLexico.js). Cada token
guarda el estado en el que fue aceptado.

Las tablas de esta sección son la especificación del autómata: el código las
sigue, pero no las guarda como datos.

### 4.1 Estados

| Estado | Nombre | Tipo |
|---|---|---|
| `q0` | Inicio | inicial |
| `q1` | Identificador | aceptación |
| `q2` | Entero | aceptación |
| `q3` | Punto decimal | intermedio |
| `q4` | Decimal | aceptación |
| `q5` | Sufijo numérico | aceptación |
| `q6` | Cadena abierta | intermedio |
| `q7` | Escape en cadena | intermedio |
| `q8` | Cadena cerrada | aceptación |
| `q9` | Carácter abierto | intermedio |
| `q10` | Carácter leído | intermedio |
| `q11` | Carácter cerrado | aceptación |
| `q12` | Operador simple | aceptación |
| `q13` | Operador doble | aceptación |
| `q14` | Delimitador | aceptación |
| `q15` | Comentario de línea | aceptación |
| `q16` | Comentario de bloque | intermedio |
| `q17` | Cierre de bloque | aceptación |
| `qE` | Error | error |

### 4.2 Transiciones principales

```
Identificadores
  q0 --letra o _--> q1
  q1 --letra, dígito o _--> q1        (se queda leyendo)

Números
  q0 --dígito--> q2
  q2 --dígito--> q2
  q2 --punto--> q3 --dígito--> q4 --dígito--> q4
  q2 | q4 --sufijo f, d o L--> q5
  q3 --cualquier otra cosa--> qE      (ej. "4." incompleto)

Cadenas
  q0 --comilla doble--> q6
  q6 --carácter normal--> q6
  q6 --barra invertida--> q7 --cualquiera--> q6
  q6 --comilla doble--> q8
  q6 --fin de línea--> qE             (cadena sin cerrar)

Caracteres
  q0 --comilla simple--> q9 --cualquiera--> q10 --comilla simple--> q11

Operadores
  q0 --+ - * / % ^ √ = < > !--> q12
  q12 --segundo símbolo--> q13        (==, !=, <=, >=, ++, --, **)

Delimitadores
  q0 --( ) { } [ ] ; , : .--> q14

Comentarios
  q12 --segunda barra--> q15 ...hasta fin de línea
  q12 --asterisco--> q16 ...hasta "*/"--> q17
```

### 4.3 Ejemplo de recorrido

Para la entrada `edad`:

| Paso | Carácter | Estado anterior | Estado nuevo | Acción |
|---|---|---|---|---|
| 1 | `e` | q0 | q1 | primera letra del identificador |
| 2 | `d` | q1 | q1 | continúa el identificador |
| 3 | `a` | q1 | q1 | continúa el identificador |
| 4 | `d` | q1 | q1 | continúa el identificador |

Al llegar a un carácter que no continúa la palabra (por ejemplo un espacio),
`q1` es de aceptación: se cierra el lexema `edad`, se consulta el diccionario de
palabras reservadas y, como no está, se emite un `IDENTIFICADOR`.

---

## 5. Cómo se decide entre palabra reservada e identificador

El autómata **no** distingue palabras reservadas mientras lee: todas siguen el
camino `q0 → q1`. La clasificación se hace al final, consultando la tabla, que es
la técnica estándar porque evita multiplicar los estados del AFD.

```js
const clasificacion = clasificarPalabra(lexema);
if (clasificacion) {
  // TIPO_DATO, PALABRA_RESERVADA, LIT_LOGICO u OP_LOGICO
} else {
  // IDENTIFICADOR
}
```

---

## 5 bis. La salida `id1 > num(9)`

Además de la lista de tokens, la fase entrega el código reescrito: los
identificadores pasan a ser `id1`, `id2`, `id3`… y los números se envuelven
como `num(valor)`. Es la forma en que se presenta el análisis léxico en la
aplicación.

| Código fuente | Salida léxica |
|---|---|
| `a > b` | `id1 > id2` |
| `a + a + b` | `id1 + id1 + id2` |
| `entero edad = 20;` | `entero id1 = num(20);` |
| `entero t = sumar(5, 3);` | `entero id1 = id2(num(5), num(3));` |
| `datos[0] = tabla[1][2];` | `id1[num(0)] = id2[num(1)][num(2)];` |
| `decimal r = area.circulo(5);` | `decimal id1 = area.circulo(num(5));` |

Lo hace [`FormatoLexico.js`](../src/core/lexico/FormatoLexico.js), con cuatro
reglas:

1. **Un nombre, una etiqueta.** El mismo identificador recibe siempre la misma
   etiqueta, sin importar cuántas veces aparezca. Por eso `a + a + b` da
   `id1 + id1 + id2`.

2. **Los números se marcan como tales.** `9` se muestra `num(9)`, para
   distinguir a simple vista un valor de un nombre.

3. **Lo que sigue a un punto es un miembro, no una variable.** En
   `area.circulo(5)`, la palabra `circulo` no se numera: nombra una figura, no
   una variable del programa. Sin esta regla saldría `area.id2(...)`, que
   confunde.

4. **El espaciado imita el estilo del lenguaje.** Las llamadas se pegan al
   paréntesis (`imprimirLn("Hola")`) y las estructuras de control lo separan
   (`si (id1 > id2)`), igual que se escribe el código a mano.

### Las categorías y sus colores

Cada pieza de la salida lleva su categoría, y es lo que decide su color en la
aplicación:

| Categoría | Qué incluye | Color |
|---|---|---|
| `logico` | `Y AND && · O OR \|\| · NO NOT !` y `verdadero` / `falso` | azul |
| `relacional` | `== != < <= > >=` | rojo |
| `aritmetico` | `+ - * / % ^ ** √ ++ --` | negro |
| `numero` | `num(9)`, `num(3.5)` | ámbar |
| `identificador` | `id1`, `id2`… | morado |
| `reservada`, `texto`, `normal` | el resto | color de texto |

Estos son los mismos colores que usan los nodos del árbol sintáctico, para que
un operador se vea igual en los dos paneles.

### Lo que devuelve la fase

```js
resultado.lexico.salida    // "id1 > num(9)"        (texto completo)
resultado.lexico.lineas    // [{ numero, sangria, texto, piezas: [...] }]
resultado.lexico.identificadores     // [{ etiqueta:'id1', nombre:'a', veces:1 }]
resultado.lexico.mapaIdentificadores // { a: 'id1', b: 'id2' }
```

Cada pieza de una línea trae lo necesario para pintarla:

```js
{ texto: 'num(9)', categoria: 'numero', espacioAntes: true,
  lexema: '9', tipo: 'LIT_ENTERO', columna: 5 }
```

El `mapaIdentificadores` también lo usa el analizador sintáctico, para que el
árbol muestre `id1` e `id2` y no `a` y `b`: así las dos fases se leen juntas.

---

## 5 ter. La tabla de la pestaña 1

La pestaña *Analizador Léxico* muestra los tokens como tabla. La arma
[`TablaLexica.js`](../src/core/lexico/TablaLexica.js) y llega en
`resultado.lexico.tabla`, un renglón por token (sin comentarios ni la marca de
fin):

| Lexema | Token | Descripción |
|---|---|---|
| `a` | identificador | Variable o nombre definido por el usuario (id1) |
| `=` | operador asignación | Asigna un valor a una variable |
| `+` | operador suma | Operación aritmética de suma (también une textos) |
| `24` | número entero | Valor numérico entero (24) |
| `si` | palabra reservada | Estructura de decisión |
| `@` | error léxico | El simbolo '@' no pertenece al alfabeto del lenguaje. |

El nombre del token es más específico que la categoría (`OP_ARITMETICO` puede
ser *operador suma* u *operador multiplicación*) y se decide así:

1. Un token de error lleva el mensaje de su error.
2. Los símbolos y los operadores con palabra (`Y`, `AND`, `O`…) se buscan en la
   tabla `SIMBOLOS`, escrita uno por uno.
3. Lo demás, por su categoría; las palabras reservadas usan la descripción de
   `PalabrasReservadas.js`.

Cada renglón trae también su `categoria`, la misma de la salida `id1 > id2`,
para pintar el token del mismo color en las dos pestañas.

---

## 6. Errores léxicos que se detectan

| Error | Ejemplo | Mensaje |
|---|---|---|
| Símbolo fuera del alfabeto | `entero y = 10 @ 5;` | `El simbolo '@' no pertenece al alfabeto del lenguaje.` |
| Cadena sin cerrar | `cadena n = "hola;` | `Cadena de texto sin cerrar: falta la comilla doble final.` |
| Número decimal incompleto | `decimal x = 4.;` | `El numero '4.' esta incompleto: falta al menos un digito despues del punto.` |
| Carácter mal formado | `caracter c = 'AB';` | `Literal de caracter mal formado...` |
| Comentario de bloque sin cerrar | `/* nunca cierra` | `Comentario de bloque sin cerrar.` |

**Recuperación:** el analizador nunca se detiene en el primer error. Registra el
problema, descarta el carácter o el lexema conflictivo y sigue, de modo que una
sola ejecución reporta todos los errores léxicos del archivo.

---

## 7. Detalles de implementación

### Posiciones de línea y columna

`_avanzar()` es el único punto donde se mueve el cursor, y ahí se actualizan
línea y columna. Así ninguna ruta del código puede desincronizarlas.

```js
_avanzar () {
  const c = this.fuente[this.pos];
  this.pos++;
  if (c === '\n') { this.linea++; this.columna = 1; }
  else { this.columna++; }
  return c;
}
```

### El punto que no siempre es decimal

Antes de tratar un `.` como parte de un número se comprueba que le siga un
dígito. Así `perimetro.circulo(5)` no confunde al analizador: el punto se emite
como delimitador de acceso a miembro.

### Sufijos numéricos pegados a una palabra

En `8000000L` la `L` es un sufijo, pero en `10 forma` la `f` de `forma` no lo es.
El analizador sólo toma el sufijo si el carácter siguiente no continúa una
palabra.

---

## 8. Probar sólo esta fase

```bash
npm run pruebas
```

Las pruebas de esta fase comprueban que reconozca cada categoría de token,
que calcule bien línea y columna, que detecte los errores léxicos y que la
salida `id1 > num(9)` sea la esperada.

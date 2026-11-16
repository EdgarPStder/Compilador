# Pestaña 3 — Analizador semántico

El analizador semántico revisa que el código **tenga sentido**. Las dos fases
anteriores ya dijeron que las palabras existen (léxico) y que cada instrucción
tiene la forma correcta (sintáctico). Esta fase revisa lo que la forma no
puede ver:
- que cada nombre esté declarado;
- que los tipos coincidan;
- que una `Constante` no cambie;
- que un triángulo tenga lados posibles…

Trabaja **sólo con programas de SwordByte**. Como en Java, todo el código va
dentro de una clase:

```swordbyte
clase ejemplo {
    clasePrincipal {
        ...
    }
}
```

Para cada programa muestra:

1. **Los errores semánticos**, si hay, y abajo las **advertencias**. Si no hay
   errores, no aparece ningún recuadro: basta con la insignia *sin errores*
   junto al título.
2. **La gramática del código**: las reglas que producen exactamente ese
   código, como en el pizarrón.

![Analizador semántico](capturas/semantico.png)

Además, mientras se escribe, los errores se **subrayan en rojo** en el cuadro
de código (ver la sección 9).

El código vive en [`src/core/03.semantico/`](../src/core/03.semantico/).

---

## 1. Las tres fases, con el mismo ejemplo

```swordbyte
entero x = "hola";
```

| Fase | Qué revisa | Con el ejemplo |
|---|---|---|
| 1. **Léxica** (pestaña 1) | Que cada palabra exista en el lenguaje | `entero` · `x` · `=` · `"hola"` · `;` — **bien** |
| 2. **Sintáctica** (pestaña 2) | Que las palabras estén en el orden correcto (la forma) | `tipo id = valor ;` es una declaración — **bien** |
| 3. **Semántica** (pestaña 3) | Que lo escrito tenga sentido (el significado) | un texto no cabe en un `entero` — **ERROR** |

Una gramática libre de contexto (la del sintáctico) no puede expresar reglas
como «el nombre se declaró antes» o «los dos lados son del mismo tipo»: para
eso hace falta recordar lo que ya se vio. Esa memoria es la **tabla de
símbolos**.

### La tabla de símbolos y el manejo de errores son de las tres fases

En el esquema clásico de un compilador, la tabla de símbolos y el manejo de
errores no pertenecen a una sola fase: **los usan todas**. Por eso en el
proyecto viven en [`src/core/comun/`](../src/core/comun/):

```
                 ┌────────────────┐
     código ───► │  1. Léxico     │ ──┐
                 ├────────────────┤   │      ┌─────────────────────┐
                 │  2. Sintáctico │ ──┼────► │  TABLA DE SÍMBOLOS  │  comun/TablaSimbolos.js
                 ├────────────────┤   │      │  MANEJO DE ERRORES  │  comun/ErrorCompilacion.js
                 │  3. Semántico  │ ──┘      └─────────────────────┘
                 └────────────────┘
```

| Fase | Qué hace con la tabla de símbolos |
|---|---|
| 1. Léxico | Anota cada identificador la primera vez que lo ve y le da su etiqueta (`edad → id1`). Cuenta cuántas veces aparece. |
| 2. Sintáctico | Usa esas etiquetas para escribir el árbol: `id1 > id2`. |
| 3. Semántico | Completa cada nombre con lo que es (variable, `Constante`, función…), su tipo y el ámbito donde vive, y con eso revisa el sentido. |

El **manejo de errores** es igual para las tres: cada fase reporta sus errores
con el mismo formato (`ErrorCompilacion`: fase, mensaje, línea, columna y
sugerencia), [`Compilador.js`](../src/core/Compilador.js) los junta, y la
interfaz los muestra y los subraya de la misma manera.

---

## 2. Sólo programas, como en Java

En Java no se puede escribir código suelto: falta la clase. En SwordByte
tampoco:

| Se escribe | Pestañas 1 y 2 | Pestaña 3 |
|---|---|---|
| `a = b + c` (expresión suelta, sin `;`) | Se acepta: es para practicar la forma | **Falta la clase** |
| `entero a = 5;` (instrucciones sin clase) | Error sintáctico: **Falta la clase** | Pide corregirlo primero |
| `clasePrincipal { … }` sin `clase` | Error sintáctico: **Falta la clase** | Pide corregirlo primero |
| `clase p { }` sin `clasePrincipal` | Error sintáctico: falta `clasePrincipal` | Pide corregirlo primero |
| `clase p { clasePrincipal { … } }` | Bien | **Se analiza** |

![Falta la clase en la pestaña 3](capturas/semantico-proposiciones.png)

El resultado trae un **estado**:

| Estado | Cuándo | Qué muestra la pestaña |
|---|---|---|
| `vacio` | No hay código | *No hay código que analizar.* |
| `sin-clase` | Es una expresión suelta | Insignia *falta la clase*, el error y cómo se escribe un programa |
| `errores-previos` | Hay errores léxicos o sintácticos (entre ellos, el de las instrucciones sin clase) | Insignia *corrige primero* y esos errores |
| `analizado` | Se revisó | Los errores y las advertencias, si hay, y la gramática |

---

## 3. La tabla de símbolos por dentro

[`TablaSimbolos.js`](../src/core/comun/TablaSimbolos.js) tiene dos partes:

- **Los identificadores** (fase 1): uno por nombre, con su etiqueta `idN`,
  cuántas veces aparece, dónde aparece primero y, después del semántico, sus
  **declaraciones** (categoría, tipo, ámbito y línea).
- **Las declaraciones** (fase 3): la clase, las funciones y una **pila de
  ámbitos**.

Cada bloque `{ }` abre un **ámbito** nuevo y, al cerrarse, sus variables dejan
de existir, igual que en Java. Un nombre se busca del ámbito actual hacia
afuera:

```swordbyte
clasePrincipal {            // ámbito "clasePrincipal"
    entero a = 1;
    si (a > 0) {            // ámbito "clasePrincipal › si": aquí se ve la a
        entero b = 2;
    }
    b = 3;                  // error: 'b' no está declarada (ya no existe aquí)
}
```

Como en Java:
- **Un nombre no se repite dentro de la misma función**, aunque esté en un
  bloque de adentro. Dos ciclos seguidos sí pueden usar el mismo contador.
- **Las funciones se anotan antes** de revisar ningún cuerpo, así que se puede
  llamar a una función declarada más abajo.

---

## 4. La revisión de tipos

Cada expresión calcula su tipo:

| Expresión | Tipo |
|---|---|
| `20` · `20L` | `entero` · `largo` |
| `2.5` · `2.5f` | `decimal` · `flotante` |
| `"hola"` · `'a'` · `verdadero` | `cadena` · `caracter` · `logico` |
| `a + b`, `a * b`… con números | El más grande de los dos, y como mínimo `entero` (igual que Java: `byte + byte` da `entero`) |
| `"Total: " + n` | `cadena` (el `+` con una cadena junta textos) |
| `a > b`, `a == b`, `a Y b`, `NO a` | `logico` |
| `sumar(1, 2)` | El tipo de retorno de la función |
| `area.circulo(r)`, `potencia(a, b)` | `decimal` |
| `longitud(x)`, `redondear(x)`, `aleatorio(a, b)` | `entero` |
| `convertir(x, tipo)` | El tipo pedido |

Los numéricos van del más chico al más grande:
`byte` < `corto` < `entero` < `largo` < `flotante` < `decimal`.
Un valor se puede guardar en un lugar si cumple una de estas condiciones:

1. Es del **mismo tipo**: `entero ← entero`.
2. Es un número y el lugar es un numérico **igual o más grande**:
   `decimal ← entero`. Nunca al revés: un decimal no cabe en un entero.
3. Es un entero **escrito tal cual** que cabe en el rango de `byte`
   (−128 a 127) o `corto` (−32 768 a 32 767): `byte b = 100;`.

---

## 5. Lo que es del lenguaje: Y, O, NO y potencia

Las pestañas 1 y 2 reconocen varias formas de escribir lo mismo. En el
lenguaje, y por eso en la pestaña 3, sólo valen estas:

| Para | Se escribe | No se usa (error en la pestaña 3) |
|---|---|---|
| Y lógico | `Y` | `&&`, `AND` |
| O lógico | `O` | `\|\|`, `OR` |
| Negación | `NO` | `!`, `NOT` |
| Potencia | `potencia(base, exponente)` | `^`, `**` |
| Raíz | `potencia(x, 0.5)`, `potencia(x, 1.0 / 3)`… | `√`, `raiz`, `raizCuadrada`, `raizCubica` |

Una raíz es una potencia con exponente fraccionario, así que **de
`potencia` salen todas las raíces**:

```swordbyte
decimal r2 = potencia(16, 0.5);       // raíz cuadrada de 16 = 4
decimal r3 = potencia(27, 1.0 / 3);   // raíz cúbica de 27 = 3
decimal rn = potencia(x, 1.0 / n);    // raíz n-ésima de x
```

Cada error dice qué se escribe en su lugar: *'&&' no se usa en SwordByte.* →
*El Y lógico se escribe Y:  a > 0 Y b > 0*. Ver el ejemplo
[`06-potencias-y-raices.bs`](../ejemplos/06-potencias-y-raices.bs).

---

## 6. Los errores que revisa

### Nombres

| Código | Mensaje |
|---|---|
| `y = 5;` (sin declarar) | `'y' no está declarada.` |
| `imprimirLn(Edad);` (se declaró `edad`) | `'Edad' no está declarada.` → *¿Quisiste decir 'edad'?* |
| `entero x = 1; entero x = 2;` | `'x' ya está declarada (línea 1).` |
| `entero x; imprimirLn(x);` | `'x' se usa antes de recibir un valor.` |
| `saludar();` sin declararla | `La función 'saludar' no está declarada.` |

### Tipos

| Código | Mensaje |
|---|---|
| `entero x = "hola";` | `Tipos incompatibles: 'x' es entero y el valor es cadena.` |
| `entero a = 2.5;` | `… 'a' es entero y el valor es decimal.` → *usa redondear(...) o convertir(..., entero)* |
| `flotante f = 8.5;` | `… 'f' es flotante y el valor es decimal.` → *el número lleva f al final: 8.5f* |
| `byte b = 200;` | `… 'b' es byte y el valor es entero.` → *byte solo guarda de -128 a 127* |
| `entero n = s * 2;` (`s` cadena) | `* trabaja con números, y 's * 2' es cadena * entero.` |
| `5 > "a"` | `> compara números…` → *Las cadenas solo se comparan con == o !=.* |
| `5 Y verdadero` | `Y une condiciones lógicas (verdadero o falso)…` |
| `n == 5` (`n` cadena) | `No se puede comparar cadena == entero: deben ser del mismo tipo.` |
| `entero x = 3000000000;` | `3000000000 es demasiado grande para un entero.` → *agrega L* |

### Condiciones, `Constante`, `romper` y `retornar`

| Código | Mensaje |
|---|---|
| `si (x) { … }` (`x` entero) | `La condición de si debe ser lógica (verdadero o falso), y 'x' es entero.` |
| `si (x = 5) { … }` | Lo mismo → *Para comparar se usa == (con un solo = se guarda un valor).* |
| `PI = 3;` (`Constante decimal PI`) | `'PI' es Constante: su valor no se puede cambiar.` |
| `romper;` fuera de un ciclo u `opcion` | `romper solo puede ir dentro de un ciclo (para, mientras, hacer) o de un caso de opcion.` |
| `retornar 5;` en `clasePrincipal` | `Fuera de una función, retornar va sin valor.` |

### Funciones

| Código | Mensaje |
|---|---|
| `funcion entero doble(entero n) { entero r = n * 2; }` | `La función 'doble' debe devolver un valor entero con retornar.` |
| `funcion vacio hola() { retornar 5; }` | `La función 'hola' es vacio: su retornar no lleva valor.` |
| `doble(2, 3)` | `'doble' recibe 1 valor(es) y se le dieron 2.` |
| `doble("a")` | `El valor 1 de 'doble' debe ser entero, y '"a"' es cadena.` |
| `entero y = hola();` (`hola` es `vacio`) | `'hola' es vacio: no devuelve ningún valor que se pueda usar aquí.` |
| Dos funciones con el mismo nombre | `Ya existe una función llamada 'f' (línea 2).` |

«Debe devolver un valor» sigue la regla de Java: la función debe **llegar
siempre** a un `retornar`. Un `si … sino` cuenta sólo si todas sus ramas
retornan; un ciclo no cuenta, porque puede no repetirse ni una vez.

### Arreglos y `opcion`

| Código | Mensaje |
|---|---|
| `datos[3] = 1;` (`datos[3]`) | `'datos' tiene 3 posiciones (de 0 a 2): la 3 no existe.` |
| `datos[-1]` · `datos[1.5]` | `Un índice no puede ser negativo…` · `Un índice debe ser entero…` |
| `Arreglo entero d[0];` | `El tamaño de un arreglo debe ser mayor que cero (se escribió 0).` |
| `Arreglo entero d[2] = {1, 2, 3};` | `En 'd' caben 2 valores y se dieron 3.` |
| `m[0]` con `m` matriz | `'m' es matriz entero: lleva 2 índice(s) [ ] y se escribieron 1.` |
| `opcion (d)` con `d` decimal | `opcion no puede evaluar un valor decimal: solo entero, caracter o cadena.` |
| Dos `caso 1:` | `El caso 1 está repetido (ya aparece en la línea 2).` |

### Geometría, funciones nativas y salida

| Código | Mensaje |
|---|---|
| `area.circulo(-5)` | `Una medida de area.circulo debe ser mayor que cero (se dio -5).` |
| `perimetro.triangulo(1, 2, 10)` | `Los lados 1, 2 y 10 no forman un triángulo.` → *Cada lado debe ser menor que la suma de los otros dos.* |
| `volumen.cubo("x")` | `Las medidas de volumen.cubo son números, y '"x"' es cadena.` |
| `entero a = area.circulo(5);` | `Tipos incompatibles…` → *area.circulo devuelve decimal: guárdalo en un decimal o usa redondear(...).* |
| `potencia(-4, 0.5)` | `No existe la raíz de un número negativo: potencia(-4, 0.5).` |
| `logaritmo(0)` | `El logaritmo solo existe para números mayores que cero (se dio 0).` |
| `aleatorio(6, 1)` | `En aleatorio(6, 1) el mínimo es mayor que el máximo.` |
| `longitud(5)` | `longitud mide una cadena o un arreglo, y '5' es entero.` |
| `convertir("hola", entero)` | `"hola" no es un número entero: no se puede convertir a entero.` |
| `convertir(verdadero, entero)` | `No se puede convertir logico a entero.` |
| `imprimirF("%d %.2f", 5, 8)` | `%.2f pide un valor decimal y '8' es entero.` |
| `imprimirF("%d", 5, 6)` | `El formato pide 1 valor(es) y se dieron 2.` |
| `imprimirLn("a", "b")` | `imprimirLn recibe un solo valor…` → *Para juntar textos usa +* |
| `esperar(-5)` | `esperar no puede recibir un tiempo negativo.` |

![Errores semánticos](capturas/semantico-errores.png)

---

## 7. Las advertencias

Las advertencias **no son errores**: el código se puede ejecutar, pero algo
parece un descuido. Van en un recuadro ámbar aparte.

| Advertencia | Ejemplo |
|---|---|
| Variables que nunca se usan (todas juntas en un solo aviso) | `Se declararon y su valor nunca se usa: a (línea 1), p (línea 2).` |
| Una función que nunca se llama | `La función 'areaAnillo' nunca se llama.` |
| Código que nunca se ejecuta | `Esta instrucción nunca se ejecuta: está después de romper.` |
| División entre cero fuera de `intentar` | `'10 / 0' divide entre cero.` |

Dentro de `intentar { } capturar (Error e) { }` dividir entre cero se hace a
propósito, así que ahí no se avisa (el programa de referencia lo hace).

---

## 8. Decisiones de diseño

Las reglas siguen a Java, porque SwordByte se traduce a Java. Donde se separan,
fue a propósito:

1. **Un `caracter` no es un número.** Java permite `'a' + 1`; aquí es error y
   se sugiere `convertir(c, entero)`. Es más claro para un lenguaje de
   geometría.
2. **No hay funciones con el mismo nombre** (Java permite sobrecarga).
3. **«Se usa antes de recibir un valor» se revisa en el orden del código.**
   Java además sigue los caminos (`si` sin `sino`); aquí basta con que el valor
   se haya dado antes en el texto. Nunca marca un error que Java no marcaría.
4. **Un nombre sin declarar se reporta una sola vez**, aunque se use varias
   veces, para no llenar la lista.
5. **Las reglas de geometría y matemáticas** (medidas positivas, triángulos,
   raíz de un negativo, logaritmo de cero) Java no las revisa (da `NaN`), pero
   SwordByte sí, porque está especializado en geometría. Sólo se revisan
   cuando el número está **escrito tal cual**; con una variable, el valor se
   conoce hasta ejecutar.
6. **La gramática se genera aunque haya errores semánticos**: describe la
   forma del código, y la forma ya es correcta. Sólo los errores léxicos o
   sintácticos la impiden.

---

## 9. Los errores subrayados mientras se escribe

En los tres cuadros de código, cuando se deja de escribir medio segundo, el
código se revisa y cada error queda **subrayado en rojo**, con el número de su
renglón también en rojo. Al pasar el mouse sobre ese renglón se ve el mensaje.

![Subrayado rojo](capturas/subrayado.png)

Cada pestaña marca los errores de su fase y los de las anteriores
(`erroresDe()` en [`Compilador.js`](../src/core/Compilador.js)):

| Pestaña | Marca |
|---|---|
| 1 · Léxico | Los errores léxicos |
| 2 · Léxico-Sintáctico | Los léxicos y los sintácticos (por ejemplo, *Falta la clase*) |
| 3 · Semántico | Los de las tres fases |

Qué token se subraya lo decide `tokenDelError()` en
[`ResaltadoCodigo.js`](../src/core/01.lexico/ResaltadoCodigo.js): el token
donde cae el error o, si el error está después del último token del renglón
(como un `;` que falta), ese último token.

---

## 10. La gramática del código

Para el ejemplo del pizarrón dentro de su clase,
`clase p { clasePrincipal { a1 = b5 / 20; } }`, el analizador genera:

```
prop      → clase id { principal }
principal → clasePrincipal { inst }
inst      → id = exp ;
exp       → id | num | exp / exp
id        → let ( dig )*
num       → dig ( dig )*
dig       → 0-9
let       → a-z
```

(Como `a1` y `b5` no están declaradas, también salen dos errores, pero la
gramática sale igual.)

### Paso 1 — Cada nodo del árbol aporta una producción

| En el código | Nodo del árbol | Producción que aporta |
|---|---|---|
| `clase p { … }` | programa | `prop → clase id { principal }` |
| `clasePrincipal { … }` | bloque principal | `principal → clasePrincipal { inst }` |
| `b5 / 20` | división | `exp → exp / exp` |
| `b5` | variable | `exp → id` |
| `20` | número | `exp → num` |
| `(a + b)` | expresión entre paréntesis | `exp → ( exp )` |
| `entero a = 5;` | declaración | `inst → tipo id = exp ;` |
| `si (a > b) { romper; }` | si | `inst → si ( exp ) { inst }` |
| `caso 1: romper;` | caso de opcion | `rama → caso exp : inst` |
| `area.circulo(r)` | geometría | `exp → area . circulo ( exp )` |

Sólo salen las alternativas que **aparecen en el código**: si no hay
multiplicaciones, no sale `exp → exp * exp`.

### Paso 2 — Las listas

| Elementos | Se escribe | Ejemplo |
|---|---|---|
| 1 | `X` | `{ inst }` |
| 2 | `X X` o `X , X` | `( exp , exp )` |
| 3 o más, iguales | `X ( , X )*` | `{ inst ( inst )* }` |
| 3 o más, distintos | Uno tras otro | `id = exp , id` |

### Paso 3 — Las palabras y los caracteres

| Regla | Cuándo sale | Cómo se escribe |
|---|---|---|
| `tipo` | Hay declaraciones | `tipo → entero \| cadena` (los usados) |
| `id` | Hay nombres | `id → inicio ( resto )*`, sólo con las clases usadas |
| `num` | Hay enteros | `num → dig` si todos son de un dígito; si no, `num → dig ( dig )*` |
| `dec` | Hay decimales | `dec → dig ( dig )* . dig ( dig )*` |
| `cadena` · `TEXTO` | Hay textos | `cadena → " TEXTO "` · `TEXTO → ( LET \| let \| dig \| simb )*` |
| `car` | Hay caracteres | `car → ' LET '` |
| `logico` | Hay `verdadero` / `falso` | `logico → verdadero` |
| `dig` · `LET` · `let` | Se usaron dígitos o letras | `dig → 0-9` · `LET → A-Z` · `let → a-z` |
| `simb` | Un texto lleva símbolos | `simb → ␣ \| !` (`␣` es el espacio) |

| Nombres en el código (con la clase `p`) | Regla `id` generada |
|---|---|
| `p`, `a1`, `b5` | `id → let ( dig )*` |
| `p`, `miVariable2` | `id → let ( let \| LET \| dig )*` |
| `_p`, `_x` | `id → _ ( let )*` |

La `ñ` y las letras con acento cuentan como letras: `año` da `let → a-z | ñ`.

---

## 11. Lo que devuelve

`compilar(fuente).semantico` trae:

```js
{
  estado: 'analizado',     // 'vacio' | 'sin-clase' | 'errores-previos' | 'analizado'
  vacio: false,
  correcto: true,          // true si no hay errores semánticos
  modo: 'programa',
  errores: [],             // semánticos (o los léxicos/sintácticos en 'errores-previos')
  advertencias: [],
  totalAlternativas: 12,
  reglas: [
    { regla: 'exp', descripcion: 'Una expresión', alternativas: [
        { texto: 'id', ejemplo: 'radio', simbolos: [{ texto: 'id', clase: 'no-terminal' }] },
        // ...
    ] },
    // ...
  ]
}
```

La tabla de símbolos queda en `compilar(fuente).lexico.identificadores`: uno
por nombre, con su etiqueta, sus apariciones y sus declaraciones.

```js
{ etiqueta: 'id2', nombre: 'edad', veces: 2, linea: 3, columna: 12,
  declaraciones: [{ categoria: 'variable', tipo: 'entero', ambito: 'clasePrincipal', linea: 3 }] }
```

Los errores semánticos **no** se suman a `resultado.errores` (que son los
léxicos y sintácticos): así la pestaña 2 sigue diciendo *correcto* cuando el
código está bien escrito.

---

## 12. Las piezas

| Archivo | Qué hace |
|---|---|
| [`AnalizadorSemantico.js`](../src/core/03.semantico/AnalizadorSemantico.js) | Punto de entrada: decide el estado, llama al verificador y al generador, y arma el resultado |
| [`VerificadorSemantico.js`](../src/core/03.semantico/VerificadorSemantico.js) | Recorre el árbol: declara en la tabla, busca cada uso, calcula tipos (`tipoDe`), revisa que quepan (`cabe`), marca lo que no es del lenguaje (`NO_SON_DEL_LENGUAJE`) y reporta errores y advertencias |
| [`GeneradorGramatica.js`](../src/core/03.semantico/GeneradorGramatica.js) | Escribe la gramática del programa |
| [`TextoDeNodo.js`](../src/core/03.semantico/TextoDeNodo.js) | Vuelve a escribir un nodo como código, para los mensajes y el *En el código: …* |
| [`comun/TablaSimbolos.js`](../src/core/comun/TablaSimbolos.js) | La tabla de símbolos que comparten las tres fases |
| [`comun/ErrorCompilacion.js`](../src/core/comun/ErrorCompilacion.js) | El formato de los errores de las tres fases |

Para agregar una regla nueva, ver [07-mantenimiento.md](07-mantenimiento.md).

---

## 13. Probar sólo esta parte

```js
const { compilar } = require('./src/core/Compilador');

const s = compilar('clase p {\n clasePrincipal {\n  entero x = "hola";\n  imprimirLn(y);\n }\n}').semantico;
s.errores.forEach((e) => console.log(e.texto));
// [Semántica] Línea 3, Columna 10: Tipos incompatibles: 'x' es entero y el valor es cadena. — …
// [Semántica] Línea 4, Columna 14: 'y' no está declarada. — …
```

`npm run pruebas` corre tres grupos:
- *Analizador semántico: que el código tenga sentido*: cada regla de este
  documento, la falta de clase, Y/O/NO y `potencia`, los ejemplos sin errores,
  la tabla de símbolos compartida y las advertencias.
- *Analizador semántico: la gramática del código*.
- *Errores subrayados mientras se escribe*.

---

## Fuentes consultadas

Qué hace la fase semántica (tabla de símbolos, ámbitos y revisión de tipos), y
el esquema de un compilador con la tabla de símbolos y el manejo de errores
compartidos por todas las fases:

- Universidad de Guanajuato, *Clase digital 12. Análisis semántico y
  estrategias de implementación* —
  <https://blogs.ugto.mx/rea/clase-digital-12-analisis-semantico-y-estrategias-de-implementacion/>
- F. Ortín, *Tablas de símbolos* (Universidad de Oviedo) —
  <https://reflection.uniovi.es/ortin/publications/TablasDeSimbolos.pdf>
- Cornell CS 4120, *Semantic analysis* —
  <https://www.cs.cornell.edu/courses/cs4120/2022sp/notes/semantic/>
- Purdue, *Type checking* —
  <https://www.cs.purdue.edu/homes/xyzhang/spring09/notes/typecheck.pdf>
- Princeton COS 320, clase 12 —
  <https://www.cs.princeton.edu/courses/archive/spring19/cos320/lectures/lecture12.pdf>
- UC Davis ECS 142, *Project part 3: semantic analysis* —
  <https://www.cs.ucdavis.edu/~pandey/Teaching/ECS142/Project/Part3/proj_part3.pdf>
- JMU CS 432, *P3: semantic analysis* —
  <https://w3.cs.jmu.edu/lam2mo/cs432_2026_08/p3-analysis.html>
- arXiv 2207.08972 —
  <https://arxiv.org/pdf/2207.08972>

Los colores de Java en los cuadros de código (tema *Light+* de VS Code y la
gramática de Java que usa para reconocer cada palabra):

- <https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/light_plus.json>
- <https://raw.githubusercontent.com/microsoft/vscode/main/extensions/theme-defaults/themes/light_vs.json>
- <https://raw.githubusercontent.com/microsoft/vscode/main/extensions/java/syntaxes/java.tmLanguage.json>

# Pestaña 6 — Generador de código objeto (Java)

La fase 6 es la última del compilador: toma el código intermedio **ya
optimizado** (fase 5) y escribe el programa en el **lenguaje destino**, que
para SwordByte es **Java**. El resultado es un archivo `.java` listo para
compilarse con `javac` y ejecutarse con `java`.

![Código objeto](capturas/objeto.png)

El código vive en [`src/core/06.objeto/`](../src/core/06.objeto/).

---

## 1. Dónde va en el compilador

```
  Código ─► 1. Léxico ─► 2. Sintáctico ─► 3. Semántico ─► 4. Intermedio ─► 5. Optimización ─► 6. CÓDIGO OBJETO (Java)
```

En un compilador «de verdad» el código objeto es lenguaje de máquina o
ensamblador. Aquí el destino es otro lenguaje de alto nivel, como hacen los
compiladores *fuente a fuente* (TypeScript → JavaScript, Kotlin → Java): lo
que llega es código de tres direcciones y lo que sale es Java.

Un ejemplo completo:

```
SwordByte                          Fase 5 (tres direcciones)       Fase 6 (Java)
---------------------------        -------------------------       -------------------------------------
entero n;                          leer n                          int n = entrada.nextInt();
leer(n);                           suma = 0                        int suma = 0;
entero suma = 0;                   i = 1                           for (int i = 1; i <= n; i++) {
para (entero i = 1; i <= n; i++) { L1:                                 suma = suma + i;
    suma = suma + i;                 t1 = i <= n                   }
}                                    ifFalse t1 goto L2            if (suma > 10) {
si (suma > 10) {                     suma = suma + i                   System.out.println("Grande: " + suma);
    imprimirLn("Grande: " + suma);   i = i + 1                     } else {
} sino {                             goto L1                           System.out.println("Chico");
    imprimirLn("Chico");           L2:                             }
}                                    t3 = suma > 10
                                     ifFalse t3 goto L3
                                     t4 = "Grande: " + suma
                                     param t4
                                     call imprimirLn, 1
                                     goto L4
                                   L3:
                                     param "Chico"
                                     call imprimirLn, 1
                                   L4:
```

---

## 2. El problema: Java no tiene `goto`

El código de tres direcciones decide y repite con **saltos** (`goto L1`,
`ifFalse t1 goto L2`), y Java no los tiene: sólo tiene `if`, `while`,
`do-while`, `for`, `switch`, `break` y `continue`. Así que no basta con
cambiar cada instrucción por una de Java: hay que **volver a encontrar las
estructuras** que la fase 4 deshizo en saltos. Es el trabajo de un
*descompilador*, y se hace con las herramientas clásicas del análisis de
flujo (Aho et al., cap. 9.6):

1. **Bloques básicos y grafo de flujo.** El código se parte en bloques
   (empiezan en una etiqueta, terminan en un salto) y se ve a dónde puede ir
   cada uno.
2. **Dominadores.** El bloque A *domina* a B si para llegar a B siempre se
   pasa por A. Se calculan con el algoritmo de Cooper, Harvey y Kennedy.
3. **Ciclos.** Un salto hacia atrás, a un bloque que domina al que salta, es
   la vuelta de un ciclo; el bloque al que regresa es su **cabecera**.
4. **Estructurar** (Ramsey, *Beyond Relooper*, 2022): se recorre el árbol de
   dominadores de arriba hacia abajo:
   - una cabecera de ciclo se vuelve `while (true) { ... }`;
   - un bloque al que llegan dos caminos se pone **después**, y los caminos
     llegan a él con `break`;
   - un salto hacia atrás es `continue`;
   - un bloque con un solo camino de llegada se escribe ahí mismo.

Como el código de SwordByte viene de un programa estructurado, este método
**siempre** encuentra una forma en Java. Pero sale tosco:

```java
L5: while (true) {                          while (i <= 3) {
    if (!(i <= 3)) {                            System.out.println(i);
        break L5;                               i++;
    } else {                     ──►        }
        System.out.println(i);
        i = i + 1;
        continue L5;
    }
}
```

Por eso hay un paso de **limpieza** (sección 3, paso 3).

---

## 3. Los pasos

| Paso | Archivo | Qué hace |
|---|---|---|
| 1 | [`Sentencias.js`](../src/core/06.objeto/Sentencias.js) | **Baja** el código de tres direcciones a sentencias con expresiones (`param` + `call` se juntan en una llamada) y calcula el **tipo de cada temporal** (el código intermedio no lo dice, pero sale de su operación: `t1 = a > b` es lógico). |
| 2 | [`Estructurador.js`](../src/core/06.objeto/Estructurador.js) | Junta las instrucciones en **expresiones** (`t1 = c * d` · `t2 = b + t1` → `b + c * d`), reconoce los `Y` / `O` con corto circuito, los `x++`, las `opcion`, y cambia saltos y etiquetas por `while`, `if`, `switch` y `try` (sección 2). |
| 3 | [`Limpieza.js`](../src/core/06.objeto/Limpieza.js) | Lo deja como lo escribiría una persona: quita saltos que llevan a donde de todos modos se iba a llegar, código después de un salto y bloques con etiqueta que nadie usa; `while (true) { if (!c) break; ... }` → `while (c)`, `... if (!c) break; }` → `do { } while (c)`, `i = 0; while (i < n) { ... i++; }` → `for`, `if / else if`… Se repite hasta que nada cambia. |
| 4 | [`GeneradorJava.js`](../src/core/06.objeto/GeneradorJava.js) | **Declara cada variable** donde se le da valor por primera vez (`int suma = 0;`, `for (int i = 1; ...)`), lo más adentro que se pueda; junta un arreglo con sus valores (`int[] d = {4, 5, 6};`); cambia los nombres que chocan con Java; arma la clase, el `Scanner` y las funciones de apoyo. |
| 5 | [`EscritorJava.js`](../src/core/06.objeto/EscritorJava.js) | Escribe el texto de Java, con los **paréntesis exactos** que pide la precedencia de Java (`(a + b) * c`, `"Total: " + (x + y)`). |

Y tres piezas de apoyo:

| Archivo | Qué hace |
|---|---|
| [`Expresiones.js`](../src/core/06.objeto/Expresiones.js) | Las expresiones (valores, operaciones, llamadas…), su tipo y sus **efectos**: qué leen y qué cambian. Con eso se sabe si una instrucción se puede mover dentro de otra sin cambiar lo que hace el programa. |
| [`TiposJava.js`](../src/core/06.objeto/TiposJava.js) | Los tipos de SwordByte en Java, los valores iniciales y los valores fijos (`verdadero` → `true`). |
| [`ConstantesJava.js`](../src/core/06.objeto/ConstantesJava.js) | Calcula las condiciones que Java considera *constantes*: `while (2 == 2)` es para Java un ciclo infinito, y lo que va después sería *unreachable statement*. |
| [`ResaltadoJava.js`](../src/core/06.objeto/ResaltadoJava.js) | Los colores del Java en la pestaña y en el reporte. |

### Juntar instrucciones en expresiones: con cuidado

Un temporal que se usa **una sola vez** se mete en donde se usa. Pero sólo si
eso no cambia el orden de lo que el programa hace:

```
t1 = x            t1 = x            NO se junta en  y = x + x
x = x + 1         x = x + 1         (x ya cambió); se reconoce como
y = t1 + x        y = t1 + x        y = x++ + x;
```

Tampoco se pasa una lectura (`leer`), una llamada que imprime o algo que puede
fallar (`a / b`, `d[k]`) por encima de otra cosa que haga algo.

---

## 4. Cómo se traduce cada cosa

### Tipos

| SwordByte | Java |
|---|---|
| `logico` | `boolean` |
| `byte` · `corto` · `entero` · `largo` | `byte` · `short` · `int` · `long` |
| `flotante` · `decimal` | `float` · `double` |
| `caracter` · `cadena` | `char` · `String` |
| `Arreglo entero d[]` | `int[] d` |
| `matriz entero m[2][3]` | `int[] m = new int[6];   // matriz de 3 columnas: m[i][j] es m[i * 3 + j]` |
| `capturar (Error e)` | `catch (Exception e)` |

La matriz queda como en el código intermedio: renglón por renglón en un solo
arreglo.

### Instrucciones

| SwordByte | Java |
|---|---|
| `si … sinoSi … sino` | `if … else if … else` |
| `mientras` · `hacer … mientras` · `para` | `while` · `do … while` · `for` |
| `opcion` / `caso` / `porDefecto` / `romper` | `switch` / `case` / `default` / `break` (sin `romper`, sigue con el siguiente caso, igual que en Java) |
| `intentar` / `capturar` | `try` / `catch` |
| `funcion entero f(entero n)` | `static int f(int n)` |
| `clasePrincipal` | `public static void main(String[] args)` |
| `retornar x;` | `return x;` |
| `Y` · `O` · `NO` | `&&` · `\|\|` · `!` |
| `a == b` entre cadenas | `a.equals(b)` |

### Entrada y salida

| SwordByte | Java |
|---|---|
| `imprimirLn(x)` · `imprimir(x)` · `imprimirF(f, x)` | `System.out.println(x)` · `System.out.print(x)` · `System.out.printf(f, x)` |
| `leer(x)` | `x = entrada.nextInt();` (`nextDouble()`, `next()`, `nextLong()`… según el tipo de `x`) |
| `equipo(Null)` | un `System.out.println` por integrante |
| `limpiar()` | `System.out.print("\033[H\033[2J"); System.out.flush();` |

`entrada` es un `Scanner` que se declara en la clase sólo si el programa usa
`leer`.

### Funciones nativas

| SwordByte | Java |
|---|---|
| `potencia(a, b)` | `Math.pow(a, b)` |
| `redondear(x)` | `(int) Math.round(x)` |
| `logaritmo(x)` · `logaritmo10(x)` | `Math.log(x)` · `Math.log10(x)` |
| `seno(x)` · `coseno(x)` | `Math.sin(x)` · `Math.cos(x)` |
| `longitud(texto)` · `longitud(arreglo)` | `texto.length()` · `arreglo.length` |
| `convertir(t, entero)` | `Integer.parseInt(t.trim())` |
| `convertir(t, decimal)` | `Double.parseDouble(t)` |
| `convertir(x, cadena)` | `String.valueOf(x)` |
| `convertir(x, entero)` (de un `decimal`) | `(int) x` |
| `convertir(x, byte)` | `(byte) x` |

### Funciones de apoyo

Lo que SwordByte tiene y Java no trae tal cual se escribe como un método
`static` al final de la clase, **sólo si el programa lo usa**:

| SwordByte | Función de apoyo |
|---|---|
| `aleatorio(min, max)` | `static int aleatorio(long minimo, long maximo)` con `Math.random()` |
| `esperar(ms)` | `static void esperar(long milisegundos)` con `Thread.sleep` |
| `logaritmo(base, x)` | `static double logaritmo(double base, double numero)` |
| `area.circulo(r)`, `volumen.cubo(l)`… | `static class area { static double circulo(double radio) { ... } }` (una clase por grupo, con sólo las figuras que se usan) |

### Nombres

Un nombre que en Java es palabra reservada o que taparía algo de Java
(`new`, `class`, `int`, `System`, `Math`, `String`…) lleva `_` al final:
`entero new;` → `int new_;`. Si la fase 4 tuvo que renombrar una variable
porque otra con el mismo nombre tenía otro tipo (`x` y `x_2`, ver
[09](09-codigo-intermedio.md)), el Java usa esos nombres.

---

## 5. Lo que el Java hace igual que SwordByte

La regla es la misma que en la fase 5: **el programa Java imprime exactamente
lo mismo** que el código de tres direcciones. Algunas cosas que hay que
cuidar para eso:

- **El orden de las operaciones**: los paréntesis se ponen donde Java los
  necesita, también en `"a" + (b + c)` (sin ellos, Java juntaría textos).
- **La división entera** y el rango de `int` ya son los de Java.
- **Las comparaciones de textos** usan `equals`, no `==`.
- **Las reglas de Java sobre el código**: cada variable tiene valor antes de
  usarse (*definite assignment*) y no queda código después de un ciclo
  infinito (*unreachable statement*): por eso las declaraciones se colocan con
  cuidado y se calculan las condiciones constantes.
- **`byte` y `short`**: en Java `b + k` ya es `int`, así que
  `convertir(b + k, byte)` se escribe `(byte) (b + k)`, y `b++` se queda como
  `b++` (que sí funciona con un `byte`).

---

## 6. Qué se ve en la pestaña

Sigue el estilo de las pestañas 3, 4 y 5: los logos en columna a la
izquierda, el título *Generador de Código Objeto “SwordByte”*, el cuadro
**Programa para traducir a Java** y, a la derecha, **Limpieza**, **Genera**,
**Guardar .java**, **Equipo** y **Termina**.

Arriba del resultado va un resumen: el nombre del archivo, cuántos renglones y
métodos tiene, de cuántas instrucciones del código optimizado sale, y las
funciones de apoyo que lleva. Dos vistas:

- **Java**: el programa con sus números de renglón y los colores de Java
  (los mismos de VS Code). Al pasar el mouse sobre un renglón se ve de qué
  línea del programa SwordByte sale.
- **Junto al optimizado**: a la izquierda el código de tres direcciones de la
  pestaña 5 y a la derecha el Java, para comparar.

  ![Junto al optimizado](capturas/objeto-lado.png)

**Guardar .java** (o **Archivo → Guardar código Java**, `Ctrl+J`) guarda el
programa con el nombre de su clase: Java exige que `public class figuras`
viva en `figuras.java`. Luego, en una terminal:

```bash
javac -encoding UTF-8 figuras.java
java figuras
```

Los reportes que se guardan traen el Java en su sección 7.

---

## 7. Lo que devuelve

`compilar(fuente).objeto` trae:

```js
{
  estado: 'generado',       // 'vacio' | 'errores-previos' | 'generado' | 'error'
  errores: [],
  clase: 'figuras',
  archivo: 'figuras.java',
  codigo: 'import java.util.Scanner;\n\n/**\n * figuras.java ...',
  lineas: [                 // el mismo código, renglón por renglón
    { texto: '        for (int i = 1; i <= n; i++) {', linea: 6,   // la línea del programa SwordByte
      html: '        <span class="j-control">for</span> (...' },  // con colores
    // ...
  ],
  metodos: 1,
  apoyo: [],                // las funciones de apoyo: 'aleatorio', 'esperar', 'logaritmo'
  instrucciones: 38         // cuántas instrucciones del código optimizado se tradujeron
}
```

`estado: 'error'` querría decir que el compilador falló al escribir el Java
(un error del compilador, no del programa); trae el mensaje en `errores`.

---

## 8. Probar sólo esta parte

```js
const { compilar } = require('./src/core/Compilador');

const o = compilar('clase p { clasePrincipal { para (entero i = 1; i <= 3; i++) { imprimirLn(i); } } }').objeto;
console.log(o.codigo);
```

`npm run pruebas` corre el grupo *Código objeto: Java (fase 6)*: cada
estructura (`for`, `while`, `do-while`, `switch`, `try`, `&&`, `x++`…), los
arreglos y las matrices, los textos, el `Scanner`, los métodos, las funciones
de apoyo, los nombres reservados y los colores. Si la computadora tiene
**`javac`**, además traduce los ejemplos y **60 programas al azar** (20 de
ellos también sin optimizar), los compila con `javac`, los ejecuta y revisa
que impriman exactamente lo mismo que el código de tres direcciones. Si no hay
`javac`, esa prueba se omite.

---

## 9. Limitaciones

| Limitación | Por qué |
|---|---|
| El Java no conserva los nombres de todos los temporales ni los comentarios del programa | Sale del código optimizado: lo que la fase 5 calculó o quitó ya no está. Cada renglón sí dice de qué línea del programa sale |
| La matriz es un arreglo de una dimensión | Así la dejó la fase 4 (`m[i * columnas + j]`); el comentario de la declaración lo explica |
| Puede aparecer un temporal (`int t3 = i * 3 + 2;`) | Cuando un valor se usa dos veces, la fase 5 lo calcula una sola vez (subexpresiones comunes) |
| `limpiar()` sólo borra la pantalla en terminales que entienden códigos ANSI | Java no tiene una forma estándar de borrar la consola |

---

## Fuentes

- A. Aho, M. Lam, R. Sethi y J. Ullman, *Compiladores: principios, técnicas y
  herramientas*, 2.ª ed., capítulo 8, «Generación de código», y capítulo 9.6,
  «Ciclos en los grafos de flujo» (dominadores y ciclos naturales).
- K. Cooper, T. Harvey y K. Kennedy, «A Simple, Fast Dominance Algorithm»,
  *Software Practice and Experience*, 2001.
- N. Ramsey, «Beyond Relooper: Recursive Translation of Unstructured Control
  Flow to Structured Control Flow», *ICFP*, 2022.
- *The Java Language Specification*, Java SE 21: capítulo 14.22,
  «Unreachable Statements», y capítulo 16, «Definite Assignment».

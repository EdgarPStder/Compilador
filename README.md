# Compilador SwordByte

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-47848F?style=flat-square&logo=electron&logoColor=white)
![Windows](https://img.shields.io/badge/Windows-portable%20%2B%20instalador-0078D6?style=flat-square&logo=windows&logoColor=white)
![Pruebas](https://img.shields.io/badge/pruebas-201%20pasando-2EA44F?style=flat-square)
![Licencia](https://img.shields.io/badge/licencia-MIT-blue?style=flat-square)

Compilador del lenguaje de programación **SwordByte**, un lenguaje propio con
sintaxis en español que traduce a Java.

La aplicación de escritorio tiene **seis pestañas**, una por fase del
compilador, que trabajan sobre el mismo código:

| Pestaña | Qué muestra |
|---|---|
| **1 · Analizador Léxico** | La tabla de tokens: lexema, token y descripción |
| **2 · Analizador Léxico-Sintáctico** | El código reescrito con los identificadores numerados (`id1 > id2`) y el árbol sintáctico dibujado |
| **3 · Analizador Semántico** | Que el programa tenga sentido: sus errores semánticos (nombres sin declarar, tipos que no coinciden…) y la gramática del código |
| **4 · Código Intermedio** | El programa traducido a código de tres direcciones (`t1 = c * d`, `ifFalse t1 goto L1`…) y su tabla de cuádruplos |
| **5 · Optimización** | El código intermedio ya optimizado (plegado y propagación de constantes, código muerto, saltos…) y cada cambio que se le hizo |
| **6 · Código Objeto** | El programa traducido a **Java**, listo para `javac`, junto al código optimizado del que sale |

![Compilador SwordByte](docs/capturas/lexico.png)

---

## Qué hace

| | |
|---|---|
| **Lenguaje** | SwordByte, archivos `.bs` |
| **Destino** | Java |
| **Fases** | 1. Léxico · 2. Léxico-sintáctico · 3. Semántico · 4. Código intermedio · 5. Optimización · 6. Código objeto (Java) |
| **Implementado en** | JavaScript (Node.js + Electron) |
| **Entregable** | `.exe` portable e instalador para Windows |

---

## El ejemplo de siempre

| | |
|---|---|
| **Código fuente** | `a > b` |
| **Análisis léxico** | `id1 > id2` |
| **Análisis sintáctico** | ver el árbol |

```
          >
        /   \
     id1     id2
```

En el análisis léxico cada identificador recibe una etiqueta `id1`, `id2`,
`id3`… en el orden en que aparece, y cada número se muestra como `num(valor)`:

| Código fuente | Análisis léxico |
|---|---|
| `a > b` | `id1 > id2` |
| `a + a + b` | `id1 + id1 + id2` |
| `entero edad = 20;` | `entero id1 = num(20);` |

Los operadores se colorean por categoría: **lógicos en azul**, **relacionales
en rojo** y **aritméticos en negro**, los mismos colores que usan los nodos del
árbol.

---

## La jerarquía de operadores

El árbol se dibuja de verdad, con la raíz arriba y las ramas colgando, así que
su forma **es** la jerarquía:

| Grupo | Operadores | Dónde queda |
|---|---|---|
| 1. **Booleanos** | `Y AND &&` · `O OR \|\|` · `NO NOT !` | hasta arriba |
| 2. **Relacionales** | `==` `!=` `<` `<=` `>` `>=` | en medio |
| 3. **Aritméticos** | `=` · `+` `-` · `*` `/` `%` · `-` `+` `√` unarios · `^` `**` · `id` `num` | hasta abajo |

Los **paréntesis** reinician la jerarquía: dentro de `( )` puede ir cualquier
expresión, así que sirven para forzar otro orden. `a > b AND c` pone el `AND`
arriba, pero `a > (b AND c)` pone el `>` arriba.

Para `a = b + c > 9 AND d > e OR f <= 30`:

```
                    OR                     <-- 1. BOOLEANOS
                 /      \
              AND        <=                <-- 2. RELACIONALES
            /     \     /    \
           >       >  id6  num(30)
         /   \   /   \
        =  num(9) id4 id5                  <-- 3. ARITMETICOS
      /   \
    id1    +
         /   \
       id2   id3
```

No hace falta punto y coma: una expresión suelta se analiza tal cual.

![Ejemplo con la jerarquía](docs/capturas/expresion.png)

Un clic en cualquier nodo deja en pantalla sólo esa rama, ya agrandada, con el
camino para regresar:

![Una rama abierta](docs/capturas/rama.png)

Cada operador lógico admite sus tres formas:

| Operación | Formas válidas |
|---|---|
| Y lógico | `Y` · `AND` · `&&` |
| O lógico | `O` · `OR` · <code>&#124;&#124;</code> |
| Negación | `NO` · `NOT` · `!` |

La potencia y la raíz quedan **por debajo** de `*` `/` `%`, así que se resuelven
primero: `2 * 3 ^ 2` es `2 * (3 ^ 2) = 18`. También admiten varias formas:

| Operación | Formas válidas |
|---|---|
| Potencia | `2 ^ 10` · `2 ** 10` · `potencia(2, 10)` |
| Raíz cuadrada | `√16` · `raiz(16)` · `raizCuadrada(16)` |
| Raíz n-ésima | `raiz(27, 3)` |
| Raíz cúbica | `raizCubica(27)` |


---

## Inicio rápido

### Usar el ejecutable

El ejecutable para Windows se genera con `npm run dist` (ver
[Generar el ejecutable](#generar-el-ejecutable)) y queda en
`dist/CompiladorSwordByte-1.0.0-portable.exe`. Se abre con doble clic y no
requiere instalación.

### Ejecutar desde el código

```bash
npm install
npm start
```

### Correr las pruebas

```bash
npm run pruebas       # 201 pruebas del compilador
npm run pruebas:ui    # 160 comprobaciones sobre la aplicación
```

Si la computadora tiene `javac` (JDK 11 o más nuevo), `npm run pruebas`
también compila y ejecuta el Java que genera la fase 6; si no, esa prueba se
omite.

### Generar el ejecutable

```bash
npm run dist
```

---

## La ventana

Hasta arriba van **las seis pestañas**. Se cambia con un clic, con `Ctrl+1` a
`Ctrl+6` o con `Ctrl+Tab`.

**Cada pestaña conserva su propio diseño**, con sus logos y sus botones donde
los pide ese diseño. Lo que comparten es el estilo (los colores, los botones y
las cajas del analizador léxico-sintáctico):

| Pestaña | Logos | Botones |
|---|---|---|
| **1 · Léxico** | UAT a la izquierda y UAMM a la derecha; en medio, la carrera, el analizador, el grupo y el equipo | A la derecha: Realizar Análisis · Guardar · Borrar · **Fuga** |
| **2 · Léxico-Sintáctico** | Los tres arriba (UAT, UAMM, ISC) | A la izquierda: Limpiar · Análisis Léxico · Análisis Sintáctico · Análisis Léxico-Sintáctico · Equipo · Salir |
| **3 · Semántico** | Los tres en columna, a la izquierda | A la derecha: Limpieza · Analiza · Equipo · Termina |
| **4 · Código Intermedio** | Como la 3: los tres en columna, a la izquierda | A la derecha: Limpieza · Genera · Equipo · Termina |
| **5 · Optimización** | Como la 3 | A la derecha: Limpieza · Optimiza · Equipo · Termina |
| **6 · Código Objeto** | Como la 3 | A la derecha: Limpieza · Genera · Guardar .java · Equipo · Termina |

**Fuga**, **Salir** y **Termina** abren la misma ventana: el equipo con sus
seis integrantes y la pregunta *¿Quieres salir del compilador?*

![Ventana de salida](docs/capturas/fuga.png)

### Los cuadros de código

Los cuadros donde se escribe llevan **números de renglón** y los
**colores de Java** que usa VS Code (tema *Light+*), mientras se escribe: el
control de flujo (`si`, `para`, `retornar`) en morado, los tipos y las clases
(`entero`, `area`) en verde azulado, `clase`, `funcion` y `verdadero` en
azul, las funciones en café, las variables en azul marino, los números en
verde, los textos en rojo oscuro y los comentarios en verde. Con mucho código
el cuadro no se estira: se desplaza por dentro. La salida del análisis léxico
de la pestaña 2 va numerada igual: el renglón 3 del análisis es el renglón 3
del código.

Al dejar de escribir medio segundo, **los errores se subrayan en rojo**, con
el número de su renglón también en rojo; al pasar el mouse sobre ese renglón
se ve el mensaje. Cada pestaña marca los errores de su fase y de las
anteriores.

![Subrayado rojo](docs/capturas/subrayado.png)

### Las seis pestañas comparten el código

- Lo que se escribe en una pestaña aparece al momento en las demás.
- Al analizar en cualquiera, **se llenan todas**: si analizas en la pestaña 1
  y pasas a la 6, el Java ya está escrito.
- **Cambiar de pestaña no borra nada**: la tabla, la fila marcada, la rama
  abierta del árbol y el zoom siguen ahí al regresar.
- Sólo Borrar / Limpiar / Limpieza vacían el código, en las seis a la vez.

El árbol de la pestaña 2 se puede **acercar y alejar** con los botones `−` /
`+` de su encabezado, con **Ajustar** (lo encaja al ancho) o con
**Ctrl + rueda** del mouse, sin perder de vista lo que se estaba viendo. Un
árbol ancho (un programa completo) se dibuja de su tamaño real, con la raíz
centrada, y se puede recorrer hacia los dos lados.

La aplicación **abre en blanco, en la pestaña 1**. Para empezar: escribe el
código, elige uno del menú **Ejemplos**, abre un archivo con `Ctrl+O` o
arrástralo a la ventana.

Las seis pestañas trabajan con el mismo lenguaje y las mismas reglas. Como en
Java, **el código va dentro de una clase** (`clase p { clasePrincipal { ... } }`):
unas instrucciones sueltas son un error, *Falta la clase*. Para practicar la
forma, las pestañas 1 y 2 aceptan también expresiones sueltas, una por renglón
y sin punto y coma (`a = b + c`, `a && b || c + f > d`). La aplicación detecta
sola qué se escribió.

El análisis sintáctico sólo reconoce las **instrucciones del lenguaje**. El
lenguaje está basado en Java, así que si se escribe una palabra de Java
(`break`, `int`, `System.out.println`…), el error dice cuál es la de
SwordByte (`romper`, `entero`, `imprimirLn`…).

### El analizador semántico

![Analizador semántico](docs/capturas/semantico.png)

Le das un **programa SwordByte** y revisa que **tenga sentido**, como lo haría
un compilador de Java:

- cada nombre debe estar **declarado** antes de usarse, y no repetirse;
- los **tipos** deben coincidir (`entero x = "hola";` es error; un `decimal`
  no cabe en un `entero`);
- las condiciones deben ser lógicas, una `Constante` no cambia, `romper` va
  dentro de un ciclo, una función devuelve lo que dice…;
- las reglas de **geometría**: medidas mayores que cero, lados que formen
  un triángulo, `area.circulo(…)` devuelve `decimal`;
- y lo que es del lenguaje: la lógica se escribe con `Y`, `O` y `NO`, y las
  potencias y las raíces con `potencia(base, exponente)` (`&&`, `^`, `√`,
  `raiz`… sólo se aceptan en las pestañas 1 y 2, para practicar).

Muestra los **errores** y, aparte, las **advertencias** (como variables que
nunca se usan) —si no hay errores, lo dice la insignia— y la **gramática del
código**, como en el pizarrón. Para el ejemplo del pizarrón dentro de su
clase, `clase p { clasePrincipal { a1 = b5 / 20; } }`:

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

La **tabla de símbolos** y el **manejo de errores** no son sólo del
semántico: como en el esquema clásico de un compilador, los comparten las
fases (`src/core/comun/`).

![Errores semánticos](docs/capturas/semantico-errores.png)

Detalles, con cada regla y su mensaje, en
[08 — Analizador semántico](docs/08-analizador-semantico.md).

### El código intermedio

![Código intermedio](docs/capturas/intermedio.png)

La pestaña 4 traduce un programa sin errores a **código de tres
direcciones**: cada instrucción hace una sola operación, los resultados a medio
camino van en temporales (`t1`, `t2`…) y las decisiones y los ciclos saltan a
etiquetas (`L1`, `L2`…):

```
entero a = b + c * d;          t1 = c * d
                               t2 = b + t1
                               a = t2
```

Cada instrucción se ve también como **cuádruplo** (operador, argumento 1,
argumento 2, resultado): `( *, c, d, t1 )`. Antes de cada grupo va, como
comentario, el renglón del programa de donde sale. Detalles en
[09 — Código intermedio](docs/09-codigo-intermedio.md).

### La optimización

![Optimización](docs/capturas/optimizacion.png)

La pestaña 5 mejora el código intermedio **sin cambiar lo que hace el
programa**: calcula desde ahora lo que ya se sabe, no calcula dos veces lo
mismo y quita lo que sobra. Muestra el código que quedó (lo que cambió va en
verde), la lista de cambios con su *antes* y *después*, y cuántas veces se usó
cada optimización:

```
entero b = 2;              b = 2                    param 6
entero a = b * 3;    ──►   t1 = b * 3         ──►   call imprimirLn, 1
imprimirLn(a);             a = t1
                           param a
                           call imprimirLn, 1
```

Plegado y propagación de constantes, propagación de copias, subexpresiones
comunes, simplificación algebraica, reducción de fuerza, código muerto, código
inalcanzable y optimización de saltos. Lo que debe fallar al ejecutarse
(`10 / 0`) se deja como está. Detalles en
[10 — Optimización](docs/10-optimizacion.md).

### El código objeto: Java

![Código objeto](docs/capturas/objeto.png)

La pestaña 6 escribe el programa en **Java** a partir del código optimizado.
Como Java no tiene `goto`, vuelve a encontrar las estructuras con las
herramientas de un descompilador (bloques básicos, dominadores y ciclos): los
saltos se vuelven `if`, `while`, `do-while`, `for` y `switch`, y las
instrucciones de tres direcciones se juntan otra vez en expresiones.

**Guardar .java** (o `Ctrl+J`) lo guarda con el nombre de la clase, listo para:

```bash
javac -encoding UTF-8 bienvenida.java
java bienvenida
```

La vista **Junto al optimizado** pone el código de tres direcciones a la
izquierda y el Java a la derecha. Detalles en
[11 — Código objeto](docs/11-codigo-objeto.md).

### Guardar

**Guardar** (pestaña 1), `Ctrl+S` o **Archivo → Guardar reporte** guardan un
**reporte visual**: una página web (`.html`) que se abre con doble clic en
cualquier navegador. Como en Java, **el archivo se llama igual que la clase**:
`clase ejemplo` se guarda como `ejemplo.html`.

![Reporte visual](docs/capturas/reporte.png)

- Trae el encabezado (equipo, integrantes, materia, grado y grupo, fecha y
  hora), el **código fuente**, la **tabla de tokens**, el **árbol dibujado**,
  la **gramática generada**, el **código intermedio**, el **código optimizado**
  y el **código Java**, con los mismos colores que la aplicación.
- Es **un solo archivo**: los logos y los estilos van adentro. Se imprime o se
  pasa a PDF con `Ctrl+P` desde el navegador.
- **Se puede volver a poner en el compilador**: ábrelo con `Ctrl+O` o
  arrástralo a la ventana. Regresa el código a las seis pestañas y vuelve a la
  pestaña desde la que se guardó.

En el diálogo también se puede elegir el **reporte en texto** (`.bs`) de antes,
que sigue siendo un programa SwordByte válido. Detalles de los dos en el
[manual](docs/06-manual-de-usuario.md#12-guardar-y-volver-a-abrir).

### Cambiar los logos

Los logos viven en `src/ui/img/` como `logo-uat.jpeg`, `logo-uamm.jpeg` y
`logo-isc.jpeg`. Para cambiar alguno, copia ahí la imagen nueva **con el mismo
nombre**. Cada logo se escala para caber en el encabezado sin deformarse, así
que sirven tanto los apaisados como los cuadrados.

---

## Un programa en SwordByte

```swordbyte
clase bienvenida {

    funcion entero sumar(entero a, entero b) {
        retornar a + b;
    }

    clasePrincipal {
        equipo(Null);

        entero edad = 20;
        cadena nombre = "SwordByte";

        si (edad >= 18 Y edad < 100) {
            imprimirLn("Mayor de edad");
        } sino {
            imprimirLn("Menor de edad");
        }

        para (entero i = 1; i <= 3; i++) {
            imprimirF("Vuelta %d", i);
        }

        imprimirLn(sumar(5, 3));
    }
}
```

Y este es el Java que escribe el compilador (pestaña 6), sin el comentario
del principio:

```java
public class bienvenida {

    static int sumar(int a, int b) {
        return a + b;
    }

    public static void main(String[] args) {
        System.out.println("Equipo SwordByte");
        System.out.println("Avalos Castillo Armando de Jesús");
        System.out.println("Borjas Arias Ronaldo Antonio");
        System.out.println("Pesina Santander Edgar Gael");
        System.out.println("Ramos Antonio Saqueo");
        System.out.println("Vazquez Romo Marco Antonio");
        System.out.println("Verlage Aceves Axel Aram");
        System.out.println("Mayor de edad");
        for (int i = 1; i <= 3; i++) {
            System.out.printf("Vuelta %d", i);
        }
        System.out.println(sumar(5, 3));
    }
}
```

La optimización (pestaña 5) ya hizo su trabajo: `edad` siempre vale 20, así
que `edad >= 18 Y edad < 100` siempre es verdadero y sólo queda
`"Mayor de edad"`; `nombre` no se usa, así que desaparece.

---

## Documentación

| Documento | Contenido |
|---|---|
| **[00 — Manual técnico](docs/00-manual-tecnico.md)** | **Empieza aquí.** El proyecto completo de lo general a lo particular: qué es un compilador, el lenguaje, la arquitectura, las seis fases por dentro, la aplicación y el mantenimiento |
| [01 — Especificación del lenguaje](docs/01-especificacion-del-lenguaje.md) | Alfabeto, palabras reservadas, tipos, todas las instrucciones y su equivalente en Java |
| [02 — Analizador léxico](docs/02-analizador-lexico.md) | El AFD, sus 19 estados, las categorías de token, la salida `id1 > id2` y los errores léxicos |
| [03 — Analizador sintáctico](docs/03-analizador-sintactico.md) | Descenso recursivo, los tres modos de análisis, precedencia, recuperación de errores y el árbol |
| [04 — Gramática EBNF](docs/04-gramatica-ebnf.md) | La gramática formal completa |
| [05 — Arquitectura](docs/05-arquitectura.md) | Estructura de carpetas y decisiones de diseño |
| [06 — Manual de usuario](docs/06-manual-de-usuario.md) | Cómo usar la aplicación: las seis pestañas, guardar y volver a abrir |
| [07 — Mantenimiento](docs/07-mantenimiento.md) | Cómo agregar instrucciones, cambiar datos y empaquetar |
| [08 — Analizador semántico](docs/08-analizador-semantico.md) | Cómo se genera la gramática del código |
| [09 — Código intermedio](docs/09-codigo-intermedio.md) | El código de tres direcciones y los cuádruplos de cada instrucción |
| [10 — Optimización](docs/10-optimizacion.md) | Las optimizaciones, los bloques básicos y lo que no se optimiza a propósito |
| [11 — Código objeto](docs/11-codigo-objeto.md) | Cómo se escribe el Java: de saltos a `if`/`while`/`for`, los tipos, las funciones y las pruebas con `javac` |

---

## Estructura del proyecto

```
Compilador/
├── src/core/         El compilador (JavaScript puro, sin dependencias)
│   ├── 01.lexico/        Fase 1 — tokens, la tabla y la salida id1/num()
│   ├── 02.sintactico/    Fase 2 — gramática, parser y árbol
│   ├── 03.semantico/     Fase 3 — nombres, tipos y la gramática
│   ├── 04.intermedio/    Fase 4 — código de tres direcciones y cuádruplos
│   ├── 05.optimizacion/  Fase 5 — optimización del código intermedio
│   ├── 06.objeto/        Fase 6 — código objeto: el programa en Java
│   ├── Compilador.js     Une las seis fases en una sola llamada
│   ├── ReporteHTML.js    El reporte visual que se guarda y se vuelve a abrir
│   └── comun/            Lo que comparten las fases: tabla de símbolos, errores, tokens y datos del equipo
├── src/ui/           Interfaz gráfica: las seis pestañas (incluye img/ con los logos)
├── electron/         Aplicación de escritorio
├── ejemplos/         Programas .bs de demostración
├── pruebas/          Pruebas automáticas (con un intérprete del código intermedio y programas al azar)
├── herramientas/     Scripts para regenerar el icono y la gramática
├── build/            Icono de la aplicación para el empaquetado
└── docs/             Documentación (incluye capturas/ y referencia/)
```

---

## Ejemplos incluidos

| Archivo | Qué demuestra |
|---|---|
| [`01-equipo.bs`](ejemplos/01-equipo.bs) | La instrucción `equipo` |
| [`02-variables.bs`](ejemplos/02-variables.bs) | Todos los tipos de dato y las constantes |
| [`03-control.bs`](ejemplos/03-control.bs) | `si`/`sinoSi`/`sino`, los tres ciclos y `opcion` |
| [`04-funciones.bs`](ejemplos/04-funciones.bs) | Funciones con y sin retorno |
| [`05-completo.bs`](ejemplos/05-completo.bs) | Arreglos, matrices, entrada, errores y funciones nativas |
| [`06-potencias-y-raices.bs`](ejemplos/06-potencias-y-raices.bs) | Potencias y raíces con `potencia(base, exponente)`: la raíz cuadrada es `potencia(x, 0.5)` |
| [`07-con-errores.bs`](ejemplos/07-con-errores.bs) | Errores a propósito, para ver el reporte |

Se abren con `Ctrl+O` desde la aplicación.

---

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Abre la aplicación |
| `npm run pruebas` | Pruebas del compilador (con `javac`, también compila y ejecuta el Java generado) |
| `npm run pruebas:ui` | Comprobaciones sobre la aplicación |
| `npm run dist` | Genera los ejecutables en `dist/` |
| `npm run icono` | Regenera el icono de la aplicación |
| `npm run capturas` | Regenera las capturas de la documentación (las seis pestañas, Fuga y el reporte) |
| `npm run gramatica` | Regenera `docs/04-gramatica-ebnf.md` desde `Gramatica.js` |

---

## Equipo

**SwordByte**

1. Avalos Castillo Armando de Jesús
2. Borjas Arias Ronaldo Antonio
3. Pesina Santander Edgar Gael
4. Ramos Antonio Saqueo
5. Vazquez Romo Marco Antonio
6. Verlage Aceves Axel Aram

---

## Licencia

Distribuido bajo la licencia [MIT](LICENSE).

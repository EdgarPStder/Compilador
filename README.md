# Compilador SwordByte

Compilador del lenguaje de programación **SwordByte**, un lenguaje propio con
sintaxis en español que traduce a Java.

La aplicación de escritorio tiene **tres pestañas**, una por analizador, que
trabajan sobre el mismo código:

| Pestaña | Qué muestra |
|---|---|
| **1 · Analizador Léxico** | La tabla de tokens: lexema, token y descripción |
| **2 · Analizador Léxico-Sintáctico** | El código reescrito con los identificadores numerados (`id1 > id2`) y el árbol sintáctico dibujado |
| **3 · Analizador Semántico** | La gramática del código: le das cualquier código del lenguaje y escribe las reglas que lo producen |

![Compilador SwordByte](docs/capturas/lexico.png)

---

## Qué hace

| | |
|---|---|
| **Lenguaje** | SwordByte, archivos `.bs` |
| **Destino** | Java |
| **Analizadores** | 1. Léxico · 2. Léxico-sintáctico · 3. Semántico |
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

Doble clic en `dist/CompiladorSwordByte-1.0.0-portable.exe`. No requiere
instalación.

### Ejecutar desde el código

```bash
npm install
npm start
```

### Correr las pruebas

```bash
npm run pruebas       # 118 pruebas del compilador
npm run pruebas:ui    # 109 comprobaciones sobre la aplicación
```

### Generar el ejecutable

````bash
npm run dist
# Compilador

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Estado](https://img.shields.io/badge/estado-en%20desarrollo-orange?style=flat-square)

Compilador educativo escrito en **JavaScript** que implementa las fases clásicas de compilación —análisis léxico, sintáctico y semántico, y generación de código— con una **interfaz web** para escribir código fuente y ver el resultado de cada fase.

> 🚧 **Proyecto en desarrollo.** La arquitectura y la estructura de módulos ya están definidas; la implementación de cada fase se está agregando.

---

## Arquitectura

```mermaid
flowchart LR
    A[Código fuente] --> B[Lexer<br/>análisis léxico]
    B -- tokens --> C[Parser<br/>análisis sintáctico]
    C -- AST --> D[Analizador<br/>semántico]
    D -- AST anotado --> E[Generador<br/>de código]
    D <--> T[(Tabla de<br/>símbolos)]
    E --> F[Código de salida]
````

Todas las fases reportarán sus errores a través de un manejador común (`utils/errorHandler.js`).

| Módulo | Archivo | Responsabilidad |
|---|---|---|
| Tokens | [`src/compiler/lexer/tokens.js`](src/compiler/lexer/tokens.js) | Definición de los tipos de token del lenguaje |
| Lexer | [`src/compiler/lexer/lexer.js`](src/compiler/lexer/lexer.js) | Convierte el texto fuente en una secuencia de tokens |
| AST | [`src/compiler/parser/ast.js`](src/compiler/parser/ast.js) | Nodos del árbol de sintaxis abstracta |
| Parser | [`src/compiler/parser/parser.js`](src/compiler/parser/parser.js) | Valida la gramática y construye el AST |
| Tabla de símbolos | [`src/compiler/semantic/symbolTable.js`](src/compiler/semantic/symbolTable.js) | Registro de identificadores, tipos y ámbitos |
| Analizador semántico | [`src/compiler/semantic/analyzer.js`](src/compiler/semantic/analyzer.js) | Verificación de tipos, declaraciones y uso de variables |
| Generador | [`src/compiler/codegen/generator.js`](src/compiler/codegen/generator.js) | Produce el código de salida a partir del AST |
| Errores | [`src/compiler/utils/errorHandler.js`](src/compiler/utils/errorHandler.js) | Reporte uniforme de errores de todas las fases |
| Punto de entrada | [`src/compiler/index.js`](src/compiler/index.js) | Encadena las fases del compilador |
| Interfaz | [`src/gui/`](src/gui/) | Editor web y visualización de tokens, AST y errores |

## Hoja de ruta

- [ ] Definir la gramática del lenguaje fuente
- [ ] Analizador léxico y pruebas (`tests/lexer.test.js`)
- [ ] Analizador sintáctico con construcción del AST y pruebas (`tests/parser.test.js`)
- [ ] Tabla de símbolos y análisis semántico
- [ ] Generación de código
- [ ] Interfaz web con visualización de cada fase

---

## Uso

**Requisitos:** Node.js 20 o superior.

```bash
git clone https://github.com/EdgarPStder/Compilador.git
cd Compilador
npm test            # ejecuta las pruebas con el runner nativo de Node (node --test)
```

La interfaz se abre directamente en el navegador desde `src/gui/index.html`.

## Estructura

```
.
├── src/
│   ├── compiler/
│   │   ├── lexer/        Análisis léxico
│   │   ├── parser/       Análisis sintáctico y AST
│   │   ├── semantic/     Análisis semántico y tabla de símbolos
│   │   ├── codegen/      Generación de código
│   │   ├── utils/        Manejo de errores
│   │   └── index.js
│   └── gui/              Interfaz web (HTML, CSS, JS)
├── tests/                Pruebas unitarias
└── package.json
```

---

## La ventana

Hasta arriba van **las tres pestañas**. Se cambia con un clic, con `Ctrl+1` /
`Ctrl+2` / `Ctrl+3` o con `Ctrl+Tab`.

**Cada pestaña conserva su propio diseño**, con sus logos y sus botones donde
los pide ese diseño. Lo que comparten es el estilo (los colores, los botones y
las cajas del analizador léxico-sintáctico):

| Pestaña | Logos | Botones |
|---|---|---|
| **1 · Léxico** | UAT a la izquierda y UAMM a la derecha; en medio, la carrera, el analizador, el grupo y el equipo | A la derecha: Realizar Análisis · Guardar · Borrar · **Fuga** |
| **2 · Léxico-Sintáctico** | Los tres arriba (UAT, UAMM, ISC) | A la izquierda: Limpiar · Análisis Léxico · Análisis Sintáctico · Análisis Léxico-Sintáctico · Equipo · Salir |
| **3 · Semántico** | Los tres en columna, a la izquierda | A la derecha: Limpieza · Analiza · Equipo · Termina |

**Fuga**, **Salir** y **Termina** abren la misma ventana: el equipo con sus
seis integrantes y la pregunta *¿Quieres salir del compilador?*

![Ventana de salida](docs/capturas/fuga.png)

### Las tres pestañas comparten el código

- Lo que se escribe en una pestaña aparece al momento en las otras dos.
- Al analizar en cualquiera, **se llenan las tres**: si analizas en la pestaña 1
  y pasas a la 2, el árbol ya está dibujado.
- **Cambiar de pestaña no borra nada**: la tabla, la fila marcada, la rama
  abierta del árbol y el zoom siguen ahí al regresar.
- Sólo Borrar / Limpiar / Limpieza vacían el código, en las tres a la vez.

El árbol de la pestaña 2 se puede **acercar y alejar** con los botones `−` /
`+` de su encabezado, con **Ajustar** (lo encaja al ancho) o con
**Ctrl + rueda** del mouse.

La aplicación **abre en blanco, en la pestaña 1**. Para empezar: escribe el
código, elige uno del menú **Ejemplos**, abre un archivo con `Ctrl+O` o
arrástralo a la ventana.

Las tres pestañas trabajan con el mismo lenguaje y las mismas reglas. Se puede
analizar una o varias proposiciones sueltas, una por renglón y sin punto y
coma (`a = b + c`, `a && b || c + f > d`), instrucciones con punto y coma
(`entero a = 5;`) o un programa completo (`clase p { clasePrincipal { ... } }`).
La aplicación detecta sola de cuál se trata.

### El analizador semántico

![Analizador semántico](docs/capturas/semantico.png)

Le das **cualquier código del lenguaje** —una proposición como `a = b + c` o
`a && b || c + f > d`, varias (una por renglón), instrucciones o un programa
completo— y **genera su gramática**, como en el pizarrón. Para `a1 = b5 / 20`:

```
prop → id = exp
exp  → id | num | exp / exp
id   → let ( dig )*
num  → dig ( dig )*
dig  → 0-9
let  → a-z
```

Sólo salen las reglas y los caracteres que aparecen en el código. Los
terminales van subrayados, como en el pizarrón, y al pasar el mouse sobre una
producción se ve de qué parte del código salió. Detalles en
[08 — Analizador semántico](docs/08-analizador-semantico.md).

### Guardar

**Guardar** (pestaña 1), `Ctrl+S` o **Archivo → Guardar reporte** guardan un
**reporte visual**: una página web (`.html`) que se abre con doble clic en
cualquier navegador.

![Reporte visual](docs/capturas/reporte.png)

- Trae el encabezado (equipo, integrantes, materia, grado y grupo, fecha y
  hora), el **código fuente**, la **tabla de tokens**, el **árbol dibujado** y
  la **gramática generada**, con los mismos colores que la aplicación.
- Es **un solo archivo**: los logos y los estilos van adentro. Se imprime o se
  pasa a PDF con `Ctrl+P` desde el navegador.
- **Se puede volver a poner en el compilador**: ábrelo con `Ctrl+O` o
  arrástralo a la ventana. Regresa el código a las tres pestañas y vuelve a la
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

Su equivalente en Java sería:

```java
public class bienvenida {
    static int sumar(int a, int b) { return a + b; }

    public static void main(String[] args) {
        // equipo(Null) genera los System.out.println del equipo
        int edad = 20;
        String nombre = "SwordByte";

        if (edad >= 18 && edad < 100) {
            System.out.println("Mayor de edad");
        } else {
            System.out.println("Menor de edad");
        }

        for (int i = 1; i <= 3; i++) {
            System.out.printf("Vuelta %d", i);
        }

        System.out.println(sumar(5, 3));
    }
}
```

---

## Documentación

| Documento | Contenido |
|---|---|
| **[00 — Manual técnico](docs/00-manual-tecnico.md)** | **Empieza aquí.** El proyecto completo de lo general a lo particular: qué es un compilador, el lenguaje, la arquitectura, los tres analizadores por dentro, la aplicación y el mantenimiento |
| [01 — Especificación del lenguaje](docs/01-especificacion-del-lenguaje.md) | Alfabeto, palabras reservadas, tipos, todas las instrucciones y su equivalente en Java |
| [02 — Analizador léxico](docs/02-analizador-lexico.md) | El AFD, sus 19 estados, las categorías de token, la salida `id1 > id2` y los errores léxicos |
| [03 — Analizador sintáctico](docs/03-analizador-sintactico.md) | Descenso recursivo, los tres modos de análisis, precedencia, recuperación de errores y el árbol |
| [04 — Gramática EBNF](docs/04-gramatica-ebnf.md) | La gramática formal completa |
| [05 — Arquitectura](docs/05-arquitectura.md) | Estructura de carpetas y decisiones de diseño |
| [06 — Manual de usuario](docs/06-manual-de-usuario.md) | Cómo usar la aplicación: las tres pestañas, guardar y volver a abrir |
| [07 — Mantenimiento](docs/07-mantenimiento.md) | Cómo agregar instrucciones, cambiar datos y empaquetar |
| [08 — Analizador semántico](docs/08-analizador-semantico.md) | Cómo se genera la gramática del código |

---

## Estructura del proyecto

```
Compilador/
├── src/core/         El compilador (JavaScript puro, sin dependencias)
│   ├── lexico/           Fase 1 — tokens, la tabla y la salida id1/num()
│   ├── sintactico/       Fase 2 — gramática, parser y árbol
│   ├── semantico/        Pestaña 3 — genera la gramática del código
│   ├── ReporteHTML.js    El reporte visual que se guarda y se vuelve a abrir
│   └── comun/            Token, tipos, errores y datos del equipo
├── src/ui/           Interfaz gráfica: las tres pestañas (incluye img/ con los logos)
├── electron/         Aplicación de escritorio
├── ejemplos/         Programas .bs de demostración
├── pruebas/          Pruebas automáticas
└── docs/             Documentación
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
| [`06-potencias-y-raices.bs`](ejemplos/06-potencias-y-raices.bs) | `^` `**` `√` y las funciones `raiz`, `raizCuadrada`, `raizCubica` |
| [`07-con-errores.bs`](ejemplos/07-con-errores.bs) | Errores a propósito, para ver el reporte |

Se abren con `Ctrl+O` desde la aplicación.

---

## Comandos disponibles

| Comando | Qué hace |
|---|---|
| `npm start` | Abre la aplicación |
| `npm run pruebas` | Pruebas del compilador |
| `npm run pruebas:ui` | Comprobaciones sobre la aplicación |
| `npm run dist` | Genera los ejecutables en `dist/` |
| `npm run icono` | Regenera el icono de la aplicación |
| `npm run capturas` | Regenera las capturas de la documentación (las tres pestañas, Fuga y el reporte) |
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

## Autor

**Edgar Gael Pesina Santander** — Ingeniería en Sistemas Computacionales, Universidad Autónoma de Tamaulipas.
GitHub: [@EdgarPStder](https://github.com/EdgarPStder)

## Licencia

Código bajo licencia [MIT](LICENSE).

# Arquitectura y estructura del proyecto

---

## 1. Los tres analizadores

```
  Código fuente (el mismo en las cuatro pestañas)
         │
         ▼
  ┌──────────────────────┐
  │ 1. Análisis léxico   │  ── tokens, tabla de tokens, salida id1/num()
  └──────────────────────┘     y errores léxicos
         │  tokens
         ├──────────────────────────────┐
         ▼                              ▼
  ┌──────────────────────┐    ┌──────────────────────┐
  │ 2. Análisis sintáct. │ ─► │ 3. Análisis semánt.  │
  │                      │ AST│                      │
  └──────────────────────┘    └──────────────────────┘
    AST, árbol y errores        la gramática del código
    sintácticos                 (prop → id = exp, ...)
         │                              │
         └──────────────┬───────────────┘
                        ▼
     Las cuatro pestañas y el reporte (.html o .bs)
```

Los tres trabajan con el mismo lenguaje (SwordByte) y las mismas reglas. El
semántico no lee el código por su cuenta: recorre el árbol (AST) que armó el
sintáctico, revisa que tenga sentido (nombres y tipos) y escribe la gramática
que produce ese código. Si el léxico o el sintáctico encontraron errores, el
semántico no revisa nada. Como en Java, el código va dentro de una clase; las
expresiones sueltas (`a = b + c`, sin `;`) sólo se aceptan en las pestañas 1
y 2.

Las tres fases comparten dos piezas de `src/core/comun/`, como en el esquema
clásico de un compilador: la **tabla de símbolos** (`TablaSimbolos.js`: el
léxico anota cada identificador, el sintáctico usa sus etiquetas en el árbol y
el semántico le agrega su tipo y su ámbito) y el **manejo de errores**
(`ErrorCompilacion.js`: todas reportan con el mismo formato). `Compilador.js`
crea una tabla por cada código y se la pasa a las tres.

---

## 2. Estructura de carpetas

```
Compilador/
│
├── package.json                 Configuración del proyecto y del empaquetado
├── README.md                    Punto de entrada de la documentación
│
├── docs/                        DOCUMENTACIÓN
│   ├── 00-manual-tecnico.md          manual técnico completo
│   ├── 01-especificacion-del-lenguaje.md
│   ├── 02-analizador-lexico.md
│   ├── 03-analizador-sintactico.md
│   ├── 04-gramatica-ebnf.md
│   ├── 05-arquitectura.md            (este archivo)
│   ├── 06-manual-de-usuario.md
│   ├── 07-mantenimiento.md
│   ├── 08-analizador-semantico.md
│   └── capturas/                     Imágenes de la aplicación
│
├── src/
│   ├── core/                    EL COMPILADOR (JavaScript puro, sin dependencias)
│   │   ├── Compilador.js             Une las cuatro fases en una llamada
│   │   │
│   │   ├── ReporteHTML.js            El reporte visual (.html) y su lectura
│   │   ├── Reporte.js                El reporte en texto (.bs)
│   │   ├── ArchivoGuardado.js        Elige el formato al guardar y lee al abrir
│   │   │
│   │   ├── comun/                    Piezas compartidas
│   │   │   ├── Token.js                  estructura de un token
│   │   │   ├── TiposToken.js             catálogo de categorías léxicas
│   │   │   ├── Equipo.js                 datos del equipo y de la materia
│   │   │   ├── ErrorCompilacion.js       manejo de errores: el formato de las 3 fases
│   │   │   └── TablaSimbolos.js          tabla de símbolos: la usan las 3 fases
│   │   │
│   │   ├── 01.lexico/           FASE 1
│   │   │   ├── AnalizadorLexico.js       recorre el fuente y produce tokens
│   │   │   ├── FormatoLexico.js          la salida id1 > num(9) y sus colores
│   │   │   ├── TablaLexica.js            la tabla Lexema | Token | Descripción
│   │   │   ├── ResaltadoCodigo.js        los colores de Java del código
│   │   │   └── PalabrasReservadas.js     diccionario del lenguaje
│   │   │
│   │   ├── 02.sintactico/       FASE 2
│   │   │   ├── AnalizadorSintactico.js   descenso recursivo y AST
│   │   │   ├── Gramatica.js              gramática EBNF como dato
│   │   │   └── NodosAST.js               nodos del AST y árbol dibujable
│   │   │
│   │   ├── 03.semantico/        FASE 3
│   │   │   ├── AnalizadorSemantico.js    punto de entrada: estado y resultado
│   │   │   ├── VerificadorSemantico.js   declaraciones, tipos, errores y advertencias
│   │   │   ├── GeneradorGramatica.js     genera la gramática del código
│   │   │   └── TextoDeNodo.js            vuelve a escribir un nodo como código
│   │   │
│   │   └── 04.intermedio/       FASE 4
│   │       ├── Instrucciones.js          las formas del código de tres direcciones
│   │       └── GeneradorIntermedio.js    traduce el árbol a tres direcciones
│   │
│   └── ui/                      INTERFAZ GRÁFICA (proceso de renderizado)
│       ├── index.html                encabezado, pestañas y los cuatro paneles
│       ├── css/estilos.css           una sola paleta para las cuatro pestañas
│       ├── img/                      logos UAT, UAMM e ISC (reemplazables)
│       └── js/
│           ├── dom.js                ayudas para crear errores, notas e insignias
│           ├── equipo.js             ventana emergente del equipo
│           ├── salir.js              ventana de Fuga / Salir / Termina
│           ├── arbol.js              dibuja el árbol en SVG, el zoom y las ramas
│           ├── editor.js             números, colores y errores subrayados en el código
│           ├── pestanas.js           cambia de pestaña sin borrar nada
│           ├── panel-lexico.js       pinta la pestaña 1 (tabla de tokens)
│           ├── panel-sintactico.js   pinta la pestaña 2 (id1 > id2 y el árbol)
│           ├── panel-semantico.js    pinta la pestaña 3 (errores y gramática)
│           ├── panel-intermedio.js   pinta la pestaña 4 (tres direcciones y cuádruplos)
│           └── app.js                el código compartido, botones, menú y archivos
│
├── electron/                    APLICACIÓN DE ESCRITORIO
│   ├── main.js                       proceso principal: ventana, menú, IPC
│   ├── preload.js                    puente seguro hacia la interfaz
│   └── logos.js                      achica los logos para el reporte .html
│
├── ejemplos/                    Programas .bs de demostración
├── pruebas/
│   ├── ejecutar.js                   161 pruebas del compilador
│   └── verificar-ui.js               142 comprobaciones sobre la ventana real
├── herramientas/
│   ├── generar-icono.js              genera el icono de la app
│   └── generar-gramatica.js          regenera docs/04 desde Gramatica.js
├── build/icono.png              Icono
├── salida/                      Reportes generados
└── dist/                        Ejecutables (.exe)
```

---

## 3. Decisiones de arquitectura

### 3.1 El compilador no sabe que existe una interfaz

Todo `src/core/` es JavaScript puro sin dependencias: no usa Electron, ni el
DOM, ni siquiera `fs`. Consecuencias:

- Se puede usar desde la interfaz o desde las pruebas.
- Las pruebas corren con `node` en milisegundos, sin abrir ventanas.
- Si mañana se quiere una versión web, el núcleo se reutiliza tal cual.

El contrato es una sola función:

```js
const { compilar } = require('./src/core/Compilador');
const resultado = compilar(codigoFuente);
```

### 3.2 La interfaz no reinterpreta nada

La salida `id1 > num(9)` y el árbol con sus etiquetas los produce **el núcleo**, no
la interfaz. `FormatoLexico.js` arma el texto y `aArbolCompacto()` arma el
árbol; la interfaz sólo los dibuja. Así, lo que se ve en pantalla es
exactamente lo que hizo el compilador, y la pantalla y el reporte guardado
nunca pueden decir cosas distintas del mismo programa.

Por la misma razón las etiquetas `id1`, `id2`… salen de una sola tabla de
símbolos, que llena la fase léxica, y la usan tanto la salida léxica como el
árbol: si las dos vistas numeraran por su cuenta, podrían discrepar.

Lo mismo vale para la tabla de tokens de la pestaña 1 (la arma
[`TablaLexica.js`](../src/core/01.lexico/TablaLexica.js)), para el análisis
semántico de la pestaña 3 (los errores con su sugerencia y las reglas con
cada símbolo, su clase y el ejemplo de cada producción salen ya listos de
[`AnalizadorSemantico.js`](../src/core/03.semantico/AnalizadorSemantico.js)) y
para los reportes que se guardan: los arman
[`ReporteHTML.js`](../src/core/ReporteHTML.js) y
[`Reporte.js`](../src/core/Reporte.js) en el núcleo, a partir del mismo
resultado, así que el archivo guardado dice exactamente lo que muestra la
pantalla.

Lo mismo vale para los colores. La categoría de cada operador (lógico,
relacional, aritmético) la deciden `categoriaDe()` en `FormatoLexico.js` y
`categoriaOperador()` en `NodosAST.js`, sobre la misma lista de símbolos, de
modo que un `>` se pinta de rojo en los dos paneles sin que la interfaz tenga
que saber nada de operadores.

### 3.3 Separación de procesos en Electron

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  Proceso principal (Node)   │        │  Renderizado (navegador)     │
│                             │        │                              │
│  electron/main.js           │        │  src/ui/  (sin acceso a Node)│
│   ├── ventana y menú        │  IPC   │   ├── botones y editor       │
│   ├── sistema de archivos   │ <────► │   ├── salida léxica           │
│   └── src/core/ (compilador)│        │   └── los cuatro paneles      │
└─────────────────────────────┘        └──────────────────────────────┘
                    ▲
                    │ contextBridge
              electron/preload.js
```

La interfaz corre con `contextIsolation: true` y `nodeIntegration: false`: no
puede tocar el disco por su cuenta. Sólo dispone de las funciones que
`preload.js` expone en `window.api`:

| Función | Qué hace |
|---|---|
| `analizar(fuente, opciones)` | ejecuta las cuatro fases |
| `equipo()` | datos del equipo y de la materia |
| `resaltar(texto)` | el código con los colores de Java; corre en el mismo `preload.js` (sin IPC) porque se llama en cada tecla |
| `abrirArchivo()` | diálogo Abrir; devuelve el código (y la pestaña, si es un reporte `.html`) |
| `leerArchivo(texto)` | lo mismo, para un archivo que se soltó sobre la ventana |
| `guardarReporte(fuente, pestana)` | diálogo Guardar; escribe el reporte `.html` o `.bs` |
| `verReporte()` | abre en el navegador el último reporte `.html` guardado |
| `salir()` | cierra la aplicación (la interfaz ya preguntó con su ventana) |
| `alMenu(manejador)` | recibe las órdenes del menú, con sus datos |

Un archivo que se suelta sobre la ventana lo lee la interfaz (`archivo.text()`,
que no necesita Node) y el texto viaja a `main.js`, que decide qué es con
[`ArchivoGuardado.js`](../src/core/ArchivoGuardado.js). Sin ese manejo,
Electron abriría el archivo soltado **en lugar** de la aplicación.

### 3.4 CommonJS en todo el proyecto

Se usa `require`/`module.exports` en lugar de módulos ES. Los módulos ES sobre
`file://` están bloqueados en Chromium, y el manejo de `.mjs`/`.cjs` en el
proceso principal de Electron varía entre versiones. CommonJS funciona igual en
Node, en Electron y en cualquier versión, que es lo que se quiere en un proyecto
que hay que poder abrir y ejecutar en cualquier máquina.

### 3.5 Errores con un formato único

Todas las fases construyen `ErrorCompilacion`, con los mismos campos: fase,
mensaje, línea, columna, lexema, esperado, encontrado y sugerencia. Así la
pantalla y el reporte muestran igual de bien un error léxico, uno sintáctico o
uno semántico, con el mismo formato, y el editor los subraya igual mientras se
escribe (`erroresDe()` en `Compilador.js` junta los de cada pestaña).

### 3.6 Tres pestañas, un solo código y un solo resultado

Cada pestaña tiene su propio cuadro de código, pero los tres llevan siempre lo
mismo: al escribir en uno, `app.js` copia el texto a los otros dos.

Al analizar, `compilar()` corre **las cuatro fases de una vez** y el mismo
resultado se reparte a los cuatro paneles (`panel-lexico.js`,
`panel-sintactico.js` y `panel-semantico.js`). Por eso al cambiar de pestaña
el análisis ya está hecho, y nunca puede pasar que una pestaña muestre un
análisis de un código distinto al de otra.

Cambiar de pestaña sólo esconde un panel y muestra otro (`display: none`): el
contenido no se borra ni se vuelve a construir. Por eso se conservan la fila
marcada de la tabla, la rama abierta del árbol y el zoom.

### 3.7 El reporte visual guarda su propio código

El reporte `.html` es una página para personas, pero también trae un bloque
`<script type="application/json">` con el código fuente, la pestaña y la fecha.
El navegador no lo ejecuta ni lo muestra; el compilador lo lee al abrir el
archivo. Así el mismo archivo sirve para entregarlo y para seguir trabajando,
sin tener que adivinar el código a partir de lo que se ve en la página.

Dentro de ese bloque los caracteres `<`, `>` y `&` se escriben como
`\u003c`…, para que un `</script>` escrito en el código no pueda cerrar el
bloque antes de tiempo.

---

## 4. Flujo de una compilación

```
1. El usuario escribe el código y presiona un botón en cualquier pestaña
2. app.js copia el código a los otros dos cuadros y llama a
   window.api.analizar(fuente, opciones)
3. preload.js reenvía por IPC a electron/main.js
4. main.js llama a Compilador.compilar(fuente, opciones)
       ├── analizarLexico(fuente)          → tokens, errores, estadísticas
       ├── formatearSalidaLexica(tokens)   → "id1 > num(9)", con su categoría
       ├── construirTablaLexica(tokens)    → Lexema | Token | Descripción
       ├── analizarSintactico(tokens)      → ast, modo, errores
       ├── aArbolCompacto(ast, mapa)       → árbol listo para dibujar
       └── analizarSemantico(sintactico)   → errores, advertencias, tabla de
                                              símbolos y gramática del código
5. main.js devuelve el resultado completo a la interfaz
6. app.js se lo pasa a los cuatro paneles: la tabla, la salida y el árbol, el
   análisis semántico y el código intermedio
```

Los botones *Análisis Léxico* y *Análisis Sintáctico* de la pestaña 2 sólo
deciden qué cuadros de esa pestaña se llenan; el análisis se hace completo.
`compilar()` sigue aceptando `soloLexico: true` para quien lo use desde
código y sólo quiera la fase 1.

Tiempo típico para un programa de 30 líneas: **2 a 5 ms**.

---

## 5. Pruebas

| Comando | Qué comprueba |
|---|---|
| `npm run pruebas` | 161 pruebas del compilador: léxico, tabla de tokens, salida `id1` / `num()`, jerarquía de operadores, sintáctico, fragmentos y la falta de clase, el análisis semántico (declaraciones, tipos, ámbitos, funciones, arreglos, geometría, Y/O/NO y `potencia`, advertencias y la tabla de símbolos compartida), la gramática generada, el código intermedio (cada forma de instrucción, los saltos de cada estructura, el corto circuito, arreglos y matrices), los errores subrayados, los dos reportes, el nombre del archivo, ejemplos y robustez |
| `npm run pruebas:ui` | 142 comprobaciones sobre la aplicación real: las pestañas con sus logos y botones donde los pide cada diseño, el código compartido, la tabla de tokens, el análisis semántico (errores, advertencias y gramática; la falta de clase), el código intermedio en sus dos vistas, que los cuadros de código no se estiren con mucho código, el subrayado rojo de los errores, el zoom con un árbol ancho, la ventana de Fuga, guardar y volver a abrir el reporte (también soltándolo), los logos, los botones, la salida de `a > b`, los colores, la jerarquía del árbol y el orden del equipo |

Las pruebas no usan ninguna librería externa: son JavaScript plano, así que
funcionan sin instalar nada extra.

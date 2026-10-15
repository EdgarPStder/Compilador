# Mantenimiento

Cómo hacer los cambios más habituales en el proyecto.

---

### Agregar una instrucción nueva al lenguaje

1. **Palabra reservada:** agregarla en `PalabrasReservadas.js` con su `java` y
   su `desc`. El analizador léxico la reconoce de inmediato.
2. **Gramática:** agregar la producción en `Gramatica.js`, que es la
   especificación de referencia y la fuente de
   [04-gramatica-ebnf.md](04-gramatica-ebnf.md).
3. **Parser:** escribir el método en `AnalizadorSintactico.js` y enlazarlo desde
   `instruccion()`.
4. **Nodo del AST:** agregar su etiqueta en `etiquetaCompacta()`
   (`NodosAST.js`). Si el nodo no encaja en ninguna familia de color,
   agregarla en `familiaNodo()` y darle su color en `estilos.css`.
5. **Prueba:** agregar un caso en `pruebas/ejecutar.js`.

No hay que tocar el dibujo del árbol: `aArbolCompacto()` recorre el AST de
forma genérica, así que un nodo nuevo aparece solo.

### Si la asignatura exige `asignar(variable, valor);`

El documento de especificación original lo menciona una vez, aunque el resto
define la asignación con `=`. Para admitir las dos formas basta con:

1. Agregar `asignar` a `RESERVADAS` en `PalabrasReservadas.js`.
2. Agregar un `case 'asignar':` en `AnalizadorSintactico.instruccion()` que
   lea `asignar` `(` destino `,` expresion `)` `;` y devuelva el mismo nodo
   `Asignacion` que ya existe.

Al reutilizar el nodo `Asignacion`, el árbol y el reporte funcionan sin más
cambios.

### Cambiar el nombre de un token o su descripción (pestaña 1)

Los nombres de la tabla de la pestaña 1 están en
[`TablaLexica.js`](../src/core/01.lexico/TablaLexica.js):

- Los **símbolos** (operadores, delimitadores y `Y` `AND` `O` `OR` `NO`
  `NOT`) en la tabla `SIMBOLOS`, uno por renglón:
  `'+': ['operador suma', 'Operación aritmética de suma ...']`.
- Lo demás (identificadores, números, cadenas…) en `nombreYDescripcion()`,
  un `case` por categoría.
- Las palabras reservadas usan la descripción de
  [`PalabrasReservadas.js`](../src/core/01.lexico/PalabrasReservadas.js).

Si se agrega un operador nuevo al lenguaje, conviene agregarlo también a
`SIMBOLOS` para que tenga su propio nombre en la tabla.

### Cuando se agrega una instrucción: las pestañas 3 y 4

Las pestañas 3 y 4 recorren el árbol del sintáctico, con un `case` por tipo
de nodo en cada recorrido:

1. **El análisis semántico**, en
   [`VerificadorSemantico.js`](../src/core/03.semantico/VerificadorSemantico.js):
   - Una **instrucción** nueva necesita su `case` en `instruccion()` y un
     método que revise sus partes. Casi siempre basta con pedir el tipo de
     cada expresión con `this.valor(...)` y compararlo:
     ```js
     /** esperar(1000);  los milisegundos son un entero que no es negativo. */
     esperar (n) {
       const tipo = this.valor(n.milisegundos);
       if (tipo && !esEntero(tipo)) this.error(n.milisegundos, 'esperar recibe milisegundos enteros…');
     }
     ```
   - Una **expresión** nueva, su `case` en `tipoDe()`, que devuelve su tipo
     (`'entero'`, `'decimal'`…) o `null` si adentro ya hubo un error.
   - Si declara un nombre, se anota con `this.declararNombre(nodo, { nombre,
     categoria, tipo, asignado })`; si lo usa, se busca con
     `this.lugar(nodo, 'leer' | 'escribir' | 'cambiar')`.
   - Una **función nativa** nueva va en la tabla `NATIVAS` (lo que devuelve) y,
     si hay que revisar algo de sus valores, en el `switch` de `nativa()`.
   - Si el sintáctico la acepta pero **no es del lenguaje** (como `&&` o
     `raiz`, que sólo sirven para practicar en las pestañas 1 y 2), se agrega a
     la tabla `NO_SON_DEL_LENGUAJE` con lo que se escribe en su lugar.
   - La tabla de símbolos está en
     [`comun/TablaSimbolos.js`](../src/core/comun/TablaSimbolos.js) porque la
     usan las tres fases; el semántico sólo la recibe.
2. **La gramática**, en
   [`GeneradorGramatica.js`](../src/core/03.semantico/GeneradorGramatica.js):
   - Una **instrucción** nueva necesita su `case` en `formaInstruccion()`: la
     lista de símbolos con que se escribe, por ejemplo
     `[T('leer'), T('('), ...this.destino(n.destino), T(')'), T(';')]`.
   - Una **expresión** nueva, su `case` en `formaExpresion()`.

3. **El código intermedio**, en
   [`GeneradorIntermedio.js`](../src/core/04.intermedio/GeneradorIntermedio.js):
   - Una **instrucción** nueva necesita su `case` en `traducir()` y un método
     que emita sus instrucciones de tres direcciones con `this.emitir(...)`,
     usando las formas de [`Instrucciones.js`](../src/core/04.intermedio/Instrucciones.js)
     (`I.operacion`, `I.copia`, `I.siFalso`, `I.salto`, `I.etiqueta`…).
     Las etiquetas se piden con `this.nuevaEtiqueta()` y los temporales con
     `this.nuevoTemporal()`.
   - Una **expresión** nueva, su `case` en `expresion()`, que devuelve dónde
     quedó su valor (un nombre, un número o un temporal).
   - Si hace falta una **forma** nueva de instrucción, se agrega a
     `Instrucciones.js` con su cuádruplo y su texto, y a la tabla de
     [09 — Código intermedio](09-codigo-intermedio.md).

Para el texto de los mensajes y el ejemplo que se ve al pasar el mouse, su
`case` en [`TextoDeNodo.js`](../src/core/03.semantico/TextoDeNodo.js).

Si falta el `case`, nada se rompe: el verificador no revisa ese nodo (su tipo
queda `null`) y la gramática lo escribe con el nombre de su nodo como
terminal, así se nota qué falta. Después se agrega su prueba al grupo
*Analizador semántico* de [`pruebas/ejecutar.js`](../pruebas/ejecutar.js),
con `conError(código, 'parte del mensaje')` o `sinErrores(código)`.

### Cambiar los colores del código

Los colores de los cuadros de código son los de **Java en VS Code** (tema
*Light+*). Están en variables al principio de la sección *Los cuadros de
código* de [`estilos.css`](../src/ui/css/estilos.css):

```css
--java-control:     #af00db;   /* si, para, retornar...      (if, for, return)  */
--java-tipo:        #267f99;   /* entero, cadena...          (int, String)      */
--java-palabra:     #0000ff;   /* clase, funcion, verdadero  (class, true)      */
--java-funcion:     #795e26;   /* imprimirLn, raiz, sumar    (println, pow)     */
--java-variable:    #001080;   /* edad, total                                   */
--java-cadena:      #a31515;   /* "textos" y 'caracteres'                       */
--java-numero:      #098658;   /* 20, 3.5                                       */
--java-comentario:  #008000;   /* comentarios                                   */
--java-error:       #cd3131;   /* errores léxicos, subrayados                   */
```

Para usar otra paleta (la de Eclipse o la de IntelliJ, por ejemplo) se
cambian esos valores. El reporte `.html` tiene los mismos colores en sus
estilos (`.j-control`, `.j-tipo`… en [`ReporteHTML.js`](../src/core/ReporteHTML.js)).

Qué se pinta de qué color lo decide `claseDe()` en
[`ResaltadoCodigo.js`](../src/core/01.lexico/ResaltadoCodigo.js), con las
listas `CONTROL`, `DECLARACION`, `CLASES` y `CONSTANTES` y, para los nombres,
lo que tienen al lado: un nombre seguido de `(` es una función, uno después
de `clase` es una clase, y los demás son variables.

### Agregar una palabra de Java a la lista

Si alguien escribe por costumbre una palabra de Java que el analizador no
avisa, se agrega a `EQUIVALENTES_JAVA` en
[`PalabrasReservadas.js`](../src/core/01.lexico/PalabrasReservadas.js), con la de
SwordByte que va en su lugar:

```js
const EQUIVALENTES_JAVA = {
  int: 'entero',
  break: 'romper',
  // ...
};
```

### Agregar una pestaña

1. **HTML:** en [`index.html`](../src/ui/index.html), un botón
   `<button class="pestana" data-pestana="nueva">` en la barra de pestañas y un
   `<section class="panel" data-pestana="nueva">` con su propio encabezado,
   sus logos (`<figure class="logo" data-logo="uat">`…), su cuadro de código
   (`class="... editor"`) y sus botones.
2. **Orden:** su nombre en la lista `PESTANAS` de
   [`pestanas.js`](../src/ui/js/pestanas.js) (es el orden de `Ctrl+Tab`).
3. **Panel:** un archivo `panel-nueva.js` con una clase que tenga
   `limpiar()` y `pintar(resultado)`, como los otros tres.
4. **app.js:** agregar el cuadro de código a `this.editores` (así se comparte
   el código), crear el panel, llamarlo en `limpiar()` y en `analizar()` y
   conectar sus botones.
5. **Reporte:** si se quiere en el reporte, una sección más en
   [`ReporteHTML.js`](../src/core/ReporteHTML.js) y su nombre en
   `PESTANAS` de ese mismo archivo.

### Cambiar el reporte visual (.html)

Todo el reporte se arma en
[`ReporteHTML.js`](../src/core/ReporteHTML.js): una función por sección
(`encabezado`, `ficha`, `seccionCodigo`, `seccionLexico`,
`seccionSintactico`, `seccionSemantico`) y los estilos en la constante
`ESTILOS`, con la misma paleta que la aplicación.

Dos reglas para no romperlo:

- Todo texto que venga del código del usuario pasa por `esc()`. Si no, un
  `<b>` escrito en el código se vería como negritas.
- El bloque `<script type="application/json" id="datos-swordbyte">` es lo
  que permite volver a abrir el reporte. Si se le agregan campos, se agregan
  también en `extraerDatosHTML()`; si se cambia su forma, hay que subir
  `VERSION_FORMATO` y seguir aceptando la versión anterior para que los
  reportes ya guardados se sigan abriendo.

### Cambiar los datos del equipo

Están en [`src/core/comun/Equipo.js`](../src/core/comun/Equipo.js), en la
constante `INTEGRANTES`. La lista se ordena sola por apellidos al mostrarse
(ignorando los acentos), así que el orden en que se escriban en el archivo no
importa. De ahí los toman el encabezado, la ventana del equipo, la ventana de
salida y los dos reportes.

Si se cambia la lista, hay que ajustar `ORDEN_ESPERADO` en
[`pruebas/verificar-ui.js`](../pruebas/verificar-ui.js), que comprueba
justamente que el orden alfabético salga bien.

### Cambiar los logos

Copiar las imágenes en [`src/ui/img/`](../src/ui/img/) con los nombres
`logo-uat.jpeg`, `logo-uamm.jpeg` y `logo-isc.jpeg`. Si falta una, la
aplicación y el reporte muestran las siglas en su lugar. No hay que tocar
código.

El reporte `.html` lleva los logos adentro, ya achicados; eso lo hace
[`electron/logos.js`](../electron/logos.js) al guardar.

### Empaquetado

`npm run dist` genera en `dist/`:

- `CompiladorSwordByte-1.0.0-portable.exe` — un solo archivo, no se instala
- `CompiladorSwordByte-1.0.0-instalador.exe` — instalador con acceso directo

**Si el empaquetado falla con `Cannot create symbolic link`:** electron-builder
descarga un paquete con enlaces simbólicos de macOS y Windows exige permisos
para crearlos. Soluciones, de menor a mayor esfuerzo:

1. Activar el **Modo de desarrollador** de Windows
   (Configuración → Privacidad y seguridad → Para desarrolladores).
2. Ejecutar la terminal **como administrador**.
3. Extraer la caché a mano, que es lo que se hizo aquí:

```bash
CACHE="$LOCALAPPDATA/electron-builder/Cache/winCodeSign"
7za.exe x "$CACHE/winCodeSign-2.6.0.7z" -o"$CACHE/winCodeSign-2.6.0" -y
```

Los errores sobre `libcrypto.dylib` y `libssl.dylib` se pueden ignorar: son
librerías de macOS que no se usan en Windows.

### Regenerar el icono

```bash
npm run icono
```

Genera `build/icono.png` (512×512) sin dependencias externas.
electron-builder lo convierte al `.ico` de Windows.

### Regenerar la gramática documentada

```bash
npm run gramatica
```

Reescribe la sección de producciones de
[04-gramatica-ebnf.md](04-gramatica-ebnf.md) a partir de
[`Gramatica.js`](../src/core/02.sintactico/Gramatica.js), que es la única fuente
de la gramática.

### Regenerar las capturas de la documentación

```bash
npm run capturas
```

Abre la aplicación, pasa por las cuatro pestañas, analiza varios programas, abre
la ventana de Fuga, guarda un reporte `.html` y guarda las imágenes en
`docs/capturas/`:

| Imagen | Qué muestra |
|---|---|
| `lexico.png` | Pestaña 1 con `a = b + c * 24` y una fila marcada |
| `fuga.png` | La ventana de salida |
| `principal.png`, `expresion.png`, `rama.png`, `programa.png`, `equipo.png`, `errores.png` | Pestaña 2 |
| `subrayado.png` | Pestaña 2 con un `;` que falta subrayado en rojo |
| `intermedio.png`, `intermedio-cuadruplos.png` | Pestaña 4: el código de tres direcciones de un `para` con un `si`, y sus cuádruplos |
| `semantico.png`, `semantico-errores.png`, `semantico-proposiciones.png` | Pestaña 3: un programa de geometría sin errores (sólo su gramática), uno con errores semánticos subrayados y una expresión suelta a la que le falta la clase |
| `reporte.png` | El reporte `.html` completo, como se ve en el navegador |

La ventana debe quedar **a la vista** mientras se toman (con la pantalla
encendida y sin otra ventana encima): Windows no pinta una ventana tapada. Si
alguna no sale, el comando lo avisa con *no se pudo capturar …* y sigue.

En esta máquina, desde la terminal de Claude Code, hay que quitar antes la
variable `ELECTRON_RUN_AS_NODE` (ver *Problemas frecuentes* en el
[manual de usuario](06-manual-de-usuario.md#15-problemas-frecuentes)).

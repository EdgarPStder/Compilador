/**
 * documentacion.js
 * Documentación integrada en la aplicación.
 *
 * No lee archivos .md ni carpetas externas: los tres manuales viven aquí y se
 * pintan dentro de la ventana, así que funcionan igual en desarrollo y en el
 * ejecutable.
 *
 *   usuario   Manual de usuario
 *   tecnico   Manual técnico
 *   lenguaje  Documentación del lenguaje SwordByte
 */

/* global window, document */

/** Escapa el texto de un ejemplo para que se vea tal cual dentro de <pre>. */
function ej (texto) {
  const seguro = String(texto)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre><code>${seguro}</code></pre>`;
}

const MANUALES = {
  // ==================================================================
  // MANUAL DE USUARIO
  // ==================================================================
  usuario: {
    titulo: 'Manual de usuario',
    secciones: [
      {
        id: 'empezar',
        titulo: '1. Qué es SwordByte y cómo empezar',
        html: `
          <p><strong>SwordByte</strong> es un compilador didáctico: recibe un programa
          escrito en el lenguaje SwordByte, lo revisa en cuatro fases y puede
          traducirlo a Java. La aplicación abre directamente en la pestaña
          <strong>Proyecto Final</strong>, que reúne todo en una sola pantalla.</p>

          <p>Para empezar:</p>
          <ol>
            <li>Escribe un programa en la columna izquierda (<strong>Codigo fuente</strong>).</li>
            <li>Presiona <strong>Compila</strong> para ver el Java, o uno de los botones
              <strong>Analiza…</strong> para revisar una fase concreta.</li>
            <li>El resultado aparece en la columna derecha (<strong>Resultado</strong>).</li>
          </ol>

          <p>El código siempre debe ir dentro de una clase y tener un bloque
          <code>clasePrincipal</code>, como en Java:</p>
          ${ej(`clase saludo {
    clasePrincipal {
        imprimirLn("Hola, SwordByte");
    }
}`)}

          <div class="doc-nota">
            <strong>Atajo para empezar:</strong> escribe el nombre del programa y presiona
            <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Shift</span>+<span class="doc-kbd">N</span>.
            También puedes escribir <code>figuras!</code> y pulsar
            <span class="doc-kbd">Tab</span>. En los dos casos se escribe la clase
            completa con su <code>clasePrincipal</code> y el cursor queda dentro,
            listo para seguir escribiendo.
          </div>

          <div class="doc-nota">
            <strong>La regla de oro:</strong> las cuatro pestañas trabajan sobre el
            mismo código. Lo que escribes en una aparece en las demás y no se borra
            al cambiar de pestaña.
          </div>`
      },

      {
        id: 'pantalla',
        titulo: '2. La pantalla principal',
        html: `
          <p>La pestaña final tiene tres zonas:</p>

          <h3>Encabezado</h3>
          <p>Arriba van los tres logos (UAT, UAMM e ISC) y, debajo, el texto del
          proyecto: <em>Proyecto Final de Programacion de Sistemas Base II.</em>,
          el grupo <strong>9o"F"</strong> y el equipo <strong>SWORDBYTE</strong>.</p>

          <h3>Botones</h3>
          <table>
            <thead><tr><th>Botón</th><th>Qué hace</th></tr></thead>
            <tbody>
              <tr><td><strong>Analiza lexico</strong></td><td>Muestra la tabla de tokens.</td></tr>
              <tr><td><strong>Analiza sintactico</strong></td><td>Dibuja el árbol sintáctico.</td></tr>
              <tr><td><strong>Analiza semantico</strong></td><td>Muestra errores, advertencias y la gramática del código.</td></tr>
              <tr><td><strong>Compila</strong></td><td>Genera y muestra únicamente el código Java.</td></tr>
              <tr><td><strong>Carga Archivo</strong></td><td>Abre un programa <code>.bs</code>, un texto o un reporte <code>.html</code>.</td></tr>
              <tr><td><strong>Guardar fuente</strong></td><td>Guarda el programa en <code>&lt;clase&gt;/&lt;clase&gt;.sb</code>.</td></tr>
              <tr><td><strong>Guardar Compilado</strong></td><td>Guarda el Java en <code>&lt;clase&gt;/&lt;clase&gt;.java</code>.</td></tr>
              <tr><td><strong>Limpiar</strong></td><td>Borra el código y todos los resultados.</td></tr>
              <tr><td><strong>Equipo</strong></td><td>Muestra el nombre del equipo y sus integrantes.</td></tr>
              <tr><td><strong>Salir</strong></td><td>Pregunta antes de cerrar la aplicación.</td></tr>
            </tbody>
          </table>

          <h3>Editor y resultado</h3>
          <p>El editor ocupa <strong>un tercio</strong> del ancho y el resultado
          <strong>dos tercios</strong>. En el editor hay números de renglón,
          colores de Java y subrayado rojo de errores mientras escribes. El
          resultado cambia según el botón que presiones.</p>`
      },

      {
        id: 'acciones',
        titulo: '3. Analizar y compilar',
        html: `
          <h3>Análisis léxico</h3>
          <p>Lista cada token con tres datos: <strong>Lexema</strong>,
          <strong>Token</strong> y <strong>Descripción</strong>. Los errores
          léxicos salen en rojo. Por ejemplo, <code>a = b + 24</code> produce
          identificadores, el signo <code>=</code>, el <code>+</code> y el número.</p>

          <h3>Análisis sintáctico</h3>
          <p>Dibuja el árbol de la expresión o del programa. Los nodos con hijos
          se pueden pulsar para ver esa rama más de cerca. Arriba del resultado
          aparecen los botones <strong>−</strong>, <strong>+</strong> y
          <strong>Ajustar</strong>; también funciona <span class="doc-kbd">Ctrl</span>
          + rueda del ratón. El botón <strong>Ajustar</strong> hace que el árbol
          quepa a lo ancho.</p>

          <h3>Análisis semántico</h3>
          <p>Revisa que el programa tenga sentido: nombres declarados, tipos
          compatibles, condiciones lógicas, funciones que devuelven lo que
          prometen, medidas positivas, etc. Además genera la
          <strong>gramática del código</strong> que aparece en pantalla.</p>

          <h3>Compila</h3>
          <p>Traduce el programa a Java. Si hay errores, no inventa código: dice
          qué hay que corregir. El Java generado se puede guardar con
          <strong>Guardar Compilado</strong> y compilar con <code>javac</code>.</p>

          <div class="doc-nota advertencia">
            Los análisis léxico y sintáctico aceptan expresiones sueltas para
            practicar (<code>a = b + c</code>). El análisis semántico y
            <strong>Compila</strong> solo trabajan con programas completos.
          </div>`
      },

      {
        id: 'archivos',
        titulo: '4. Cargar, guardar y compilar archivos',
        html: `
          <h3>Carga Archivo</h3>
          <p>Abre el diálogo del sistema. Se pueden elegir programas
          <code>.bs</code>, textos <code>.txt</code> y reportes
          <code>.html</code> generados por la aplicación. También puedes
          arrastrar un archivo y soltarlo sobre la ventana.</p>

          <h3>Guardar fuente</h3>
          <p>Pide una carpeta y crea dentro la carpeta de la clase:</p>
          ${ej(`<carpeta elegida>/<clase>/<clase>.sb`)}

          <p>Por ejemplo, para <code>clase figuras { ... }</code> se crea
          <code>figuras/figuras.sb</code>. El archivo se llama igual que la
          clase, como en Java.</p>

          <h3>Guardar Compilado</h3>
          <p>Hace lo mismo, pero escribe el Java generado:</p>
          ${ej(`<carpeta elegida>/<clase>/<clase>.java`)}

          <p>Después puedes abrir una terminal en esa carpeta y ejecutar:</p>
          ${ej(`javac figuras.java
java figuras`)}

          <div class="doc-nota">
            Si <strong>Guardar Compilado</strong> avisa que no hay Java, primero
            presiona <strong>Compila</strong> y corrige los errores que muestre
            el compilador.
          </div>`
      },

      {
        id: 'pestanas',
        titulo: '5. Pestañas de los analizadores',
        html: `
          <p>Además de la pestaña final, la aplicación conserva las tres pestañas
          originales de los analizadores. Empiezan ocultas para dejar la pantalla
          limpia:</p>

          <table>
            <thead><tr><th>Pestaña</th><th>Atajo</th><th>Contenido</th></tr></thead>
            <tbody>
              <tr><td>1. Analizador Léxico</td><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">1</span></td><td>Tabla de tokens, salida del curso y botones de la pestaña 1.</td></tr>
              <tr><td>2. Analizador Léxico-Sintáctico</td><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">2</span></td><td>Salida léxica, árbol dibujado y controles de zoom.</td></tr>
              <tr><td>3. Analizador Semántico</td><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">3</span></td><td>Errores, advertencias, tabla de símbolos y gramática.</td></tr>
            </tbody>
          </table>

          <p>Para regresar a la pestaña final usa <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">0</span>
          o el menú <strong>Ver → Proyecto Final</strong>.</p>

          <h3>Cerrar una pestaña</h3>
          <p>Cada pestaña de analizador tiene una <strong>×</strong> a la derecha.
          Al pulsarla, la pestaña se esconde otra vez. Si era la pestaña activa,
          la aplicación regresa automáticamente a la pestaña final. También puedes
          cerrar las tres desde <strong>Ver → Cerrar pestañas de analizadores</strong>.</p>

          <p><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Tab</span>
          recorre solo las pestañas que están abiertas: una pestaña cerrada no
          reaparece sin querer.</p>`
      },

      {
        id: 'atajos',
        titulo: '6. Atajos de teclado',
        html: `
          <table>
            <thead><tr><th>Atajo</th><th>Acción</th></tr></thead>
            <tbody>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">0</span></td><td>Ir a la pestaña final.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">1</span> / <span class="doc-kbd">2</span> / <span class="doc-kbd">3</span></td><td>Ir a la pestaña del analizador 1, 2 o 3 (y abrirla si estaba cerrada).</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Tab</span></td><td>Pestaña siguiente (solo entre las abiertas).</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Shift</span>+<span class="doc-kbd">Tab</span></td><td>Pestaña anterior.</td></tr>
              <tr><td><span class="doc-kbd">F5</span></td><td>Analizar el código de la pestaña activa.</td></tr>
              <tr><td><span class="doc-kbd">F1</span></td><td>Abrir esta documentación.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">O</span></td><td>Abrir un programa o reporte.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">S</span></td><td>Guardar reporte.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">L</span></td><td>Limpiar el código y los resultados.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Q</span></td><td>Salir (pregunta antes).</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Shift</span>+<span class="doc-kbd">N</span></td><td>Escribir <code>clase</code> y <code>clasePrincipal</code> con el nombre seleccionado (o el que está antes del cursor).</td></tr>
              <tr><td><span class="doc-kbd">Tab</span> después de <code>nombre!</code></td><td>Convertir el nombre en la clase completa con su <code>clasePrincipal</code>.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">+</span> o <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">=</span></td><td>Acercar toda la interfaz.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">−</span></td><td>Alejar toda la interfaz.</td></tr>
              <tr><td><span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Shift</span>+<span class="doc-kbd">0</span></td><td>Regresar el zoom de la interfaz al 100 %.</td></tr>
              <tr><td><span class="doc-kbd">Tab</span></td><td>Insertar cuatro espacios dentro del editor.</td></tr>
              <tr><td><span class="doc-kbd">Esc</span></td><td>Cerrar la ventana del equipo, la de salida o la documentación.</td></tr>
              <tr><td><span class="doc-kbd">F11</span></td><td>Pantalla completa.</td></tr>
            </tbody>
          </table>`
      },

      {
        id: 'problemas',
        titulo: '7. Si algo no funciona',
        html: `
          <table>
            <thead><tr><th>Lo que ves</th><th>Qué hacer</th></tr></thead>
            <tbody>
              <tr><td><em>Falta la clase</em></td><td>Envuelve las instrucciones en <code>clase nombre { clasePrincipal { ... } }</code>.</td></tr>
              <tr><td><em>El programa tiene errores</em> al compilar</td><td>Presiona <strong>Analiza semantico</strong> y corrige los errores; después vuelve a <strong>Compila</strong>.</td></tr>
              <tr><td>No aparece el botón de una pestaña</td><td>Ábrela desde el menú <strong>Ver</strong> o con <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">1</span>/<span class="doc-kbd">2</span>/<span class="doc-kbd">3</span>.</td></tr>
              <tr><td>La pestaña no se quiere cerrar</td><td>Pulsa la <strong>×</strong> de la pestaña o usa <strong>Ver → Cerrar pestañas de analizadores</strong>.</td></tr>
              <tr><td>El árbol quedó muy grande o muy pequeño</td><td>Usa <strong>−</strong>, <strong>+</strong> o <strong>Ajustar</strong>. Si el resultado es el de la pestaña final, los controles están junto a <strong>Resultado</strong>.</td></tr>
              <tr><td>La interfaz se ve enorme</td><td>Presiona <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Shift</span>+<span class="doc-kbd">0</span> para volver al 100 %.</td></tr>
              <tr><td>No se guardó el archivo</td><td>Revisa que hayas elegido una carpeta con permisos y que el programa tenga una clase con nombre.</td></tr>
            </tbody>
          </table>`
      },

      {
        id: 'equipo',
        titulo: '8. Equipo, salir y ayuda',
        html: `
          <p>El botón <strong>Equipo</strong> (y el menú <strong>Ayuda → Equipo</strong>)
          muestra el nombre del equipo y la lista de integrantes. El botón
          <strong>Salir</strong>, el menú <strong>Archivo → Salir</strong> y
          <span class="doc-kbd">Ctrl</span>+<span class="doc-kbd">Q</span> preguntan
          antes de cerrar la aplicación. Si hay código escrito, la ventana avisa
          que no se guardará.</p>

          <p>Esta documentación se abre con <span class="doc-kbd">F1</span> o desde
          <strong>Ayuda → Documentación</strong>. Tiene tres manuales:</p>
          <ul>
            <li><strong>Manual de usuario</strong>: esta guía.</li>
            <li><strong>Manual técnico</strong>: cómo está construido el compilador.</li>
            <li><strong>Lenguaje SwordByte</strong>: sintaxis, funciones y buenas prácticas.</li>
          </ul>`
      }
    ]
  },

  // ==================================================================
  // MANUAL TÉCNICO
  // ==================================================================
  tecnico: {
    titulo: 'Manual técnico',
    secciones: [
      {
        id: 'vision',
        titulo: '1. Visión general',
        html: `
          <p>La aplicación es un compilador de escritorio hecho con
          <strong>Electron</strong>. Se divide en tres procesos y una biblioteca
          de compilación:</p>

          <table>
            <thead><tr><th>Parte</th><th>Carpeta</th><th>Responsabilidad</th></tr></thead>
            <tbody>
              <tr><td>Proceso principal</td><td><code>electron/main.js</code></td><td>Ventana, menú, diálogos de archivo, IPC y ejecución del compilador.</td></tr>
              <tr><td>Puente seguro</td><td><code>electron/preload.js</code></td><td>Expone <code>window.api</code> con las operaciones permitidas.</td></tr>
              <tr><td>Interfaz</td><td><code>src/ui/</code></td><td>HTML, CSS y JavaScript de las pestañas y paneles.</td></tr>
              <tr><td>Compilador</td><td><code>src/core/</code></td><td>Fases léxica, sintáctica, semántica y generación de Java.</td></tr>
            </tbody>
          </table>

          <p>La interfaz no tiene acceso a Node ni al sistema de archivos. Todo lo
          que necesita del sistema pasa por <code>window.api</code> y por IPC,
          con <code>contextIsolation</code> activado.</p>`
      },

      {
        id: 'flujo',
        titulo: '2. Flujo de compilación',
        html: `
          <p>La función central es <code>compilar(fuente, opciones)</code>, en
          <code>src/core/Compilador.js</code>. Ejecuta las fases en orden y
          devuelve un solo objeto:</p>
          ${ej(`{
  ok,          // true si no hay errores léxicos ni sintácticos
  fuente,
  lexico:      { errores, tabla, lineas, identificadores, ... },
  sintactico:  { ast, arbol, errores, modo, ... },
  semantico:   { correcto, errores, advertencias, reglas, ... },
  java:        { ok, codigo, nombreClase, error },
  errores,
  tiempoMs
}`)}

          <p>Las fases comparten dos piezas de <code>src/core/comun/</code>:</p>
          <ul>
            <li><strong>Tabla de símbolos:</strong> el léxico anota cada nombre, el
              sintáctico usa sus etiquetas <code>id1</code>, <code>id2</code>… y el
              semántico completa tipo y ámbito.</li>
            <li><strong>ErrorCompilacion:</strong> todas las fases reportan con el
              mismo formato (fase, mensaje, línea, columna y sugerencia).</li>
          </ul>

          <p>La generación de Java solo corre para un AST de tipo
          <code>Programa</code>, con nombre de clase real y sin errores léxicos,
          sintácticos ni semánticos.</p>`
      },

      {
        id: 'lexico',
        titulo: '3. Fase léxica',
        html: `
          <p>El analizador léxico recorre el texto carácter por carácter con un
          autómata finito determinista (AFD). Reconoce:</p>
          <ul>
            <li>Palabras reservadas y tipos de dato.</li>
            <li>Identificadores y literales numéricos, de cadena, carácter y lógicos.</li>
            <li>Operadores simples y dobles, delimitadores y comentarios.</li>
          </ul>

          <p>Cada token guarda su tipo, su lexema, su línea, su columna y el estado
          del AFD donde se aceptó. Los comentarios se reconocen, pero no llegan al
          sintáctico.</p>

          <p>La tabla que se muestra en la pestaña 1 se construye en
          <code>01.lexico/TablaLexica.js</code>; la salida del curso
          (<code>a &gt; b</code> → <code>id1 &gt; id2</code>) en
          <code>FormatoLexico.js</code>. El resaltado del editor y el subrayado de
          errores usan <code>ResaltadoCodigo.js</code> desde el preload.</p>

          <div class="doc-nota">
            Los errores léxicos no detienen el análisis: se registran y se sigue
            leyendo, para reportar varios en una sola pasada.
          </div>`
      },

      {
        id: 'sintactico',
        titulo: '4. Fase sintáctica',
        html: `
          <p>El analizador sintáctico es descendente recursivo. Cada regla de la
          gramática es un método de <code>AnalizadorSintactico.js</code> y
          construye nodos del AST. El resultado se convierte a un árbol compacto
          para dibujarlo con <code>NodosAST.aArbolCompacto()</code>.</p>

          <p>El analizador tiene tres modos:</p>
          <table>
            <thead><tr><th>Modo</th><th>Qué acepta</th></tr></thead>
            <tbody>
              <tr><td><code>auto</code></td><td>Decide entre programa, instrucciones o expresión según el contenido.</td></tr>
              <tr><td><code>programa</code></td><td>Solo <code>clase nombre { clasePrincipal { ... } }</code>.</td></tr>
              <tr><td><code>expresion</code></td><td>Una expresión suelta, para practicar en las pestañas 1 y 2.</td></tr>
            </tbody>
          </table>

          <p>Ante un error, el analizador se recupera y continúa para reportar más
          de uno. Cada error trae línea, columna y una sugerencia; por ejemplo, si
          se escribe <code>if</code> de Java, sugiere <code>si</code>.</p>

          <p>La gramática EBNF que se muestra en la pestaña 3 no es fija: se genera
          con <code>GeneradorGramatica.js</code> a partir de las producciones que
          realmente aparecen en el código.</p>`
      },

      {
        id: 'semantico',
        titulo: '5. Fase semántica',
        html: `
          <p>El verificador semántico recorre el AST con la tabla de símbolos y
          revisa, entre otras cosas:</p>
          <ul>
            <li>Que cada nombre se declare antes de usarse y no se repita en el mismo ámbito.</li>
            <li>Que los tipos sean compatibles en asignaciones, operadores, condiciones y retornos.</li>
            <li>Que las constantes no cambien y que las variables se usen después de recibir valor.</li>
            <li>Que los arreglos y matrices revisen tamaño, índices y valores.</li>
            <li>Que las funciones existan, reciban la aridad correcta y devuelvan su tipo.</li>
            <li>Que <code>romper</code> y <code>retornar</code> estén donde tienen sentido.</li>
            <li>Que las medidas de geometría sean positivas y que los triángulos sean posibles.</li>
            <li>Que <code>imprimirF</code> use formatos válidos y la cantidad correcta de valores.</li>
          </ul>

          <p>También produce <strong>advertencias</strong> (variables sin usar,
          código que no corre, división entre cero) y la gramática del código.</p>

          <p>Si hay errores léxicos o sintácticos, el semántico no revisa: repite
          los errores anteriores y explica que primero hay que corregirlos. Por eso
          <code>resultado.ok</code> solo refleja errores léxicos y sintácticos;
          para saber si el programa tiene sentido hay que mirar
          <code>semantico.correcto</code>.</p>`
      },

      {
        id: 'java',
        titulo: '6. Generación de código Java',
        html: `
          <p><code>04.codigo/GeneradorJava.js</code> traduce el AST a una clase
          Java. Las equivalencias principales son:</p>

          <table>
            <thead><tr><th>SwordByte</th><th>Java</th></tr></thead>
            <tbody>
              <tr><td><code>clase</code> / <code>clasePrincipal</code></td><td><code>public class</code> / <code>public static void main</code></td></tr>
              <tr><td><code>entero</code>, <code>decimal</code>, <code>cadena</code>…</td><td><code>int</code>, <code>double</code>, <code>String</code>…</td></tr>
              <tr><td><code>imprimir</code>, <code>imprimirLn</code>, <code>imprimirF</code></td><td><code>System.out.print</code>, <code>println</code>, <code>printf</code></td></tr>
              <tr><td><code>Y</code>, <code>O</code>, <code>NO</code></td><td><code>&amp;&amp;</code>, <code>||</code>, <code>!</code></td></tr>
              <tr><td><code>potencia</code>, geometry, <code>redondear</code>…</td><td><code>Math.*</code></td></tr>
              <tr><td><code>leer</code></td><td><code>Scanner</code></td></tr>
              <tr><td><code>equipo(Null)</code></td><td>Líneas con los datos del equipo</td></tr>
            </tbody>
          </table>

          <p>El nombre de la clase se conserva; si coincide con una palabra
          reservada de Java, se ajusta con un guion bajo. El código generado se
          prueba con <code>javac</code> en la suite del proyecto.</p>

          <p>Si el programa no es completo o tiene errores, el generador devuelve
          <code>ok: false</code> y un mensaje. La interfaz muestra ese mensaje en
          la pestaña final y no permite guardar un archivo Java vacío.</p>`
      },

      {
        id: 'interfaz',
        titulo: '7. Interfaz Electron y documentación',
        html: `
          <p>La interfaz activa está en <code>src/ui/</code>. El proceso principal
          carga <code>src/ui/index.html</code>; la carpeta <code>src/gui/</code>
          es un diseño anterior que se conserva pero no se usa.</p>

          <p>Las piezas principales del renderer son:</p>
          <ul>
            <li><code>app.js</code>: crea la aplicación, conecta botones, atajos y el código compartido.</li>
            <li><code>pestanas.js</code>: muestra, oculta, cierra y recorre pestañas.</li>
            <li><code>editor.js</code>: números de renglón, colores y subrayado.</li>
            <li><code>panel-lexico.js</code>, <code>panel-sintactico.js</code>, <code>panel-semantico.js</code>: paneles de las tres pestañas.</li>
            <li><code>panel-final.js</code>: tabla, árbol, semántica y Java de la pestaña final.</li>
            <li><code>documentacion.js</code>: los tres manuales integrados.</li>
            <li><code>arbol.js</code>: dibujo del árbol, ramas y zoom.</li>
          </ul>

          <p>Los canales IPC están en <code>electron/preload.js</code> y se atienden
          en <code>electron/main.js</code>: <code>compilador:analizar</code>,
          <code>compilador:equipo</code>, <code>archivo:abrir</code>,
          <code>archivo:guardar</code>, <code>archivo:guardarFuente</code>,
          <code>archivo:guardarCompilado</code>, <code>archivo:verReporte</code> y
          <code>app:salir</code>.</p>

          <p>La documentación ya no abre archivos Markdown ni una carpeta externa:
          el contenido de <code>documentacion.js</code> se pinta en el modal
          <code>#modal-documentacion</code>. Así funciona igual en desarrollo y en
          el ejecutable empaquetado.</p>`
      },

      {
        id: 'pruebas',
        titulo: '8. Pruebas, mantenimiento y empaquetado',
        html: `
          <p>Los comandos del proyecto son:</p>
          <table>
            <thead><tr><th>Comando</th><th>Qué hace</th></tr></thead>
            <tbody>
              <tr><td><code>npm start</code></td><td>Abre la aplicación.</td></tr>
              <tr><td><code>npm run pruebas</code></td><td>Pruebas del compilador: léxico, sintáctico, semántico, Java, reportes y ejemplos.</td></tr>
              <tr><td><code>npm run pruebas:ui</code></td><td>Abre la ventana real y revisa la interfaz.</td></tr>
              <tr><td><code>npm run capturas</code></td><td>Regenera las capturas de la documentación del repositorio.</td></tr>
              <tr><td><code>npm run dist</code></td><td>Genera el portable y el instalador de Windows.</td></tr>
            </tbody>
          </table>

          <h3>Agregar un ejemplo</h3>
          <p>Guarda un archivo <code>.bs</code> en <code>ejemplos/</code>. El menú
          <strong>Ejemplos</strong> lo detecta al iniciar y las pruebas lo revisan
          automáticamente.</p>

          <h3>Agregar o cambiar una regla</h3>
          <ol>
            <li>Agrega la palabra en <code>01.lexico/PalabrasReservadas.js</code>.</li>
            <li>Escribe el método de la regla en <code>02.sintactico/AnalizadorSintactico.js</code>.</li>
            <li>Agrega el nodo en <code>NodosAST.js</code> y, si aplica, en <code>GeneradorGramatica.js</code>.</li>
            <li>Revisa tipos y ámbitos en <code>03.semantico/VerificadorSemantico.js</code>.</li>
            <li>Traduce el nodo en <code>04.codigo/GeneradorJava.js</code>.</li>
            <li>Agrega una prueba en <code>pruebas/ejecutar.js</code> y ejecuta las dos suites.</li>
          </ol>

          <div class="doc-nota">
            Antes de entregar, ejecuta <code>npm run pruebas</code> y
            <code>npm run pruebas:ui</code>. Las dos deben terminar sin fallas.
          </div>`
      }
    ]
  },

  // ==================================================================
  // LENGUAJE SWORDBYTE
  // ==================================================================
  lenguaje: {
    titulo: 'Documentación del lenguaje SwordByte',
    secciones: [
      {
        id: 'presentacion',
        titulo: '1. Presentación',
        html: `
          <p><strong>SwordByte</strong> es un lenguaje de programación didáctico
          basado en Java. Su objetivo es practicar las fases de un compilador sin
          perder la familiaridad de Java: la estructura, los tipos y las
          instrucciones se parecen, pero las palabras clave están en español.</p>

          <table>
            <thead><tr><th>Dato</th><th>Valor</th></tr></thead>
            <tbody>
              <tr><td>Extensión</td><td><code>.bs</code></td></tr>
              <tr><td>Lenguaje destino</td><td>Java</td></tr>
              <tr><td>Punto de entrada</td><td><code>clasePrincipal</code></td></tr>
              <tr><td>Fin de instrucción</td><td><code>;</code></td></tr>
              <tr><td>Comentarios</td><td><code>//</code> y <code>/* ... */</code></td></tr>
            </tbody>
          </table>

          <p>Un programa se guarda en un archivo con el nombre de su clase, igual
          que en Java: <code>clase figuras</code> se guarda como
          <code>figuras.sb</code> y produce <code>figuras.java</code>.</p>`
      },

      {
        id: 'estructura',
        titulo: '2. Estructura de un programa',
        html: `
          <p>Todo programa vive dentro de una clase y necesita exactamente un
          bloque <code>clasePrincipal</code>. Las funciones pueden ir antes o
          después de él.</p>

          ${ej(`clase nombreDelPrograma {

    funcion entero sumar(entero a, entero b) {
        retornar a + b;
    }

    clasePrincipal {
        entero resultado = sumar(2, 3);
        imprimirLn(resultado);
    }
}`)}

          <p>No se puede escribir código suelto fuera de la clase: el compilador
          reporta <em>Falta la clase</em>. Las expresiones sueltas
          (<code>a = b + c</code>) solo se aceptan en las pestañas 1 y 2 para
          practicar; el análisis semántico y la compilación piden un programa
          completo.</p>

          <h3>Equivalente en Java</h3>
          ${ej(`public class nombreDelPrograma {
    static int sumar(int a, int b) { return a + b; }
    public static void main(String[] args) {
        int resultado = sumar(2, 3);
        System.out.println(resultado);
    }
}`)}`
      },

      {
        id: 'tipos',
        titulo: '3. Tipos, variables y constantes',
        html: `
          <p>Los tipos de dato son:</p>
          <table>
            <thead><tr><th>Tipo</th><th>Java</th><th>Valores</th></tr></thead>
            <tbody>
              <tr><td><code>logico</code></td><td><code>boolean</code></td><td><code>verdadero</code>, <code>falso</code></td></tr>
              <tr><td><code>byte</code></td><td><code>byte</code></td><td>Entero de 8 bits</td></tr>
              <tr><td><code>caracter</code></td><td><code>char</code></td><td>Un carácter Unicode</td></tr>
              <tr><td><code>corto</code></td><td><code>short</code></td><td>Entero de 16 bits</td></tr>
              <tr><td><code>entero</code></td><td><code>int</code></td><td>Entero de 32 bits</td></tr>
              <tr><td><code>largo</code></td><td><code>long</code></td><td>Entero de 64 bits</td></tr>
              <tr><td><code>flotante</code></td><td><code>float</code></td><td>Punto flotante de 32 bits</td></tr>
              <tr><td><code>decimal</code></td><td><code>double</code></td><td>Punto flotante de 64 bits</td></tr>
              <tr><td><code>cadena</code></td><td><code>String</code></td><td>Texto</td></tr>
              <tr><td><code>vacio</code></td><td><code>void</code></td><td>Sin valor (solo funciones)</td></tr>
            </tbody>
          </table>

          <h3>Declaraciones</h3>
          ${ej(`entero edad = 20;        // con valor inicial
entero a;                // sin valor inicial
entero x, y, z;          // varias del mismo tipo
Constante decimal IVA = 0.16;`)}

          <p>Una variable debe recibir un valor antes de usarse. Una
          <code>Constante</code> no puede cambiar después de su declaración.</p>

          <h3>Literales</h3>
          <table>
            <thead><tr><th>Tipo</th><th>Ejemplos</th></tr></thead>
            <tbody>
              <tr><td>Entero</td><td><code>20</code>, <code>0</code>, <code>30000</code></td></tr>
              <tr><td>Entero largo</td><td><code>8000000L</code></td></tr>
              <tr><td>Decimal</td><td><code>3.1416</code>, <code>8.5</code></td></tr>
              <tr><td>Flotante</td><td><code>8.5f</code></td></tr>
              <tr><td>Cadena</td><td><code>"Hola"</code>, <code>"Línea\\n"</code></td></tr>
              <tr><td>Carácter</td><td><code>'A'</code>, <code>'\\n'</code></td></tr>
              <tr><td>Lógico</td><td><code>verdadero</code>, <code>falso</code></td></tr>
            </tbody>
          </table>

          <p><code>4.</code> es un error léxico: después del punto debe venir al
          menos un dígito.</p>`
      },

      {
        id: 'operadores',
        titulo: '4. Operadores y precedencia',
        html: `
          <p>La jerarquía va de menor a mayor prioridad. Los operadores que se
          aplican al final quedan arriba en el árbol sintáctico:</p>

          <table>
            <thead><tr><th>Grupo</th><th>Operadores</th></tr></thead>
            <tbody>
              <tr><td>Booleanos</td><td><code>O</code>, <code>Y</code>, <code>NO</code></td></tr>
              <tr><td>Relacionales</td><td><code>==</code>, <code>!=</code>, <code>&lt;</code>, <code>&lt;=</code>, <code>&gt;</code>, <code>&gt;=</code></td></tr>
              <tr><td>Aritméticos</td><td><code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>%</code>, unarios, paréntesis</td></tr>
            </tbody>
          </table>

          <p>La lógica se escribe con palabras:</p>
          ${ej(`si (edad >= 18 Y tieneCredencial) {
    imprimirLn("Puede entrar");
}

si (NO estaCerrado O hayExcepcion) {
    imprimirLn("Abierto");
}`)}

          <p>La asignación <code>=</code> también funciona como expresión, por eso
          se puede analizar <code>a = b + c</code>. La asociatividad es:</p>
          <ul>
            <li><code>=</code> asocia a la derecha: <code>a = b = 5</code> es <code>a = (b = 5)</code>.</li>
            <li>Los binarios asocian a la izquierda: <code>10 - 3 - 2</code> es <code>(10 - 3) - 2</code>.</li>
            <li><code>NO</code> y los unarios asocian a la derecha.</li>
          </ul>

          <p>El incremento y decremento se escriben <code>contador++</code> y
          <code>contador--</code>.</p>

          <div class="doc-nota advertencia">
            En el lenguaje, las potencias y raíces se escriben con
            <code>potencia(base, exponente)</code>. Las pestañas 1 y 2 también
            reconocen <code>^</code>, <code>**</code>, <code>√</code> y
            <code>raiz()</code> para practicar la jerarquía, pero el análisis
            semántico las marca como error y dice cómo escribirlas.
          </div>`
      },

      {
        id: 'control',
        titulo: '5. Control de flujo',
        html: `
          <h3>Decisión</h3>
          ${ej(`si (edad >= 18) {
    imprimirLn("Mayor de edad");
} sinoSi (edad > 0) {
    imprimirLn("Menor de edad");
} sino {
    imprimirLn("Edad no válida");
}`)}

          <h3>Ciclos</h3>
          ${ej(`para (entero i = 1; i <= 3; i++) {
    imprimirLn(i);
}

mientras (i <= 3) {
    imprimirLn(i);
    i++;
}

hacer {
    imprimirLn("Al menos una vez");
} mientras (x < 1);`)}

          <h3>Selección múltiple</h3>
          ${ej(`opcion (dia) {
    caso 1:
        imprimirLn("Lunes");
        romper;
    caso 2:
        imprimirLn("Martes");
        romper;
    porDefecto:
        imprimirLn("Otro día");
}`)}

          <h3>Manejo de errores</h3>
          ${ej(`intentar {
    entero x = 10 / 0;
} capturar (Error e) {
    imprimirLn("Error: división entre cero.");
}`)}

          <p>Las condiciones de <code>si</code>, <code>mientras</code> y
          <code>hacer ... mientras</code> deben ser lógicas. <code>romper</code>
          solo va dentro de un ciclo o de <code>opcion</code>, y
          <code>retornar</code> solo dentro de una función.</p>`
      },

      {
        id: 'funciones',
        titulo: '6. Funciones',
        html: `
          <p>Una función se declara con <code>funcion</code>, su tipo de retorno,
          su nombre y sus parámetros. Si no devuelve nada, el tipo es
          <code>vacio</code>.</p>

          ${ej(`funcion entero sumar(entero a, entero b) {
    retornar a + b;
}

funcion vacio saludar(cadena nombre) {
    imprimirLn("Hola " + nombre);
}

clasePrincipal {
    entero total = sumar(4, 6);
    saludar("Ana");
    imprimirLn(total);
}`)}

          <p>Una función con tipo de retorno distinto de <code>vacio</code> debe
          terminar con <code>retornar</code> un valor compatible. Las funciones
          pueden llamarse entre sí y se revisan la aridad y los tipos de los
          argumentos.</p>

          <div class="doc-nota">
            Las funciones son <code>static</code> en Java, así que no hace falta
            crear objetos para llamarlas.
          </div>`
      },

      {
        id: 'arreglos',
        titulo: '7. Arreglos y matrices',
        html: `
          <p>Un arreglo se declara con <code>Arreglo</code> y una matriz con
          <code>matriz</code>:</p>

          ${ej(`Arreglo entero datos[3];                     // tamaño definido
Arreglo cadena nombres[] = {"Ana", "Luis"};  // por valores
matriz entero tabla[2][2] = {{1, 2}, {3, 4}};
matriz entero t[3][3];`)}

          <p>Los índices empiezan en cero:</p>
          ${ej(`datos[0] = 10;
tabla[1][1] = 7;
entero tam = longitud(datos);
imprimirF("El arreglo tiene %d posiciones%n", tam);`)}

          <p>El análisis semántico revisa que el índice sea entero, que esté dentro
          del tamaño y que el valor guardado sea del tipo del arreglo.</p>`
      },

      {
        id: 'biblioteca',
        titulo: '8. Biblioteca estándar y funciones nativas',
        html: `
          <h3>Entrada y salida</h3>
          <table>
            <thead><tr><th>Función</th><th>Uso</th></tr></thead>
            <tbody>
              <tr><td><code>imprimir(x)</code></td><td>Escribe sin salto de línea.</td></tr>
              <tr><td><code>imprimirLn(x)</code></td><td>Escribe con salto de línea.</td></tr>
              <tr><td><code>imprimirF(formato, ...)</code></td><td>Escribe con formato: <code>%d %f %.2f %s %c %b %x %o %e %n %%</code>.</td></tr>
              <tr><td><code>leer(variable)</code></td><td>Lee un valor del teclado y lo guarda.</td></tr>
              <tr><td><code>equipo(Null)</code></td><td>Muestra el nombre del equipo y sus integrantes.</td></tr>
              <tr><td><code>limpiar()</code></td><td>Limpia la consola.</td></tr>
              <tr><td><code>esperar(ms)</code></td><td>Pausa el programa los milisegundos indicados.</td></tr>
            </tbody>
          </table>

          <h3>Matemáticas</h3>
          <table>
            <thead><tr><th>Función</th><th>Resultado</th><th>Tipo</th></tr></thead>
            <tbody>
              <tr><td><code>longitud(x)</code></td><td>Tamaño de una cadena o arreglo.</td><td><code>entero</code></td></tr>
              <tr><td><code>aleatorio(min, max)</code></td><td>Entero aleatorio entre dos enteros.</td><td><code>entero</code></td></tr>
              <tr><td><code>potencia(base, exp)</code></td><td>Potencia o raíz con exponente fraccionario.</td><td><code>decimal</code></td></tr>
              <tr><td><code>redondear(x)</code></td><td>Entero más cercano.</td><td><code>entero</code></td></tr>
              <tr><td><code>logaritmo(x)</code> / <code>logaritmo(base, x)</code></td><td>Logaritmo natural o en otra base.</td><td><code>decimal</code></td></tr>
              <tr><td><code>logaritmo10(x)</code></td><td>Logaritmo base 10.</td><td><code>decimal</code></td></tr>
              <tr><td><code>seno(x)</code> / <code>coseno(x)</code></td><td>Seno y coseno (en radianes).</td><td><code>decimal</code></td></tr>
              <tr><td><code>convertir(valor, tipo)</code></td><td>Convierte entre número, texto, carácter y lógico.</td><td>El tipo destino</td></tr>
            </tbody>
          </table>

          <h3>Geometría</h3>
          <p>Estas funciones devuelven <code>decimal</code> y revisan que las
          medidas sean positivas:</p>
          <table>
            <thead><tr><th>Familia</th><th>Figuras</th></tr></thead>
            <tbody>
              <tr><td><code>perimetro.*</code></td><td><code>circulo(r)</code>, <code>cuadrado(l)</code>, <code>rectangulo(b, h)</code>, <code>triangulo(a, b, c)</code></td></tr>
              <tr><td><code>area.*</code></td><td><code>circulo(r)</code>, <code>cuadrado(l)</code>, <code>rectangulo(b, h)</code>, <code>triangulo(b, h)</code></td></tr>
              <tr><td><code>volumen.*</code></td><td><code>cubo(l)</code>, <code>esfera(r)</code>, <code>cilindro(r, h)</code>, <code>cono(r, h)</code>, <code>prisma(a, h)</code>, <code>piramide(a, h)</code></td></tr>
            </tbody>
          </table>

          ${ej(`decimal radio = 2.5;
imprimirLn(area.circulo(radio));
imprimirLn(volumen.esfera(radio));`)}`
      },

      {
        id: 'buenas-practicas',
        titulo: '9. Buenas prácticas',
        html: `
          <ul>
            <li><strong>Nombra con intención.</strong> <code>totalVentas</code> dice más que <code>x</code>. Los nombres empiezan con letra o <code>_</code>, no pueden ser palabras reservadas y distinguen mayúsculas.</li>
            <li><strong>Una instrucción por línea.</strong> Así los errores de línea y columna te llevan directo al problema.</li>
            <li><strong>Declara cerca de donde usas.</strong> Una variable debe recibir valor antes de leerse.</li>
            <li><strong>Usa constantes para valores fijos.</strong> <code>Constante decimal IVA = 0.16;</code> evita números mágicos.</li>
            <li><strong>Divide en funciones.</strong> Una función debe hacer una cosa y devolver un tipo claro.</li>
            <li><strong>Revisa las condiciones.</strong> Las condiciones son lógicas: no escribas <code>si (numero)</code>, escribe <code>si (numero &gt; 0)</code>.</li>
            <li><strong>Cuida la división.</strong> Verifica que el divisor no sea cero o usa <code>intentar ... capturar</code>.</li>
            <li><strong>Valida las medidas.</strong> En geometría, las longitudes deben ser positivas y los triángulos deben cumplir la desigualdad triangular.</li>
            <li><strong>Comenta el porqué, no el qué.</strong> El código ya dice qué hace; el comentario debe explicar la intención.</li>
            <li><strong>Compila seguido.</strong> Alterna <strong>Analiza semantico</strong> y <strong>Compila</strong> para corregir errores pequeños antes de que se acumulen.</li>
          </ul>

          <div class="doc-nota">
            Un programa correcto en SwordByte debe pasar las tres fases y generar
            Java que compile con <code>javac</code>. Esa es la mejor señal de que
            está bien escrito.
          </div>`
      },

      {
        id: 'errores',
        titulo: '10. Errores comunes',
        html: `
          <table>
            <thead><tr><th>Error</th><th>Causa</th><th>Solución</th></tr></thead>
            <tbody>
              <tr><td><em>Falta la clase</em></td><td>Hay instrucciones fuera de <code>clase</code>.</td><td>Envuelve todo en <code>clase nombre { clasePrincipal { ... } }</code>.</td></tr>
              <tr><td><em>Se esperaba ;</em></td><td>Falta el punto y coma.</td><td>Agrega <code>;</code> al final de la instrucción.</td></tr>
              <tr><td><em>Nombre no declarado</em></td><td>Se usa una variable antes de declararla o está mal escrita.</td><td>Declara la variable o corrige el nombre; el compilador sugiere el parecido.</td></tr>
              <tr><td><em>Un decimal no cabe en un entero</em></td><td>Asignas <code>8.5</code> a un <code>entero</code>.</td><td>Usa <code>decimal</code>, <code>redondear(...)</code> o <code>convertir(..., entero)</code>.</td></tr>
              <tr><td><em>La condición debe ser lógica</em></td><td>Se usó un número o una cadena como condición.</td><td>Escribe una comparación, por ejemplo <code>x &gt; 0</code>.</td></tr>
              <tr><td><em>Se esperaba Y, O o NO</em></td><td>Se escribió <code>AND</code>, <code>&amp;&amp;</code> o <code>!</code>.</td><td>Usa las palabras del lenguaje: <code>Y</code>, <code>O</code>, <code>NO</code>.</td></tr>
              <tr><td><em>La potencia se saca con potencia(...)</em></td><td>Se usó <code>^</code>, <code>**</code> o <code>√</code>.</td><td>Escribe <code>potencia(base, exponente)</code>.</td></tr>
              <tr><td><em>Constante no cambia</em></td><td>Se asigna otra vez a una <code>Constante</code>.</td><td>Declara una variable normal si el valor debe cambiar.</td></tr>
              <tr><td><em>La función devuelve otro tipo</em></td><td>El <code>retornar</code> no coincide con el tipo declarado.</td><td>Convierte el valor o cambia el tipo de retorno.</td></tr>
              <tr><td><em>Palabra de Java</em></td><td>Se escribió <code>int</code>, <code>if</code>, <code>while</code>…</td><td>Usa <code>entero</code>, <code>si</code>, <code>mientras</code>…</td></tr>
            </tbody>
          </table>

          <h3>Programa de referencia</h3>
          ${ej(`clase demostracion {

    funcion decimal areaCirculo(decimal radio) {
        retornar area.circulo(radio);
    }

    clasePrincipal {
        equipo(Null);

        decimal radio = 2.5;
        imprimirLn("Área: " + areaCirculo(radio));

        Arreglo entero datos[3];
        datos[0] = 10;
        entero tam = longitud(datos);
        imprimirF("El arreglo tiene %d posiciones%n", tam);

        intentar {
            entero division = 10 / 0;
        } capturar (Error e) {
            imprimirLn("Error: división entre cero.");
        }

        imprimirLn("Programa terminado.");
    }
}`)}`
      }
    ]
  }
};

class VentanaDocumentacion {
  constructor () {
    this.modal = document.getElementById('modal-documentacion');
    this.contenido = document.getElementById('doc-contenido');
    this.titulo = document.getElementById('doc-titulo');
    this.opciones = Array.from(this.modal.querySelectorAll('.doc-opcion'));

    this.modal.querySelectorAll('[data-cerrar-doc]').forEach((el) => {
      el.addEventListener('click', () => this.cerrar());
    });

    this.opciones.forEach((boton) => {
      boton.addEventListener('click', () => this.mostrar(boton.dataset.doc));
    });

    // Los enlaces del índice mueven solo el panel, no toda la ventana.
    this.contenido.addEventListener('click', (e) => {
      const enlace = e.target.closest('a[href^="#doc-"]');
      if (!enlace) return;
      e.preventDefault();
      const destino = document.getElementById(enlace.getAttribute('href').slice(1));
      if (destino) destino.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.estaAbierta()) this.cerrar();
    });
  }

  /** Abre la documentación, opcionalmente en uno de los tres manuales. */
  abrir (clave = 'usuario') {
    this.modal.classList.remove('oculto');
    this.mostrar(clave);
    this.contenido.focus();
  }

  cerrar () { this.modal.classList.add('oculto'); }

  estaAbierta () { return !this.modal.classList.contains('oculto'); }

  /** Pinta el manual pedido: 'usuario', 'tecnico' o 'lenguaje'. */
  mostrar (clave) {
    const doc = MANUALES[clave];
    if (!doc) return;

    this.titulo.textContent = doc.titulo;
    this.opciones.forEach((b) => {
      b.classList.toggle('activa', b.dataset.doc === clave);
    });

    const indice = doc.secciones
      .map((s) => `<a href="#doc-${clave}-${s.id}">${s.titulo}</a>`)
      .join('');
    const cuerpo = doc.secciones
      .map((s) => `<h2 id="doc-${clave}-${s.id}">${s.titulo}</h2>${s.html}`)
      .join('');

    this.contenido.innerHTML =
      `<nav class="doc-indice" aria-label="Contenido de este manual">${indice}</nav>` +
      `<article>${cuerpo}</article>`;
    this.contenido.scrollTop = 0;
  }
}

window.VentanaDocumentacion = VentanaDocumentacion;

/**
 * app.js
 * Conecta las tres pestañas con el compilador.
 *
 * La regla principal: las tres pestañas trabajan sobre el MISMO código.
 *   - Lo que se escribe en una pestaña se copia al momento a las otras dos.
 *   - Al analizar desde cualquier pestaña se analiza todo de una vez y se
 *     llenan los tres paneles. Al cambiar de pestaña el resultado ya está ahí.
 *   - Cambiar de pestaña no borra nada. Solo Borrar / Limpiar / Limpieza
 *     vacían el código, y lo vacían en las tres.
 *
 * Botones de cada pestaña:
 *   1. Léxico            Realizar Análisis · Guardar · Borrar · Fuga
 *   2. Léxico-Sintáctico Limpiar · Análisis Léxico · Análisis Sintáctico ·
 *                        Análisis Léxico-Sintáctico · Equipo · Salir
 *   3. Semántico         Limpieza · Analiza · Equipo · Termina
 *
 * Fuga, Salir y Termina abren la misma ventana: el equipo y la pregunta
 * "¿Quieres salir del compilador?".
 */

/* global window, document, VentanaEquipo, VentanaSalir, VentanaDocumentacion,
          Pestanas, EditorCodigo, PanelLexico, PanelLexicoSintactico,
          PanelSemantico, PanelFinal */

/** Nombre completo de cada institución, para el alt de su logo. */
const INSTITUCIONES = {
  uat: { siglas: 'UAT', nombre: 'Universidad Autónoma de Tamaulipas' },
  uamm: { siglas: 'UAMM', nombre: 'Unidad Académica Multidisciplinaria Mante' },
  isc: { siglas: 'ISC', nombre: 'Ingeniería en Sistemas Computacionales' }
};

/** Un archivo más grande que esto no es un programa: no se abre. */
const TAMANO_MAXIMO_ARCHIVO = 5 * 1024 * 1024;

class Aplicacion {
  constructor () {
    // El cuadro de código de cada pestaña. Todos llevan siempre lo mismo.
    this.editores = {
      final: document.getElementById('final-codigo'),
      lexico: document.getElementById('lex-codigo'),
      sintactico: document.getElementById('codigo'),
      semantico: document.getElementById('sem-codigo')
    };
    // A cada cuadro se le ponen sus números de renglón y los colores de Java.
    this.cuadros = Object.values(this.editores).map((ta) => new EditorCodigo(ta));

    this.panelLexico = new PanelLexico();
    this.panelSintactico = new PanelLexicoSintactico();
    this.panelSemantico = new PanelSemantico();
    this.panelFinal = new PanelFinal();

    this.ventanaEquipo = new VentanaEquipo();
    this.ventanaSalir = new VentanaSalir();
    this.pestanas = new Pestanas((nombre) => this._alCambiarPestana(nombre));
    this.ventanaDocumentacion = new VentanaDocumentacion();

    /** Nombre del programa abierto, si viene de un archivo o de un ejemplo. */
    this.nombreArchivo = null;

    this._cargarLogos();
    this._conectarBotones();
    this._conectarEditores();
    this._conectarArrastre();

    // La aplicación abre en blanco, en la pestaña del proyecto final.
    this.pestanas.mostrar('final');
    this.limpiar();
    this._cargarDatos();
  }

  // ------------------------------------------------------------------
  // Arranque
  // ------------------------------------------------------------------

  /**
   * Pide al compilador los datos del equipo y los pone en las ventanas y en
   * cada texto marcado con data-dato:
   *   data-dato="equipo"   SwordByte
   *   data-dato="grupo"    9° F
   *   data-dato="carrera"  Ingeniería en Sistemas Computacionales
   *   data-dato="materia"  Programación de Sistemas de Base II
   */
  async _cargarDatos () {
    const datos = await this.ventanaEquipo.cargar();
    this.ventanaSalir.llenar(datos);

    const valores = {
      equipo: datos.nombre,
      grupo: `${datos.materia.grado}° ${datos.materia.grupo}`,
      carrera: datos.materia.carrera,
      materia: datos.materia.nombre
    };
    document.querySelectorAll('[data-dato]').forEach((el) => {
      el.textContent = valores[el.dataset.dato];
    });
  }

  /** Pone cada logo en su hueco; si falta el archivo, deja las siglas. */
  _cargarLogos () {
    document.querySelectorAll('.logo').forEach((figura) => {
      const clave = figura.dataset.logo;
      const datos = INSTITUCIONES[clave];

      const img = document.createElement('img');
      img.src = `img/logo-${clave}.jpeg`;
      img.alt = datos.nombre;
      img.title = datos.nombre;

      img.addEventListener('error', () => {
        const respaldo = document.createElement('span');
        respaldo.className = 'respaldo';
        respaldo.textContent = datos.siglas;
        respaldo.title = datos.nombre;
        figura.replaceChildren(respaldo);
      });

      figura.replaceChildren(img);
    });
  }

  _conectarBotones () {
    const boton = (id, accion) =>
      document.getElementById(id).addEventListener('click', accion);

    // Pestaña final: Proyecto SWORDBYTE
    boton('final-lexico', () => this.analizarFinal('lexico'));
    boton('final-sintactico', () => this.analizarFinal('sintactico'));
    boton('final-semantico', () => this.analizarFinal('semantico'));
    boton('final-compila', () => this.analizarFinal('java'));
    boton('final-cargar', () => this.abrirArchivo());
    boton('final-guardar-fuente', () => this.guardarFuente());
    boton('final-guardar-compilado', () => this.guardarCompilado());
    boton('final-limpiar', () => this.limpiar());
    boton('final-equipo', () => this.ventanaEquipo.abrir());
    boton('final-salir', () => this.salir());

    // Pestaña 1: Analizador Léxico
    boton('lex-analizar', () => this.analizar('lexico'));
    boton('lex-guardar', () => this.guardarReporte());
    boton('lex-borrar', () => this.limpiar());
    boton('lex-fuga', () => this.salir());

    // Pestaña 2: Analizador Léxico-Sintáctico
    boton('btn-limpiar', () => this.limpiar());
    boton('btn-lexico', () => this.analizar('sintactico', 'lexico'));
    boton('btn-sintactico', () => this.analizar('sintactico', 'sintactico'));
    boton('btn-ambos', () => this.analizar('sintactico', 'ambos'));
    boton('btn-equipo', () => this.ventanaEquipo.abrir());
    boton('btn-salir', () => this.salir());

    // Pestaña 3: Analizador Semántico
    boton('sem-limpieza', () => this.limpiar());
    boton('sem-analiza', () => this.analizar('semantico'));
    boton('sem-equipo', () => this.ventanaEquipo.abrir());
    boton('sem-termina', () => this.salir());

    // El botón del aviso (por ejemplo "Abrir reporte")
    boton('aviso-accion', () => {
      if (this._accionAviso) this._accionAviso();
      document.getElementById('aviso').classList.add('oculto');
    });

    window.api.alMenu((orden, datos) => {
      if (orden === 'limpiar') this.limpiar();
      else if (orden === 'analizar') this.analizar(this.pestanas.activa);
      else if (orden === 'equipo') this.ventanaEquipo.abrir();
      else if (orden === 'abrir') this.abrirArchivo();
      else if (orden === 'guardar') this.guardarReporte();
      else if (orden === 'guardarFuente') this.guardarFuente();
      else if (orden === 'guardarCompilado') this.guardarCompilado();
      else if (orden === 'salir') this.salir();
      else if (orden === 'ejemplo') this.cargarEjemplo(datos);
      else if (orden === 'pestana') this.pestanas.mostrar(datos);
      else if (orden === 'cerrarPestanas') this.pestanas.cerrarAnalizadores();
      else if (orden === 'documentacion') this.ventanaDocumentacion.abrir(datos);
      else if (orden === 'zoom') this._zoom(datos);
      else if (orden === 'insertarClase') this.insertarClase();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'F5') {
        e.preventDefault();
        this.analizar(this.pestanas.activa);
        return;
      }

      // F1 abre la documentación integrada.
      if (e.key === 'F1') {
        e.preventDefault();
        this.ventanaDocumentacion.abrir();
        return;
      }

      // Ctrl+Tab y Ctrl+Shift+Tab pasan a la pestaña siguiente / anterior.
      if (e.key === 'Tab' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.pestanas.mover(e.shiftKey ? -1 : 1);
        return;
      }

      // Ctrl+Shift+N escribe clase + clasePrincipal con el nombre que esté
      // seleccionado o con la palabra que se acaba de escribir.
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyN') {
        e.preventDefault();
        this.insertarClase();
        return;
      }

      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const codigo = e.code || '';

      // Zoom de toda la interfaz. Ctrl+0 queda para la pestaña final, así
      // que el zoom normal usa Ctrl+Shift+0.
      if (codigo === 'Equal' || codigo === 'NumpadAdd' || e.key === '+') {
        e.preventDefault();
        this._zoom('mas');
      } else if (codigo === 'Minus' || codigo === 'NumpadSubtract' || e.key === '-') {
        e.preventDefault();
        this._zoom('menos');
      } else if (codigo === 'Digit0' && e.shiftKey) {
        e.preventDefault();
        this._zoom('normal');
      } else if (codigo === 'Digit0') {
        e.preventDefault();
        this.pestanas.mostrar('final');
      } else if (codigo === 'Digit1') {
        e.preventDefault();
        this.pestanas.mostrar('lexico');
      } else if (codigo === 'Digit2') {
        e.preventDefault();
        this.pestanas.mostrar('sintactico');
      } else if (codigo === 'Digit3') {
        e.preventDefault();
        this.pestanas.mostrar('semantico');
      }
    });
  }

  /** Los tres cuadros de código: se copian entre sí y crecen con el texto. */
  _conectarEditores () {
    Object.values(this.editores).forEach((editor) => {
      editor.addEventListener('input', () => this._copiarCodigoDesde(editor));

      // Tab dentro del código inserta espacios en vez de cambiar el foco.
      editor.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab' || e.ctrlKey) return;

        // Antes de meter espacios, prueba el atajo "figuras!" + Tab o
        // "clase figuras" + Tab, que escribe la clase completa.
        if (this._expandirClase(editor)) {
          e.preventDefault();
          return;
        }

        e.preventDefault();
        const ini = editor.selectionStart;
        const fin = editor.selectionEnd;
        const v = editor.value;
        editor.value = v.slice(0, ini) + '    ' + v.slice(fin);
        editor.selectionStart = editor.selectionEnd = ini + 4;
        this._copiarCodigoDesde(editor);
      });
    });
  }

  // ------------------------------------------------------------------
  // Atajo para escribir la estructura de la clase
  // ------------------------------------------------------------------

  /** Un nombre que el léxico acepte como identificador, o el respaldo. */
  _nombreClase (texto, respaldo) {
    const limpio = String(texto || '').trim();
    return /^[A-Za-zÀ-ɏ_][A-Za-zÀ-ɏ0-9_]*$/.test(limpio) ? limpio : respaldo;
  }

  /**
   * Escribe  clase <nombre> { clasePrincipal { ... } }  y deja el cursor
   * dentro de clasePrincipal. Reemplaza el texto entre desde y hasta.
   */
  _insertarEsqueleto (editor, nombre, desde, hasta) {
    const valor = editor.value;
    const inicioLinea = valor.lastIndexOf('\n', desde - 1) + 1;
    const sangria = (/^[ \t]*/.exec(valor.slice(inicioLinea)) || [''])[0];

    const texto =
      `clase ${nombre} {\n` +
      `${sangria}    clasePrincipal {\n` +
      `${sangria}        \n` +
      `${sangria}    }\n` +
      `${sangria}}`;

    editor.value = valor.slice(0, desde) + texto + valor.slice(hasta);

    const cursor = desde +
      (`clase ${nombre} {\n${sangria}    clasePrincipal {\n${sangria}        `).length;
    editor.selectionStart = editor.selectionEnd = cursor;
    editor.focus();
    this._copiarCodigoDesde(editor);
  }

  /**
   * Ctrl+Shift+N: usa el nombre seleccionado o la palabra que está antes del
   * cursor. Si no hay ninguno, usa "Programa".
   */
  insertarClase () {
    const editor = Object.values(this.editores).includes(document.activeElement)
      ? document.activeElement
      : this.editores[this.pestanas.activa];

    let desde = editor.selectionStart;
    let hasta = editor.selectionEnd;
    let nombre = this._nombreClase(editor.value.slice(desde, hasta), null);

    if (!nombre) {
      // La palabra solo cuenta si está sola en su renglón: así no se mete la
      // estructura en medio de una instrucción que ya estaba escrita.
      const inicioLinea = editor.value.lastIndexOf('\n', desde - 1) + 1;
      const antesLinea = editor.value.slice(inicioLinea, desde);
      const palabra = /^[ \t]*([A-Za-zÀ-ɏ_][A-Za-zÀ-ɏ0-9_]*)$/.exec(antesLinea);
      if (palabra) {
        nombre = palabra[1];
        desde -= palabra[1].length;
      } else {
        nombre = 'Programa';
      }
    }

    this._insertarEsqueleto(editor, this._nombreClase(nombre, 'Programa'), desde, hasta);
  }

  /**
   * Tab después de "figuras!" o de "clase figuras" escribe la estructura
   * completa. Devuelve true si expandió algo (para no meter espacios).
   */
  _expandirClase (editor) {
    const pos = editor.selectionStart;
    if (pos !== editor.selectionEnd) return false;

    const valor = editor.value;
    const inicio = valor.lastIndexOf('\n', pos - 1) + 1;
    const linea = valor.slice(inicio, pos);

    const m = /^([ \t]*)(?:clase[ \t]+)?([A-Za-zÀ-ɏ_][A-Za-zÀ-ɏ0-9_]*)[ \t]*!?[ \t]*$/.exec(linea);
    if (!m) return false;

    // Solo con el disparador: un "!" al final o la palabra "clase" delante.
    // Así, escribir un nombre suelto y pulsar Tab sigue metiendo espacios.
    const disparador = /![ \t]*$/.test(linea) || /^[ \t]*clase[ \t]+/.test(linea);
    if (!disparador) return false;

    // Se conserva la sangría que ya tenía la línea.
    this._insertarEsqueleto(editor, m[2], inicio + m[1].length, pos);
    return true;
  }

  /**
   * Arrastrar un archivo sobre la ventana lo abre, igual que Ctrl+O.
   * Sin esto, Electron abriría el archivo EN LUGAR de la aplicación.
   */
  _conectarArrastre () {
    const zona = document.getElementById('zona-soltar');
    const traeArchivo = (e) => e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (traeArchivo(e)) zona.classList.remove('oculto');
    });
    document.addEventListener('dragleave', (e) => {
      // Solo cuando el mouse sale de la ventana, no al pasar entre elementos.
      if (e.relatedTarget === null) zona.classList.add('oculto');
    });
    document.addEventListener('drop', (e) => {
      e.preventDefault();
      zona.classList.add('oculto');
      const archivo = e.dataTransfer && e.dataTransfer.files[0];
      if (archivo) this.abrirArchivoSoltado(archivo);
    });
  }

  // ------------------------------------------------------------------
  // El código compartido
  // ------------------------------------------------------------------

  /** El código de la pestaña que se está viendo (es el mismo en las tres). */
  codigo () {
    return this.editores[this.pestanas.activa].value;
  }

  /** Copia el código de un cuadro a los otros dos. */
  _copiarCodigoDesde (origen) {
    Object.values(this.editores).forEach((editor) => {
      if (editor !== origen) editor.value = origen.value;
    });
    this._acomodarEditores();
  }

  /** Pone el mismo texto en los tres cuadros. */
  _ponerCodigo (texto) {
    Object.values(this.editores).forEach((editor) => { editor.value = texto; });
    this._acomodarEditores();
  }

  _alCambiarPestana (nombre) {
    // Un cuadro escondido no sabe cuánto mide: se ajusta al hacerse visible.
    this._acomodarEditores();
    this.editores[nombre].focus();
  }

  // ------------------------------------------------------------------
  // Acciones
  // ------------------------------------------------------------------

  /** Borra el código y los resultados de las tres pestañas. */
  limpiar () {
    this._ponerCodigo('');
    this.nombreArchivo = null;
    this.panelLexico.limpiar();
    this.panelSintactico.limpiar();
    this.panelSemantico.limpiar();
    this.panelFinal.limpiar();
    if (this.pestanas.activa) this.editores[this.pestanas.activa].focus();
  }

  /**
   * Analiza el código y llena las tres pestañas.
   *
   * @param {string} desde Pestaña cuyo botón se presionó. Su código es el
   *                       que se analiza (y se copia a las otras dos).
   * @param {string} [que] Solo para la pestaña 2: 'lexico' | 'sintactico' |
   *                       'ambos'. Desde las otras pestañas siempre es 'ambos'.
   */
  async analizar (desde, que = 'ambos') {
    // Desde la pestaña final, el resultado se muestra en su propia caja.
    if (desde === 'final') {
      await this.analizarFinal(que === 'ambos' ? 'semantico' : que);
      return;
    }

    const editor = this.editores[desde] || this.editores[this.pestanas.activa];
    this._copiarCodigoDesde(editor);
    const fuente = editor.value;

    if (fuente.trim() === '') {
      this.limpiar();
      const aviso = 'Escribe algo de código para analizar.';
      this.panelLexico.limpiar(aviso);
      this.panelSintactico.limpiar(aviso);
      this.panelSemantico.limpiar(aviso);
      this.panelFinal.limpiar(aviso);
      return;
    }

    const respuesta = await window.api.analizar(fuente, {});
    if (!respuesta.ok) {
      this._avisar('Error interno del compilador', respuesta.error, true);
      return;
    }

    const r = respuesta.resultado;
    this.panelLexico.pintar(r);
    this.panelSintactico.pintar(r, desde === 'sintactico' ? que : 'ambos');
    this.panelSemantico.pintar(r);
  }

  /**
   * Analiza desde la pestaña final y muestra el resultado pedido en su caja.
   * @param {string} vista 'lexico' | 'sintactico' | 'semantico' | 'java'
   */
  async analizarFinal (vista) {
    const editor = this.editores.final;
    this._copiarCodigoDesde(editor);
    const fuente = editor.value;

    if (fuente.trim() === '') {
      this.limpiar();
      this.panelFinal.limpiar('Escribe algo de código para analizar.');
      return;
    }

    const respuesta = await window.api.analizar(fuente, {});
    if (!respuesta.ok) {
      this._avisar('Error interno del compilador', respuesta.error, true);
      return;
    }

    const r = respuesta.resultado;
    // Las tres pestañas de los analizadores siguen llenandose, para que la
    // funcionalidad anterior quede disponible desde el menú Ver.
    this.panelLexico.pintar(r);
    this.panelSintactico.pintar(r, 'ambos');
    this.panelSemantico.pintar(r);
    this.panelFinal.mostrar(r, vista || 'semantico');
  }

  /** Fuga, Salir y Termina: pregunta antes de cerrar. */
  salir () {
    this.ventanaEquipo.cerrar();
    this.ventanaSalir.abrir(this.codigo().trim() !== '');
  }

  /** Archivo → Abrir: un reporte .html, un .bs o un .txt. */
  async abrirArchivo () {
    const r = await window.api.abrirArchivo();
    if (r.cancelado) return;
    this._cargarAbierto(r, r.ok ? r.ruta.split(/[\\/]/).pop() : '');
  }

  /** Un archivo que se soltó sobre la ventana. */
  async abrirArchivoSoltado (archivo) {
    if (archivo.size > TAMANO_MAXIMO_ARCHIVO) {
      this._avisar('No se pudo abrir', `${archivo.name} es demasiado grande para ser un programa.`, true);
      return;
    }
    const r = await window.api.leerArchivo(await archivo.text());
    this._cargarAbierto(r, archivo.name);
  }

  /** Carga lo que devolvió la lectura de un archivo, o avisa del error. */
  _cargarAbierto (r, nombre) {
    if (!r.ok) {
      this._avisar('No se pudo abrir', r.error || 'Error desconocido.', true);
      return;
    }
    this.nombreArchivo = nombre;
    // Un reporte .html recuerda en qué pestaña se guardó: se regresa a ella.
    if (r.pestana) this.pestanas.mostrar(r.pestana);
    this._ponerCodigo(r.contenido);
    this.analizar(this.pestanas.activa);
  }

  /** Carga un programa del menú Ejemplos. */
  cargarEjemplo (datos) {
    if (!datos || typeof datos.contenido !== 'string') return;
    this.nombreArchivo = datos.nombre;
    this._ponerCodigo(datos.contenido);
    this.analizar(this.pestanas.activa);
  }

  /**
   * Guarda el reporte. El diálogo ofrece dos formatos:
   *   .html  el reporte visual, que se abre en el navegador (el normal)
   *   .bs    el reporte en texto, que sigue siendo un programa válido
   * Los dos se pueden volver a abrir en el compilador.
   */
  async guardarReporte () {
    const fuente = this.codigo();
    if (fuente.trim() === '') {
      this._avisar('Nada que guardar', 'Escribe primero algo de código.');
      return;
    }

    const r = await window.api.guardarReporte(fuente, this.pestanas.activa);
    if (r.ok) {
      this.nombreArchivo = r.ruta.split(/[\\/]/).pop();
      if (r.formato === 'html') {
        this._avisar('Reporte guardado', `Se guardó en:\n${r.ruta}`, false,
          { texto: 'Abrir reporte', hacer: () => window.api.verReporte() });
      } else {
        this._avisar('Reporte guardado', `Se guardó en:\n${r.ruta}`);
      }
    } else if (!r.cancelado) {
      this._avisar('No se pudo guardar', r.error || 'Error desconocido.', true);
    }
  }

  /**
   * Archivo → Guardar fuente: crea  <carpeta elegida>/<clase>/<clase>.sb
   */
  async guardarFuente () {
    const fuente = this.codigo();
    if (fuente.trim() === '') {
      this._avisar('Nada que guardar', 'Escribe primero algo de código.');
      return;
    }

    const r = await window.api.guardarFuente(fuente);
    if (r.ok) {
      this.nombreArchivo = r.ruta.split(/[\\/]/).pop();
      this._avisar('Fuente guardada', `Se guardó en:\n${r.ruta}`);
    } else if (!r.cancelado) {
      this._avisar('No se pudo guardar', r.error || 'Error desconocido.', true);
    }
  }

  /**
   * Archivo → Guardar compilado: crea  <carpeta elegida>/<clase>/<clase>.java
   * con el Java que generó el compilador.
   */
  async guardarCompilado () {
    const fuente = this.codigo();
    if (fuente.trim() === '') {
      this._avisar('Nada que compilar', 'Escribe primero algo de código.');
      return;
    }

    const r = await window.api.guardarCompilado(fuente);
    if (r.ok) {
      this._avisar('Compilado guardado', `Se guardó en:\n${r.ruta}`, false,
        { texto: 'Guardar fuente', hacer: () => this.guardarFuente() });
    } else if (!r.cancelado) {
      this._avisar('No se pudo guardar', r.error || 'Error desconocido.', true);
    }
  }

  // ------------------------------------------------------------------
  // Utilidades
  // ------------------------------------------------------------------

  /**
   * Deja los tres cuadros de código al día con su texto:
   *   - el alto, según lo que se escribió, entre un mínimo y un máximo
   *     (pasado el máximo el cuadro se desplaza). El de la pestaña 3 es más
   *     bajo (data-alto-minimo): ahí se escribe una sola proposición;
   *   - los números de renglón y los colores (ver editor.js).
   */
  _acomodarEditores () {
    Object.values(this.editores).forEach((ta) => {
      // El editor de la pestaña final tiene alto fijo: lo maneja el CSS.
      if (ta.hasAttribute('data-alto-fijo')) return;
      const minimo = Number(ta.dataset.altoMinimo) || 130;
      ta.style.height = 'auto';
      ta.style.height = Math.min(Math.max(ta.scrollHeight, minimo), 300) + 'px';
    });
    this.cuadros.forEach((cuadro) => cuadro.refrescar());
  }

  /** Acerca, aleja o restablece el zoom de toda la interfaz. */
  _zoom (accion) {
    if (window.api && typeof window.api.zoom === 'function') {
      window.api.zoom(accion || 'normal');
    }
  }

  /**
   * Aviso breve al pie de la ventana, sin bloquear el trabajo.
   * @param {object} [accion] { texto, hacer }: agrega un botón al aviso.
   */
  _avisar (titulo, detalle, esError = false, accion = null) {
    const el = document.getElementById('aviso');
    const boton = document.getElementById('aviso-accion');

    el.className = 'aviso' + (esError ? ' error' : '');
    document.getElementById('aviso-texto').textContent =
      detalle ? `${titulo}\n${detalle}` : titulo;

    this._accionAviso = accion ? accion.hacer : null;
    boton.textContent = accion ? accion.texto : '';
    boton.classList.toggle('oculto', !accion);

    clearTimeout(this._temporizadorAviso);
    this._temporizadorAviso = setTimeout(() => el.classList.add('oculto'), accion ? 9000 : 6000);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new Aplicacion();
});

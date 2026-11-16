/**
 * panel-final.js
 * Pestaña final del proyecto: muestra en una sola caja el resultado de la
 * accion elegida.
 *
 *   Analiza lexico      -> la tabla de tokens
 *   Analiza sintactico  -> el arbol dibujado
 *   Analiza semantico   -> errores, advertencias y gramatica
 *   Compila             -> el codigo Java generado
 *
 * La caja se limpia y se vuelve a armar en cada accion, asi que nunca se
 * mezclan dos resultados.
 */

/* global window, document, Dom, VistaArbol */

const ESPERA_FINAL =
  'Escribe tu programa SwordByte y elige una acción: Analiza lexico, ' +
  'Analiza sintactico, Analiza semantico o Compila.';

const EJEMPLO_FINAL = [
  'clase ejemplo {',
  '    clasePrincipal {',
  '        decimal radio = 2.5;',
  '        imprimirLn(area.circulo(radio));',
  '    }',
  '}'
].join('\n');

class PanelFinal {
  constructor () {
    this.salida = document.getElementById('final-resultado');
    this.estado = document.getElementById('final-estado');
    this.zoom = document.getElementById('final-zoom');
    this.camino = document.getElementById('final-arbol-camino');

    // El árbol de la pestaña final tiene su propio zoom y su camino de ramas,
    // igual que el de la pestaña 2, pero con controles distintos.
    this.vista = new VistaArbol({
      menos: document.getElementById('final-zoom-menos'),
      mas: document.getElementById('final-zoom-mas'),
      ajustar: document.getElementById('final-zoom-ajustar'),
      nivel: document.getElementById('final-zoom-nivel'),
      camino: this.camino
    });

    this.limpiar();
  }

  /** Deja la caja esperando una accion. */
  limpiar (mensaje) {
    this.salida.className = 'caja final-resultado';
    this.zoom.hidden = true;
    this.vista.limpiar();
    Dom.ponerInsignia(this.estado, null);
    Dom.mostrarNota(this.salida, mensaje || ESPERA_FINAL);
  }

  /**
   * @param {object} r      Resultado de Compilador.compilar().
   * @param {string} vista  'lexico' | 'sintactico' | 'semantico' | 'java'
   */
  mostrar (r, vista) {
    this.salida.className = 'caja final-resultado';

    // El zoom solo tiene sentido cuando se ve el árbol.
    this.zoom.hidden = vista !== 'sintactico';
    if (vista !== 'sintactico') this.vista.limpiar();

    if (vista === 'sintactico') this._mostrarSintactico(r);
    else if (vista === 'semantico') this._mostrarSemantico(r);
    else if (vista === 'java') this._mostrarJava(r);
    else this._mostrarLexico(r);
  }

  // ------------------------------------------------------------------
  // Análisis léxico
  // ------------------------------------------------------------------

  _mostrarLexico (r) {
    const errores = r.lexico.errores || [];
    const filas = r.lexico.tabla || [];

    if (errores.length > 0) {
      Dom.ponerInsignia(this.estado, 'error',
        Dom.cuantos(errores.length, 'error léxico', 'errores léxicos'));
    } else {
      Dom.ponerInsignia(this.estado, 'ok', 'correcto');
    }

    const partes = [];
    errores.forEach((e) => partes.push(Dom.filaError(e)));

    if (filas.length === 0) {
      partes.push(Dom.nota('No se encontró ningún token.'));
      this.salida.replaceChildren(...partes);
      return;
    }

    const tabla = Dom.crear('table', 'tabla-tokens');
    const cabeza = tabla.appendChild(Dom.crear('thead'));
    const filaCabeza = cabeza.appendChild(Dom.crear('tr'));
    ['Lexema', 'Token', 'Descripción'].forEach((t) => {
      filaCabeza.appendChild(Dom.crear('th', null, t));
    });

    const cuerpo = tabla.appendChild(Dom.crear('tbody'));
    filas.forEach((f) => {
      const tr = cuerpo.appendChild(Dom.crear('tr', f.categoria === 'error' ? 'fila-error' : ''));
      tr.title = `Línea ${f.linea}, columna ${f.columna}`;
      tr.append(
        Dom.crear('td', 'lexema', f.lexema),
        Dom.crear('td', 'tk-' + f.categoria, f.token),
        Dom.crear('td', null, f.descripcion)
      );
    });

    partes.push(tabla);
    partes.push(Dom.crear('p', 'linea-estado' + (errores.length ? ' error' : ' ok'),
      errores.length
        ? `✕ Análisis con ${Dom.cuantos(errores.length, 'error léxico', 'errores léxicos')} — ` +
          `${Dom.cuantos(filas.length, 'token encontrado', 'tokens encontrados')}.`
        : `✓ Análisis completado — ${Dom.cuantos(filas.length, 'token encontrado', 'tokens encontrados')}.`));

    this.salida.replaceChildren(...partes);
  }

  // ------------------------------------------------------------------
  // Análisis sintáctico
  // ------------------------------------------------------------------

  _mostrarSintactico (r) {
    const errores = r.sintactico.errores || [];
    const arbol = r.sintactico.arbol;

    if (errores.length > 0) {
      Dom.ponerInsignia(this.estado, 'error',
        Dom.cuantos(errores.length, 'error sintáctico', 'errores sintácticos'));
    } else {
      Dom.ponerInsignia(this.estado, 'ok', 'correcto');
    }

    if (!arbol) {
      this.zoom.hidden = true;
      this.vista.limpiar();
      const partes = errores.map((e) => Dom.filaError(e));
      partes.push(Dom.nota('No hay árbol: el código está vacío o no se pudo analizar.'));
      this.salida.replaceChildren(...partes);
      return;
    }

    // Con errores, primero se muestran ellos y abajo el árbol que sí se
    // construyó. El árbol se dibuja primero porque dibujarArbol() vacía la
    // caja; después los errores se colocan arriba.
    let listaErrores = null;
    if (errores.length > 0) {
      listaErrores = Dom.crear('div', 'lista-errores');
      errores.forEach((e) => listaErrores.appendChild(Dom.filaError(e)));
    }

    this.zoom.hidden = false;
    this.salida.classList.add('con-arbol');
    this.vista.mostrar(this.salida, arbol);
    if (listaErrores) this.salida.prepend(listaErrores);
  }

  // ------------------------------------------------------------------
  // Análisis semántico
  // ------------------------------------------------------------------

  _mostrarSemantico (r) {
    const sem = r.semantico;

    if (!sem || sem.estado === 'vacio') {
      this.limpiar('No hay código que analizar.');
      return;
    }

    if (sem.estado === 'sin-clase') {
      Dom.ponerInsignia(this.estado, 'error', 'falta la clase');
      this.salida.replaceChildren(this._sinClase(sem.errores[0]));
      return;
    }

    if (sem.estado === 'errores-previos') {
      Dom.ponerInsignia(this.estado, 'error', 'corrige primero');
      this.salida.replaceChildren(this._erroresPrevios(sem.errores));
      return;
    }

    Dom.ponerInsignia(this.estado, sem.correcto ? 'ok' : 'error',
      sem.correcto ? 'sin errores' : Dom.cuantos(sem.errores.length, 'error', 'errores'));

    const partes = [];
    if (!sem.correcto) partes.push(this._errores(sem.errores));
    if (sem.advertencias.length > 0) partes.push(this._advertencias(sem.advertencias));

    partes.push(
      Dom.crear('h3', 'titulo-semantico-parte',
        `Gramática del código (${Dom.cuantos(sem.reglas.length, 'regla', 'reglas')}, ` +
        `${Dom.cuantos(sem.totalAlternativas, 'producción', 'producciones')})`),
      this._gramatica(sem.reglas),
      this._nota()
    );

    this.salida.replaceChildren(...partes);
  }

  _sinClase (error) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ Falta la clase'),
      error ? Dom.filaError(error) : document.createTextNode(''),
      Dom.crear('p', null, 'Como en Java, el código va dentro de una clase y se ejecuta desde clasePrincipal:'),
      Dom.crear('pre', 'ejemplo-codigo', EJEMPLO_FINAL)
    );
    return caja;
  }

  _erroresPrevios (errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ No se pudo hacer el análisis semántico'),
      Dom.crear('p', null, 'Primero hay que corregir los errores léxicos y sintácticos del código:')
    );
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
    return caja;
  }

  _errores (errores) {
    const caja = Dom.crear('div', 'veredicto mal');
    caja.append(
      Dom.crear('b', null, '✕ ' + Dom.cuantos(errores.length, 'error semántico', 'errores semánticos')),
      Dom.crear('p', null, 'El código está bien escrito, pero algo no tiene sentido:')
    );
    errores.forEach((e) => caja.appendChild(Dom.filaError(e)));
    return caja;
  }

  _advertencias (advertencias) {
    const caja = Dom.crear('div', 'veredicto advertencia');
    caja.appendChild(Dom.crear('b', null,
      '⚠ ' + Dom.cuantos(advertencias.length, 'advertencia', 'advertencias')));
    advertencias.forEach((e) => caja.appendChild(Dom.filaError(e, '⚠')));
    return caja;
  }

  _gramatica (reglas) {
    const tabla = Dom.crear('table', 'gramatica');
    const cuerpo = tabla.appendChild(Dom.crear('tbody'));

    reglas.forEach((r) => {
      const tr = Dom.crear('tr');
      const regla = Dom.crear('td', 'regla', r.regla);
      regla.title = r.descripcion;

      const alternativas = Dom.crear('td');
      r.alternativas.forEach((a, i) => {
        if (i > 0) alternativas.appendChild(Dom.crear('span', 'meta', ' | '));
        alternativas.appendChild(this._alternativa(a));
      });

      tr.append(regla, Dom.crear('td', 'flecha', '→'), alternativas);
      cuerpo.appendChild(tr);
    });
    return tabla;
  }

  _alternativa (a) {
    const caja = Dom.crear('span', 'alternativa');
    caja.title = 'En el código: ' + a.ejemplo;

    a.simbolos.forEach((s, i) => {
      if (i > 0) caja.appendChild(document.createTextNode(' '));
      const simbolo = Dom.crear('span', s.clase, s.texto);
      if (s.clase === 'terminal' && /^[A-Za-zÀ-ɏ]/.test(s.texto)) {
        simbolo.classList.add('palabra');
      }
      caja.appendChild(simbolo);
    });
    return caja;
  }

  _nota () {
    const nota = Dom.crear('p', 'nota-gramatica');
    nota.append(
      document.createTextNode('Terminales en '),
      Dom.crear('b', null, 'negritas'),
      document.createTextNode(' (las palabras, subrayadas): se escriben tal cual. ' +
        'Los no terminales, en morado, son otras reglas. ( … )* significa «cero o más veces» ' +
        'y [ … ] «opcional». Pasa el mouse sobre una producción para ver de qué parte del código salió.')
    );
    return nota;
  }

  // ------------------------------------------------------------------
  // Compilación a Java
  // ------------------------------------------------------------------

  _mostrarJava (r) {
    const java = r.java;

    if (!java || !java.ok) {
      Dom.ponerInsignia(this.estado, 'error', 'no compiló');
      const caja = Dom.crear('div', 'veredicto mal');
      caja.append(
        Dom.crear('b', null, '✕ No se pudo generar el código Java'),
        Dom.crear('p', null, (java && java.error) ||
          'Corrige los errores del programa antes de compilar.')
      );

      // Acompañar el aviso con los errores concretos que encontró el compilador.
      const errores = []
        .concat(r.lexico.errores || [])
        .concat(r.sintactico ? r.sintactico.errores : [])
        .concat(r.semantico && r.semantico.estado === 'analizado' ? r.semantico.errores : []);
      errores.forEach((e) => caja.appendChild(Dom.filaError(e)));

      this.salida.replaceChildren(caja);
      return;
    }

    Dom.ponerInsignia(this.estado, 'ok', 'Java generado');
    const pre = Dom.crear('pre', 'codigo-java');
    pre.innerHTML = window.api.resaltar(java.codigo);
    this.salida.replaceChildren(pre);
  }
}

window.PanelFinal = PanelFinal;

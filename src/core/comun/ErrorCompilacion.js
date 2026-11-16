/**
 * ErrorCompilacion.js
 * Representación uniforme de un error detectado en cualquier fase del compilador.
 *
 * Todas las fases (léxica, sintáctica, semántica...) construyen objetos de esta
 * clase para que la interfaz pueda mostrarlos con el mismo formato.
 */

const FASES = {
  LEXICA: 'Léxica',
  SINTACTICA: 'Sintáctica',
  SEMANTICA: 'Semántica'
};

class ErrorCompilacion {
  /**
   * @param {string} fase      Fase que detectó el error (ver FASES).
   * @param {string} mensaje   Descripción del problema.
   * @param {number} linea     Línea (base 1).
   * @param {number} columna   Columna (base 1).
   * @param {object} [extra]   { lexema, esperado, encontrado, sugerencia }
   */
  constructor (fase, mensaje, linea, columna, extra = {}) {
    this.fase = fase;
    this.mensaje = mensaje;
    this.linea = linea;
    this.columna = columna;
    this.lexema = extra.lexema || null;
    this.esperado = extra.esperado || null;
    this.encontrado = extra.encontrado || null;
    this.sugerencia = extra.sugerencia || null;
  }

  /** Texto de una sola línea, útil para la consola y el panel de errores. */
  toString () {
    let s = `[${this.fase}] Línea ${this.linea}, Columna ${this.columna}: ${this.mensaje}`;
    if (this.esperado) s += ` (se esperaba: ${this.esperado})`;
    if (this.sugerencia) s += ` — ${this.sugerencia}`;
    return s;
  }

  /** Copia plana, segura para enviar por IPC a la interfaz. */
  toJSON () {
    return {
      fase: this.fase,
      mensaje: this.mensaje,
      linea: this.linea,
      columna: this.columna,
      lexema: this.lexema,
      esperado: this.esperado,
      encontrado: this.encontrado,
      sugerencia: this.sugerencia,
      texto: this.toString()
    };
  }
}

/** Excepción interna usada por el parser para abortar una producción. */
class ErrorSintacticoFatal extends Error {
  constructor (errorCompilacion) {
    super(errorCompilacion.mensaje);
    this.name = 'ErrorSintacticoFatal';
    this.detalle = errorCompilacion;
  }
}

module.exports = { ErrorCompilacion, ErrorSintacticoFatal, FASES };

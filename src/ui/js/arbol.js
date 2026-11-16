/**
 * arbol.js
 * Dibuja el arbol sintactico como un arbol de verdad: la raiz arriba y los
 * hijos colgando debajo, unidos por ramas.
 *
 *   a > b        ->            >
 *                            /   \
 *                         id1     id2
 *
 * El acomodo usa el metodo clasico: primero se colocan las hojas de izquierda
 * a derecha y despues cada nodo interno se centra sobre sus hijos.
 *
 * Para ver el arbol de cerca hay dos formas:
 *   1. Los botones - y + (o Ctrl + rueda del mouse) agrandan todo el dibujo.
 *   2. Un clic en un nodo deja en pantalla SOLO esa rama, ya agrandada.
 *      Arriba queda el camino recorrido para poder regresar.
 */

/* global window, document */

const NS = 'http://www.w3.org/2000/svg';

/** Medidas del dibujo, en pixeles. */
const ALTO_NODO = 32;
const ALTO_NIVEL = 76;    // separacion vertical entre niveles
const HUECO = 18;         // separacion horizontal minima entre hojas
const MARGEN = 26;
const ANCHO_CARACTER = 8; // ancho aproximado de un caracter monoespaciado
const RELLENO_NODO = 20;  // relleno horizontal dentro del recuadro

/** Ancho que necesita un nodo segun su etiqueta. */
function anchoDe (etiqueta) {
  return Math.max(42, etiqueta.length * ANCHO_CARACTER + RELLENO_NODO);
}

/**
 * Asigna a cada nodo su posicion (x, y) en pixeles.
 * @returns {{ancho:number, alto:number}} tamano total que ocupa el dibujo.
 */
function acomodar (raiz) {
  let cursor = MARGEN;
  let profundidadMaxima = 0;

  const colocar = (n, nivel) => {
    n.ancho = anchoDe(n.etiqueta);
    n.y = MARGEN + nivel * ALTO_NIVEL;
    profundidadMaxima = Math.max(profundidadMaxima, nivel);

    if (n.hijos.length === 0) {
      // Hoja: se coloca a continuacion de la anterior.
      n.x = cursor + n.ancho / 2;
      cursor += n.ancho + HUECO;
      return;
    }

    n.hijos.forEach((h) => colocar(h, nivel + 1));

    // Nodo interno: centrado sobre el primero y el ultimo de sus hijos.
    const primero = n.hijos[0];
    const ultimo = n.hijos[n.hijos.length - 1];
    n.x = (primero.x + ultimo.x) / 2;

    // Si el nodo es mas ancho que el hueco que dejan sus hijos, se corre el
    // cursor para que no se encime con el siguiente subarbol.
    const bordeDerecho = n.x + n.ancho / 2 + HUECO;
    if (bordeDerecho > cursor) cursor = bordeDerecho;
  };

  colocar(raiz, 0);

  return {
    ancho: cursor + MARGEN,
    alto: MARGEN * 2 + profundidadMaxima * ALTO_NIVEL + ALTO_NODO
  };
}

/** Recorre el arbol aplicando una funcion a cada nodo. */
function recorrer (n, fn) {
  fn(n);
  n.hijos.forEach((h) => recorrer(h, fn));
}

/**
 * Dibuja el arbol dentro de un contenedor.
 * @param {HTMLElement} contenedor
 * @param {object} raiz  Arbol compacto ({ etiqueta, familia, hijos }).
 * @param {Function} [alElegirRama] Se llama con el nodo al que se le hizo clic.
 * @returns {{svg:Element, lienzo:Element, ancho:number, alto:number, raizX:number}|null}
 */
function dibujarArbol (contenedor, raiz, alElegirRama) {
  contenedor.textContent = '';
  if (!raiz) return null;

  // Se trabaja sobre una copia para no ensuciar el objeto original con las
  // coordenadas calculadas.
  const copia = JSON.parse(JSON.stringify(raiz));
  const tamano = acomodar(copia);

  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', tamano.ancho);
  svg.setAttribute('height', tamano.alto);
  svg.setAttribute('viewBox', `0 0 ${tamano.ancho} ${tamano.alto}`);

  // --- Ramas (se dibujan primero para que queden detras de los nodos) ---
  const capaRamas = document.createElementNS(NS, 'g');
  svg.appendChild(capaRamas);

  recorrer(copia, (n) => {
    for (const h of n.hijos) {
      const rama = document.createElementNS(NS, 'path');
      const y1 = n.y + ALTO_NODO / 2;
      const y2 = h.y - ALTO_NODO / 2;
      rama.setAttribute('d', `M ${n.x} ${y1} L ${h.x} ${y2}`);
      rama.setAttribute('class', 'arbol-rama');
      capaRamas.appendChild(rama);
    }
  });

  // --- Nodos ---
  const familias = new Set();
  recorrer(copia, (n) => {
    familias.add(n.familia);

    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', 'arbol-nodo ' + n.familia);

    const caja = document.createElementNS(NS, 'rect');
    caja.setAttribute('x', n.x - n.ancho / 2);
    caja.setAttribute('y', n.y - ALTO_NODO / 2);
    caja.setAttribute('width', n.ancho);
    caja.setAttribute('height', ALTO_NODO);
    g.appendChild(caja);

    const texto = document.createElementNS(NS, 'text');
    texto.setAttribute('x', n.x);
    texto.setAttribute('y', n.y);
    texto.textContent = n.etiqueta;
    g.appendChild(texto);

    const titulo = document.createElementNS(NS, 'title');
    titulo.textContent = `${n.tipoNodo} — línea ${n.linea}, columna ${n.columna}`;
    g.appendChild(titulo);

    // Solo los nodos con hijos forman una rama que se pueda abrir. El nodo de
    // hasta arriba ya se esta viendo completo, asi que ese se deja quieto.
    if (alElegirRama && n.hijos.length > 0 && n !== copia) {
      g.classList.add('con-rama');
      g.addEventListener('click', () => alElegirRama(n));
    }

    svg.appendChild(g);
  });

  // El lienzo centra el árbol cuando cabe y lo deja desplazarse cuando no.
  const lienzo = document.createElement('div');
  lienzo.className = 'arbol-lienzo';
  lienzo.appendChild(svg);

  contenedor.appendChild(lienzo);
  contenedor.appendChild(construirLeyenda(familias));

  // raizX: donde quedo la raiz a lo ancho, para ponerla a la vista.
  return { svg, lienzo, ancho: tamano.ancho, alto: tamano.alto, raizX: copia.x };
}

// ====================================================================
// La vista: que rama se ve y que tan de cerca
// ====================================================================

const ZOOM_MINIMO = 0.1;   // un programa completo es muy ancho: hay que poder verlo entero
const ZOOM_MAXIMO = 3;
const ZOOM_PASO = 0.1;

/**
 * Maneja lo que se ve del arbol: la rama elegida y su acercamiento.
 *
 * Guarda el "camino": la lista de nodos desde la raiz hasta la rama que esta
 * en pantalla. Al principio el camino tiene un solo elemento, la raiz, o sea
 * que se ve el arbol completo. Cada clic en un nodo agrega un paso al camino
 * y cada clic en el camino regresa a ese punto.
 *
 *   camino = [ OR ]            -> se ve todo el arbol
 *   camino = [ OR, AND ]       -> se ve solo la rama AND, mas grande
 *   camino = [ OR, AND, > ]    -> se ve solo la rama >, mas grande todavia
 */
class VistaArbol {
  /**
   * @param {object} controles Elementos del DOM:
   *   { menos, mas, ajustar, nivel, camino }
   */
  constructor (controles) {
    this.controles = controles;
    this.contenedor = null;
    this.camino = [];
    this.dibujo = null;
    this.zoom = 1;

    // Con los botones, lo que queda quieto es el centro de la caja.
    controles.menos.addEventListener('click', () => this.acercar(-ZOOM_PASO, this._centro()));
    controles.mas.addEventListener('click', () => this.acercar(ZOOM_PASO, this._centro()));
    controles.ajustar.addEventListener('click', () => this.ajustar());
  }

  /** Muestra un arbol nuevo, completo y desde el principio. */
  mostrar (contenedor, arbol) {
    this.contenedor = contenedor;
    this.camino = arbol ? [arbol] : [];
    this._dibujar(1);
  }

  /** Deja la vista en blanco, cuando no hay arbol que mostrar. */
  limpiar () {
    this.camino = [];
    this.dibujo = null;
    this._pintarCamino();
    this._pintarNivel();
  }

  /** Abre una rama: a partir de ahora solo se ve ese pedazo del arbol. */
  verRama (nodo) {
    this.camino.push(nodo);
    this._dibujar(null);
  }

  /** Regresa a un punto del camino. El paso 0 es el arbol completo. */
  regresarA (paso) {
    this.camino = this.camino.slice(0, paso + 1);
    this._dibujar(paso === 0 ? 1 : null);
  }

  /**
   * Acerca o aleja lo que ya esta en pantalla.
   * @param {number} paso    Cuanto sube o baja el zoom (0.1 = 10 %).
   * @param {object} [punto] { x, y } dentro de la caja: lo que esta ahi se
   *                         queda en el mismo lugar, para no perderlo de vista.
   */
  acercar (paso, punto) {
    this._aplicarZoom(this.zoom + paso, punto);
  }

  /** Zoom con el que el dibujo cabe a lo ancho, sin pasar del 100 %. */
  ajustar () {
    if (!this.dibujo) return;
    const disponible = this.dibujo.lienzo.clientWidth - 32; // menos el relleno
    this._aplicarZoom(Math.min(1, disponible / this.dibujo.ancho));
    this._centrarRaiz();
  }

  // ------------------------------------------------------------------
  // Trabajo interno
  // ------------------------------------------------------------------

  /**
   * Vuelve a dibujar el ultimo nodo del camino.
   * @param {number|null} zoom Null significa "el que haga que la rama llene
   *                           el ancho", que es lo que se quiere al abrirla.
   */
  _dibujar (zoom) {
    if (!this.contenedor) return;

    const rama = this.camino[this.camino.length - 1] || null;
    this.dibujo = dibujarArbol(this.contenedor, rama, (n) => this.verRama(n));

    if (this.dibujo) {
      // Ctrl + rueda sobre el arbol tambien acerca y aleja.
      // Lo que queda quieto es lo que esta bajo el mouse.
      const lienzo = this.dibujo.lienzo;
      lienzo.addEventListener('wheel', (e) => {
        if (!e.ctrlKey) return;
        e.preventDefault();
        const caja = lienzo.getBoundingClientRect();
        const mouse = { x: e.clientX - caja.left, y: e.clientY - caja.top };
        this.acercar(e.deltaY < 0 ? ZOOM_PASO : -ZOOM_PASO, mouse);
      }, { passive: false });
    }

    this._aplicarZoom(zoom === null ? this._zoomQueLlenaElAncho() : zoom);
    this._centrarRaiz();
    this._pintarCamino();
  }

  /**
   * Que tanto hay que agrandar para que la rama ocupe todo el ancho de la
   * caja. Se mide solo el ancho porque a lo alto la caja se puede desplazar.
   * Nunca se achica: una rama abierta se ve igual o mas grande que cuando
   * estaba metida dentro del arbol completo.
   */
  _zoomQueLlenaElAncho () {
    if (!this.dibujo) return 1;
    const disponible = this.dibujo.lienzo.clientWidth - 32; // menos el relleno
    return Math.max(1, disponible / this.dibujo.ancho);
  }

  /**
   * Cambia el tamano del dibujo. Se mueven el ancho y el alto del SVG dejando
   * fijo su viewBox: asi la imagen crece de verdad y las barras de
   * desplazamiento se ajustan solas.
   *
   * Si viene un punto, la caja se desplaza para que lo que estaba en ese
   * punto siga ahi despues del zoom (si no, al agrandar, lo que se estaba
   * viendo se iria hacia abajo y a la derecha):
   *
   *   1. antes de cambiar el tamano: que parte del dibujo esta en el punto;
   *   2. se cambia el tamano;
   *   3. se desplaza la caja hasta que esa parte vuelva a quedar en el punto.
   */
  _aplicarZoom (zoom, punto = null) {
    const anterior = this.zoom;
    this.zoom = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, zoom));

    if (this.dibujo) {
      const { svg, lienzo } = this.dibujo;
      const enDibujo = punto ? this._puntoEnDibujo(punto, anterior) : null;   // 1

      svg.setAttribute('width', this.dibujo.ancho * this.zoom);                 // 2
      svg.setAttribute('height', this.dibujo.alto * this.zoom);

      if (enDibujo) {                                                          // 3
        const origen = this._origenDelDibujo();
        lienzo.scrollLeft = origen.x + enDibujo.x * this.zoom - punto.x;
        lienzo.scrollTop = origen.y + enDibujo.y * this.zoom - punto.y;
      }
    }
    this._pintarNivel();
  }

  /** El centro de la caja que se ve, en pixeles: { x, y }. */
  _centro () {
    if (!this.dibujo) return null;
    return { x: this.dibujo.lienzo.clientWidth / 2, y: this.dibujo.lienzo.clientHeight / 2 };
  }

  /**
   * Donde empieza el dibujo dentro de todo lo que se puede desplazar de la
   * caja (el relleno y el centrado lo recorren un poco).
   */
  _origenDelDibujo () {
    const { svg, lienzo } = this.dibujo;
    const s = svg.getBoundingClientRect();
    const l = lienzo.getBoundingClientRect();
    return { x: s.left - l.left + lienzo.scrollLeft, y: s.top - l.top + lienzo.scrollTop };
  }

  /** Un punto de la caja, pasado a coordenadas del dibujo (sin zoom). */
  _puntoEnDibujo (punto, zoom) {
    const origen = this._origenDelDibujo();
    const lienzo = this.dibujo.lienzo;
    return {
      x: (lienzo.scrollLeft + punto.x - origen.x) / zoom,
      y: (lienzo.scrollTop + punto.y - origen.y) / zoom
    };
  }

  /**
   * Desplaza la caja para que la raiz quede a la vista, centrada a lo ancho.
   * En un arbol mas ancho que la caja, si no, se veria la orilla izquierda y
   * la raiz quedaria fuera.
   */
  _centrarRaiz () {
    if (!this.dibujo) return;
    const { lienzo, raizX } = this.dibujo;
    const origen = this._origenDelDibujo();
    lienzo.scrollLeft = origen.x + raizX * this.zoom - lienzo.clientWidth / 2;
    lienzo.scrollTop = 0;
  }

  /** Escribe el porcentaje y apaga los botones que ya no sirven. */
  _pintarNivel () {
    const hayDibujo = this.dibujo !== null;
    this.controles.nivel.textContent =
      hayDibujo ? Math.round(this.zoom * 100) + '%' : '100%';
    this.controles.menos.disabled = !hayDibujo || this.zoom <= ZOOM_MINIMO + 0.001;
    this.controles.mas.disabled = !hayDibujo || this.zoom >= ZOOM_MAXIMO - 0.001;
    this.controles.ajustar.disabled = !hayDibujo;
  }

  /** Dibuja la barra de arriba: la ayuda, o el camino de ramas abiertas. */
  _pintarCamino () {
    const barra = this.controles.camino;
    barra.replaceChildren();

    if (!this.dibujo) {
      barra.classList.add('oculto');
      return;
    }
    barra.classList.remove('oculto');

    const texto = document.createElement('span');
    texto.className = 'camino-ayuda';
    barra.appendChild(texto);

    // Arbol completo: solo se explica como abrir una rama.
    if (this.camino.length === 1) {
      texto.textContent = 'Haz clic en cualquier nodo para ver esa rama más de cerca.';
      return;
    }

    // Rama abierta: se arma el camino con un boton por paso.
    texto.textContent = 'Viendo la rama:';

    this.camino.forEach((nodo, i) => {
      if (i > 0) {
        const flecha = document.createElement('span');
        flecha.className = 'camino-flecha';
        flecha.textContent = '›';
        barra.appendChild(flecha);
      }

      const paso = document.createElement('button');
      paso.className = 'camino-paso';
      paso.textContent = i === 0 ? 'Árbol completo' : nodo.etiqueta;

      if (i === this.camino.length - 1) {
        paso.classList.add('camino-actual');   // el que se esta viendo
        paso.disabled = true;
      } else {
        paso.addEventListener('click', () => this.regresarA(i));
      }
      barra.appendChild(paso);
    });
  }
}

/** Leyenda con los colores que aparecen en el arbol dibujado. */
function construirLeyenda (familias) {
  // El orden de esta lista es el de la jerarquía: primero los booleanos,
  // luego los relacionales y al final los aritméticos.
  const nombres = {
    logico: 'Lógico (booleano)',
    relacional: 'Relacional',
    aritmetico: 'Aritmético',
    operador: 'Operador',
    identificador: 'Identificador',
    literal: 'Valor',
    control: 'Control de flujo',
    llamada: 'Instrucción',
    estructura: 'Estructura'
  };
  const colores = {
    logico: ['#e3edfd', '#0b5ed7'],
    relacional: ['#fdeaea', '#d12a2a'],
    aritmetico: ['#ececec', '#000000'],
    operador: ['#e7effb', '#1f4e9c'],
    identificador: ['#f1ecff', '#5b3fbf'],
    literal: ['#fdf3e0', '#b7791f'],
    control: ['#e4f4ec', '#17794f'],
    llamada: ['#fdeff5', '#b03a6e'],
    estructura: ['#eef1f6', '#7b8a9e']
  };

  const leyenda = document.createElement('div');
  leyenda.className = 'arbol-leyenda';

  for (const familia of Object.keys(nombres)) {
    if (!familias.has(familia)) continue;
    const item = document.createElement('span');
    const muestra = document.createElement('i');
    muestra.style.background = colores[familia][0];
    muestra.style.borderColor = colores[familia][1];
    item.appendChild(muestra);
    item.appendChild(document.createTextNode(nombres[familia]));
    leyenda.appendChild(item);
  }
  return leyenda;
}

window.dibujarArbol = dibujarArbol;
window.VistaArbol = VistaArbol;

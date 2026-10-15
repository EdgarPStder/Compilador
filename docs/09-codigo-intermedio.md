# Pestaña 4 — Generador de código intermedio

La fase 4 traduce un programa SwordByte que ya pasó las tres fases anteriores
(sin errores léxicos, sintácticos ni semánticos) a **código intermedio**: una
forma sencilla del programa, a medio camino entre el código fuente y el código
de la máquina. Se usa la forma clásica, el **código de tres direcciones**, y
cada instrucción se guarda también como un **cuádruplo**.

![Código intermedio](capturas/intermedio.png)

El código vive en [`src/core/04.intermedio/`](../src/core/04.intermedio/).

---

## 1. Dónde va en el compilador

```
  Código ─► 1. Léxico ─► 2. Sintáctico ─► 3. Semántico ─► 4. CÓDIGO INTERMEDIO ─► (5. Optimización ─► 6. Código Java)
                                  │                              │
                                  └── árbol ─────────────────────┘
```

El generador recorre el **árbol** que armó el sintáctico. Sólo trabaja cuando
el semántico dijo que el programa tiene sentido: si hay cualquier error, la
pestaña pide corregirlo primero y lista los errores. Las advertencias (una
variable que no se usa) no lo impiden.

Como en las otras fases, sólo se traducen **programas**
(`clase nombre { clasePrincipal { ... } }`): a una expresión suelta le falta la
clase.

---

## 2. El código de tres direcciones

Cada instrucción hace **una sola operación** y usa a lo más **tres
direcciones**: dos valores y el lugar donde queda el resultado. Las
expresiones largas se parten en pasos, y los resultados a medio camino se
guardan en **temporales** (`t1`, `t2`…):

```
SwordByte:              entero a = b + c * d;

Tres direcciones:       t1 = c * d
                        t2 = b + t1
                        a = t2
```

La jerarquía de operadores decide el orden: `c * d` se calcula primero porque
la multiplicación va antes que la suma.

Las decisiones y los ciclos se convierten en **saltos** a **etiquetas**
(`L1`, `L2`…):

```
SwordByte:              si (a > 0) { a = 2; } sino { a = 3; }

Tres direcciones:       t1 = a > 0
                        ifFalse t1 goto L1     si NO se cumple, salta al sino
                        a = 2
                        goto L2                al terminar, salta al final
                      L1:
                        a = 3
                      L2:
```

Si el programa ya usa un nombre como `t1` o `L1`, los temporales pasan a
llamarse `tt1`, `tt2`… (y las etiquetas `LL1`…), para no confundirse con las
variables.

---

## 3. Los cuádruplos

Cada instrucción se guarda como un **cuádruplo**: (operador, argumento 1,
argumento 2, resultado). La pestaña muestra las dos formas con los botones
**Tres direcciones** y **Cuádruplos**.

| # | Tres direcciones | Operador | Arg 1 | Arg 2 | Resultado |
|---|---|---|---|---|---|
| 1 | `t1 = c * d` | `*` | `c` | `d` | `t1` |
| 2 | `t2 = b + t1` | `+` | `b` | `t1` | `t2` |
| 3 | `a = t2` | `=` | `t2` | | `a` |

![Cuádruplos](capturas/intermedio-cuadruplos.png)

---

## 4. Todas las instrucciones

Están en [`Instrucciones.js`](../src/core/04.intermedio/Instrucciones.js), una
función por forma:

| Forma | Ejemplo | Cuádruplo |
|---|---|---|
| Operación de dos valores | `t1 = a + b` | `( +, a, b, t1 )` |
| Operación de un valor | `t1 = - a` · `t1 = NO a` | `( menos, a, , t1 )` · `( NO, a, , t1 )` |
| Copia | `a = t1` | `( =, t1, , a )` |
| Leer de un arreglo | `t1 = datos[i]` | `( =[], datos, i, t1 )` |
| Escribir en un arreglo | `datos[i] = t1` | `( []=, t1, i, datos )` |
| Reservar un arreglo | `reservar datos, 3` | `( reservar, 3, , datos )` |
| Conversión de tipo | `t1 = (entero) a` | `( convertir, a, entero, t1 )` |
| Etiqueta | `L1:` | `( etiqueta, , , L1 )` |
| Salto | `goto L1` | `( goto, , , L1 )` |
| Salto si es verdadero | `if t1 goto L1` | `( if, t1, , L1 )` |
| Salto si es falso | `ifFalse t1 goto L1` | `( ifFalse, t1, , L1 )` |
| Salto si son iguales | `if t1 == 2 goto L1` | `( if==, t1, 2, L1 )` |
| Parámetro | `param a` | `( param, a, , )` |
| Llamada | `t1 = call sumar, 2` | `( call, sumar, 2, t1 )` |
| Retorno | `return t1` | `( return, t1, , )` |
| Leer del teclado | `leer a` | `( leer, , , a )` |
| Inicio y fin de función | `funcion sumar(a, b)` · `fin sumar` | `( funcion, sumar, a b, )` · `( fin, sumar, , )` |
| Manejo de errores | `intentar L1` · `finIntentar` · `capturar e` | `( intentar, , , L1 )` … |

---

## 5. Cómo se traduce cada instrucción

### Declaraciones, asignaciones e incrementos

| SwordByte | Tres direcciones |
|---|---|
| `entero a = 5;` | `a = 5` |
| `entero b;` | (nada: sólo declara) |
| `Constante decimal IVA = 0.16;` | `IVA = 0.16` |
| `x = x + 1;` | `t1 = x + 1` · `x = t1` |
| `i++;` | `i = i + 1` |
| `entero y = x++;` | `t1 = x` · `x = x + 1` · `y = t1` |

### Llamadas, entrada y salida

Primero se calculan los valores, luego va un `param` por cada uno y al final
el `call` con cuántos son. Las funciones nativas, la geometría y las de salida
se llaman igual:

| SwordByte | Tres direcciones |
|---|---|
| `imprimirLn(a);` | `param a` · `call imprimirLn, 1` |
| `decimal r = potencia(2, 10);` | `param 2` · `param 10` · `t1 = call potencia, 2` · `r = t1` |
| `decimal a = area.circulo(r);` | `param r` · `t1 = call area.circulo, 1` · `a = t1` |
| `leer(x);` | `leer x` |
| `entero n = convertir(s, entero);` | `t1 = (entero) s` · `n = t1` |

### Funciones

```
funcion entero sumar(entero a, entero b) {        funcion sumar(a, b)
    retornar a + b;                                 t1 = a + b
}                                                   return t1
                                                    fin sumar

entero r = sumar(5, 3);                             param 5
                                                    param 3
                                                    t2 = call sumar, 2
                                                    r = t2
```

`clasePrincipal` se traduce igual, como `funcion clasePrincipal()` …
`fin clasePrincipal`. Las funciones y `clasePrincipal` salen en el orden en
que están en el programa.

### Ciclos

```
mientras (c) { A }        hacer { A } mientras (c);     para (inicio; c; paso) { A }

  L1:                       L1:                            inicio
    t1 = c                    A                          L1:
    ifFalse t1 goto L2        t1 = c                       t1 = c
    A                         if t1 goto L1                ifFalse t1 goto L2
    goto L1                                                A
  L2:                                                      paso
                                                           goto L1
                                                         L2:
```

`romper;` se traduce como `goto` a la salida del ciclo (o de la `opcion`) de
más adentro.

### opcion

```
opcion (x) {                          if x == 1 goto L1
    caso 1: A  romper;                if x == 2 goto L2
    caso 2: B                         goto L3
    porDefecto: C                   L1:
}                                     A
                                      goto L4         <- romper
                                    L2:
                                      B               <- sin romper sigue con C, como en Java
                                    L3:
                                      C
                                    L4:
```

### Y, O y NO: con corto circuito

Como en Java, si con el primer valor ya se sabe el resultado, el segundo ni se
calcula:

```
logico l = a > 0 Y b > 0;         t1 = a > 0
                                  t2 = t1
                                  ifFalse t2 goto L1    si a > 0 es falso, ya no se revisa b > 0
                                  t3 = b > 0
                                  t2 = t3
                                L1:
                                  l = t2
```

Con `O` el salto es `if t2 goto L1` (si ya es verdadero). `NO a` es una
operación de un valor: `t1 = NO a`.

### Arreglos y matrices

Un arreglo se reserva con su tamaño y se usa por posición. Una **matriz** se
guarda renglón por renglón en un solo bloque, así que la posición de
`m[i][j]` es `i * columnas + j`:

```
Arreglo entero d[] = {5, 6};        reservar d, 2
                                    d[0] = 5
                                    d[1] = 6

matriz entero m[2][3];              t1 = 2 * 3
                                    reservar m, t1

m[i][2] = d[1];                     t2 = i * 3
                                    t3 = t2 + 2
                                    t4 = d[1]
                                    m[t3] = t4
```

### intentar / capturar

```
intentar { A } capturar (Error e) { B }        intentar L1      <- si algo falla en A, salta a L1
                                                 A
                                                 finIntentar
                                                 goto L2
                                               L1:
                                                 capturar e
                                                 B
                                               L2:
```

---

## 6. Qué se ve en la pestaña

Sigue el estilo de la pestaña 3: los logos en columna a la izquierda, el título
*Generador de Código Intermedio “SwordByte”*, el cuadro **Programa para
traducir** y, a la derecha, **Limpieza**, **Genera**, **Equipo** y
**Termina**.

En el cuadro **Código intermedio**:

- Una línea verde con cuántas instrucciones, temporales y etiquetas salieron.
- **Tres direcciones**: una fila por instrucción, con su número. Antes de
  cada grupo, en verde, el renglón del programa de donde sale
  (`// entero a = b + c * d;`). Las etiquetas van a la orilla y en azul, los
  temporales en morado y las palabras (`goto`, `if`, `call`…) como el control
  de flujo de Java.
- **Cuádruplos**: la misma lista como tabla: `#`, *Operador*, *Arg 1*,
  *Arg 2* y *Resultado*. Al pasar el mouse sobre una fila se ve la instrucción
  y la línea del programa.

Si el programa tiene errores, la insignia dice *corrige primero* y se listan.
Los reportes que se guardan traen el código intermedio en su sección 5.

---

## 7. Lo que devuelve

`compilar(fuente).intermedio` trae:

```js
{
  estado: 'generado',        // 'vacio' | 'errores-previos' | 'generado'
  errores: [],               // los de las fases 1 a 3, si los hay
  temporales: 2,
  etiquetas: 0,
  prefijos: { temporal: 't', etiqueta: 'L' },
  instrucciones: [
    { numero: 1, op: '*', arg1: 'c', arg2: 'd', resultado: 't1',
      texto: 't1 = c * d', linea: 4, comentarios: ['entero a = b + c * d;'] },
    // ...
  ]
}
```

---

## 8. Las piezas

| Archivo | Qué hace |
|---|---|
| [`Instrucciones.js`](../src/core/04.intermedio/Instrucciones.js) | Las formas del código de tres direcciones: una función por forma, que arma el cuádruplo y su texto |
| [`GeneradorIntermedio.js`](../src/core/04.intermedio/GeneradorIntermedio.js) | Recorre el árbol: `expresion()` devuelve dónde quedó cada valor, y una función por instrucción (`si()`, `mientras()`, `opcion()`…) emite sus instrucciones. Al final, `renumerarEtiquetas()` las numera en el orden en que aparecen |

Para que una instrucción nueva del lenguaje tenga su código intermedio, ver
[07-mantenimiento.md](07-mantenimiento.md).

---

## 9. Probar sólo esta parte

```js
const { compilar } = require('./src/core/Compilador');
const { codigoIntermedioATexto } = require('./src/core/04.intermedio/GeneradorIntermedio');

const ci = compilar('clase p { clasePrincipal { entero b = 1, c = 2, d = 3; entero a = b + c * d; } }').intermedio;
console.log(codigoIntermedioATexto(ci.instrucciones).join('\n'));
```

`npm run pruebas` corre el grupo *Código intermedio: código de tres
direcciones (fase 4)*: cada forma de instrucción, los saltos de cada
estructura, el corto circuito, los arreglos y las matrices, los comentarios,
los nombres que chocan y que en todos los ejemplos cada salto llegue a una
etiqueta que existe.

---

## Fuentes

- A. Aho, M. Lam, R. Sethi y J. Ullman, *Compiladores: principios, técnicas y
  herramientas*, 2.ª ed., capítulo 6, «Generación de código intermedio»
  (código de tres direcciones, cuádruplos y corto circuito).

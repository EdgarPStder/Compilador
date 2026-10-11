# Fase 2 — Analizador sintáctico

El analizador sintáctico (*parser*) recibe la lista de tokens y comprueba que su
**orden** respete la gramática del lenguaje. Si el orden es válido, construye el
**Árbol de Sintaxis Abstracta (AST)**, que es la estructura sobre la que
trabajarán las fases siguientes.

Archivos:

- [`src/core/sintactico/AnalizadorSintactico.js`](../src/core/sintactico/AnalizadorSintactico.js) — el análisis
- [`src/core/sintactico/Gramatica.js`](../src/core/sintactico/Gramatica.js) — la gramática como dato
- [`src/core/sintactico/NodosAST.js`](../src/core/sintactico/NodosAST.js) — nodos del árbol y vista dibujable

---

## 1. Qué entra y qué sale

```
[TIPO_DATO "entero"] [IDENTIFICADOR "edad"] [OP_ASIGNACION "="] [LIT_ENTERO "20"] [DELIMITADOR ";"]
        │
        ▼
┌───────────────────────┐
│ Analizador sintáctico │
└───────────────────────┘
        │
        ▼
      Declaracion (entero)
            └── Declarador (edad)
                   └── Literal (20)
```

Salidas de la fase:

| Salida | Para qué sirve |
|---|---|
| `ast` | árbol que consumirán las fases 3 a 6 |
| `arbol` | versión dibujable del AST para la interfaz |
| `errores` | errores sintácticos con posición y sugerencia |
| `estadisticas` | nodos, profundidad, funciones declaradas |

---

## 2. Técnica: descenso recursivo (LL, 1 token de anticipación)

Se eligió un **analizador descendente recursivo** porque:

1. **Se lee como la gramática.** Cada no terminal es un método con el mismo
   nombre. La regla `<mientras> ::= "mientras" "(" <expresion> ")" "{" ... "}"`
   se convierte casi literalmente en el método `mientras()`.
2. **Los mensajes de error son claros.** Como en cada punto se sabe qué se
   esperaba, se puede decir *"Falta ';' al final de la declaración"* en vez de
   un genérico "error de sintaxis".
3. **Cada producción es una función.** No hay tablas que mantener: para
   agregar una instrucción al lenguaje se escribe un método más.

La gramática se escribió sin recursividad por la izquierda y con las
alternativas separadas por el primer token, de modo que **un solo token de
anticipación** basta para decidir qué producción aplicar.

### Ejemplo: cómo se decide una instrucción

```js
instruccion () {
  const t = this.actual;
  if (t.tipo === TiposToken.TIPO_DATO) return this.declaracion();
  switch (t.lexema) {
    case 'si':       return this.si();
    case 'mientras': return this.mientras();
    case 'para':     return this.para();
    // ...
  }
  if (t.tipo === TiposToken.IDENTIFICADOR) return this.asignacionOLlamada();
  this.fallar(`'${t.lexema}' no puede iniciar una instruccion.`, 'una instruccion');
}
```

---

## 2 bis. Tres modos de análisis

No siempre se quiere escribir un programa completo para revisar una idea. El
analizador acepta tres formas de entrada y elige sola cuál corresponde:

| Modo | Entrada | Ejemplo |
|---|---|---|
| `programa` | clase completa | `clase p { clasePrincipal { ... } }` |
| `instrucciones` | una o varias instrucciones sueltas, cada una con su `;` | `entero a = 5;` · `a && b \|\| c;` |
| `expresion` | una o varias proposiciones sueltas, **una por renglón** y sin `;` | `a > b` · `a = b + c` |

```js
analizarSintactico(tokens, 'auto');   // por defecto
```

El modo lo decide `elegirModo()` mirando el texto **antes** de analizarlo, con
cuatro reglas en orden:

| # | Si… | Modo |
|---|---|---|
| 1 | el primer token es `clase` | `programa` |
| 2 | el primer token es un tipo (`entero`, `cadena`…) o una palabra que empieza instrucción (`si`, `para`, `imprimirLn`…) | `instrucciones` |
| 3 | en algún lado hay un `;` o un `{` | `instrucciones` |
| 4 | en cualquier otro caso | `expresion` (una o varias proposiciones) |

La regla 3 es la que atrapa los casos que no empiezan con palabra reservada,
como `x = 5;` o `tabla[0] = 1;`: el punto y coma delata que es una instrucción
y no una expresión suelta.

Elegir de entrada, en vez de probar los tres modos a ver cuál pega, tiene dos
ventajas: el analizador corre una sola vez, y el mensaje de error que sale es
el del modo correcto en lugar del que "llegó más lejos":

| Entrada | Regla | Mensaje |
|---|---|---|
| `5 = a` | 4 → `expresion` | *A la izquierda de "=" debe ir una variable* |
| `entero a = 5` | 2 → `instrucciones` | *Falta ';' al final de la declaración* |

Un detalle de presentación: cuando el fragmento es una sola instrucción, el
`Bloque` que la envuelve se descarta y la instrucción queda como raíz del
árbol. Sin eso, `entero a = 5;` mostraría un nodo `bloque` sobrante.

### Varias proposiciones, una por renglón

En el modo `expresion` se pueden escribir varias proposiciones, una por
renglón, sin punto y coma:

```
a = b + c
a && b || c + f > d
```

Cada renglón es una proposición. Si hay varias, cuelgan de un nodo
`proposiciones` en el árbol; si hay una sola, ella es la raíz. Una expresión
puede seguir en el renglón de abajo mientras no termine (`a = b +` y abajo
`c`), pero dos expresiones completas en el **mismo** renglón son un error:
`a = b + c d` → *Sobra 'd' al final de la expresión*.

### Proposiciones simples con punto y coma

En el modo `instrucciones` (y dentro de un programa), una instrucción que
empieza como expresión —un nombre, un valor, un paréntesis, `NO`, `-`, una
función nativa…— se lee completa con `proposicion()` y se clasifica por lo que
resultó:

| Código | Nodo |
|---|---|
| `a = b + c;` | `Asignacion` |
| `i++;` | `IncrementoStmt` |
| `sumar(5, 3);` | `ExpresionInstruccion` (una llamada) |
| `a && b \|\| c + f > d;` | `ExpresionInstruccion` (una proposición simple) |

Una proposición simple se dibuja directo con su expresión, sin un nodo que la
envuelva. Si después de una variable sola no viene `;`, el error sigue siendo
el de siempre: `a b;` → *Falta '=' para asignar un valor a la variable*.

---

## 3. Jerarquía de operadores

La precedencia no se programa con tablas: está **codificada en la forma de la
gramática**. Cada nivel es un método que llama al siguiente, y el nivel que se
aplica al final es el que queda **arriba** del árbol.

```
expresion → expresionO → expresionY → negacion        grupo 1: BOOLEANOS
          → igualdad   → relacional                   grupo 2: RELACIONALES
          → asignacion → aditiva → multiplicativa
          → unaria     → potencia → postfija
          → primaria                                  grupo 3: ARITMÉTICOS
```

| Altura en el árbol | Grupo | Operadores |
|---|---|---|
| Arriba | **Booleanos** | `O` `OR` `\|\|` · `Y` `AND` `&&` · `NO` `NOT` `!` |
| En medio | **Relacionales** | `==` `!=` · `<` `<=` `>` `>=` |
| Abajo | **Aritméticos** | `=` · `+` `-` · `*` `/` `%` · `-` `+` `√` unarios · `^` `**` · `++` `--` · `( )` `[ ]`, `id`, `num` |

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

Dos detalles que se ven en ese árbol:

- **El `=` es aritmético**, así que queda por debajo de los relacionales:
  `a = b + c > 9` se agrupa como `(a = (b + c)) > 9`.
- **La negación es booleana**, así que `NO a > b` niega toda la comparación:
  `NO (a > b)`. Pero como el `NO` se aplica antes que el `Y`, `NO a Y b` sigue
  siendo `(NO a) Y b`.

Cada operador lógico admite tres formas equivalentes —la española, la inglesa
y el símbolo— y todas producen el mismo nodo:

```js
while (this.es('Y') || this.es('AND') || this.es('&&')) { ... }
```

Cada nivel usa un bucle `while`, lo que da **asociatividad izquierda**:
`10 - 3 - 2` se agrupa como `(10 - 3) - 2`.

### La potencia y la raíz

Van por debajo de `*` `/` `%`, así que se resuelven primero: `2 * 3 ^ 2` es
`2 * (3 ^ 2) = 18`.

```
            *
          /        num(2)    ^
             /           num(3)  num(2)
```

La potencia se escribe `^` o `**`, y son el mismo operador. A diferencia de los
demás binarios, **no** usa un bucle `while` sino una llamada recursiva a la
derecha, lo que le da **asociatividad derecha**: `2 ^ 3 ^ 2` es `2 ^ (3 ^ 2)`.

```js
potencia () {
  const base = this.postfija();
  if (this.es('^') || this.es('**')) {
    const op = this.consumir().lexema;
    const exponente = this.unaria();   // <- vuelve a subir, por eso agrupa a la derecha
    return nodo('Binaria', ..., { operador: op, izquierda: base, derecha: exponente });
  }
  return base;
}
```

El lado izquierdo arranca en `postfija()`, saltándose el menos unario, para que
`-2 ^ 2` sea `-(2 ^ 2) = -4` como en matemáticas. El lado derecho sí empieza en
`unaria()`, y por eso el exponente puede ser negativo: `2 ^ -3`.

La raíz tiene dos escrituras. El símbolo `√` es un operador unario y vive junto
al menos unario; las funciones `raiz(x)`, `raiz(x, n)`, `raizCuadrada(x)` y
`raizCubica(x)` son llamadas nativas y se resuelven en `primaria()`.

### Los paréntesis reinician la jerarquía

`primaria()` vuelve a llamar a `expresion()` al abrir un paréntesis, así que
dentro de `( )` cabe cualquier expresión y el orden se puede forzar:

| Expresión | Raíz del árbol |
|---|---|
| `a > b AND c` | `AND` |
| `a > (b AND c)` | `>` |
| `2 + 3 * 4` | `+` |
| `(2 + 3) * 4` | `*` |

### La asignación es una expresión

`asignacion` vive en el grupo aritmético y asocia a la **derecha**, así que
`a = b = 5` se agrupa como `a = (b = 5)`.

Tratarla como expresión tiene una consecuencia práctica: un fragmento como

```swordbyte
a = b + c > 9 AND d > e OR f <= 30
```

se analiza tal cual, **sin punto y coma**, porque es una expresión completa y
no una instrucción.

Como la gramática admite cualquier expresión a la izquierda del `=`, el parser
comprueba que sea una variable o una posición de arreglo y, si no, lo reporta:

```
5 = a    →    A la izquierda de "=" debe ir una variable.
```

### Cómo se ve un nivel en el código

Todos los niveles binarios tienen la misma forma: piden el nivel de abajo,
y mientras vean su operador siguen agrupando hacia la izquierda.

```js
aditiva () {
  let izq = this.multiplicativa();
  while (this.es('+') || this.es('-')) {
    const inicio = this.actual;
    const op = this.consumir().lexema;
    const der = this.multiplicativa();
    izq = nodo('Binaria', inicio, { operador: op, izquierda: izq, derecha: der });
  }
  return izq;
}
```

Mover un operador de grupo es, por tanto, mover una llamada: el `=` pasó de
estar arriba de todo a llamarse desde `relacional()`, y con eso bajó al grupo
aritmético sin tocar nada más.

---

## 4. Recuperación de errores: modo pánico

Un compilador que se detiene en el primer error obliga a compilar una y otra
vez. Este usa **modo pánico**:

1. Al fallar una producción se lanza `ErrorSintacticoFatal`, que desenreda la
   recursión hasta el bucle de instrucciones.
2. Se registra el error con línea, columna, lo esperado y lo encontrado.
3. `sincronizar()` descarta tokens hasta un punto seguro: un `;`, un `}`, o una
   palabra que pueda iniciar una instrucción.
4. El análisis continúa desde ahí.

```js
sincronizar () {
  while (!this.finalizado) {
    if (this.actual.lexema === ';') { this.i++; return; }
    if (this.actual.lexema === '}') return;
    if (INICIO_INSTRUCCION.includes(this.actual.lexema)) return;
    if (this.actual.tipo === TiposToken.TIPO_DATO) return;
    this.i++;
  }
}
```

Gracias a esto, este programa reporta **los tres errores de una sola vez**:

```swordbyte
clase p {
    clasePrincipal {
        entero a = 1      // falta ;
        entero b = 2      // falta ;
        entero c = 3      // falta ;
    }
}
```

### Red de seguridad contra ciclos infinitos

Si una producción falla sin consumir ningún token, el bucle podría girar para
siempre. Por eso el bucle de instrucciones comprueba que el índice avanzó; si no,
fuerza un avance:

```js
if (this.i === antes) {
  this.i++;
  if (++this._guardas > 500) break;
}
```

Esto está cubierto por la prueba *"no entra en ciclo infinito con basura"*.

---

## 5. Errores sintácticos que se detectan

| Situación | Mensaje |
|---|---|
| Falta `;` | `Falta ';' al final de la declaracion.` |
| Falta `)` | `Falta ')' para cerrar la condicion.` |
| Falta `}` | `Falta '}' para cerrar el bloque verdadero.` |
| Falta `clasePrincipal` | `Falta el bloque clasePrincipal: todo programa debe tener un punto de entrada.` |
| Dos `clasePrincipal` | `La clase solo puede tener un bloque clasePrincipal.` |
| `intentar` sin `capturar` | `Falta 'capturar' porque intentar siempre necesita su capturar.` |
| `opcion` sin casos | `La estructura opcion necesita al menos un caso.` |
| Nombre inválido | `Se esperaba el nombre de la variable en la declaracion.` |
| Palabra reservada como nombre | `'entero' es una palabra reservada y no puede usarse como nombre.` |
| Aridad incorrecta | `aleatorio espera 2 argumento(s) y recibio 1.` |
| Figura inexistente | `'dodecaedro' no es una figura valida para area.` |
| Código tras la clase | `Hay codigo despues del final de la clase: 'x'.` |

Cada error incluye: fase, línea, columna, lo esperado, lo encontrado y, cuando
aplica, una sugerencia concreta.

---

## 6. El Árbol de Sintaxis Abstracta

Cada nodo es un objeto plano con su tipo y su posición en el fuente:

```js
{
  tipo: 'Si',
  linea: 18, columna: 9,
  condicion: { tipo: 'Binaria', operador: '>=', izquierda: {...}, derecha: {...} },
  entonces:  { tipo: 'Bloque', instrucciones: [...] },
  ramas:     [ { tipo: 'SinoSi', ... } ],
  sino:      { tipo: 'Sino', cuerpo: {...} }
}
```

### Tipos de nodo

| Grupo | Nodos |
|---|---|
| Estructura | `Programa`, `ClasePrincipal`, `Funcion`, `Parametro`, `Bloque` |
| Declaraciones | `Declaracion`, `Declarador`, `Constante`, `Arreglo`, `Matriz`, `Inicializador` |
| Instrucciones | `Asignacion`, `IncrementoStmt`, `Impresion`, `Leer`, `Equipo`, `Limpiar`, `Esperar` |
| Control | `Si`, `SinoSi`, `Sino`, `Para`, `Mientras`, `HacerMientras`, `Opcion`, `Caso`, `PorDefecto`, `Intentar`, `Retornar`, `Romper` |
| Expresiones | `Binaria`, `Unaria`, `Postfija`, `Literal`, `Variable`, `Indexacion`, `Llamada`, `Nativa`, `Geometrica`, `Convertir` |

### De AST a árbol dibujable

`aArbolCompacto(ast, mapa)` en
[`NodosAST.js`](../src/core/sintactico/NodosAST.js) recorre el AST de forma
genérica: todo valor que sea un nodo (o un arreglo de nodos) se vuelve un hijo.
Por eso agregar un nodo nuevo al parser **no obliga a tocar la interfaz**.

Recibe el `mapaIdentificadores` de la fase léxica, así que las variables
aparecen como `id1`, `id2`… igual que en la salida léxica. Cada nodo queda
así:

```js
{ etiqueta: '>', familia: 'operador', tipoNodo: 'Binaria',
  linea: 1, columna: 3,
  hijos: [
    { etiqueta: 'id1', familia: 'identificador', ... },
    { etiqueta: 'id2', familia: 'identificador', ... }
  ] }
```

La `familia` (operador, identificador, literal, control, llamada, estructura)
es lo que la interfaz usa para darle color a cada nodo.

### Cómo se acomoda el dibujo

El dibujo lo hace [`src/ui/js/arbol.js`](../src/ui/js/arbol.js) con el método
clásico de dos pasos:

1. Las **hojas** se colocan de izquierda a derecha, una tras otra.
2. Cada **nodo interno** se centra sobre el primero y el último de sus hijos.

El ancho de cada nodo depende del largo de su etiqueta, y el cursor se corre
cuando un nodo es más ancho que el hueco que dejan sus hijos, para que dos
subárboles vecinos no se encimen.

```
          >              nivel 0
        /   \
     id1     id2         nivel 1
```

---

---

## 8. Probar sólo esta fase

```bash
npm run pruebas
```

Las pruebas de esta fase comprueban cada estructura del lenguaje, la jerarquía
de operadores, el efecto de los paréntesis, los tres modos de análisis y que la
recuperación de errores reporte todos los problemas de una sola pasada.

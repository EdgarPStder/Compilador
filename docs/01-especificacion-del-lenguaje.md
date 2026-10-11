# Especificación del lenguaje SwordByte

Documento de referencia del lenguaje. Define el alfabeto, las palabras
reservadas, los tipos de dato y cada instrucción con su equivalente en Java.

- **Nombre:** SwordByte
- **Extensión de archivo:** `.bs`
- **Lenguaje destino:** Java
- **Equipo:** SwordByte

---

## 1. Estructura de un programa

Todo programa vive dentro de una clase y necesita exactamente un bloque
`clasePrincipal`, que es el punto de entrada.

```swordbyte
clase nombreDelPrograma {

    // Las funciones pueden ir antes o después de clasePrincipal
    funcion entero sumar(entero a, entero b) {
        retornar a + b;
    }

    clasePrincipal {
        // instrucciones
    }
}
```

Equivalente en Java:

```java
public class nombreDelPrograma {
    static int sumar(int a, int b) { return a + b; }
    public static void main(String[] args) { }
}
```

---

## 2. Alfabeto

| Conjunto | Símbolos |
|---|---|
| Letras | `A`–`Z`, `a`–`z`, acentuadas y `ñ` |
| Dígitos | `0`–`9` |
| Guion bajo | `_` (solo dentro de identificadores) |
| Operadores | `+ - * / % ^ ** √ = == != < > <= >= ++ -- ! && \|\|` |
| Delimitadores | `( ) { } [ ] ; , : .` |
| Comillas | `"` `'` (también se aceptan las tipográficas `“ ” ‘ ’`) |
| Espacios | espacio, tabulador, retorno de carro, salto de línea |

Cualquier otro carácter produce un **error léxico**.

---

## 3. Palabras reservadas

### 3.1 Tipos de dato

| SwordByte | Java | Descripción |
|---|---|---|
| `logico` | `boolean` | `verdadero` o `falso` |
| `byte` | `byte` | entero de 8 bits |
| `caracter` | `char` | un carácter Unicode de 16 bits |
| `corto` | `short` | entero de 16 bits |
| `entero` | `int` | entero de 32 bits |
| `largo` | `long` | entero de 64 bits |
| `flotante` | `float` | punto flotante de 32 bits |
| `decimal` | `double` | punto flotante de 64 bits |
| `cadena` | `String` | secuencia de caracteres |
| `vacio` | `void` | sin valor de retorno (solo funciones) |

### 3.2 Estructura y declaraciones

| Palabra | Java | Uso |
|---|---|---|
| `clase` | `class` | declara la clase del programa |
| `clasePrincipal` | `public static void main` | punto de entrada |
| `Constante` | `final` | declara una constante |
| `Arreglo` | `tipo[]` | arreglo unidimensional |
| `matriz` | `tipo[][]` | matriz bidimensional |
| `funcion` | `static` | declara una función |
| `retornar` | `return` | devuelve un valor |

### 3.3 Control de flujo

| Palabra | Java |
|---|---|
| `si` | `if` |
| `sinoSi` | `else if` |
| `sino` | `else` |
| `para` | `for` |
| `mientras` | `while` |
| `hacer` | `do` |
| `opcion` | `switch` |
| `caso` | `case` |
| `porDefecto` | `default` |
| `romper` | `break` |
| `intentar` | `try` |
| `capturar` | `catch` |
| `Error` | `Exception` |

### 3.4 Entrada, salida y utilidades

| Palabra | Java |
|---|---|
| `imprimir` | `System.out.print` |
| `imprimirLn` | `System.out.println` |
| `imprimirF` | `System.out.printf` |
| `leer` | `Scanner.nextX()` |
| `equipo` | (bloque generado con los datos del equipo) |
| `limpiar` | código de escape ANSI `\033[H\033[2J` |
| `esperar` | `Thread.sleep` |

### 3.5 Funciones nativas

| Palabra | Java | Argumentos |
|---|---|---|
| `longitud` | `.length()` / `.length` | 1 |
| `aleatorio` | `Math.random` escalado | 2 (mín, máx) |
| `potencia` | `Math.pow` | 2 |
| `raiz` | `Math.sqrt` / `Math.pow(x, 1.0/n)` | 1 o 2 (número, índice) |
| `raizCuadrada` | `Math.sqrt` | 1 |
| `raizCubica` | `Math.cbrt` | 1 |
| `redondear` | `Math.round` | 1 |
| `logaritmo` | `Math.log` | 1 o 2 (base, número) |
| `logaritmo10` | `Math.log10` | 1 |
| `seno` | `Math.sin` | 1 |
| `coseno` | `Math.cos` | 1 |
| `convertir` | casting / `parseX` | 2 (valor, tipo destino) |
| `perimetro.figura` | fórmula | según la figura |
| `area.figura` | fórmula | según la figura |
| `volumen.figura` | fórmula | según la figura |

**Figuras admitidas**

| Familia | Figuras y número de argumentos |
|---|---|
| `perimetro` | `circulo(1)`, `cuadrado(1)`, `rectangulo(2)`, `triangulo(3)` |
| `area` | `circulo(1)`, `cuadrado(1)`, `rectangulo(2)`, `triangulo(2)` |
| `volumen` | `cubo(1)`, `esfera(1)`, `cilindro(2)`, `cono(2)`, `prisma(2)`, `piramide(2)` |

### 3.6 Literales y operadores con palabra

| Palabra | Java |
|---|---|
| `verdadero` | `true` |
| `falso` | `false` |
| `Y` · `AND` | `&&` |
| `O` · `OR` | `\|\|` |
| `NO` · `NOT` | `!` |
| `Null` | (marca de lista de parámetros vacía en `equipo`) |

Los operadores lógicos aceptan tres formas equivalentes: la española, la
inglesa y el símbolo. `a Y b`, `a AND b` y `a && b` son lo mismo.

---

## 4. Identificadores

- Empiezan con letra o `_`.
- Después admiten letras, dígitos y `_`.
- Distinguen mayúsculas de minúsculas: `edad` y `Edad` son distintos.
- No pueden coincidir con una palabra reservada.

Válidos: `edad`, `_total`, `miVariable123`, `contadorDeAlumnos`
Inválidos: `5malNombre` (empieza con dígito), `entero` (palabra reservada)

---

## 5. Literales

| Tipo | Ejemplos | Notas |
|---|---|---|
| Entero | `20`, `0`, `30000` | |
| Entero largo | `8000000L` | sufijo `L` |
| Decimal | `3.1416`, `8.5` | necesita al menos un dígito tras el punto |
| Flotante | `8.5f` | sufijo `f` |
| Doble | `3.1416d` | sufijo `d` |
| Cadena | `"Hola mundo"` | escapes `\n \t \" \\` |
| Carácter | `'A'`, `'\n'` | exactamente un carácter |
| Lógico | `verdadero`, `falso` | |

`4.` es un **error léxico**: falta el dígito decimal.

---

## 6. Operadores y jerarquía

Los operadores se agrupan en tres niveles. El grupo que se aplica **al final**
es el que queda **arriba** en el árbol sintáctico:

| Grupo | Operadores (de menor a mayor prioridad dentro del grupo) | En el árbol |
|---|---|---|
| **1. Booleanos** | `O` `OR` `\|\|` → `Y` `AND` `&&` → `NO` `NOT` `!` | hasta arriba |
| **2. Relacionales** | `==` `!=` → `<` `<=` `>` `>=` | en medio |
| **3. Aritméticos** | `=` → `+` `-` → `*` `/` `%` → `-` `+` `√` unarios → `^` `**` → `++` `--` → `( )` `[ ]`, identificadores y números | hasta abajo |

Los operadores lógicos aceptan tres formas equivalentes: la española, la
inglesa y el símbolo. `a Y b`, `a AND b` y `a && b` son lo mismo.

### Potencia y raíz

Las dos van **por debajo** de `*` `/` `%`, o sea que se resuelven primero:
`2 * 3 ^ 2` es `2 * (3 ^ 2) = 18`.

| Operación | Formas de escribirla | Ejemplo |
|---|---|---|
| Potencia | `^`, `**`, `potencia(base, exponente)` | `2 ^ 10`, `2 ** 10`, `potencia(2, 10)` |
| Raíz cuadrada | `√`, `raiz(x)`, `raizCuadrada(x)` | `√16`, `raiz(16)`, `raizCuadrada(16)` |
| Raíz n-ésima | `raiz(x, n)` | `raiz(27, 3)` |
| Raíz cúbica | `raizCubica(x)` | `raizCubica(27)` |

El símbolo `√` es un operador de un solo operando y se escribe pegado a él:
`√16`, `√(a + b)`.

### Asociatividad

| Operadores | Asociatividad |
|---|---|
| `=` | derecha: `a = b = 5` es `a = (b = 5)` |
| `^` `**` | derecha: `2 ^ 3 ^ 2` es `2 ^ (3 ^ 2) = 512` |
| Todos los demás binarios | izquierda: `10 - 3 - 2` es `(10 - 3) - 2` |
| `NO` `NOT` `!` y los unarios `-` `+` `√` | derecha |

El menos se comporta como en matemáticas: `-2 ^ 2` es `-(2 ^ 2) = -4`, y el
exponente puede ser negativo: `2 ^ -3`.

### Ejemplos

`a = b + c > 9 AND d > e OR f <= 30` se agrupa como:

```
( ( (a = (b + c)) > 9 )  AND  (d > e) )  OR  (f <= 30)
```

- El `=` es aritmético, así que queda **debajo** del `>`.
- El `AND` y el `OR` son booleanos, así que quedan **arriba** de todo.

### Los paréntesis

`( )` reinicia la jerarquía: dentro de los paréntesis cabe cualquier expresión,
así que sirven para forzar otro orden.

| Expresión | Se agrupa como | Raíz del árbol |
|---|---|---|
| `a > b AND c` | `(a > b) AND c` | `AND` |
| `a > (b AND c)` | `a > (b AND c)` | `>` |
| `2 + 3 * 4` | `2 + (3 * 4)` | `+` |
| `(2 + 3) * 4` | `(2 + 3) * 4` | `*` |
| `NO a > b` | `NO (a > b)` | `NO` |
| `(NO a) > b` | `(NO a) > b` | `>` |

### La asignación es una expresión

Además de instrucción, `=` funciona como expresión. Eso permite analizar
`a = b + c` sin escribir el punto y coma final.

---

## 7. Comentarios

```swordbyte
// Comentario de una línea

/* Comentario
   de varias líneas */
```

El analizador léxico los reconoce y los muestra en la tabla de tokens, pero
**no se entregan al analizador sintáctico**.

---

## 8. Instrucciones

### 8.1 Declaración de variables

```swordbyte
entero edad = 20;        // con valor inicial
entero a;                // sin valor inicial
entero x, y, z;          // varias del mismo tipo
Constante decimal IVA = 0.16;
```

### 8.2 Arreglos y matrices

```swordbyte
Arreglo entero datos[3];                        // tamaño definido
Arreglo cadena nombres[] = {"Ana", "Luis"};     // por valores
matriz entero tabla[2][2] = {{1, 2}, {3, 4}};
matriz entero t[3][3];
```

### 8.3 Asignación y proposiciones simples

```swordbyte
edad = 21;
datos[0] = 10;
tabla[1][1] = 7;
contador++;
```

Cualquier expresión seguida de `;` también es una instrucción (una
**proposición simple**):

```swordbyte
a && b || c + f > d;
```

Para revisar fragmentos, las proposiciones también se pueden escribir sueltas,
una por renglón y sin punto y coma:

```swordbyte
a = b + c
a && b || c + f > d
```

### 8.4 Salida

```swordbyte
imprimir("Sin salto de línea");
imprimirLn("Con salto de línea");
imprimirF("Edad: %d, nombre: %s", edad, nombre);
```

Formatos de `imprimirF`: `%d %f %.2f %s %c %b %x %o %e %n %%`

### 8.5 Entrada

```swordbyte
entero a;
leer(a);
```

### 8.6 Decisión

```swordbyte
si (edad >= 18) {
    imprimirLn("Mayor");
} sinoSi (edad > 0) {
    imprimirLn("Menor");
} sino {
    imprimirLn("Edad no válida");
}
```

### 8.7 Ciclos

```swordbyte
para (entero i = 1; i <= 3; i++) {
    imprimirLn(i);
}

mientras (i <= 3) {
    imprimirLn(i);
    i++;
}

hacer {
    imprimirLn("Al menos una vez");
} mientras (x < 1);
```

### 8.8 Selección múltiple

```swordbyte
opcion (dia) {
    caso 1:
        imprimirLn("Lunes");
        romper;
    caso 2:
        imprimirLn("Martes");
        romper;
    porDefecto:
        imprimirLn("Otro día");
}
```

### 8.9 Funciones

```swordbyte
funcion entero sumar(entero a, entero b) {
    retornar a + b;
}

funcion vacio saludar(cadena n) {
    imprimirLn("Hola " + n);
}
```

### 8.10 Manejo de errores

```swordbyte
intentar {
    entero x = 10 / 0;
} capturar (Error e) {
    imprimirLn("Error: división entre cero.");
}
```

### 8.11 Utilidades

```swordbyte
equipo(Null);       // datos del equipo
limpiar();          // limpia la consola
esperar(1000);      // pausa un segundo
```

---

## 9. Decisiones de diseño y observaciones

Durante la implementación se encontraron algunos puntos que el documento de
especificación original dejaba abiertos. Así se resolvieron:

1. **`asignar(edad, 20);`**
   Aparece una vez en el ejemplo de la instrucción `imprimir`, pero contradice
   la sección de declaración de variables, que define la asignación con `=`.
   No existe como palabra reservada en el resto del documento.
   **Decisión:** el compilador implementa únicamente `variable = valor;`.
   Si la asignatura exige `asignar(...)`, se agrega como una regla más en
   `AnalizadorSintactico.instruccion()`.

2. **Comillas tipográficas.**
   El documento original usa `“ ”` (las de Word). Como es fácil copiar código
   desde ahí, el analizador léxico las acepta además de `"`.

3. **`Arreglo` con dos dimensiones.**
   La especificación muestra `Arreglo Tipo id[num][num];`. Se acepta, y equivale
   a `matriz`, que es la forma recomendada.

4. **Mayúsculas de `Constante`, `Arreglo` y `Error`.**
   Se respetan tal como vienen en la especificación. `matriz` va en minúscula.

5. **Un solo `clasePrincipal`.**
   Si hay más de uno, o ninguno, se reporta un error sintáctico.

---

## 10. Programa de referencia

```swordbyte
clase demostracion {

    funcion decimal areaCirculo(decimal radio) {
        retornar area.circulo(radio);
    }

    clasePrincipal {
        equipo(Null);

        Arreglo entero datos[3];
        datos[0] = 10;

        entero tam = longitud(datos);
        imprimirF("El arreglo tiene %d posiciones", tam);

        intentar {
            entero division = 10 / 0;
        } capturar (Error e) {
            imprimirLn("Error: división entre cero.");
        }

        imprimirLn("Programa terminado.");
    }
}
```

Está en [`ejemplos/05-completo.bs`](../ejemplos/05-completo.bs).

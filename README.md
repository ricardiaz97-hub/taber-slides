# Taber Slides

Creador de diapositivas HTML para que los miembros de la iglesia armen sus anuncios y presentaciones sin tocar código.
Primer estilo: **Vidrio estelar** (el de Arca).

## Cómo se usa

1. Abre `index.html` (o la dirección donde lo publiques).
2. Elige una diapositiva a la izquierda, o crea una con **+ Nueva diapositiva**.
3. Cambia los textos y las fotos en el panel de la derecha. La vista previa se actualiza sola.
4. **▶ Presentar** abre la presentación a pantalla completa. Flechas o espacio para avanzar, **F** pantalla completa, **B** pantalla negra, **A** avance automático.
5. **Descargar HTML** guarda la presentación en un solo archivo que funciona sin internet y se abre en cualquier computadora o proyector.
6. **Guardar proyecto** descarga un archivo `.json` con todo el trabajo. Con **Abrir** se retoma después o en otra computadora. Así se arma la presentación de la semana siguiente a partir de la anterior.

El trabajo se guarda solo en el navegador de cada persona. Para pasarlo a otra persona, mándale el archivo `.json`.

## Publicarlo (GitHub y Vercel)

Es una página estática: no necesita servidor ni instalar nada.

1. Crea un repositorio en GitHub y sube esta carpeta tal cual.
2. En vercel.com elige **Add New → Project**, importa el repositorio y pulsa **Deploy**. Framework: *Other*. No hay comando de build ni carpeta de salida especial.
3. Alternativa sin Vercel: en GitHub, **Settings → Pages → Deploy from a branch → main / (root)**.

## Cambiar el código

Todo el código está en `src/`:

- `src/parts/theme-vidrio.css`: el estilo Vidrio estelar de las diapositivas.
- `src/parts/ui.css`: el diseño del editor.
- `src/parts/app.js`: el editor, las plantillas de diapositivas (`TYPES`) y el motor de presentación (`createRuntime`).
- `src/parts/body.html`: la estructura del editor.

Para regenerar `index.html` después de editar:

```
npm install
FONTS_DIR=node_modules/@fontsource python3 src/build.py
```

El resultado queda en `src/dist/index.html`; cópialo a la raíz.

## Agregar otro lenguaje de diseño

1. Copia `src/parts/theme-vidrio.css` a un archivo nuevo, por ejemplo `theme-sobrio.css`, y cambia colores, tipografías y formas. Mantén los mismos nombres de clase (`.slide`, `.glass`, `.t-mega`…): las plantillas dependen de ellos.
2. En `build.py`, lee el CSS nuevo además del actual.
3. En `app.js`, agrega la opción al selector de **Ajustes → Lenguaje de diseño** y pon la clase del estilo en `deckHTML` para activarlo.

## Agregar un tipo de diapositiva

En `app.js`, dentro de `TYPES`, agrega un objeto con `name`, `desc`, `def()` (valores iniciales), `fields` (los campos que se editan) y `render(d)` (el HTML de la diapositiva). El editor arma el formulario solo a partir de `fields`.

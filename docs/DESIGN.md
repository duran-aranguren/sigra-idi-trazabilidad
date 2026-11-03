# DESIGN.md · Guía de estilo de SIGRA Trazabilidad I+D+i

Esta guía resume las decisiones visuales de la aplicación. Se basa en el manual de identidad de SIGRA y en un estilo «científico» pensado para leer datos con rapidez. Es la referencia para cualquier pantalla nueva, incluidas las que genere un asistente de IA. Los valores provienen de `public/css/app.css`.

## 1. Principios

1. **La marca enmarca, los datos hablan:** oliva y dorado en la navegación y en los acentos; las figuras usan una paleta validada.
2. **Cada figura se explica sola:** número de figura, título, subtítulo con lo que se compara, unidades y nota de fuente o corte.
3. **Una acción principal por pantalla:** un solo botón primario (oliva).
4. **El estado se entiende sin color:** salud y alertas siempre llevan símbolo y texto (● ▲ ■).

## 2. Color

### Marca (manual de identidad)

| Token | Valor | Uso |
|----------------------|------------------------------|------------------------------------------------|
| `--brand-olive` | `#839B31` Olive Green | Marca, acentos, barras |
| `--brand-gold` | `#EEB012` Antique Gold | Acento secundario, foco de campos |
| `--brand-white` | `#FFFFFF` Pure White | Superficies |
| `--olive-d` | `#5F7A1F` | Botón primario y texto de acento (contraste AA) |
| `--olive-dd` | `#3B4A12` | Texto sobre fondos claros de oliva |
| `--gold-t` | `#8A6300` | Etiquetas en dorado legible (kickers) |

### Interfaz

| Token | Claro | Oscuro | Uso |
|------------------------|----------------------|----------------------|--------------------------------|
| `--bg` | `#F8F4EA` | `#13140E` | Fondo general |
| `--surface` | `#FFFFFF` | `#1C1D17` | Tarjetas |
| `--line` / `--line2` | `#ECE4D1` / `#DCD1B6` | `#2E3024` / `#3E4131` | Bordes |
| `--ink` / `--ink2` / `--ink3` | `#23241C` / `#575748` / `#8B8977` | `#F1EEE0` / `#C6C3AC` / `#8F8D78` | Texto principal, secundario y tenue |
| `--side` | `#2C3610` | `#0E1007` | Barra lateral |

### Datos

| Uso | Tokens y valores |
|------------------------------|----------------------------------------------------------------------|
| Series categóricas (horizontes H1, H2, H3) | `#5F7A1F` · `#E0A100` · `#256ABF` (modo oscuro: `#5A781A` · `#C08600` · `#4F92E3`) |
| Etapas Stage-Gate (rampa ordinal) | `#A3B85A` → `#8EA63E` → `#7A9230` → `#667C25` → `#52651C` → `#3F4E14` → `#2C370C` |
| Salud | En ruta `#0CA30C` · Atención `#FAB219` · En riesgo `#D03B3B` |
| Postura de stakeholders | Promotor `#3F4E14` · Favorable `#8EA63E` · Neutral `#A8A79F` · Reticente `#E0896B` · Opositor `#B23A2A` |
| Matriz de riesgo (zonas) | `#EEF3DC` · `#FBF0CC` · `#F8DCC4` · `#F3C9C0` |

La paleta categórica se validó para daltonismo (deuteranopía y protanopía). Nunca se usa solo el color para transmitir un estado.

## 3. Tipografía

| Rol | Fuente | Tamaño y peso |
|----------------------|------------------------------------|------------------------------------------|
| Interfaz y títulos | **Poppins** (SIL OFL, incluida en la app; funciona sin internet) | Título de página 24 px · Cuerpo 13,5 px con interlineado 1,55 |
| Datos, etiquetas y códigos | **DejaVu Sans Mono** | *Kickers* de 10 px en mayúsculas con espaciado 0,14 em, en dorado `--gold-t` |
| Cifras de indicadores | Poppins | 26 px, peso 500, con la unidad en mono de 11 px (COP M, %, d) |

## 4. Espaciado, forma y elevación

- Escala de espaciado: 4 · 8 · 12 · 16 · 20 · 24 px.
- Radio de tarjetas: 14 px (`--radius`); botones y campos: 8–10 px; chips: 999 px.
- Sombra única y suave: `0 1px 2px rgba(60,50,20,.05), 0 6px 18px rgba(60,50,20,.05)`; sin sombra en modo oscuro.

## 5. Componentes

| Componente | Especificación |
|-------------------------|---------------------------------------------------------------------------|
| Botón primario | Fondo `--olive-d`, texto blanco, uno por vista |
| Botón secundario | Fondo blanco, borde `--line2`, texto `--ink` |
| Tarjeta KPI | Borde superior de color según estado, *kicker* en mono, cifra grande con unidad, línea de contexto y flecha ↗ hacia el detalle |
| Figura | Etiqueta «FIG. 01» en mono dorado, título, subtítulo con método, botón «Ver detalle →», nota de corte y tamaño de muestra (n) |
| Chip de salud | ● En ruta (verde) · ▲ Atención (ámbar) · ■ En riesgo (rojo), siempre con texto |
| Tabla | Encabezado en mono pequeño, filas de 36–40 px, máximo 640 px de alto con desplazamiento cuando supera 18 filas |
| Formulario | Etiqueta arriba, campos de ancho completo, obligatorios con asterisco, foco con borde dorado |
| Mensaje emergente (toast) | Esquina inferior; verde para confirmación, rojo para error o permiso denegado |
| Ventana de revisión de IA | Etiqueta de modo (n8n o «local (respaldo)»), confianza, aviso, cada cambio con casilla de aprobación |

## 6. Diseño adaptable

| Ancho | Navegación |
|-----------------------------------|-----------------------------------------------------------------|
| ≥ 1200 px | Barra lateral completa |
| 761–1199 px (pantalla dividida, tableta) | Riel compacto de 96 px con íconos y etiquetas cortas |
| ≤ 760 px (celular) | Barra superior con logo y menú desplegable |

Las figuras se recalculan con el ancho disponible. En el celular, las tarjetas KPI pasan a dos columnas.

## 7. Iconografía e imágenes

Íconos de trazo de 1,8 px, en el color del texto. Logo SIGRA tomado del manual de marca, sin deformar. Ícono de la app instalable de 192 y 512 px.

## 8. Voz y tono

Español claro y directo, en segunda persona («Pulsa cualquier indicador…»). Las cifras siempre llevan unidad. Los mensajes de error dicen qué pasó y qué hacer («Tu rol es de solo lectura», «Solo el administrador puede hacer esto»).

## 9. Reglas para generar pantallas con IA

- Usar solo los tokens de esta guía; no introducir colores nuevos.
- Toda figura nueva sigue el patrón de la sección 5 (número, título, método, nota).
- Respetar los tres tamaños de pantalla de la sección 6.
- Los textos de estado siempre acompañados de símbolo.

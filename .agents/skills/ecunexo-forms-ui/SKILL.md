---
name: ecunexo-forms-ui
description: >-
  Estilo UI de formularios y resúmenes del frontend EcuNexo (SPA tenant, Platform
  ecunexo_license y template_project_syncfusion): layout tipo login, EcuLabeledInput,
  cuadrícula friendMobile de 4 columnas, desplegables details, botón primario con texto
  on-primary (nunca negro sobre azul), pie con enlace partido y mensajes de error.
  USE WHEN se cree o modifique un formulario, resumen, diálogo o dashboard; emitir
  licencia; grid de campos; o cuando el usuario pida 4 columnas, friendMobile, o
  consistencia visual con bienvenida, login o «Resumen para emitir».
---

# EcuNexo — Formularios UI (SPA)

Skill para **no perder el formato** acordado en la pantalla de creación de organización (`/bienvenida`) y alinear **todos los formularios**, resúmenes y diálogos de producto.

**Raíces:** `template_project_syncfusion/` (auth/onboarding), `ecunexo_admin/` (empresas), `ecunexo_license/` (emitir licencia).

Skills relacionados (cuando el trabajo sea mixto):

- `ecunexo-architecture` / `ecunexo-coding-standards` — solo backend .NET
- Reglas React/TS del usuario — tipado estricto, exports con nombre

---

## Principios

1. **Un solo design system visual** para formularios “de producto”: variables y clases definidas en `src/features/auth/loginPage.css` (prefijo `login-page__*`).
2. **Etiqueta siempre visible** encima del campo: usar `EcuLabeledInput` / `EcuLabeledTextarea`, no inputs sueltos sin `<label>`, ni Syncfusion `TextBoxComponent` con `floatLabelType="Auto"` si el objetivo es este look (el float usa placeholder como label animado y se ve distinto).
3. **Scope CSS por pantalla**: las variantes compactas, grid y desplegables de bienvenida están en `src/features/onboarding/welcomeOnboarding.css` bajo el selector **`.welcome-onboarding.login-page`**. En **nuevas pantallas** con el mismo look, o bien reutilizas ese modificador en el `<main>` (solo si tiene sentido semántico), o bien **copias el bloque de reglas** bajo un nuevo modificador (p. ej. `.ecu-settings-form.login-page`) hasta que se extraiga un CSS compartido `ecuFormLayout.css`.

---

## Imports obligatorios en la página

```tsx
import '../auth/loginPage.css' // o ruta equivalente hasta loginPage.css
```

Si la pantalla debe verse como **bienvenida** (compacta, grid, labels pequeños, footer):

```tsx
import '../onboarding/welcomeOnboarding.css' // solo si <main> incluye clase welcome-onboarding
```

---

## Shell de layout (página centrada con tarjeta)

Patrón alineado a login y bienvenida:

```tsx
<main className="login-page welcome-onboarding">
  <div className="login-page__glow" aria-hidden />
  <div className="login-page__inner">
    <div className="login-page__brand">{/* icono + título + subtítulo opcional */}</div>
    <div className="login-page__card">{/* formulario + mensajes */}</div>
    <footer className="login-page__footer login-page__footer--welcome">{/* acciones secundarias */}</footer>
  </div>
</main>
```

- Sin `welcome-onboarding` en `<main>`: se aplican solo los estilos base de `loginPage.css` (p. ej. login estándar).
- Con `welcome-onboarding`: se aplican overrides de `welcomeOnboarding.css` (labels más pequeños, márgenes, grid, etc.).

---

## Campos con label

**Componentes:** (exports con nombre)

| Componente            | Ruta |
|-----------------------|------|
| `EcuLabeledInput`     | `src/components/form/EcuLabeledInput.tsx` |
| `EcuLabeledTextarea`  | `src/components/form/EcuLabeledTextarea.tsx` |

Cada uno envuelve `login-page__group` + `login-page__label` + control. Props clave: `id`, `label`, `value`, `onValueChange`, `placeholder`, `type`, `autoComplete`, `required`, opcional `topSlot` (contenido encima del label, p. ej. enlace “Olvidé contraseña”), `groupClassName` (p. ej. `login-page__token-block`).

**Ejemplo mínimo:**

```tsx
<EcuLabeledInput
  id="campo-id"
  name="campoName"
  label="Texto del label"
  value={valor}
  onValueChange={setValor}
  placeholder="Ejemplo opcional"
  required
/>
```

---

## Cuadrícula horizontal (elegante en desktop)

- Contenedor: **`welcome-onboarding__fields-grid`** (1 columna &lt; 560px, 2 columnas ≥ 560px).
- Ancho del bloque en bienvenida: **`.welcome-onboarding.login-page .login-page__inner`** pasa a `min(94vw, 36rem)` desde **560px** (junto con el grid).

Para **grupos opcionales** con 3 campos donde el tercero debe ancho completo en 2 columnas:

- Contenedor: **`welcome-onboarding__details-fields welcome-onboarding__fields-grid--adv`**
- Regla: el **último** `.login-page__group` hijo hace `grid-column: 1 / -1` desde 560px.

---

## 4 columnas y friendMobile (resúmenes, diálogos, dashboards)

**Debe respetarse las 4 columnas y ser friendMobile.** No es opcional en pantallas de producto (emitir licencia, ficha de empresa, diálogos de resultado).

| Ancho | Columnas |
|-------|----------|
| &lt; 640px (móvil) | **1** |
| ≥ 640px (tablet) | **2** |
| ≥ 960px (desktop) | **4** |

Clases de referencia:

| Superficie | Contenedor |
|------------|------------|
| Emitir licencia (campos) | `issue-license-form-grid` / `issue-license-field-grid--4` |
| Resumen + diálogo emitida | `issue-license-review--4`, `ecu-plan-summary-grid--4`, `ecu-plan-summary-modules--4` |
| Empresas Admin | `ecu-companies-form__grid--4` |

Reglas:

- Los cuatro huecos se ocupan. Si hay 3 métricas, la cuarta es un dato real (p. ej. recuento de módulos), no un vacío a la derecha.
- Módulos y chips van en la misma cuadrícula, **no** en barras a todo el ancho.
- Un campo ancho usa `span 2` o `span 1 / -1`; no rompe el grid dejando una columna muerta.
- No uses `repeat(auto-fill, minmax(...))` en estos resúmenes: agrupa tarjetas a la izquierda y deja un hueco.

**Botón primario (dark y light):** fondo `--shell-primary` (o `--c-primary`) y texto **`--shell-on-primary` / blanco**. En dark **nunca** `color: var(--shell-bg)` sobre azul (negro sobre azul no compagina). El enlace «Descargar .ecunexo-license» sigue esa regla.

Referencia: `ecunexo_license/src/pages/licensing/issueLicenseForm.css`, `IssueLicenseReviewStep.tsx`, `IssueLicenseResultDialog.tsx`, `ecunexo_admin/src/styles/ecu-companies-form.css`.

---

## Desplegables (no deben parecer inputs)

- `details` con clases: **`welcome-onboarding__details welcome-onboarding__details--disclosure`**
- `summary`: texto azul (`--c-primary-container`), chevron **▸ / ▾** vía `::before` (tamaños ~0.85rem / 0.95rem abierto), `gap` entre icono y texto.
- Cuerpo de ayuda: **`welcome-onboarding__details-body`** (borde izquierdo sutil).
- Espacio entre dos `details` consecutivos: margen superior entre hermanos.

---

## Botón primario de envío

- **`login-page__submit`** en un `<button type="submit">`.
- En bienvenida, márgenes verticales ligeros ya definidos en `welcomeOnboarding.css` (separación respecto a `details` y al footer).

---

## Mensajes de error en tarjeta

- **`welcome-onboarding__error`** + `role="alert"`, encima del `<form>` dentro de la card.

---

## Pie con dos intenciones (“¿Ya tienes cuenta?” + acción)

Patrón usado en bienvenida (separación visual y semántica):

```tsx
<footer className="login-page__footer login-page__footer--welcome">
  <Link className="welcome-onboarding__link welcome-onboarding__link--footer" to="/login">
    <span className="welcome-onboarding__footer-muted">¿Ya tienes cuenta?</span>
    <span className="welcome-onboarding__footer-action">Iniciar sesión</span>
  </Link>
</footer>
```

- El enlace usa **`inline-flex`** + **`gap`** (clases en `welcomeOnboarding.css`).
- Footer con **`margin-top`** y **`padding-top`** para no quedar pegado al botón.

---

## Tokens (no inventar colores sueltos en el form)

Definidos en **`.login-page`** dentro de `loginPage.css`, entre otros:

- `--c-primary`, `--c-primary-container`, `--c-text-muted`, `--c-on-surface`, `--c-border`, `--c-surface-lowest`, `--c-outline-variant`, `--c-code-bg`, `--c-code-text`

Cualquier CSS nuevo para formularios debe preferir estas variables.

---

## Breakpoints a respetar

| Ancho      | Comportamiento relevante |
|------------|---------------------------|
| &lt; 560px | Login/bienvenida: **1 columna** |
| ≥ 560px    | Login/bienvenida: **2 columnas**; inner más ancho |
| &lt; 640px | Producto (licencias, empresas, resúmenes): **1 columna** friendMobile |
| ≥ 640px    | Producto: **2 columnas** |
| ≥ 768px    | Padding página y card (bienvenida) |
| ≥ 960px    | Producto: **4 columnas** |

---

## Anti patrones (evitar regresiones)

- No sustituir `EcuLabeledInput` por `<input>` + label manual duplicando clases distintas sin motivo.
- No mezclar este look con **Syncfusion TextBox float** en la misma tarjeta salvo decisión explícita de producto.
- No poner lógica de negocio en el JSX del formulario más allá del estado local y envío; la Api sigue en capas/hooks según el proyecto.
- No dejar métricas o módulos pegados a la izquierda con vacío a la derecha: **4 columnas** en desktop.
- No pintar el texto del botón primario en negro sobre azul en tema oscuro.

---

## Referencia rápida de implementación

**Pantalla de referencia:** `src/features/onboarding/WelcomeOnboardingPage.tsx`  
**Estilos de referencia:** `src/features/onboarding/welcomeOnboarding.css`  
**Estilos base:** `src/features/auth/loginPage.css`  
**Resumen / emitir licencia:** `ecunexo_license/src/pages/licensing/issueLicenseForm.css` (`1 → 2 → 4` columnas)

Antes de dar por cerrada una PR de UI: checklist — labels visibles, **4 columnas** en desktop (friendMobile: 1 / 2 / 4), módulos en grid no barras full-width, botón primario con texto claro, errores accesibles.

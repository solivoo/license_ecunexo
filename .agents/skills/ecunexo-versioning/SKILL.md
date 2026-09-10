---
name: ecunexo-versioning
description: >-
  Reglas y protocolo estándar para el control de versiones semántico (SemVer),
  bump de versiones, sincronización multi-archivo (VERSION, Docker Compose, Portainer,
  package.json, feeds NuGet), etiquetado Git y versionado de features en la plataforma
  EcuNexo (Licencias y Cliente). USE WHEN se agregue o modifique un módulo de negocio,
  se prepare un release, se incremente la versión del sistema, se cree un tag de git,
  o el usuario consulte sobre la versión actual o el flujo de versionado.
---

# EcuNexo — Sistema y Protocolo de Versionado de Features (SemVer)

Este documento establece las directrices oficiales para versionar, etiquetar y desplegar nuevas funcionalidades, módulos comerciales y correcciones en la arquitectura desacoplada de EcuNexo (**Plataforma de Licencias** y **Tenant Cliente**).

---

## 1. Esquema SemVer (Semantic Versioning)

EcuNexo adopta la convención **`vMAJOR.MINOR.PATCH`** (ej. `v1.1.0`):

| Segmento | Cuándo incrementar | Ejemplos en EcuNexo |
|---|---|---|
| **`MAJOR`** (`X.0.0`) | **Breaking changes** en contratos o protocolos | Cambio incompatible en el formato del artefacto criptográfico RSA-PSS; rediseño no retrocompatible de esquemas de base de datos (`licensing_ecunexo` o `ecunexo`); ruptura en el protocolo de canje `/activate-license`. |
| **`MINOR`** (`1.X.0`) | **Nuevas features o módulos de negocio** | Integración de nuevo módulo comercial (ej. `repairs`, `customers`); nuevos catálogos de límites/entitlements; adición de presets en UI; nuevos endpoints en API sin romper existentes; Command Palette global. |
| **`PATCH`** (`1.0.X`) | **Correcciones de errores y parches** | Bug fixes en componentes UI; ajustes de tipado TypeScript; resolución de warnings de compilación .NET (ej. CA1848); corrección de variables de entorno o proxies Nginx. |

---

## 2. Matriz de Archivos a Sincronizar en cada Versión

Cuando se realiza un bump de versión en **`license_ecunexo`** (Plataforma de Licencias), **TODOS** los siguientes archivos deben actualizarse atómicamente:

```
┌────────────────────────────────────────────────────────────────────────┐
│  license_ecunexo (Repositorio de Licenciamiento)                       │
├────────────────────────────────┬───────────────────────────────────────┤
│ Archivo                        │ Valor / Formato                       │
├────────────────────────────────┼───────────────────────────────────────┤
│ VERSION                        │ X.Y.Z (texto plano en la raíz)        │
│ README.md                      │ Mención de versión y tag `vX.Y.Z`      │
│ docker-compose.yml             │ Fallbacks: ecunexo-license-api:X.Y.Z  │
│                                │            ecunexo-license-spa:X.Y.Z  │
│ deploy/docker-compose.yml      │ Fallbacks: ecunexo-license-api:X.Y.Z  │
│                                │            ecunexo-license-spa:X.Y.Z  │
│ deploy/.env.example            │ LICENSE_API_IMAGE=...:X.Y.Z           │
│                                │ LICENSE_SPA_IMAGE=...:X.Y.Z           │
│ ecunexo_license/package.json   │ "version": "X.Y.Z"                    │
│ nuget-local/EcuNexo.Core.*     │ Reempaquetar si hubo cambios en Core  │
└────────────────────────────────┴───────────────────────────────────────┘
```

En **`Cliente`** (`ecunexo_api` / `ecunexo_admin`):
- `ecunexo_admin/package.json`: Actualizar `"version": "X.Y.Z"`.
- Documentación de versión / ADRs correspondientes al módulo.

---

## 3. Protocolo de Versionado Paso a Paso (Runbook)

Para versionar una nueva feature o módulo de forma segura, sigue rigurosamente esta secuencia:

### Paso 1: Validación y Pruebas Limpias
Antes de tocar cualquier número de versión, valida que todo el código compile sin advertencias ni errores:

```bash
# 1. Backend .NET Release
dotnet build ecunexo_license_api/src/EcuNexo.Platform.Api/EcuNexo.Platform.Api.csproj -c Release

# 2. Pruebas criptográficas y unitarias
dotnet test tests/...

# 3. Frontend TypeScript & Bundling
cd ecunexo_license && npm run build
```

### Paso 2: Actualización de Archivos de Versión
Actualiza los 6 archivos listados en la matriz de la Sección 2 con el nuevo número de versión.

### Paso 3: Commit Convencional de Release
Confirma los cambios siguiendo la especificación Conventional Commits:

```bash
git add VERSION README.md docker-compose.yml deploy/ ecunexo_license/package.json
git commit -m "chore(release): bump version to vX.Y.Z"
```

Si el commit incluye tanto la feature como el release:
```bash
git commit -m "feat(modulo): integrar módulo X [vX.Y.Z]"
```

### Paso 4: Creación del Git Tag Anotado
Crea **siempre** un tag anotado (`-a`) que describa los hitos del release:

```bash
git tag -a vX.Y.Z -m "Release vX.Y.Z: Integración del módulo <Nombre> (<código>) y catálogo de límites"
```

### Paso 5: Publicación Remota
Envía la rama y el tag de forma coordinada a GitHub:

```bash
git push origin main && git push origin vX.Y.Z
```

### Paso 6: Verificación de Estado
Comprueba que el árbol esté limpio y que `git describe` refleje el tag exacto:

```bash
git describe --tags --always
# Debe imprimir exactamente: vX.Y.Z (sin sufijos -g... ni conteos de commits)
```

---

## 4. Despliegue en Portainer y Docker

Gracias a la directiva `pull_policy: build` configurada en `docker-compose.yml`:
1. Portainer detecta el commit de `main`.
2. Al ejecutar **"Update the stack"** con la opción **"Re-pull image and redeploy"**, Docker construye localmente las imágenes con las nuevas etiquetas `:X.Y.Z`.
3. Esto garantiza que el host ejecute imágenes versionadas idénticas al código fuente en GitHub, evitando cachés obsoletos.

---

## 5. Reglas No Negociables para Agentes y Desarrolladores

1. **Prohibido desincronizar compose y VERSION:** Nunca actualices `VERSION` o `package.json` sin reflejarlo en `docker-compose.yml`, `deploy/docker-compose.yml` y `deploy/.env.example`.
2. **Tags siempre anotados:** NUNCA uses tags ligeros (`git tag vX.Y.Z`). Usa siempre `-a` con mensaje descriptivo.
3. **No romper retrocompatibilidad en parches:** Los parches (`PATCH`) solo resuelven bugs y jamás deben alterar el contrato de tokens JWT, firma RSA o parámetros de endpoints.
4. **Validación previa obligatoria:** Ningún bump de versión puede confirmarse si `npm run build` o `dotnet build` reportan errores o advertencias tratadas como error.

# Licencias — Contexto Activo del Proyecto (Active Memory)

> Este archivo mantiene el hilo operativo de la Plataforma de Licencias (API emisora + panel del
> operador) para que cualquier sesión retome el trabajo con precisión. Se actualiza al completar o
> cambiar de hito.

---

## 1. Estado Actual del Repositorio

* **Repositorio:** `github.com/solivoo/license_ecunexo` (separado de `ecunexo` y `Ecunexo_cliente`).
* **Rama Activa:** `main` (sincronizada con `origin/main`).
* **Última Versión Publicada:** `v1.13.0` (`VERSION`, `docker-compose.yml`, `deploy/*` y
  `ecunexo_license/package.json` sincronizados).
* **Verificación:** build .NET limpio, panel `npm run build` limpio, migración
  `AddLicenseGrantEntitlements` aplicada y prueba E2E con un grant activo (v1→v2→v3 con auditoría).

---

## 2. Arquitectura (ADR-008)

Dos hosts y dos bases de datos desacopladas; el tenant nunca lee `licensing_ecunexo`:

```text
licensing_ecunexo (Plataforma)                 exunexo (Tenant / Cliente)
─────────────────────────────                  ──────────────────────────
LicenseGrant + plan + customer                 SubscriptionAccount + Tenant
LicenseGrantEntitlementChange (auditoría)      license_redemptions (grant_id)
        │                                              ▲
        │  artefacto RSA firmado + activationCode      │ canje offline
        └──────────────────────────────────────────────┘
        ▲
        │  GET /licenses/{grantId}/entitlements (X-Platform-Validation-Key)
        └──────── sync de módulos en el login del tenant (cloud)
```

* **Emisión:** solo plataforma (`IssueLicense`/`ReissueLicense`), artefacto firmado + doble hash
  (`IssuePepper` vs `ValidationPepper`).
* **Cloud sin reemisión:** los entitlements de un grant activo cloud se editan en caliente
  (`PUT /licenses/{id}/entitlements`) con auditoría append-only y versión; el tenant los sincroniza.
* **On-prem/VPS:** los módulos se aplican reemitiendo la licencia (el endpoint cloud responde
  `license.entitlements.offline_mode`).

---

## 3. Hitos Recientes Completados

* **Entitlements cloud editables y auditoría (`LicenseGrant.UpdateEntitlements`,
  `LicenseGrantEntitlementChange`, migración `AddLicenseGrantEntitlements`) [v1.13.0]:**
  - `PUT /api/v1/platform/licenses/{grantId}/entitlements` (operador) con validación de módulos,
    `identity` obligatorio, dependencias (`ModuleDependencyGraph`) y coherencia de tiers.
  - Sube `EntitlementsVersion` y registra quién/cuándo/antes/después en
    `licensing.license_grant_entitlement_changes`.
* **Endpoint de sincronización para el tenant (`TenantApiKeyEndpointFilter`) [v1.13.0]:**
  - `GET /api/v1/platform/licenses/{grantId}/entitlements` con `X-Platform-Validation-Key`
    (comparación en tiempo constante; 503 si `LicenseValidation:TenantApiKey` no está configurada).
* **UI de módulos en el panel (`GrantModulesPage`, `platformLicensingApi`, acción en
  `LicensesGrid`) [v1.13.0]:** matriz de módulos con tier y límites, motivo de auditoría y
  guardado contra el endpoint. Ruta `licencias/:grantId/modulos`.
* **Integración con el tenant (repo `Ecunexo_cliente`) [v0.55.0]:** el tenant sincroniza en cada
  login con throttle de 5 min, aplica a sus empresas y muestra los módulos no contratados
  visibles/bloqueados.

---

## 4. Configuración y Entorno

| Variable | Uso |
|---|---|
| `ConnectionStrings__Licensing` | BD `licensing_ecunexo` (solo plataforma). |
| `Jwt__SigningKey` / `Jwt__Audience` | Sesión de operadores del panel. |
| `ActivationCodes__IssuePepper` | Hash de emisión (nunca va al cliente). |
| `LicenseValidation__ValidationPepper` | Hash de validación (mismo valor en el tenant). |
| `LicenseValidation__TenantApiKey` | Clave máquina-a-máquina del sync de entitlements. |
| `LicenseSigning__PrivateKeyPath` | Clave privada RSA para firmar artefactos. |
| `Licensing__ProvisioningEncryptionKey` | Cifrado del payload de provisioning. |
| `LICENSE_API_IMAGE` / `LICENSE_SPA_IMAGE` | Imágenes del release (fallback `1.13.0`). |

Endpoints clave: `POST /licenses`, `POST /licenses/{id}/reissue`, `GET /licenses/{id}/status`
(anónimo), `PUT/GET /licenses/{id}/entitlements`, `plans`, `customers`, `operators`, `training`.

---

## 5. Despliegue

* Portainer con `deploy/docker-compose.yml` (API + SPA + Postgres). Las migraciones se aplican al
  arrancar; `VERSION` y las imágenes se sincronizan por la skill `ecunexo-versioning`.
* Variables obligatorias: peppers (`ISSUE_PEPPER`, `VALIDATION_PEPPER`),
  `PROVISIONING_ENCRYPTION_KEY`, `JWT_SIGNING_KEY`. Nueva: `TENANT_API_KEY` (debe coincidir con
  `PLATFORM_API_KEY` del stack Cliente).

---

## 6. Pendientes

* Revocación online en caliente (la revocación ya bloquea el login del titular).
* Métricas/observabilidad del sync (última aplicación por tenant, tasa de errores).
* Edición de entitlements para despliegues híbridos (hoy solo `CloudShared`).
* Historial de cambios de módulos visible en el panel (la tabla de auditoría ya existe).
* Bump de la API/Core compartido si se cambia `ModuleEntitlement` (paquete `nuget-local`).

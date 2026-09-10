---
name: ecunexo-licensing-security
description: Modelo de seguridad de licencias EcuNexo — desacoplamiento entre ecunexo_license_api (emisión CEO) y ecunexo_api (validación cliente), doble hash (IssuePepper vs ValidationPepper), artefacto RSA firmado, sin BD licensing en tenant, HTTP solo GET status, tabla license_redemptions. USE WHEN se implemente IssueLicense, ActivateLicense, peppers, firma, onboarding comercial, o el usuario hable de falsificar licencias, desacoplar platform, hash de validación, licenseArtifact.
---

# EcuNexo — Licensing Security Skill

## Reglas no negociables

1. **`ecunexo_api` NUNCA** referencia `EcuNexo.Platform.*`, **NUNCA** usa `ConnectionStrings:Licensing`, **NUNCA** llama HTTP a platform **para emitir**.
2. **Excepción de lectura:** si `LicenseValidation:PlatformApiBaseUrl` está configurada, el tenant puede hacer `GET /api/v1/platform/licenses/{grantId}/status` (login / compliance). Sin esa URL = air-gapped (solo expiración local + gracia).
3. **`ecunexo_license_api` NUNCA** provisiona tenants en `ecunexo`.
4. **Emisión** = solo platform + `licensing_ecunexo`.
5. **Canje** = solo tenant + `ecunexo` + validación local del artefacto.

404 en status ≠ “sin internet”: el grant no está en Platform (BD recreada o id huérfano) → `license.not_found` / 403. Recrear `licensing_ecunexo` no borra `grant_id` en el tenant.

En Linux, `ProjectReference` a `ecunexo_api/src/EcuNexo.Core/EcuNexo.Core.csproj` (case-sensitive).

## Dos hashes (`EcuNexo.Core.Licensing.LicenseHashing`)

| Método | Config (platform) | Config (tenant) |
|--------|-------------------|-----------------|
| `ComputeIssueHash` | `ActivationCodes:IssuePepper` | **Prohibido** |
| `ComputeValidationHash` | `LicenseValidation:ValidationPepper` | `LicenseValidation:ValidationPepper` |

Dominios distintos en el string hasheado (`ecunexo:license:issue:v1` vs `validate:v1`).

## Artefacto firmado

- Tipos: `LicenseArtifactPayload`, `SignedLicenseArtifact`, `LicenseArtifactCodec` en **EcuNexo.Core**.
- Platform: `ILicenseArtifactIssuer` + clave **privada** (`LicenseSigning`).
- Tenant: `ILicenseArtifactVerifier` + clave **pública** (`LicenseValidation:SigningPublicKeyPem`).

## Flujos

### Emitir (platform)

`IssueLicenseHandler` → `issueHash` en BD, `validationHash` en payload, `LicenseArtifactCodec.Sign` → respuesta incluye `activationCodePlaintext` + `licenseArtifact`.

### Activar (tenant)

`ActivateLicenseCommand(ActivationCode, LicenseArtifact)` → verificar firma + hash validación + expiración → `tenancy.license_redemptions` por `grantId` → provisionar o login.

## Configuración dev

```powershell
pwsh scripts/Generate-DevLicenseKeys.ps1
```

- Privada: `ecunexo_api/dev-license-private.pem` (gitignored) — solo platform.
- Pública: `ecunexo_api/dev-license-public.pem` — tenant `SigningPublicKeyPath`.

## Legacy

`tenancy.activation_codes` + `OnboardTenantWithActivation` = dev únicamente; pepper `ActivationCodes:Pepper` en tenant **no** es el de emisión comercial.

## Documentación

- `ecunexo_license/README.md` — panel + hosts
- `ecunexo_api/docs/platform-licensing/09-seguridad-licencias-desacopladas.md`
- `ecunexo_api/docs/platform-licensing/13-compliance-reissue.md`
- ADR `ecunexo_api/docs/adr/008-platform-licensing-admin.md`

## Anti-patrones

- Un solo pepper en platform y tenant para `code_hash`.
- Tenant leyendo `licensing_ecunexo`.
- `ProjectReference` Platform → Tenant o Tenant → Platform.
- Persistir código en claro en PostgreSQL.
- Tratar HTTP 404 de status como fallo de red (`license.validation.required`).

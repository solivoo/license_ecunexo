# license_ecunexo

Plataforma de licenciamiento EcuNexo: API de emisión (`ecunexo_license_api`) y panel de operadores (`ecunexo_license`).

Host y base de datos separados del producto cliente. Versión: `VERSION` / tag `v1.6.3`.

```
ecunexo_license_api/   # API .NET — 5090, BD licensing_ecunexo
ecunexo_license/       # SPA operadores (Vite / Nginx)
nuget-local/           # Feed local EcuNexo.Core
deploy/                # Docker Compose + Portainer
```

## Contributors

- [solivoo](https://github.com/solivoo) — Sergio Olivo

## Portainer / Docker

1. En el host genera la RSA en `/opt/ecunexo/licencias/keys/license-private.pem`.
2. Env: peppers, JWT, passwords + opcional `BOOTSTRAP_OPERATOR_*`.
3. **Detrás de Cloudflare HTTPS:** deja `VITE_API_BASE_URL` **vacío**. La SPA hace proxy `/api` → API (sin mixed content).
4. Compose: `docker-compose.yml` en la raíz. Rebuild API + SPA al actualizar.
5. Login bootstrap (si BD vacía): `admin@ecunexo.local` / `CambiaEstoYa123!` (cámbialo).
6. `VALIDATION_PEPPER` + clave pública → producto Cliente.

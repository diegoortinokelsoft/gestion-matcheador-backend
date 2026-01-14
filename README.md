# gestion-matcheador-backend

Backend NestJS que actúa como única puerta de entrada para el frontend.

## 0) Objetivo y reglas de diseño

### Objetivo

Reestructurar el sistema para que:

- El frontend se comunique solo con NestJS.
- NestJS sea el único que llama a:
  - Supabase (Auth, perfiles, roles).
  - Apps Script (operaciones sobre Google Sheets).
- Apps Script sea una capa “Sheets RPC” simple (sin auth interna), accesible únicamente por un token interno.

### Reglas (no negociables)

- No guardar tokens en `localStorage` ni `sessionStorage`.
- Auth por cookies `HttpOnly` con `Secure` y `SameSite`.
- Apps Script no valida credenciales ni gestiona sesiones.
- Toda acción de escritura en Sheets debe quedar logueada (en logs).
- Nunca loguear secretos: tokens JWT, `refresh_token`, `internalToken`, passwords.

## 1) Arquitectura (3 entornos)

Flujo general:

`React → NestJS → (Supabase | Apps Script) → Sheets`

### Apps Script (Google Sheets RPC)

Responsabilidades:

- CRUD de `tasks`, `vacations`, `absences`.
- Registro/consulta de logs (hoja `logs`).
- Allowlist/control de acceso por email (hoja `passwords` redefinida; sin contraseñas).

No hace:

- Login, sesiones, roles, validación de credenciales.

### Backend NestJS (gateway único)

Responsabilidades:

- Auth con Supabase (email/password) y roles/guards.
- Emitir cookies de auth (JWT en `HttpOnly`).
- Aplicar CORS/CSRF/rate limit.
- Exponer endpoints de negocio para el frontend.
- Proxyear llamadas a Apps Script con `internalToken` (server-to-server), con whitelist y auditoría.

### Frontend React

Responsabilidades:

- UI + routing + permisos visuales por rol (la seguridad real es backend).
- Llamar solo a NestJS con `credentials: "include"`.
- No persistir tokens (estado auth en memoria).

### Entregables esperados (por entorno)

Apps Script:

- `api.js` simplificado (token interno + router + JSON).
- Módulos por recurso: `tasks` / `vacations` / `absences` / `logs` / `allowlist`.
- Logs persistentes en Sheets.
- Hoja `passwords` usada como allowlist (sin contraseñas reales) y soporte a recovery (orquestado por NestJS).

Backend NestJS:

- Auth con Supabase y cookies `HttpOnly` (sin tokens en storage ni en el body).
- Roles/guards funcionando.
- Proxy Apps Script robusto (whitelist, timeouts, auditoría).
- Endpoint de `password-recovery/request` con allowlist + rate limit + log.

Frontend React:

- Login / logout / bootstrap de sesión por cookies (`credentials: "include"`).
- Reemplazo de llamadas directas a Apps Script por llamadas a NestJS.
- UI por rol (admin/supervisor/user) + manejo consistente de errores.

Documentación:

- Arquitectura (este README).
- Tabla “acción → endpoint → quién puede → qué hace” (sección 7).
- Guía “agregar nueva hoja/feature” (sección 10).

## 2) Contratos (forma de requests y errores)

### Errores (shape único)

Respuesta de error recomendada desde NestJS (y normalizada desde Apps Script):

```json
{ "ok": false, "error": { "code": "SOME_CODE", "message": "Human readable" } }
```

### Apps Script RPC request/response

Request (desde NestJS hacia Apps Script):

```json
{ "internalToken": "…", "action": "tasks_list", "payload": { } }
```

Response (desde Apps Script hacia NestJS):

```json
{ "ok": true, "data": { } }
```

Notas:

- `internalToken` nunca debe escribirse en logs.
- Token inválido → `401`.
- Acción fuera de whitelist → `400`.

## 3) Apps Script: refactor a “Sheets RPC”

### 3.1 Nuevo rol de Apps Script

Apps Script pasa a ser únicamente una capa de lectura/escritura sobre Sheets. NestJS aplica auth/roles; Apps Script solo confía en `internalToken`.

### 3.2 `api.js` simplificado (router + token interno)

Reemplazar el esquema actual por:

1. `parseRequest(e)`
   - Leer body JSON `{ internalToken, action, payload }`.
   - No aceptar `sessionToken`.
2. `authorizeInternalToken(internalToken)`
   - Comparar con `INTERNAL_TOKEN` guardado en Script Properties (no hardcode).
3. Dispatcher
   - `ACTIONS[action](payload)` donde `ACTIONS` es un map central.
4. Respuesta
   - Siempre JSON `{ ok: true|false, data?, error? }`.

Estructura recomendada:

- `api.js` (router + auth token interno)
- `modules/tasks.js`
- `modules/vacations.js`
- `modules/absences.js`
- `modules/logs.js`
- `modules/allowlist.js`
- `modules/sheets.js` (helpers: `getSheetData`, `ensureHeaders`, etc.)

### 3.3 Hoja `passwords` redefinida (allowlist, no contraseñas)

Objetivo: control de acceso por email + flags para habilitar recovery, sin almacenar credenciales.

Columnas sugeridas:

- `email`
- `enabled` (TRUE/FALSE)
- `role_hint` (opcional; solo bootstrap)
- `can_reset_password` (TRUE/FALSE)
- `can_manage_users` (TRUE/FALSE) (opcional)
- `notes`
- `updated_at`

Acciones Apps Script:

- `allowlist_get({ email })`
- `allowlist_list()`
- `allowlist_upsert(payload)`
- `allowlist_disable({ email })`

Importante: “admin only” lo aplica NestJS (guard/roles). Apps Script solo valida `internalToken`.

### 3.4 Logs en Sheets (mantener y mejorar)

Crear/estandarizar `log_event(payload)` que escriba en hoja `logs`.

Columnas recomendadas:

- `log_id` (uuid)
- `ts` (Date)
- `actor_user_id` (UUID Supabase; o legacy si aplica)
- `actor_email`
- `actor_role`
- `action` (ej: `TASKS_SET_MULTIPLE`, `AUTH_PASSWORD_RESET_REQUEST`)
- `resource` (`tasks|vacations|absences|auth`)
- `resource_id` (opcional)
- `result` (`OK|ERROR`)
- `error_message` (opcional)
- `ip` (si llega desde Nest)
- `user_agent` (si llega desde Nest)
- `meta_json` (string JSON, sin secretos)

Acciones Apps Script:

- `logs_append(payload)` (NestJS lo usa para auditoría)
- `logs_query(filters)` (admin/supervisor; filtros por fecha/email/action; soportar `limit` + `offset`/cursor)

### 3.5 Mantener CRUD de `tasks`/`vacations`/`absences`

Reglas:

- Todas aceptan `payload` puro y devuelven `{ ok, data?, error? }`.
- Sin auth/sessions.
- Naming consistente:
  - `tasks_list`, `tasks_set_multiple`, `tasks_delete_multiple`
  - `vacations_list_all`, `vacations_list_user`, `vacations_list_team`, `vacations_set`, `vacations_delete`
  - `absences_create`, `absences_list_user`, `absences_calendar`, `absences_delete`, `absences_cases`

### 3.6 Preparar Apps Script para crecimiento

Patrón: “nueva hoja → módulo nuevo → acciones nuevas en `ACTIONS`”.

Checklist:

- Crear hoja y headers (o `ensureHeaders`).
- Crear `modules/<feature>.js` con funciones CRUD.
- Registrar acciones en `api.js`:
  - `const ACTIONS = { "<feature>_list": feature_list, ... }`
- Agregar tests manuales (payloads mínimos) y verificar logs.

## 4) Backend NestJS: gateway + seguridad

### 4.1 Auth con cookies `HttpOnly` (sin storage en front)

Implementar endpoints:

- `POST /auth/login` → valida contra Supabase; setea cookie `access_token` (`HttpOnly`); responde `user` (sin tokens).
- `POST /auth/logout` → limpia cookies.
- `GET /auth/me` → devuelve usuario + rol a partir de cookie.
- (Opcional) `POST /auth/refresh` si se decide usar refresh token por cookie.

Cookies:

- `HttpOnly: true`
- `Secure: true` en producción
- `SameSite: Lax` (o `Strict` si no rompe flows)
- `Path: /`
- `Max-Age` acorde a expiración

CSRF (recomendado: double submit):

- Cookie `csrf_token` (no `HttpOnly`)
- Header `x-csrf-token` en cada request mutante (`POST|PATCH|DELETE`)
- Validar coincidencia en NestJS
- Validar `Origin`/`Referer` contra allowlist (`ALLOWED_ORIGINS`)

Implementación:

- `GET /auth/csrf` setea la cookie `csrf_token` y devuelve `{ csrf_token }` para que el frontend lo use en el header `x-csrf-token`.

### 4.2 Roles y autorización

- `JwtAuthGuard` debe extraer token desde cookie (no header).
- `RolesGuard` valida roles desde Supabase (claims/app metadata o tabla `public.user_roles`).

### 4.3 Proxy Apps Script robusto (whitelist + timeouts + auditoría)

Diseño recomendado:

- Un “registry” de acciones permitidas (constante + typing) en NestJS.
- Un `AppscriptsClient` que:
  - aplique timeout y (máximo) 1 retry controlado,
  - nunca loguee payloads con secretos,
  - normalice errores hacia `{ ok: false, error: { code, message } }`.
- Endpoints de negocio (ejemplos):
  - `POST /sheets/tasks/list`
  - `POST /sheets/tasks/set-multiple`
  - `POST /sheets/tasks/delete-multiple`
  - Similar para `vacations`/`absences`
  - `POST /logs/query` (admin/supervisor)

Auditoría:

- Antes y después de cada acción de escritura, disparar `logs_append` (o un `log_event` interno que forwardee a Apps Script).
- Incluir `request_id` en acciones masivas para idempotencia y trazabilidad.

### 4.4 Password recovery (con allowlist en Sheets)

Endpoint:

- `POST /auth/password-recovery/request` con `{ email }`

Flujo:

1. Consultar allowlist en Sheets: `allowlist_get({ email })`.
2. Si `enabled=false` o `can_reset_password=false` → responder 200 genérico (no revelar).
3. Si habilitado → disparar recovery via Supabase (reset password email) desde backend.
4. Registrar log en Sheets: `AUTH_PASSWORD_RESET_REQUEST` (sin secretos).

Seguridad extra:

- Rate limit por email + IP (mínimo para login y recovery).

### 4.5 Preparar NestJS para crecimiento

Estándar sugerido por feature:

`src/sheets/<feature>/`:

- `<feature>.controller.ts`
- `<feature>.service.ts`
- `<feature>.appscripts.ts` (wrapper de acciones Apps Script)
- `dto/`

Centralizar acciones Apps Script en un registry:

- `src/appscripts/actions.registry.ts` (whitelist + typings)

### 4.6 Dónde se toca este repo (mapa rápido)

Puntos típicos de implementación:

- Cookies + endpoints auth: `src/auth/auth.controller.ts`, `src/auth/auth.service.ts`
- Extraer JWT desde cookie (no header): `src/auth/strategies/supabase-jwt.strategy.ts`, `src/common/guards/jwt-auth.guard.ts`
- Roles: `src/common/guards/roles.guard.ts`, `src/roles/*`
- CORS/helmet/pipes (y middlewares como `cookie-parser`/CSRF): `src/main.ts`
- Cliente Apps Script (timeouts/retry/normalización): `src/appscripts/appscripts.client.ts`
- Whitelist + auditoría por acción: `src/appscripts/appscripts.service.ts`

## 5) Frontend React: contrato y UI por rol

### 5.1 Comunicación

- Todas las requests a NestJS deben usar `credentials: "include"`.
- No guardar tokens en storage; estado auth solo en memoria.

### 5.2 AuthProvider (en memoria)

Al iniciar la app:

- `GET /auth/me` → setear `user`, `role`, `isAuthenticated`.

Login:

- `POST /auth/login` → si ok, refrescar `GET /auth/me`.

Logout:

- `POST /auth/logout` → limpiar estado.

### 5.3 Sustituir llamadas directas a Apps Script

Todas las operaciones de:

- `tasks`
- `vacations`
- `absences`
- `logs` (UI admin)

deben apuntar a endpoints NestJS (`/sheets/...` o `/logs/...`).

### 5.4 UI por rol + robustez UX

- `RequireRole`/route-guard para ocultar UI no permitida.
- Manejo centralizado de errores:
  - `401` → redirect a login
  - `403` → “sin permisos”
  - `5xx` → fallback + retry manual

Estructura recomendada:

- `src/features/tasks/` (`api.ts`, `types.ts`, `components/`, `pages/`)
- `src/features/vacations/`
- `src/features/absences/`
- `src/features/logs/`

## 6) Requisitos extra de seguridad y persistencia (sumar sí o sí)

- Rate limiting en NestJS (mínimo para login y password recovery), por IP y por email.
- Validación estricta de DTOs (class-validator) y `ValidationPipe` con `whitelist: true` + `transform: true` (ver `src/main.ts`).
- Sanitización de logs: nunca loguear tokens JWT, `refresh_token`, `internalToken` ni passwords (NestJS y Apps Script).
- CORS restrictivo: solo orígenes permitidos (`ALLOWED_ORIGINS`) + `credentials: true`.
- Headers de seguridad: `helmet` (ver `src/main.ts`) y revisar CSP/headers en prod según el frontend.
- Auditoría: toda escritura en Sheets debe registrar evento (`logs_append`/`log_event`) con `request_id` cuando aplique.
- Idempotencia en acciones masivas: incluir `request_id` en payloads y usarlo para deduplicación si se necesita.
- Errores consistentes en todos los entornos: `{ ok: false, error: { code, message } }`.

## 7) Tabla “acción → endpoint → quién puede → qué hace”

### Auth (cookies)

| Acción | Endpoint (NestJS) | Quién puede | Qué hace |
| --- | --- | --- | --- |
| CSRF token | `GET /auth/csrf` | público | Setea cookie `csrf_token` (double submit) |
| Login | `POST /auth/login` | allowlist (pre-check opcional) | Auth Supabase, set cookie `access_token` |
| Refresh | `POST /auth/refresh` | con `refresh_token` | Renueva cookies (`access_token`/`refresh_token`) |
| Logout | `POST /auth/logout` | autenticado | Limpia cookies |
| Yo | `GET /auth/me` | autenticado | Devuelve `user` + `role` |
| Password recovery (request) | `POST /auth/password-recovery/request` | público (respuesta genérica) | Si allowlist permite, envía email de reset (Supabase) + log |

### Sheets (RPC vía Apps Script)

| Acción (Apps Script) | Endpoint (NestJS) | Quién puede | Qué hace |
| --- | --- | --- | --- |
| `tasks_list` | `POST /sheets/tasks/list` | user/supervisor/admin | Lista tasks (lectura) |
| `tasks_set_multiple` | `POST /sheets/tasks/set-multiple` | supervisor/admin | Upsert masivo (escritura + log) |
| `tasks_delete_multiple` | `POST /sheets/tasks/delete-multiple` | supervisor/admin | Delete masivo (escritura + log) |
| `vacations_list_all` | `POST /sheets/vacations/list-all` | supervisor/admin | Lista vacaciones (lectura) |
| `vacations_list_user` | `POST /sheets/vacations/list-user` | user/supervisor/admin | Lista vacaciones del usuario (lectura) |
| `vacations_list_team` | `POST /sheets/vacations/list-team` | supervisor/admin | Lista vacaciones del equipo (lectura) |
| `vacations_set` | `POST /sheets/vacations/set` | supervisor/admin | Upsert (escritura + log) |
| `vacations_delete` | `POST /sheets/vacations/delete` | supervisor/admin | Delete (escritura + log) |
| `absences_create` | `POST /sheets/absences/create` | supervisor/admin | Crear ausencia (escritura + log) |
| `absences_list_user` | `POST /sheets/absences/list-user` | user/supervisor/admin | Ausencias por usuario (lectura) |
| `absences_calendar` | `POST /sheets/absences/calendar` | user/supervisor/admin | Vista calendario (lectura) |
| `absences_delete` | `POST /sheets/absences/delete` | supervisor/admin | Borrar ausencia (escritura + log) |
| `absences_cases` | `POST /sheets/absences/cases` | supervisor/admin | Casuística/reportes (lectura) |

### Admin (allowlist + logs)

| Acción (Apps Script) | Endpoint (NestJS) | Quién puede | Qué hace |
| --- | --- | --- | --- |
| `allowlist_get` | `POST /allowlist/get` | admin | Lee estado por email |
| `allowlist_list` | `POST /allowlist/list` | admin | Lista allowlist |
| `allowlist_upsert` | `POST /allowlist/upsert` | admin | Crea/actualiza allowlist |
| `allowlist_disable` | `POST /allowlist/disable` | admin | Deshabilita email |
| `logs_append` | `POST /logs/append` (interno) | backend | Inserta un evento de auditoría en Sheets |
| `logs_query` | `POST /logs/query` | supervisor/admin | Consulta logs (paginado) |

### Usuarios y roles (Supabase)

| Acción | Endpoint (NestJS) | Quién puede | Qué hace |
| --- | --- | --- | --- |
| Ver perfil propio | `GET /users/me` | autenticado | Devuelve usuario + perfil |
| Listar usuarios | `GET /users` | supervisor/admin | Lista usuarios/perfiles |
| Editar usuario | `PATCH /users/:id` | supervisor/admin | Actualiza campos del perfil |
| Asignar rol | `POST /roles/assign` | admin | Asigna rol a usuario |
| Revocar rol | `POST /roles/revoke` | admin | Revoca rol a usuario |
| Ver roles | `GET /roles/:userId` | admin o dueño | Lista roles de un usuario |
| Healthcheck | `GET /health` | público | Estado básico del servicio |

Notas operativas:

- Todo endpoint mutante (`set*`, `delete*`, `create*`, `upsert*`) debe disparar log de auditoría en Sheets.
- Requests mutantes desde React deben incluir CSRF token (`x-csrf-token`) + `credentials: "include"`.

## 8) Plan por hitos (recomendado)

- Hito A — Seguridad y cimientos: Supabase como source of truth, cookies, CORS, CSRF, rate limit.
- Hito B — Apps Script como “Sheets RPC”: quitar auth interna, mantener logs/allowlist, dejar CRUD operativo.
- Hito C — NestJS como gateway único: proxy completo, endpoints de negocio, password recovery, auditoría.
- Hito D — React: consumo por cookies, reemplazo de endpoints, UI por rol, manejo de errores.

## 9) Criterios de aceptación

- El frontend no opera sin estar autenticado (cookie válida).
- No existe consumo directo de Apps Script desde React.
- Apps Script no tiene login/sessions activos.
- Password recovery solo corre para emails habilitados en allowlist, responde genérico y deja log.
- CRUD (tasks/vacations/absences) funciona end-to-end: React → Nest → Apps Script → Sheets.
- Logs visibles/consultables por roles permitidos.
- Estructura preparada: agregar “nueva hoja X” siguiendo el patrón (Apps Script module + Nest module + Front feature).

## 10) Agregar una nueva hoja/feature (end-to-end)

Checklist recomendado para mantener el patrón “nueva hoja → Apps Script → Nest → React”:

### 10.1 Google Sheets

- Crear hoja (tab) y definir headers.
- Documentar el esquema (columnas + tipos esperados).
- Definir qué endpoints son lectura y cuáles escritura (para auditoría y roles).

### 10.2 Apps Script

- Crear `modules/<feature>.js` con funciones puras (payload in → `{ ok, data?, error? }` out).
- Registrar acciones en `api.js` dentro de `ACTIONS`.
- En acciones de escritura: llamar `log_event` con `action`, `resource`, `result`, `meta_json` (sanitizado).

### 10.3 NestJS

- Crear `src/sheets/<feature>/` (controller/service/appscrips wrapper + `dto/`).
- Validar DTOs (class-validator) y aplicar `JwtAuthGuard` + `RolesGuard`.
- Implementar llamadas a Apps Script únicamente via `AppscriptsClient` y acciones de whitelist.
- Agregar auditoría antes/después de escrituras (registrar `request_id` en el payload y en logs).

### 10.4 React

- Crear `src/features/<feature>/` con `api.ts` que llame a Nest (`credentials: "include"`).
- Reutilizar `AuthProvider` + `RequireRole` para permisos.
- Manejo consistente de errores (`401/403/5xx`) y estados de carga/vacío.

### 10.5 Documentación

- Agregar filas en la tabla de la sección “7)”.
- Actualizar criterios de aceptación si cambia el alcance.

## Setup rápido (backend)

1. Instalar dependencias: `npm install`
2. Crear `.env` a partir de `.env.example`
3. Levantar en dev: `npm run start:dev` (default `http://localhost:3001`)

## Variables de entorno

Ver `.env.example`.

Notas:

- `SUPABASE_SERVICE_ROLE_KEY` debe existir solo en el backend (no exponer nunca al frontend).
- `APPSCRIPT_INTERNAL_TOKEN` debe ser largo (mínimo 20 chars) y solo server-to-server.

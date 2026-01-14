# gestion-matcheador-backend

Backend NestJS que actúa como “puerta única” para el frontend:

- El frontend NO habla con Apps Script ni con Supabase directo.
- NestJS autentica contra Supabase Auth (email/password).
- NestJS lee/escribe datos en tablas `public.*` de Supabase (`user_profiles`, `user_roles`, etc.).
- NestJS expone endpoints REST para el frontend.
- (Opcional) NestJS proxyea requests hacia Apps Script usando un token interno (server-to-server).

## Setup

1. Instalar dependencias: `npm install`
2. Crear `.env` en la raíz (no commitear) a partir de `.env.example`.
3. Levantar en dev: `npm run start:dev`

Por defecto corre en `http://localhost:3001`.

## Variables de entorno

Ver `.env.example`.

Nota: `SUPABASE_SERVICE_ROLE_KEY` debe existir solo en el backend (no exponer nunca al frontend).

## Endpoints

Auth
- `POST /auth/login`
- `POST /auth/register` (admin; o bootstrap si `public.user_roles` está vacío)

Users
- `GET /users/me` (auth)
- `GET /users` (admin/supervisor)
- `PATCH /users/:id` (admin/supervisor)

Roles
- `POST /roles/assign` (admin)
- `POST /roles/revoke` (admin)
- `GET /roles/:userId` (admin o dueño)

Sessions
- `POST /sessions/register` (auth)
- `POST /sessions/revoke` (auth)
- `GET /sessions/me` (auth)

AppScripts (proxy)
- `POST /appscripts/proxy` (auth; whitelist en `src/appscripts/appscripts.service.ts`)

Health
- `GET /health`

## Notas

- No guardar contraseñas en tablas propias (Supabase Auth se encarga).
- Aunque Supabase puede usar RLS, este backend también protege endpoints con guards (JWT + roles).

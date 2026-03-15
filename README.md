# KlinikaFront

React frontend for the Klinika backend application, built with Vite.

Current focus: role-based worker authentication only.

## Scripts

- `npm install`
- `npm run dev`
- `npm run build`
- `npm run preview`

## Backend connection

By default, the Vite dev server proxies `/api` to the .NET backend at `https://localhost:7069`.

That means local development works against the backend login flow without adding backend CORS first.

The implemented frontend auth flow uses:

- `POST /api/Auth/login`
- `GET /api/Workers/me`

Three login portals are available:

- `/login/admin`
- `/login/doctor`
- `/login/secretary`

Each portal only accepts the matching backend role.

## Environment override

Set `VITE_API_BASE_URL` only if you want to bypass the dev proxy and call a different API base directly.

Example:

```powershell
$env:VITE_API_BASE_URL="https://localhost:7069/api"
npm run dev
```

If you use a direct API URL instead of `/api`, the backend must allow that frontend origin with CORS.

## Current scope

- Login is finished for administrators, doctors, and secretaries.
- Session persistence is implemented in local storage.
- Role-specific protected landing screens are implemented for testing.
- Self-service sign-up is not implemented because the current backend does not expose a public register endpoint.

## Deferred / out-of-scope for this phase

- Admin master-data CRUD screens for vaccination and allergen catalogs are intentionally deferred.
- Existing role flows (admin staff/clinics, secretary desk modules, doctor slots/appointments) are treated as release scope for this phase.
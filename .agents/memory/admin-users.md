---
name: BaleBeleq admin users
description: Admin accounts setup pattern and secret code info
---

Three admin accounts exist in the admins table (usernames: admin, hendra, toni).
Credentials are NOT stored here — managed by the site owner only.

JWT_SECRET is required — set as Replit Secret (not env var). Server throws at startup if missing.

Secret code on the public search page: type it into the "Kode akses khusus" field to reveal
an admin login button. The constant `SECRET_CODE` is in `artifacts/balebeleq-web/src/pages/search.tsx`.

**Why:** User requested discreet admin access without a visible link on the public site.

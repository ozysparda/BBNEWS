---
name: BaleBeleq admin users
description: Admin accounts and credentials seeded in DB
---

Three admin accounts in the admins table:
- admin / admin123 (id=1, seeded during initial setup)
- hendra / 310304 (id=2, bcrypt hash in password column)
- toni / toni100 (id=3, bcrypt hash in password column)

JWT_SECRET is required — set as Replit Secret (not env var). Server throws at startup if missing.
Secret code on search page to reveal admin login: type "adminbale" in the access code field.

**Why:** User explicitly requested these three admins. Secret code pattern added to search
page to allow discreet access to admin login without a visible link.

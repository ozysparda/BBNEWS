---
name: BaleBeleqNews Admin Accounts
description: Admin credentials and role system for BaleBeleqNews
---
Three owner accounts: admin/owner, hendra/owner, toni/owner

Role system: owner (all permissions + user management), editor, journalist, reviewer

JWT stored in localStorage as `admin_token`. Auth middleware: artifacts/api-server/src/middlewares/auth.ts
Role check for owner-only endpoints: query admins table, check role === 'owner'

Secret admin access: type exactly "admin" in the search bar → shows "Masuk Panel Admin" button

**Why:** Durable credential and role reference for future sessions.
**How to apply:** When adding new admin features, check role against 'owner' using the requireOwner pattern in users.ts.

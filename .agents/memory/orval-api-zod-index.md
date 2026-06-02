---
name: Orval api-zod index.ts pitfall
description: After codegen, api-zod/src/index.ts gets regenerated with two exports causing duplicate name errors
---
The orval config had `schemas: { path: "generated/types", type: "typescript" }` which generated both api.ts (zod schemas) and types/ (TS types). The auto-generated index.ts exported both, causing duplicate export errors for schemas that appeared in both.

Fix applied: Remove `schemas` option from orval zod config. Then after each codegen run, force-write `echo 'export * from "./generated/api";' > lib/api-zod/src/index.ts`

**Why:** Orval with `clean: true` regenerates index.ts with `export * from "./generated/types"` even when that folder no longer exists (after removing schemas option).
**How to apply:** After any codegen run, check if api-zod/src/index.ts has duplicate exports and fix with the echo command.

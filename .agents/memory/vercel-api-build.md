---
name: Vercel API build
description: How the Express backend is packaged as a Vercel serverless function
---

The Express application is exported directly as the Vercel function (`export default app`). No `serverless-http` wrapper is needed because a Vercel Node.js function only requires a request handler, and an Express app is already one.

The dedicated build script (`artifacts/api-server/build-vercel.mjs`) bundles `src/vercel.ts` and all workspace dependencies into `api/index.mjs` at the repository root. The frontend build is separate and produces `artifacts/balebeleq-web/dist/public`. The root `vercel.json` wires the static output to the Vercel CDN and rewrites `/api/(.*)` to `/api/index.mjs`.

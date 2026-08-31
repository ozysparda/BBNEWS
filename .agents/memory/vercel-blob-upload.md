---
name: Vercel Blob frontend upload
description: How client uploads are wired for BerugakNews on Vercel
---

For Vercel Blob client uploads, the server must generate a **client token** from `BLOB_READ_WRITE_TOKEN` using `generateClientTokenFromReadWriteToken` from `@vercel/blob/client`. The browser then calls `put(filename, file, { access: "public", token: clientToken })` from `@vercel/blob/client` to upload directly.

**Why:** The `upload` function exported by `@vercel/blob/client` is designed for the `handleUpload` pattern where the SDK itself fetches the token from a server URL. It does **not** accept a raw client token.

**Why `as any` on `zodResolver`:** Adding `@vercel/blob` to the frontend pulls in a transitive `zod` v4 dependency (via `@vercel/oidc`), which conflicts with the project's `zod` v3 and `@hookform/resolvers` types. The runtime schemas are still zod v3 and work correctly; the cast is only to satisfy the type-checker until the dependency graph is reconciled.

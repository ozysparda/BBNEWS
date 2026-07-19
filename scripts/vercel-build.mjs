import { execSync } from "node:child_process";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(root, ".vercel/output");
const staticDir = path.join(outputDir, "static");
const funcDir = path.join(outputDir, "functions/api.func");
const webDist = path.join(root, "artifacts/balebeleq-web/dist/public");
const apiDist = path.join(root, "api");

async function main() {
  // Clean previous output
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(staticDir, { recursive: true });
  await mkdir(funcDir, { recursive: true });

  // 1. Build frontend
  console.log("\n▶ Building frontend...");
  execSync("pnpm --filter @workspace/balebeleq-web run build", {
    cwd: root,
    stdio: "inherit",
  });

  // 2. Build API function
  console.log("\n▶ Building API function...");
  execSync("pnpm --filter @workspace/api-server run build:vercel", {
    cwd: root,
    stdio: "inherit",
  });

  // 3. Copy static files into Build Output API static directory
  console.log("\n▶ Copying static files...");
  await cp(webDist, staticDir, { recursive: true, force: true });

  // 4. Copy API function bundle into Build Output API function directory
  console.log("\n▶ Copying API function...");
  await cp(apiDist, funcDir, { recursive: true, force: true });

  // 5. Write function config
  await writeFile(
    path.join(funcDir, ".vc-config.json"),
    JSON.stringify(
      {
        runtime: "nodejs20.x",
        handler: "index.mjs",
        launcherType: "Nodejs",
      },
      null,
      2,
    ),
  );

  // 6. Write Build Output API config with routes
  await writeFile(
    path.join(outputDir, "config.json"),
    JSON.stringify(
      {
        version: 3,
        routes: [
          { src: "^/api/(.*)$", dest: "/api" },
          { handle: "filesystem" },
          { src: "/(.*)", dest: "/index.html" },
        ],
      },
      null,
      2,
    ),
  );

  console.log("\n✅ Vercel Build Output API ready at .vercel/output");
  console.log("   Static files:", staticDir);
  console.log("   API function:", funcDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

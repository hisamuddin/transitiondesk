import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const expoDist = path.join(projectRoot, "dist");
const sitesDist = path.join(projectRoot, "sites-dist", "dist");
const serverDir = path.join(sitesDist, "server");
const hostingDir = path.join(sitesDist, ".openai");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".ttf": "font/ttf"
};

function walk(directory, prefix = "") {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    const relative = path.join(prefix, entry).replaceAll("\\", "/");
    return statSync(absolute).isDirectory() ? walk(absolute, relative) : [relative];
  });
}

function toRoute(filePath) {
  return filePath === "index.html" ? "/" : `/${filePath}`;
}

function buildAssetMap() {
  return Object.fromEntries(
    walk(expoDist).map((filePath) => {
      const absolute = path.join(expoDist, filePath);
      return [
        toRoute(filePath),
        {
          body: readFileSync(absolute).toString("base64"),
          contentType: contentTypes[path.extname(filePath)] ?? "application/octet-stream",
          encoding: "base64"
        }
      ];
    })
  );
}

execFileSync(
  process.execPath,
  [path.join(projectRoot, "node_modules", "expo", "bin", "cli"), "export", "--platform", "web", "--output-dir", "dist"],
  {
  cwd: projectRoot,
  stdio: "inherit"
  }
);

rmSync(path.join(projectRoot, "sites-dist"), { force: true, recursive: true });
mkdirSync(serverDir, { recursive: true });
mkdirSync(hostingDir, { recursive: true });

const assets = buildAssetMap();
const worker = `const ASSETS = ${JSON.stringify(assets)};

function responseFor(pathname, env) {
  const asset = ASSETS[pathname] || ASSETS[pathname.replace(/\\/$/, "")] || ASSETS["/"];
  if (!asset) {
    return new Response("Not found", { status: 404 });
  }

  let body = Uint8Array.from(atob(asset.body), (char) => char.charCodeAt(0));
  const headers = {
    "content-type": asset.contentType,
    "cache-control": pathname === "/" || pathname === "/index.html" ? "no-store" : "public, max-age=31536000, immutable"
  };

  if (asset.contentType.startsWith("text/html")) {
    const html = new TextDecoder().decode(body);
    const config = {
      adminEmails: env.EXPO_PUBLIC_ADMIN_EMAILS || "",
      googleClientId: env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "",
      supabaseAnonKey: env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
      supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL || ""
    };
    body = new TextEncoder().encode(
      html.replace(
        "</head>",
        \`<script>window.__APP_CONFIG__=\${JSON.stringify(config)};window.__GOOGLE_CLIENT_ID__=\${JSON.stringify(config.googleClientId)};</script></head>\`
      )
    );
  }

  return new Response(body, { headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    return responseFor(url.pathname, env || {});
  }
};
`;

writeFileSync(path.join(serverDir, "index.js"), worker, "utf8");
writeFileSync(
  path.join(hostingDir, "hosting.json"),
  readFileSync(path.join(projectRoot, ".openai", "hosting.json"), "utf8"),
  "utf8"
);

console.log(`Built Sites worker package at ${sitesDist}`);

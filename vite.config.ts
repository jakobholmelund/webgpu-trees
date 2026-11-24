import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { type Plugin, defineConfig } from "vite";

/** The commit the files stand at, short, and "-dirty" if tracked files differ from it: what a gallery set is named by. */
function commit(): string {
  try {
    const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: import.meta.dirname, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=no"], { cwd: import.meta.dirname, encoding: "utf8" }).trim() !== "";
    return head + (dirty ? "-dirty" : "");
  } catch {
    return "unknown";
  }
}

/**
 * For the gallery on the dev server: `GET /__gallery/commit` says the commit now (the files may have moved
 * on since the server started), and, when the server was started with GALLERY_OUT set to a folder,
 * `POST /__gallery/save?name=x.png` writes the body there, so a script can keep contact sheets without
 * a download. Nothing of this is in a build.
 */
function gallery(): Plugin {
  const out = process.env.GALLERY_OUT ? resolve(process.env.GALLERY_OUT) : null;
  return {
    name: "tree-gallery",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__gallery/commit", (_req, res) => {
        res.setHeader("content-type", "text/plain");
        res.end(commit());
      });
      server.middlewares.use("/__gallery/save", (req, res) => {
        const name = basename(new URL(req.url ?? "", "http://x").searchParams.get("name") ?? "");
        if (req.method !== "POST" || !out || !/^[\w.-]+\.(png|json)$/.test(name)) {
          res.statusCode = out ? 400 : 404;
          res.end(out ? "POST a .png or .json with ?name=" : "start the dev server with GALLERY_OUT=<folder> to save here");
          return;
        }
        const parts: Buffer[] = [];
        req.on("data", (c: Buffer) => parts.push(c));
        req.on("end", () => {
          mkdirSync(out, { recursive: true });
          const path = resolve(out, name);
          writeFileSync(path, Buffer.concat(parts));
          res.setHeader("content-type", "text/plain");
          res.end(path);
        });
      });
    },
  };
}

// The lab and its gallery: `pnpm dev` serves them, `pnpm build` makes a static copy of them in dist/.
export default defineConfig({
  base: "./",
  define: { __COMMIT__: JSON.stringify(commit()) },
  plugins: [gallery()],
  build: {
    rollupOptions: { input: { lab: resolve(import.meta.dirname, "lab/index.html"), gallery: resolve(import.meta.dirname, "lab/gallery.html") } },
    target: "es2022",
  },
});

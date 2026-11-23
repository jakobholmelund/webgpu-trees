import { resolve } from "node:path";
import { defineConfig } from "vite";

// The lab is the only page: `pnpm dev` serves it, `pnpm build` makes a static copy of it in dist/.
export default defineConfig({
  base: "./",
  build: { rollupOptions: { input: { lab: resolve(import.meta.dirname, "lab/index.html") } }, target: "es2022" },
});

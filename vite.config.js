import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
// Two pages, one app: the groom's family's invitation at the root and the bride's at /bridal/
// (generated from index.html by scripts/bridal-html.mjs).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "docs", rollupOptions: { input: { index: "index.html", bridal: "bridal/index.html" } } },
})

import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    target: "es2020",
    minify: "esbuild",
    rollupOptions: {
      input: "index.html"
    }
  },
  server: {
    port: 8080,
    open: true
  }
});

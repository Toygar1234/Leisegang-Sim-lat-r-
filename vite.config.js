import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// İki çıktı:
//  - npm run build            -> dist/index.html (tek dosya, internetsiz açılır)
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile({ removeViteModuleLoader: true })],
  build: {
    target: "es2020",
    assetsInlineLimit: 100_000_000,
    chunkSizeWarningLimit: 5000,
    cssCodeSplit: false,
  },
  server: { host: true, port: 5173 },
});

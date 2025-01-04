import copy from "rollup-plugin-copy";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        "background": "src/ts/background.ts",
        "moulinette": "src/ts/moulinette.ts"
      },
      // we build a single file with vite
      output: {
        dir: "dist/js",
        format: "es",
        entryFileNames: "[name].js",
      },
    },
  },
  plugins: [
    copy({
      targets: [
        { src: "src/html", dest: "dist" },
        { src: "src/icons", dest: "dist" },
        { src: "src/js", dest: "dist" },
        { src: "src/manifest.json", dest: "dist" },
      ],
      hook: "writeBundle",
    }),
  ],
});




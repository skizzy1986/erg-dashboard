import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // base: "./" makes the build work whether hosted at a domain root
  // or a sub-path (e.g. GitHub Pages project sites).
  base: "./",
});

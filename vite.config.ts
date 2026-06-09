import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// `base` matters for GitHub Pages: a project site is served from
// https://<user>.github.io/<repo>/ , so assets must be requested from "/<repo>/".
// The deploy workflow sets VITE_BASE automatically from the repo name.
// For local dev / a user-site (<user>.github.io) leave it as "/".
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  plugins: [react()],
});

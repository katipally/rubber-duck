/**
 * Frontend-only dev server: no Cloudflare Workers / Miniflare.
 * Use for layout and styling; agent WebSockets will stay disconnected.
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});

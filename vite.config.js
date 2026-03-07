import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: {
    host: "127.0.0.1",
    // change the port if 5173 is polluted by cookies/extensions
    port: 5173,
    strictPort: false,
  },
});

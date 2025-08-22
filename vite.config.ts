import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/auth': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
      '/invoices': 'http://127.0.0.1:8000',
      '/payments': 'http://127.0.0.1:8000',
      '/students': 'http://127.0.0.1:8000',
      '/fee': 'http://127.0.0.1:8000',
      '/hod': 'http://127.0.0.1:8000',
      '/webhooks': 'http://127.0.0.1:8000',
    },
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));

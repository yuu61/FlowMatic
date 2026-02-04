import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["global-builtin", "color-functions", "import"],
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-calendar": [
            "@fullcalendar/core",
            "@fullcalendar/react",
            "@fullcalendar/daygrid",
            "@fullcalendar/interaction",
            "@fullcalendar/list",
          ],
          "vendor-gantt": ["@svar-ui/react-gantt"],
          "vendor-axios": ["axios"],
          "vendor-emoji": ["emoji-picker-react"],
          "vendor-datepicker": ["react-datepicker", "date-fns"],
          "vendor-icons": [
            "@fortawesome/fontawesome-svg-core",
            "@fortawesome/free-solid-svg-icons",
            "@fortawesome/react-fontawesome",
          ],
          "vendor-dayjs": ["dayjs"],
        },
      },
    },
  },
});

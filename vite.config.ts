import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const sheetsUrl = env.VITE_SHEETS_WEB_APP_URL || "";
  return {
    server: {
      host: "::",
      port: 8080,
      proxy: sheetsUrl
        ? {
            "/sheets": {
              target: sheetsUrl,
              changeOrigin: true,
              secure: false,
              followRedirects: true,
              rewrite: (p) => p.replace(/^\/sheets/, ""),
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.setHeader('Origin', 'https://script.google.com');
                  proxyReq.setHeader('Referer', 'https://script.google.com/');
                });
              },
            },
          }
        : undefined,
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: "autoUpdate",
        injectRegister: 'script',
        injectManifest: {
          injectionPoint: 'self.__WB_MANIFEST',
        },
        includeAssets: [
          'icon-192.png',
          'icon-512.png',
          'icon-512-maskable.png',
          'screenshot-wide.png',
          'screenshot-narrow.png',
          'Appiconandlogo.jpg',
        ],
        manifest: {
          id: "/",
          name: "Meditrack",
          short_name: "Meditrack",
          description: "Track your medicines and glucose levels with an easy-to-use personal health tracker",
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["window-controls-overlay", "tabbed", "standalone", "minimal-ui"],
          orientation: "portrait",
          theme_color: "#3B82F6",
          background_color: "#0a0a0a",
          lang: "en",
          dir: "ltr",
          categories: ["health", "medical", "lifestyle"],
          iarc_rating_id: "e84b072d-71b3-4d3e-86ae-31a8ce4e53b7",
          prefer_related_applications: false,
          related_applications: [],
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
            { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          screenshots: [
            {
              src: "/screenshot-wide.png",
              sizes: "1280x720",
              type: "image/png",
              form_factor: "wide",
              label: "Meditrack on desktop",
            },
            {
              src: "/screenshot-narrow.png",
              sizes: "390x844",
              type: "image/png",
              form_factor: "narrow",
              label: "Meditrack on mobile",
            },
          ],
          shortcuts: [
            {
              name: "Add Medicine",
              short_name: "Add Med",
              description: "Quickly add a new medicine",
              url: "/?action=add-medicine",
              icons: [{ src: "/icon-192.png", sizes: "192x192" }],
            },
            {
              name: "Log Glucose",
              short_name: "Glucose",
              description: "Log a blood glucose reading",
              url: "/?action=add-glucose",
              icons: [{ src: "/icon-192.png", sizes: "192x192" }],
            },
          ],
          // @ts-expect-error – extended manifest fields not yet in VitePWA types
          launch_handler: { client_mode: "focus-existing" },
          share_target: {
            action: "/",
            method: "GET",
            params: { title: "title", text: "text", url: "url" },
          },
          file_handlers: [
            {
              action: "/",
              accept: { "text/plain": [".txt"], "application/json": [".json"] },
            },
          ],
          protocol_handlers: [
            { protocol: "web+meditrack", url: "/?protocol=%s" },
          ],
          edge_side_panel: { preferred_width: 400 },
          note_taking: { new_note_url: "/?action=new-note" },
          scope_extensions: [],
          widgets: [
            {
              name: "Meditrack Quick View",
              tag: "meditrack-widget",
              description: "View your medicines and glucose at a glance",
              template: "generic-widget",
              ms_ac_template: "/widget-template.json",
              data: "/widget-data.json",
              type: "application/json",
              auth: false,
              update: 3600,
              icons: [{ src: "/icon-192.png", sizes: "192x192" }],
              screenshots: [{ src: "/screenshot-narrow.png", sizes: "390x844", label: "Meditrack widget" }],
            },
          ],
        } as any,
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});

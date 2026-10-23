import {
  defineConfig,
} from "vite";

import react
  from "@vitejs/plugin-react";

import tailwindcss
  from "@tailwindcss/vite";

import {
  VitePWA,
} from "vite-plugin-pwa";

import {
  fileURLToPath,
  URL,
} from "node:url";


export default defineConfig({

  resolve: {

    alias: {
      "@": fileURLToPath(
        new URL(
          "./src",
          import.meta.url
        )
      ),
    },

  },


  plugins: [

    react(),

    tailwindcss(),

    VitePWA({

      registerType:
        "autoUpdate",

      manifest: {

        name:
          "Rosehome Apartment Management",

        short_name:
          "Rosehome",

        description:
          "Ứng dụng quản lý phòng trọ và căn hộ Rosehome Apartment",

        theme_color:
          "#111827",

        background_color:
          "#f5f7fb",

        display:
          "standalone",

        orientation:
          "portrait",

        start_url:
          "/",

        scope:
          "/",

        lang:
          "vi",

        icons: [

          {
            src:
              "/Rosehome.png",

            sizes:
              "1254x1254",

            type:
              "image/png",

            purpose:
              "any",
          },

          {
            src:
              "/Rosehome.png",

            sizes:
              "1254x1254",

            type:
              "image/png",

            purpose:
              "maskable",
          },

        ],

      },


      workbox: {

        cleanupOutdatedCaches:
          true,

        maximumFileSizeToCacheInBytes:
          3 * 1024 * 1024,

        globPatterns: [
          "**/*.{js,css,html,ico,png,svg,webp}",
        ],

      },

    }),

  ],

});
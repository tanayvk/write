// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  modules: [
    "@nuxt/fonts",
    "@nuxt/ui",
    "@pinia/nuxt",
    "@nuxtjs/tailwindcss",
    "@vite-pwa/nuxt",
    "nuxt-gtag",
  ],
  fonts: {
    families: [{ name: "PT Mono", provider: "google" }],
  },
  nitro: {
    routeRules: {
      "/*": { prerender: true },
    },
  },
  gtag: {
    id: "G-95LZ059684",
  },
  pwa: {
    strategies: "generateSW",
    registerWebManifestInRouteRules: true,
    registerType: "autoUpdate",
    manifest: {
      name: "Write | write.tanay.xyz",
      short_name: "Write",
      theme_color: "#b9927e",
      icons: [
        {
          src: "pwa-64x64.png",
          sizes: "64x64",
          type: "image/png",
        },
        {
          src: "pwa-192x192.png",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "pwa-512x512.png",
          sizes: "512x512",
          type: "image/png",
        },
        {
          src: "maskable-icon-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      globPatterns: ["/", "**/*.{mjs,js,css,html,png,svg,ico}"],
    },
    injectManifest: {
      globPatterns: ["/", "**/*.{mjs,js,css,html,png,svg,ico}"],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: true,
      suppressWarnings: true,
      navigateFallback: "/",
      navigateFallbackAllowlist: [/^\/$/],
      type: "module",
    },
  },
});

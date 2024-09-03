// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2024-04-03",
  devtools: { enabled: false },
  modules: ["@nuxt/fonts", "@nuxt/ui", "@pinia/nuxt", "@nuxtjs/tailwindcss"],
  fonts: {
    families: [{ name: "PT Mono", provider: "google" }],
  },
});

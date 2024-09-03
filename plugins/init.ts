export default defineNuxtPlugin({
  hooks: {
    "app:beforeMount"() {
      dbInit().then(() => {
        peerInit();
        updateWritings();
      });
    },
  },
});

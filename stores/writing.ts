import { defineStore } from "pinia";

export const useWritingsStore = defineStore("writings", {
  state: () => ({ writings: [], loaded: false }),
  actions: {
    setWritings(writings) {
      this.loaded = true;
      this.writings = writings;
    },
  },
});

export const updateWritings = async () => {
  const w = await getWritings();
  useWritingsStore().setWritings(w);
};

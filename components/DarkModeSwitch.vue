<script setup>
const modes = ["system", "light", "dark"];
const colorMode = useColorMode();
const switchMode = () => {
  colorMode.preference =
    modes[(modes.indexOf(colorMode.preference) + 1) % modes.length];
};
const icons = {
  system: "i-heroicons-computer-desktop-20-solid",
  light: "i-heroicons-sun",
  dark: "i-heroicons-moon",
};
</script>
<template>
  <UTooltip
    :text="`Switch to ${
      modes[(modes.indexOf(colorMode.preference) + 1) % modes.length]
    } mode`"
    :popper="{ arrow: true }"
  >
    <UButton
      color="gray"
      variant="ghost"
      @click="switchMode"
      :icon="icons[colorMode.preference]"
    />
  </UTooltip>
</template>

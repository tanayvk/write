<script setup>
import moment from "moment";
const { loaded, writings } = storeToRefs(useWritingsStore());
const creating = ref(false);
async function create() {
  creating.value = true;
  const id = await createNewWriting();
  useRouter().push(`/editor/${id}`);
  creating.value = false;
}
onMounted(() => {
  updateWritings();
});
function go(id) {
  useRouter().push(`/editor/${id}`);
}
function del(writing) {
  writing.deleting = true;
  deleteWritingByID(writing.id);
}
const copied = ref(false);
async function copy(id) {
  const { texts, current } = await getWritingText(id);
  const text = texts.map(({ text }) => text).join("") + current;
  navigator.clipboard.writeText(text);
  copied.value = true;
}
const openSync = ref(false);
</script>
<template>
  <div class="w-screen h-screen flex flex-col">
    <nav class="fixed right-0 top-0 h-12 flex items-center px-2 space-x-1">
      <UButton
        color="gray"
        variant="ghost"
        icon="i-heroicons-arrow-path"
        @click="openSync = true"
      />
      <DarkModeSwitch />
    </nav>
    <div
      class="container max-w-2xl mx-auto flex-grow scrollbar-hide overflow-y-scroll"
    >
      <div class="h-12"></div>
      <div class="px-2 pb-6 w-full flex justify-center items-center">
        <UButton
          variant="outline"
          icon="i-heroicons-pencil"
          :loading="creating"
          @click="create"
          >Start Writing</UButton
        >
      </div>
      <SpinLoader v-if="!loaded" height="h-64" />
      <UAlert
        v-if="loaded && writings.length === 0"
        color="primary"
        variant="subtle"
        icon="i-heroicons-information-circle"
        title="No writings here"
      />
      <div v-if="loaded && writings.length > 0" class="space-y-5">
        <div
          :class="['flex flex-col group', writing.deleting && 'opacity-50']"
          :key="writing.id"
          v-for="writing in writings"
        >
          <div class="flex items-center w-full gap-4">
            <span
              ><UButton
                class="p-0 text-xl"
                variant="link"
                @click="go(writing.id)"
                >{{
                  moment.utc(writing.created_at).local().format("MMMM D, YYYY")
                }}</UButton
              ></span
            >
            <UTooltip
              :text="copied ? 'Copied!' : 'Copy to clipboard'"
              :popper="{ placement: 'top', arrow: true }"
            >
              <UButton
                class="p-0 text-md hidden group-hover:block"
                color="green"
                variant="link"
                @click="copy(writing.id)"
                @mouseout="copied = false"
                >Copy</UButton
              >
            </UTooltip>
            <span
              ><UButton
                class="p-0 text-md hidden group-hover:block"
                color="red"
                variant="link"
                @click="del(writing)"
                >Delete</UButton
              ></span
            >
          </div>
          <span class="text-lg">{{ writing.title || "Empty" }}&hellip;</span>
        </div>
      </div>
      <div class="h-12"></div>
    </div>
    <footer
      class="flex flex-col md:flex-row md:justify-between items-center px-1 gap-1"
    >
      <div class="dark:text-gray-400 flex items-center space-x-1">
        <span>Built with</span
        ><UIcon class="text-rose-600" name="i-heroicons-heart-solid" /><span
          >by
          <UButton
            to="https://tanay.xyz"
            target="_blank"
            class="p-0"
            size="lg"
            variant="link"
            >Tanay Karnik</UButton
          ></span
        >
      </div>
      <div class="text-gray-800 dark:text-gray-400 flex items-center space-x-2">
        <UButton
          to="https://github.com/tanayvk/write"
          target="_blank"
          variant="ghost"
          color="gray"
          icon="fa6-brands-github"
        />
        <UButton
          to="https://x.com/tanayvk"
          target="_blank"
          variant="ghost"
          color="gray"
          icon="fa6-brands-x-twitter"
        />
      </div>
    </footer>
  </div>
  <UModal v-model="openSync"><Sync /> </UModal>
</template>

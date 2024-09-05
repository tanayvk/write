<script setup lang="ts">
import {
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  sub,
  format,
  isSameDay,
  type Duration,
} from "date-fns";
import moment from "moment";
import {
  VisXYContainer,
  VisAxis,
  VisLine,
  VisCrosshair,
  VisTooltip,
} from "@unovis/vue";

const ranges = [
  { label: "Last week", duration: { days: 7 } },
  { label: "Last 2 weeks", duration: { days: 14 } },
  { label: "Last month", duration: { months: 1 } },
  { label: "Last 3 months", duration: { months: 3 } },
  { label: "Last 6 months", duration: { months: 6 } },
  { label: "Last year", duration: { years: 1 } },
];
const selected = ref({
  start: sub(new Date(), { days: 7 }),
  end: new Date(),
});

const aggregation = ref("Daily");
const items = [
  [{ label: "Daily" }, { label: "Weekly" }, { label: "Monthly" }].map(
    (item) => ({
      ...item,
      click() {
        aggregation.value = item.label;
      },
    }),
  ),
];
const tab = ref(0);

function isRangeSelected(duration: Duration) {
  return (
    isSameDay(selected.value.start, sub(new Date(), duration)) &&
    isSameDay(selected.value.end, new Date())
  );
}

function selectRange(duration: Duration) {
  selected.value = { start: sub(new Date(), duration), end: new Date() };
}

const padding = {
  top: 5,
  bottom: 5,
};
const {
  data: sessionData,
  pending: sessionPending,
  status,
} = useAsyncData(
  async () => {
    const textData = await getSessionsInRange(
      selected.value.start,
      selected.value.end,
    );
    const sessions = [];
    let lastSession = null;
    textData.forEach(({ created_at, words }) => {
      const time = moment.utc(created_at).local();
      if (lastSession && time.diff(lastSession.end) < 5 * 60 * 1000) {
        lastSession.end = time;
        lastSession.words += words;
      } else {
        lastSession = {
          start: time,
          words,
          end: time,
        };
        sessions.push(lastSession);
      }
    });
    return sessions;
  },
  { watch: [() => selected.value] },
);
const { data, pending, refresh } = useAsyncData(async () => {
  const dates = {
    Daily: eachDayOfInterval,
    Weekly: eachWeekOfInterval,
    Monthly: eachMonthOfInterval,
  }[aggregation.value](selected.value);
  const data = dates.map((date) => ({ date, words: 0, duration: 0 }));
  if (data.length) {
    let dateIndex = 0;
    sessionData.value.forEach((session) => {
      while (
        dateIndex + 1 < dates.length &&
        moment(dates[dateIndex + 1]).isBefore(session.start)
      ) {
        dateIndex++;
      }
      data[dateIndex].words += session.words;
      data[dateIndex].duration += session.end.diff(session.start);
    });
  }
  return data;
});
watch([sessionData, () => aggregation.value], () => {
  refresh();
});
const totalWords = computed(() =>
  sessionData.value.reduce((a, b) => a + b.words, 0),
);
const totalTime = computed(() =>
  sessionData.value.reduce((a, b) => a + b.end.diff(b.start), 0),
);
const x = (_, i) => i;
const y = (d) => (tab.value === 0 ? d.words : d.duration);
const xTicks = (i: number) => {
  if (!data.value[i]) {
    return "";
  }
  return moment(data.value[i].date).calendar();
};
const template = (d) =>
  `${moment(d.date).format("D MMM, YYYY")}: ${
    tab.value === 0 ? d.words + " words" : showDuration(d.duration)
  }`;

const cols = [
  { label: "Session", key: "start" },
  { label: "Duration", key: "duration" },
  { label: "Words", key: "words" },
];
</script>
<template>
  <UCard>
    <template #header> <div class="text-2xl">Stats</div> </template>
    <div class="space-y-3">
      <UCard>
        <template #header>
          <div class="flex space-x-2">
            <UPopover :popper="{ placement: 'bottom-start' }">
              <UButton
                variant="outline"
                trailing-icon="i-heroicons-chevron-down-20-solid"
              >
                {{ format(selected.start, "d MMM, yyy") }} -
                {{ format(selected.end, "d MMM, yyy") }}
              </UButton>
              <template #panel="{ close }">
                <div
                  class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800"
                >
                  <div class="hidden sm:flex flex-col py-4">
                    <UButton
                      v-for="(range, index) in ranges"
                      :key="index"
                      :label="range.label"
                      color="gray"
                      variant="ghost"
                      class="rounded-none px-6"
                      :class="[
                        isRangeSelected(range.duration)
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      ]"
                      truncate
                      @click="selectRange(range.duration)"
                    />
                  </div>
                  <DatePicker v-model="selected" @close="close" />
                </div>
              </template>
            </UPopover>
            <UDropdown :items="items" :popper="{ placement: 'bottom-start' }">
              <UButton
                :label="aggregation"
                variant="outline"
                trailing-icon="i-heroicons-chevron-down-20-solid"
              />
            </UDropdown>
          </div>
        </template>
        <SpinLoader v-if="sessionPending" height="h-64" />
        <div class="space-y-6 max-h-[50vh] overflow-scroll" v-else>
          <SpinLoader v-if="pending" />
          <UTabs
            v-else
            :ui="{
              list: {
                height: 'h-auto',
                tab: {
                  base: 'justify-start',
                  height: 'h-auto',
                },
              },
            }"
            :items="[{ label: 'Words' }, { label: 'Time' }]"
            v-model="tab"
          >
            <template #default="{ item }">
              <div class="space-y-1 flex flex-col items-start py-2">
                <span class="font-medium text-lg">{{ item.label }}</span>
                <span class="text-2xl font-bold text-left">{{
                  item.label === "Words"
                    ? totalWords
                    : moment.duration(totalTime).humanize()
                }}</span>
              </div>
            </template>
            <template #item>
              <div class="py-4">
                <VisXYContainer :padding="padding" :data="data">
                  <VisAxis type="x" :x="x" :tick-format="xTicks" />
                  <VisLine :x="x" :y="y" />
                  <VisCrosshair
                    :template="template"
                    :hideWhenFarFromPointer="true"
                    :hideWhenFarFromPointerDistance="50"
                  />
                  <VisTooltip />
                </VisXYContainer>
              </div>
            </template>
          </UTabs>
          <div class="space-y-4">
            <span class="text-xl">Session History</span>
            <div class="border-gray-300 dark:border-gray-700 border rounded-lg">
              <UTable :rows="sessionData" :columns="cols">
                <template #start-data="{ row }">
                  {{ moment(row.start).calendar() }}
                </template>
                <template #duration-data="{ row }">
                  {{ showDuration(row.end.diff(row.start), true) }}
                </template>
              </UTable>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </UCard>
</template>

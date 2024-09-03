<script setup>
import { minimalSetup, EditorView } from "codemirror";
import { EditorState, RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { createPopper } from "@popperjs/core";
import moment from "moment";

const focusHighlight = Decoration.mark({
  attributes: { class: "focus-highlight" },
});
const lastLineHighlight = Decoration.line({
  attributes: { class: "last-line" },
});

const copied = ref(false);
function copy() {
  const text = editor.state.doc.toString();
  navigator.clipboard.writeText(text);
  copied.value = true;
}

function findCurrentSentence(text, pos) {
  const beforeCursor = text.slice(0, pos);
  const afterCursor = text.slice(Math.max(0, pos - 1));
  let sentenceStart = 0;
  let punc = beforeCursor
    .split("")
    .reverse()
    .join("")
    .match(/ ([.?!])/)
    ?.pop();
  if (punc) {
    sentenceStart = beforeCursor.lastIndexOf(punc + " ") + 1;
  }
  punc = afterCursor.match(/([.?!]) /)?.pop();
  let sentenceEnd = text.length;
  if (punc) {
    sentenceEnd = pos + afterCursor.indexOf(punc + " ") + 1;
  }
  return { from: sentenceStart, to: sentenceEnd };
}

function focusHighlightCurrentSentence(view) {
  let builder = new RangeSetBuilder();
  const pos = view.state.selection.main.head;
  const line = view.state.doc.lineAt(pos);
  const loc = findCurrentSentence(line.text, pos - line.from);
  if (line)
    builder.add(line.from + loc.from, line.from + loc.to, focusHighlight);
  return builder.finish();
}

function getLastLineHighlight(view) {
  let builder = new RangeSetBuilder();
  const lastLine = view.state.doc.lineAt(view.state.doc.length);
  builder.add(lastLine.from, lastLine.from, lastLineHighlight);
  return builder.finish();
}

const highlightLastLine = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = getLastLineHighlight(view);
    }
    update(update) {
      this.decorations = getLastLineHighlight(update.view);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const highlightSentence = ViewPlugin.fromClass(
  class {
    constructor(view) {
      this.decorations = focusHighlightCurrentSentence(view);
    }
    update(update) {
      this.decorations = focusHighlightCurrentSentence(update.view);
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

const route = useRoute();
const id = route.params.id;
const loading = ref(true);
let toSave = [],
  unsavedText = "",
  saveTimeout = null,
  title = null,
  editor = null,
  stale = false;

const SESSION_WAIT_TIME = 5 * 60 * 1000;
const savedWords = ref(0),
  currentWords = ref(0),
  sessionTime = ref(""),
  lastTime = ref(null),
  sessionStartTime = ref(null),
  sessionStartWords = ref(null),
  updateTimerInterval = ref(null);
let sessionWaitTimeout = null;
const wordsCount = computed(() => savedWords.value + currentWords.value);
const sessionWords = computed(() => wordsCount.value - sessionStartWords.value);

async function save(timeout = true) {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (stale) {
    const text = toSave.join("");
    toSave = [];
    try {
      await saveText(id, text, unsavedText, title);
    } catch {
      toSave = [text, ...toSave];
    }
  }
  if (timeout) saveTimeout = setTimeout(save, 3000);
}

function getLineDom(line) {
  const lineFrom = editor.state.doc.line(line).from;
  const lineDom = editor.domAtPos(lineFrom);
  if (!lineDom.precise) return;
  let node = lineDom.node;
  while (node && !node.classList?.contains("cm-line")) {
    node = node.parentElement;
  }
  if (node?.classList.contains("cm-line")) return node;
}

function updateTimer() {
  if (sessionStartTime)
    sessionTime.value = showTime(
      moment.duration(moment().local().diff(sessionStartTime.value)),
    );
}

let timestamps = {};
function setTimestamp(line, time) {
  if (timestamps[line]) {
    timestamps[line].remove();
    delete timestamps[line];
  }
  const el = (timestamps[line] = document.createElement("span"));
  el.className = "timestamp";
  el.style.position = "fixed";
  el.style.left = "-200vw";
  el.innerHTML = time;
  document.body.appendChild(el);
}

const updateTimestamps = debounce(
  function () {
    const startLine = editor.state.doc.lineAt(editor.viewport.from).number;
    const endLine = editor.state.doc.lineAt(editor.viewport.to).number;
    for (const [line, el] of Object.entries(timestamps)) {
      if (startLine <= line && line <= endLine)
        createPopper(getLineDom(line), el, { placement: "left" });
    }
  },
  300,
  "timestamps",
);

function times(texts) {
  let line = 1;
  let words = 0;
  texts.forEach(({ text, created_at }) => {
    const curTime = moment.utc(created_at).local();
    if (
      !lastTime.value ||
      curTime.diff(lastTime.value).valueOf() > SESSION_WAIT_TIME
    ) {
      setTimestamp(line, curTime.calendar());
      sessionStartTime.value = curTime;
      sessionStartWords.value = words;
    }
    lastTime.value = curTime;
    if (sessionWaitTimeout) clearTimeout(sessionWaitTimeout);
    sessionWaitTimeout = setTimeout(
      () => {
        sessionStartTime.value = null;
      },
      Math.max(0, SESSION_WAIT_TIME - moment().diff(curTime).valueOf()),
    );
    line += text.match(/\n/g)?.length || 0;
    words += text.match(/ /g)?.length || 0;
  });
}
onMounted(async () => {
  loading.value = true;
  const { texts, current } = await getWritingText(id);
  const text = texts.map(({ text }) => text).join("");
  let saved = text.length;
  savedWords.value = text.trim() ? text.split(" ").length : 0;
  currentWords.value = current.trim() ? current.split(" ").length : 0;
  editor = new EditorView({
    doc: text + current,
    parent: document.getElementById("editor"),
    lineWrapping: true,
    extensions: [
      minimalSetup,
      EditorView.theme({
        ".cm-content": {
          whiteSpace: "break-spaces",
          wordWrap: "break-word",
          width: "100%",
          maxWidth: "100%",
        },
        "&.cm-focused": {
          outline: "none",
        },
        "&.cm-editor": {
          height: "100%",
        },
      }),
      markdown(),
      EditorState.transactionFilter.of((tr) => {
        let filter = true;
        tr.changes.iterChanges((a, _b, aa, _bb) => {
          if (Math.min(a, aa) < saved) filter = false;
        });
        if (filter && tr.state.doc) {
          const doc = tr.state.doc;
          const newSaved =
            doc.length - getLastThreeWordsLength(doc.line(doc.lines).text);
          if (newSaved > saved) {
            const newText = doc.slice(saved, newSaved).toString();
            toSave.push(newText);
            stale = true;
            const before = savedWords.value;
            savedWords.value += newText.trim()
              ? newText.trim().split(" ").length
              : 0;
            saved = newSaved;
            const curTime = moment();
            if (
              !lastTime.value ||
              curTime.diff(lastTime.value).valueOf() > SESSION_WAIT_TIME
            ) {
              setTimestamp(Math.max(doc.lines, 1), curTime.calendar());
              sessionStartTime.value = curTime;
              sessionStartWords.value = before;
            }
            lastTime.value = curTime;
            if (sessionWaitTimeout) clearTimeout(sessionWaitTimeout);
            sessionWaitTimeout = setTimeout(() => {
              sessionStartTime.value = null;
            }, SESSION_WAIT_TIME);
          }
          const curUnsavedText = doc.slice(saved).toString();
          const curTitle = doc.slice(0, 100).toString();
          if (unsavedText !== curUnsavedText) {
            unsavedText = curUnsavedText;
            stale = true;
          }
          if (title !== curTitle) {
            title = curTitle;
            stale = true;
          }
          currentWords.value = unsavedText.trim()
            ? unsavedText.trim().split(" ").length
            : 0;
          return tr;
        }
      }),
      EditorView.updateListener.of(() => {
        updateTimestamps();
      }),
      highlightSentence,
      highlightLastLine,
    ],
  });
  window.e = editor;
  saveTimeout = setTimeout(save, 500);
  setTimeout(() => {
    editor.focus();
    const pos = editor.state.doc.length;
    editor.dispatch({
      selection: { anchor: pos, head: pos },
      scrollIntoView: true,
    });
    times(texts);
  }, 0);
  updateTimerInterval.value = setInterval(updateTimer, 200);
  loading.value = false;
});
onUnmounted(() => {
  for (const el of Object.values(timestamps)) {
    el.remove();
  }
  save();
  if (saveTimeout) clearTimeout(saveTimeout);
  if (updateTimerInterval) clearInterval(updateTimerInterval);
});
</script>
<template>
  <SpinLoader v-if="loading" />
  <div class="h-screen flex flex-col justify-between">
    <div
      :class="[
        'py-0 w-full text-2xl h-[60%] overflow-scroll scrollbar-hide',
        loading ? 'invisible' : 'visible',
      ]"
      id="editor"
    ></div>
    <div
      v-if="!loading"
      class="w-full py-2 flex items-center justify-center text-primary"
    >
      <div>{{ wordsCount }} word{{ wordsCount === 1 ? "" : "s" }}</div>
    </div>
    <div class="fixed bottom-2 left-2">
      <div v-if="sessionStartTime && sessionTime" class="space-x-2">
        <UBadge variant="subtle">{{ sessionTime }}</UBadge>
        <UBadge variant="outline">{{ sessionWords }}</UBadge>
      </div>
    </div>
    <div class="fixed top-2 right-2">
      <UTooltip
        :text="copied ? 'Copied!' : 'Copy to clipboard'"
        :popper="{ placement: 'left', arrow: true }"
      >
        <UButton
          icon="i-ic-baseline-content-copy"
          @click="copy"
          @mouseout="copied = false"
          variant="outline"
        />
      </UTooltip>
    </div>
  </div>
</template>

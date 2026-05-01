<template>
  <div class="editor-wrapper">
    <div ref="editorContainer" class="editor"/>
  </div>
</template>

<script lang="ts" setup>
import {markRaw, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import Quill from 'quill';

// --- Aditional Tags ---
const Embed = Quill.import('blots/embed') as any;

/**
 * Soft-line-break blot. Inserted on shift+enter and on pasted <br> nodes so a
 * <br> survives Quill's delta round-trip instead of being collapsed.
 */
class SoftLineBreakBlot extends Embed {
  static blotName = 'br';
  static tagName = 'br';

  static create(value?: unknown) {
    return super.create();
  }

  static value(node?: unknown) {
    return undefined;
  }
}

Quill.register(SoftLineBreakBlot as any, true);

// --- Props ---
const props = defineProps({
  modelValue: {type: String, default: ''},
  theme: {type: String, default: 'snow'},
  placeholder: {type: String, default: 'Write something...'},
  readOnly: {type: Boolean, default: false},
  formats: {type: Array as () => string[] | undefined, default: undefined},
  toolbar: {type: [String, Array], default: 'full'},
  options: {type: Object, default: () => ({})},
})

// --- Emits ---
const emit = defineEmits(['update:modelValue', 'ready', 'text-change', 'focus', 'blur'])

// --- Refs ---
const editorContainer = ref<HTMLElement | null>(null)
let quill: Quill | null = null
// Tracks the last value emitted to the parent so the modelValue watcher can
// distinguish a parent-echoed update (skip) from a genuine external change (apply).
let lastEmitted = ''

const TOOLBAR_PRESETS: Record<string, any[]> = {
  full: [
    [{header: [1, 2, 3, false]}],
    ['bold', 'italic', 'underline', 'strike'],
    [{list: 'ordered'}, {list: 'bullet'}],
    [{indent: '-1'}, {indent: '+1'}],
    [{align: []}],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
  basic: [
    ['bold', 'italic'],
    ['link'],
  ],
}

const resolveToolbar = (toolbar: unknown): any[] => {
  if (Array.isArray(toolbar)) return toolbar;
  if (typeof toolbar === 'string') {
    const preset = TOOLBAR_PRESETS[toolbar];
    if (preset) return preset;
    console.warn(`[QuillBlogEditor] Unknown toolbar preset "${toolbar}", falling back to "full".`);
  }
  return TOOLBAR_PRESETS.full;
};

/**
 * Inserts a <br> at the caret on shift+enter. Inserts a second <br> when the
 * caret sits at the end of a block (no next leaf, or next leaf belongs to a
 * different parent) so the empty line stays visible — Quill otherwise collapses
 * a trailing <br>.
 */
const softBreakHandler = (range: any, _context: any) => {
  if (!quill || !range) {
    return false
  }

  if (range.length > 0) {
    quill.deleteText(range.index, range.length, Quill.sources.USER);
  }

  const currentLeaf = quill.getLeaf(range.index)[0];
  const nextLeaf = quill.getLeaf(range.index + 1)[0];
  quill.insertEmbed(range.index, 'br', true, Quill.sources.USER);

  if (currentLeaf != null && (nextLeaf === null || currentLeaf.parent !== nextLeaf.parent)) {
    quill.insertEmbed(range.index, 'br', true, Quill.sources.USER);
  }

  quill.setSelection(range.index + 1, Quill.sources.SILENT);

  return false
};


onMounted(async () => {
  await nextTick();

  if (!editorContainer.value) return;

  const mergedModules: Record<string, any> = {
    keyboard: {
      bindings: {
        'shift+enter': {
          key: ['Enter'],
          shiftKey: true,
          handler: softBreakHandler
        }
      }
    },

    toolbar: resolveToolbar(props.toolbar),
  };

  // Merge consumer-supplied modules; toolbar is special-cased so the consumer
  // can fully replace the resolved preset by providing options.modules.toolbar.
  if (props.options.modules) {
    for (const key of Object.keys(props.options.modules)) {
      if (key === 'toolbar') continue;
      mergedModules[key] = props.options.modules[key];
    }
    if ('toolbar' in props.options.modules) {
      mergedModules.toolbar = props.options.modules.toolbar;
    }
  }

  const {modules: _ignored, ...otherOptions} = props.options || {};

  const finalOptions = {
    theme: props.theme,
    placeholder: props.placeholder,
    readOnly: props.readOnly,
    formats: props.formats,
    modules: mergedModules,
    ...otherOptions,
  };

  quill = markRaw(new Quill(editorContainer.value, finalOptions));

  quill!.clipboard.addMatcher('BR', function (_node, delta) {
    return delta.insert({br: true});
  });

  quill.clipboard.dangerouslyPasteHTML(props.modelValue || '');
  lastEmitted = quill.root.innerHTML;

  quill.on('text-change', () => {
    if (!quill) return;
    lastEmitted = quill.root.innerHTML;
    emit('update:modelValue', lastEmitted);
    emit('text-change');
  });

  quill.on('selection-change', (range) => {
    if (range === null) emit('blur')
    else emit('focus')
  });

  emit('ready', quill);
});

onBeforeUnmount(() => {
  quill = null;
});

watch(
    () => props.modelValue,
    (newVal) => {
      if (!quill) return
      // Parent echoed back what we just emitted — skip to preserve cursor.
      if (newVal === lastEmitted) return
      if (newVal !== quill.root.innerHTML) {
        quill.clipboard.dangerouslyPasteHTML(newVal || '')
        lastEmitted = quill.root.innerHTML
      }
    }
)

watch(
    () => props.readOnly,
    (val) => {
      quill?.enable(!val)
    }
)
</script>

<style scoped>
</style>

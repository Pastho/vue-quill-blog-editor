<template>
  <div class="editor-wrapper">
    <div ref="editorContainer" class="editor"/>
  </div>
</template>

<script lang="ts" setup>
import {markRaw, nextTick, onMounted, ref, watch} from 'vue';
import Quill from 'quill';

// --- Aditional Tags ---
const Embed = Quill.import('blots/embed') as any;

/**
 * Represents a Soft Line Break blot in the editor, extending the Embed class.
 * This blot is used to handle the representation of a line break ('br' HTML tag) in the document.
 */
class SoftLineBreakBlot extends Embed {
  static blotName = 'br';
  static tagName = 'br';

  // both static methods are required when initializing the component
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
  features: {type: Object, default: () => ({})},
})

// --- Emits ---
const emit = defineEmits(['update:modelValue', 'ready', 'text-change', 'focus', 'blur'])

// --- Refs ---
const editorContainer = ref<HTMLElement | null>(null)
let quill: Quill | null = null

/**
 * A constant object defining toolbar configuration presets for the text editor. Will be overwritten when providing the container when calling the editor component.
 *
 * - `full`: A preset configuration that includes a comprehensive set of toolbar options such as headers, text formatting, lists, indentation, alignment, block elements, media insertion, and clearing formatting.
 * - `basic`: A minimal toolbar configuration that includes only basic text formatting options and link insertion.
 */
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

/**
 * Handles soft break insertion in a Quill editor instance. This function manages the insertion of `<br>` tags
 * based on the current selection range and the context of the Quill editor's content structure.
 *
 * @param {any} range - The current selection range in the Quill editor.
 * @param {any} context - Additional context or configuration for handling the soft break.
 * @returns {boolean} Returns `false` after handling the soft break to indicate no default action is needed.
 */
const softBreakHandler = (range: any, context: any) => {
  if (!quill || !range) {
    return false
  }

  const currentLeaf = quill.getLeaf(range.index)[0];
  const nextLeaf = quill.getLeaf(range.index + 1)[0];
  quill.insertEmbed(range.index, 'br', true, Quill.sources.USER);

  // At the end of the editor, OR next leaf has a different parent (<p>)
  if (currentLeaf != null && (nextLeaf === null || currentLeaf.parent !== nextLeaf.parent)) {
    quill.insertEmbed(range.index, 'br', true, Quill.sources.USER);
  }

  quill.setSelection(range.index + 1, Quill.sources.SILENT);

  return false
};


/**
 * Lifecycle hook executed when the component is mounted.
 *
 * - Waits for the next DOM update cycle.
 * - Initializes the Quill editor instance with merged module and option configurations,
 *   combining component defaults with additional options supplied via props.
 * - Sets the initial HTML content of the editor.
 * - Registers event listeners to emit updates when the editor's content or selection changes.
 * - Emits a 'ready' event once initialization is complete.
 *
 * @async
 */
onMounted(async () => {
  await nextTick();

  if (!editorContainer.value) return;

  // preparing fundamental modules for being merged with others from calling component
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

    toolbar: Array.isArray(props.toolbar)
        ? props.toolbar
        : TOOLBAR_PRESETS[props.toolbar] || TOOLBAR_PRESETS.full,
  };

  // merge additional modules supplied by calling component
  if (props.options.modules) {
    for (const key of Object.keys(props.options.modules)) {
      if (key === 'toolbar') continue;
      mergedModules[key] = props.options.modules[key];
    }
    if ('toolbar' in props.options.modules) {
      mergedModules.toolbar = props.options.modules.toolbar;
    }
  }

  // extend basic options with supplied ones
  const {modules, ...otherOptions} = props.options || {};

  const finalOptions = {
    theme: props.theme,
    placeholder: props.placeholder,
    readOnly: props.readOnly,
    formats: props.formats,
    modules: mergedModules,
    ...otherOptions,
  };

  // create quill editor
  quill = markRaw(new Quill(editorContainer.value, finalOptions));

  quill!.clipboard.addMatcher('BR', function(node, delta) {
    // Insert a custom blot for each <br>
    return delta.insert({ br: true });
  });

  quill.clipboard.dangerouslyPasteHTML(props.modelValue || '');

  // emit fundamental update events to calling component
  quill.on('text-change', (...args: any[]) => {
    emit('update:modelValue', quill!.root.innerHTML)
    emit('text-change')
  });

  quill.on('selection-change', (range) => {
    if (range === null) emit('blur')
    else emit('focus')
  });

  emit('ready', quill);
});


/**
 * Watches for changes to the `modelValue` prop and synchronizes the Quill editor content.
 *
 * - If the Quill editor instance exists and the new value differs from the current editor HTML,
 *   updates the editor content to match the new `modelValue` using `dangerouslyPasteHTML`.
 * - Prevents unnecessary updates if the editor content is already in sync.
 *
 * @param {() => string} source - Reactive function returning the current `modelValue`.
 * @param {(newVal: string) => void} callback - Function called when `modelValue` changes, used to update the editor.
 */
watch(
    () => props.modelValue,
    (newVal) => {
      if (!quill) return
      if (newVal !== quill.root.innerHTML) {
        quill.clipboard.dangerouslyPasteHTML(newVal || '')
      }
    }
)
</script>

<style scoped>
</style>
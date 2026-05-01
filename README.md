# Vue Quill Blog Editor

A lightweight, Vue 3-based rich text editor component that wraps the powerful [Quill](https://quilljs.com) editor. Built
using the Composition API and styled with Quill's Snow theme, this component is easy to use, reusable across projects,
and ready for modern Vue applications.

---

## ✨ Features

- 🧩 Reusable Vue 3 component (Composition API)
- 🖋 Two-way binding via `v-model`
- 🎨 Pre-styled with Quill’s Snow theme
- 🔌 Works seamlessly with Vite, TypeScript, and modern tooling
- ✂️ Supports soft line breaks and robust formatting

### Component Playground:

- 🖼️ Includes a custom image handler and built-in image service for uploads/deletes
- 🚮 Automatically deletes images removed from the editor using your configured service

---

## 📦 Installation

Install the component and peer dependencies:

```bash
npm install @pastho/vue-quill-blog-editor quill vue
```

## 🚀 Usage

1. Import the Required Quill Styles

``` css
/* Mandatory import in main.css or other styling source */
@import 'quill/dist/quill.core.css';

/* import either snow, bubble or both */
@import 'quill/dist/quill.snow.css';
@import 'quill/dist/quill.bubble.css';
```

2. Use in Your Vue Component

```vue

<script setup>
  import {ref} from 'vue'
  import {QuillBlogEditor} from '@pastho/vue-quill-blog-editor'

  const content = ref('<p>Hello, world!</p>')
</script>

<template>
  <QuillBlogEditor v-model="content"/>
</template>
```

Check the playground example which shows the integration of a custom Quill module paired with a custom toolbar handler.

## 📚 Props

| Prop        | Type                | Default                | Description                     |
|-------------|---------------------|------------------------|---------------------------------|
| modelValue  | String              | `''`                   | HTML content bound with v-model |
| theme       | String              | `'snow'`               | Quill theme (`snow`, `bubble`)  |
| placeholder | String              | `'Write something...'` | Editor placeholder text         |
| readOnly    | Boolean             | `false`                | Makes the editor read-only      |
| formats     | Array&lt;string&gt; | `undefined`            | Allowed Quill formats           |
| toolbar     | String \| Array     | `'full'`               | Toolbar config, string or array |
| options     | Object              | `{}`                   | Quill options override          |
| features    | Object              | `{}`                   | Additional feature toggles      |

---

## 🎨 Styling (Required)

This component uses Quill’s Snow theme by default. To ensure the editor appears correctly, **import the Quill stylesheet
** into your app (required if you use a custom build process):

```ts
import '@pastho/vue-quill-blog-editor/dist/quill.snow.css'
```

Note: If this file is not imported, the editor will render without proper styling.

## 🛠 Development

To run and test the component locally:

```bash
# Clone or work in your component directory
npm install
npm run dev
```

To build the component and prepare it for reuse or publishing:

```bash
npm run build
```

This will output the compiled module and a copy of quill.snow.css in the dist/ folder.

## 📁 Project Structure

```
vue-quill-blog-editor/
├── src/
│   └── QuillBlogEditor.vue              # Main component
│   └── index.ts                         # Component exposure
├── scripts/
│   └── postbuild.js                     # Copies Quill theme CSS to dist
├── playground/                          # Local test app
│   └── modules/
│       └── ImageHandler.ts              # Example implementatio of a custom Quill module to handle images (e.g., resizing)
│   └── services/
│       └── ImageService.ts              # Encapsulates the service for uploading and deleting images from a server 
├── tests/                               # Vitest test suite
│   └── unit/
│       └── QuillBlogEditor.spec.ts      # Unit tests covering the QuillBlogEditor integration with Vue
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .gitignore
└── README.md
```

## 🛠 Build & Distribution

Some build processes require Quill's CSS to be present in your distribution. This project includes a simple Node script
that copies the required CSS files from `node_modules/quill/dist` to the `dist/` directory, which you can run as part of
your build step.

---

## 🧩 Extending and Custom Modules

You can register custom Quill modules by using Quill's global API or by following extension patterns in the codebase.

---

## 📝 License

MIT

---

## 📣 Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.
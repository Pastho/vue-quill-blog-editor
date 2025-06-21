<script setup lang="ts">
import QuillBlogEditor from '../../vue-quill-blog-editor/src/QuillBlogEditor.vue'
import {ref} from 'vue'
import Quill from 'quill';
import ImageHandler from './modules/ImageHandler';
import ImageService from './services/ImageService';

/**
 * Handles custom image uploads for a rich text editor and replaces the Quill standard functionality which embeds the images into the text.
 * This method creates a file input element to allow the user to select an image file.
 * Once an image is selected, it uploads the file using the `ImageService.upload()` method
 * and inserts the uploaded image into the editor at the current cursor position.
 *
 * The function performs the following steps:
 * 1. Creates an input element of type 'file' to let users choose an image file.
 * 2. Waits for the file input change event to get the selected file.
 * 3. Ensures a valid file is selected before proceeding.
 * 4. Uploads the image file via a predefined `ImageService.upload()` method.
 * 5. Inserts the uploaded image URL as an image embed in the Quill editor at the user's current cursor position.
 *
 * @function
 * @param {any} this - Contextual reference to the current editor instance that includes the Quill editor object.
 * @throws {Error} If the image upload process fails.
 */
const customImageHandler = function (this: any) {
  const input = document.createElement('input');
  input.setAttribute('type', 'file');
  input.setAttribute('accept', 'image/*');
  input.click();

  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const range = this.quill.getSelection(true);

    // 1. Upload
    const imageUrl = await ImageService.upload(file);

    // 2. Insert at cursor
    this.quill.insertEmbed(range.index, 'image', imageUrl, 'user');
    this.quill.setSelection(range.index + 1);
  };
};

// register additional modules (custom or external)
Quill.register('modules/imageHandler', ImageHandler);

const content = ref('<p>This is a test.</p>')
</script>

<template>
  <div style="padding: 2rem">
    <h1>Vue Quill Editor Playground</h1>

    <!-- Simple component usage with default only
    <QuillBlogEditor v-model="content" />  -->

    <!-- Calls the QuillBlogEditor component with a custom toolbar and image handling -->
    <QuillBlogEditor
        v-model="content"
        theme="snow"
        :options="{
          modules: {
            imageHandler: { }, // introduces the custom Quill module
            toolbar: {
              container: [ // overwrites the default toolbar
                  [{ header: [1, 2, 3, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  [{ indent: '-1' }, { indent: '+1' }],
                  [{ align: [] }],
                  ['blockquote', 'code-block'],
                  ['link', 'image'],
                  ['clean'],
                ],
              handlers: {
                image: customImageHandler // replace the standard Quill image handling by custom logic
              }
            },
          }
        }"
    />

    <h2>Rendered Output:</h2>
    <div class="preview-wrapper ql-container ql-snow">
      <div class="ql-editor" v-html="content"/>
    </div>


    <h2>Raw HTML:</h2>
    <pre class="raw">{{ content }}</pre>
  </div>
</template>

<style scoped>
/* Not scoped, to ensure Quill theme CSS applies */
.preview-wrapper {
  border: 1px solid #ccc;
  padding: 1rem;
  margin-top: 1rem;
  background: #fff;
}

.raw {
  white-space: pre-wrap;
  background: #eee;
  padding: 1rem;
  margin-top: 1rem;
  font-family: monospace;
}
</style>

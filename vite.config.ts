// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

const playgroundMode = fs.existsSync(path.resolve(__dirname, 'playground'))

export default defineConfig(({ command }) => {
    const isDev = command === 'serve'

    return {
        root: '.', // serves from project root
        plugins: [vue()],
        build: !isDev
            ? {
                lib: {
                    entry: path.resolve(__dirname, 'src/index.ts'),
                    name: 'QuillBlogEditor',
                    fileName: (format) => `vue-quill-blog-editor.${format}.js`,
                    formats: ['es', 'cjs'],
                },
                rollupOptions: {
                    external: ['vue', 'quill'],
                    output: {
                        globals: {
                            vue: 'Vue',
                            quill: 'Quill',
                        },
                    },
                },
            }
            : undefined,
        server: isDev && playgroundMode
            ? {
                open: '/playground/index.html',
            }
            : undefined,
    }
})

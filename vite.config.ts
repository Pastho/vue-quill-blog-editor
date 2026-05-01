// vite.config.ts
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import fs from 'fs'

const playgroundDir = path.resolve(__dirname, 'playground')
const playgroundMode = fs.existsSync(playgroundDir)

export default defineConfig(({command}) => {
    const isDev = command === 'serve'

    return {
        // In dev, serve the playground app at `/`. In build, root is the project
        // root so `src/index.ts` resolves as the library entry.
        root: isDev && playgroundMode ? playgroundDir : '.',
        plugins: [vue()],
        resolve: {
            dedupe: ['vue', 'quill'],
        },
        server: isDev && playgroundMode
            ? {
                open: '/',
                fs: {
                    // Allow imports from `src/` even though dev root is `playground/`.
                    allow: [__dirname],
                },
            }
            : undefined,
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
                        exports: 'named',
                        globals: {
                            vue: 'Vue',
                            quill: 'Quill',
                        },
                    },
                },
            }
            : undefined,
    }
})

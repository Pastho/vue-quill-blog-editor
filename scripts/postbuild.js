/**
 * Copies selected Quill CSS and source map files from the package's node_modules directory
 * to the project's dist directory. This ensures that required Quill stylesheets are available
 * with the built distribution artifacts.
 *
 * For each file specified in the `filesToCopy` array, this script attempts to copy it from
 * 'node_modules/quill/dist' to 'dist'. Success and error messages are logged for each operation.
 */

const fs = require('fs')
const path = require('path')

const filesToCopy = [
    'quill.snow.css',
    'quill.snow.css.map',
    'quill.core.css',
    'quill.bubble.css'
]

filesToCopy.forEach((filename) => {
    const source = path.resolve('node_modules/quill/dist', filename)
    const dest = path.resolve('dist', filename)

    try {
        fs.copyFileSync(source, dest)
        console.log(`✅ ${filename} copied to dist/`)
    } catch (err) {
        console.warn(`⚠️  Could not copy ${filename}: ${err.message}`)
    }
})
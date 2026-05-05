import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function markdownLoaderPlugin() {
  const docsDir = path.resolve(__dirname, '../docs')

  return {
    name: 'markdown-loader',
    resolveId(id: string) {
      if (id === 'virtual:docs-data') return id
    },
    load(id: string) {
      if (id === 'virtual:docs-data') {
        const docs: Record<string, string> = {}
        function walk(dir: string) {
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              walk(full)
            } else if (entry.name.endsWith('.md')) {
              const rel = path.relative(docsDir, full)
              docs[rel] = fs.readFileSync(full, 'utf-8')
            }
          }
        }
        walk(docsDir)
        return `export default ${JSON.stringify(docs)}`
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), markdownLoaderPlugin()],
})

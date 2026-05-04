# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sandybox is a personal knowledge base built with **MkDocs** and the **Material for MkDocs** theme. Content is written in Markdown and organized into topic sections.

## Commands

- `mkdocs serve` — local dev server with live reload (http://127.0.0.1:8000)
- `mkdocs build` — generate static site into `site/`

## Content Structure

All content lives in `docs/` as Markdown files. The navigation tree is **manually defined** in `mkdocs.yml` under `nav:` — new pages must be added there to appear in the site.

Sections: Mobile Development (Android, iOS, Cross-Platform), Programming (Languages, Design Patterns, DSA), Infrastructure (Networking, DevOps, Databases), Science & Universe (Physics, Astronomy), Tools & Productivity, TIL.

## Adding Content

1. Create a `.md` file under the appropriate `docs/` subdirectory
2. Add the file path to the `nav:` section in `mkdocs.yml`

## Content Philosophy

Every article should serve as an **interview crash-course** — concise enough to review in one sitting, thorough enough to answer confidently. Follow this structure:

1. **Brief concept coverage**: Cover the basics clearly and concisely. Use tables, diagrams (mermaid), and code snippets to maximize information density. No filler prose.
2. **Sample use cases**: Where applicable, include real-world scenarios or practical examples that demonstrate when and why a concept matters.
3. **Interview-ready sections**: End articles with a collapsible `??? question` FAQ covering common interview questions and concise answers.
4. **Advanced resources**: Where a topic goes deeper than this crash-course covers, include a `## Further Reading` section at the bottom with hyperlinks to official docs, key blog posts, or conference talks. Use `!!! tip "Further Reading"` admonition format.

### Tone & Style

- **Concise over exhaustive** — just enough to build a mental model and answer interview questions
- **Tables over paragraphs** — use comparison tables whenever contrasting options (e.g., Service vs IntentService)
- **Code snippets should be short and practical** — show the pattern, not the full implementation
- **Mermaid diagrams** for flows, lifecycles, and architecture where they aid understanding
- **No redundant explanations** — assume the reader is a developer, not a beginner

## Markdown Features Available

The site is configured with these extensions — use them in content:

- **Admonitions**: `!!! note`, `!!! warning`, `!!! tip`, etc. (collapsible with `???`)
- **Tabbed content**: `=== "Tab 1"` / `=== "Tab 2"`
- **Code blocks**: fenced with language + line numbers; copy button enabled
- **Inline code highlighting**: `` `#!python print("hi")` ``
- **Attribute lists** and **HTML in Markdown** (`md_in_html`)

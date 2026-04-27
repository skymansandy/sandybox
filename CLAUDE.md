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

## Markdown Features Available

The site is configured with these extensions — use them in content:

- **Admonitions**: `!!! note`, `!!! warning`, `!!! tip`, etc. (collapsible with `???`)
- **Tabbed content**: `=== "Tab 1"` / `=== "Tab 2"`
- **Code blocks**: fenced with language + line numbers; copy button enabled
- **Inline code highlighting**: `` `#!python print("hi")` ``
- **Attribute lists** and **HTML in Markdown** (`md_in_html`)

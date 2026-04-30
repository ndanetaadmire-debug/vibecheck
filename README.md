# VibeCheck

[![CI](https://github.com/ndanetaadmire-debug/vibecheck/actions/workflows/ci.yml/badge.svg)](https://github.com/ndanetaadmire-debug/vibecheck/actions/workflows/ci.yml)
![React](https://img.shields.io/badge/React-19-20232A?logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![XSS](https://img.shields.io/badge/XSS-safe%20by%20construction-0a7)
![Tests](https://img.shields.io/badge/tests-32-blue)

**Mood-based blogging.** Write in Markdown, see a live preview, and VibeCheck reads the mood of your post (joyful, calm, reflective, anxious, low, fired up) so you can browse your own writing by how you felt. Everything stays in your browser.

## The engineering in a small app

### A Markdown renderer where XSS is impossible by construction

Most apps render Markdown to an HTML string and then sanitise it before `innerHTML`. That works until the sanitiser misses a case. VibeCheck never produces HTML:

1. A small parser turns Markdown into an **AST** (headings, paragraphs, emphasis, code, quotes, lists, links, images, rules).
2. React renders the AST as **elements**. Text is always a text node, so `<script>` and `<img onerror>` in a post are displayed as literal text.
3. Links and images are the only way to produce a URL, and URLs pass an **allow-list**: `https:`, `http:` and `mailto:` for links; `https:` only for images; same-site paths. `javascript:` (any case, with tabs, NULs or leading spaces), `data:`, `vbscript:` and protocol-relative `//host` are dropped, **keeping the link text**.
4. External links get `rel="noopener noreferrer nofollow ugc"` and a screen-reader "(opens in a new tab)".

There is no `dangerouslySetInnerHTML` in the codebase. The tests include a table of real XSS payloads.

Parser details that matter in practice: nested emphasis (`**bold *and italic***`), escapes (`\*`), fenced code kept literal, unclosed fences tolerated, balanced parentheses in URLs (Wikipedia links), and heading levels shifted so each page keeps a single `h1`.

### Private, explainable mood detection

A lexicon model with **negation** ("not happy" leans *low* rather than cancelling out) and **intensifiers** ("very", "a bit"), showing which words drove the result. It runs in the browser, so a private draft is never sent to an API, and it's deterministic, so it's testable.

### Resilient local state

Posts and the current draft persist through a validated `usePersistentState` hook that survives full or disabled storage and corrupt JSON (tested). The draft survives a reload; publishing clears it.

### Accessible by default

A proper ARIA tablist for Write / Preview, `aria-pressed` filter buttons, an `aria-live` mood hint, labelled form controls, visible focus rings, and focusable scrollable code blocks.

## Structure

```
src/lib/markdown.ts      parser → AST, URL allow-list, plain-text extraction
src/lib/mood.ts          lexicon mood model, negation, intensifiers, reading time
src/components/Markdown  AST → React elements (no innerHTML)
src/components/App       editor, preview, feed, mood filters
```

```bash
npm ci
npm run dev
npm run ci      # typecheck + 32 tests + production build
```

---

Built by **[Admire T. Ndaneta](https://admire-portfolio.vercel.app)**. MIT licensed.

/**
 * A small Markdown parser that produces an AST, rendered by React (see components/Markdown.tsx).
 *
 * Security model: there is no HTML pass-through at all. Raw "<script>" in a post is just text.
 * Links and images are the only way to produce a URL, and URLs are allow-listed by scheme.
 * Because React escapes text nodes, XSS is impossible by construction rather than by sanitising.
 *
 * Supported: # headings, paragraphs, **bold**, *italic*, `code`, ```fenced code```, > quotes,
 * - / 1. lists, [links](https://…), ![images](https://…), --- rules, hard line breaks.
 */

export type Inline =
  | { type: "text"; value: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "image"; src: string; alt: string }
  | { type: "break" };

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "code"; lang: string; value: string }
  | { type: "quote"; children: Block[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "rule" };

const SAFE_SCHEMES = /^(https?:|mailto:)/i;

/** Returns a safe URL or null. Blocks javascript:, data:, vbscript:, protocol-relative tricks and control chars. */
export function safeUrl(raw: string, kind: "link" | "image" = "link"): string | null {
  const url = raw.trim().replace(/[\u0000-\u001F\u007F\s]/g, "");
  if (!url) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url; // same-site relative path
  if (url.startsWith("#") && kind === "link") return url;
  if (!SAFE_SCHEMES.test(url)) return null;
  if (kind === "image" && !/^https:/i.test(url)) return null; // no mixed content, no mailto images
  return url;
}

export function parse(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i]!)) body.push(lines[i++]!);
      i++; // closing fence (or EOF)
      blocks.push({ type: "code", lang: fence[1] ?? "", value: body.join("\n") });
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.+?)\s*#*$/);
    if (h) {
      blocks.push({ type: "heading", level: h[1]!.length as 1 | 2 | 3, children: parseInline(h[2]!) });
      i++;
      continue;
    }
    if (/^(\*\s*){3,}$|^(-\s*){3,}$/.test(line.trim())) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i]!)) inner.push(lines[i++]!.replace(/^>\s?/, ""));
      blocks.push({ type: "quote", children: parse(inner.join("\n")) });
      continue;
    }
    const listRe = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
    const lm = line.match(listRe);
    if (lm) {
      const ordered = /\d/.test(lm[1]!);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = lines[i]!.match(listRe);
        if (!m || /\d/.test(m[1]!) !== ordered) break;
        items.push(parseInline(m[2]!));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|```|>|\s*([-*+]|\d+[.)])\s)/.test(lines[i]!)) para.push(lines[i++]!);
    blocks.push({ type: "paragraph", children: parseInline(para.join("\n")) });
  }
  return blocks;
}

/** Inline parser: a single left-to-right scan; unmatched markers stay literal text. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ type: "text", value: text });
    text = "";
  };
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);
    let m: RegExpMatchArray | null;
    if (rest.startsWith("\\") && i + 1 < src.length && /[\\`*_[\]()#!>-]/.test(src[i + 1]!)) {
      text += src[i + 1];
      i += 2;
    } else if ((m = rest.match(/^ {2,}\n|^\\\n/))) {
      flush();
      out.push({ type: "break" });
      i += m[0].length;
    } else if ((m = rest.match(/^`([^`\n]+)`/))) {
      flush();
      out.push({ type: "code", value: m[1]! });
      i += m[0].length;
    } else if ((m = rest.match(/^!\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/))) {
      const src2 = safeUrl(m[2]!, "image");
      flush();
      if (src2) out.push({ type: "image", src: src2, alt: m[1]! });
      else out.push({ type: "text", value: m[1]! || "[image removed]" });
      i += m[0].length;
    } else if ((m = rest.match(/^\[([^\]]+)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/))) {
      const href = safeUrl(m[2]!);
      flush();
      if (href) out.push({ type: "link", href, children: parseInline(m[1]!) });
      else out.push(...parseInline(m[1]!)); // unsafe link → keep the words, drop the URL
      i += m[0].length;
    } else if ((m = rest.match(/^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/))) {
      flush();
      out.push({ type: "strong", children: parseInline(m[1]!) });
      i += m[0].length;
    } else if ((m = rest.match(/^[*_](?=\S)([^*_\n]*?\S)[*_]/))) {
      flush();
      out.push({ type: "em", children: parseInline(m[1]!) });
      i += m[0].length;
    } else {
      text += src[i];
      i++;
    }
  }
  flush();
  return out;
}

export function plainText(blocks: Block[]): string {
  const inl = (xs: Inline[]): string =>
    xs.map((x) => (x.type === "text" || x.type === "code" ? x.value : x.type === "image" ? x.alt : x.type === "break" ? " " : "children" in x ? inl(x.children) : "")).join("");
  return blocks
    .map((b) => (b.type === "code" ? b.value : b.type === "rule" ? "" : b.type === "quote" ? plainText(b.children) : b.type === "list" ? b.items.map(inl).join(" ") : inl(b.children)))
    .join("\n");
}

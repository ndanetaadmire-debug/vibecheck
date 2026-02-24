import { Fragment, type ReactNode } from "react";
import { type Block, type Inline, parse } from "../lib/markdown";

/** Renders the AST to React elements. No dangerouslySetInnerHTML anywhere: text is escaped by React. */
export function Markdown({ source }: { source: string }) {
  return <div className="md">{parse(source).map(renderBlock)}</div>;
}

function renderBlock(b: Block, i: number): ReactNode {
  switch (b.type) {
    case "heading": {
      const Tag = (`h${b.level + 1}`) as "h2" | "h3" | "h4"; // post title is the page's h1
      return <Tag key={i}>{b.children.map(renderInline)}</Tag>;
    }
    case "paragraph":
      return <p key={i}>{b.children.map(renderInline)}</p>;
    case "code":
      return (
        <pre key={i} tabIndex={0} aria-label={b.lang ? `${b.lang} code` : "code"}>
          <code data-lang={b.lang || undefined}>{b.value}</code>
        </pre>
      );
    case "quote":
      return <blockquote key={i}>{b.children.map(renderBlock)}</blockquote>;
    case "list": {
      const items = b.items.map((it, j) => <li key={j}>{it.map(renderInline)}</li>);
      return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
    }
    case "rule":
      return <hr key={i} />;
  }
}

function renderInline(n: Inline, i: number): ReactNode {
  switch (n.type) {
    case "text":
      return <Fragment key={i}>{n.value}</Fragment>;
    case "strong":
      return <strong key={i}>{n.children.map(renderInline)}</strong>;
    case "em":
      return <em key={i}>{n.children.map(renderInline)}</em>;
    case "code":
      return <code key={i}>{n.value}</code>;
    case "break":
      return <br key={i} />;
    case "image":
      return <img key={i} src={n.src} alt={n.alt} loading="lazy" referrerPolicy="no-referrer" />;
    case "link": {
      const external = /^https?:/i.test(n.href);
      return (
        <a key={i} href={n.href} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow ugc" } : {})}>
          {n.children.map(renderInline)}
          {external && <span className="sr-only"> (opens in a new tab)</span>}
        </a>
      );
    }
  }
}

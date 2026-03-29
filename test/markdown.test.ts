import { describe, expect, it } from "vitest";
import { parse, parseInline, plainText, safeUrl } from "../src/lib/markdown";

describe("block parsing", () => {
  it("parses headings, paragraphs, lists, quotes, code and rules", () => {
    const ast = parse("# Title\n\nHello *world*\n\n- one\n- two\n\n1. a\n2. b\n\n> quoted **bold**\n\n```ts\nconst x = 1;\n```\n\n---");
    expect(ast.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list", "quote", "code", "rule"]);
    expect(ast[2]).toMatchObject({ ordered: false, items: [[{ type: "text", value: "one" }], [{ type: "text", value: "two" }]] });
    expect(ast[3]).toMatchObject({ ordered: true });
    expect(ast[5]).toEqual({ type: "code", lang: "ts", value: "const x = 1;" });
  });

  it("keeps markdown inside code fences literal", () => {
    expect(parse("```\n**not bold** <b>\n```")[0]).toEqual({ type: "code", lang: "", value: "**not bold** <b>" });
  });

  it("tolerates an unclosed fence", () => {
    expect(parse("```\ncode")[0]).toMatchObject({ type: "code", value: "code" });
  });
});

describe("inline parsing", () => {
  it("nests emphasis and leaves unmatched markers literal", () => {
    expect(parseInline("**bold *and italic***")).toEqual([{ type: "strong", children: [{ type: "text", value: "bold " }, { type: "em", children: [{ type: "text", value: "and italic" }] }] }]);
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "text", value: "2 * 3 = 6" }]);
    expect(parseInline("\\*literal\\*")).toEqual([{ type: "text", value: "*literal*" }]);
  });
});

describe("security: XSS is impossible by construction", () => {
  it.each([
    "javascript:alert(1)", "JaVaScRiPt:alert(1)", " javascript:alert(1)", "java\tscript:alert(1)", "java\u0000script:alert(1)",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==", "vbscript:msgbox(1)", "//evil.example/x",
  ])("rejects %s", (url) => expect(safeUrl(url)).toBeNull());

  it("allows safe links and only https images", () => {
    expect(safeUrl("https://example.com/a?b=1")).toBe("https://example.com/a?b=1");
    expect(safeUrl("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(safeUrl("/posts/1")).toBe("/posts/1");
    expect(safeUrl("http://example.com/x.png", "image")).toBeNull();
  });

  it("drops unsafe URLs but keeps the words", () => {
    expect(parseInline("[click me](javascript:alert(1))")).toEqual([{ type: "text", value: "click me" }]);
    expect(parseInline("![cat](data:image/png;base64,AAA)")).toEqual([{ type: "text", value: "cat" }]);
  });

  it("treats raw HTML as text", () => {
    expect(parse("<img src=x onerror=alert(1)><script>alert(1)</script>")[0]).toEqual({
      type: "paragraph", children: [{ type: "text", value: "<img src=x onerror=alert(1)><script>alert(1)</script>" }],
    });
  });
});

it("extracts plain text for mood detection", () => {
  expect(plainText(parse("# Happy\n\n**so** grateful [link](https://x.y)"))).toBe("Happy\nso grateful link");
});

it("supports balanced parentheses in URLs", () => {
  expect(parseInline("[Mercury](https://en.wikipedia.org/wiki/Mercury_(planet))")).toEqual([
    { type: "link", href: "https://en.wikipedia.org/wiki/Mercury_(planet)", children: [{ type: "text", value: "Mercury" }] },
  ]);
});

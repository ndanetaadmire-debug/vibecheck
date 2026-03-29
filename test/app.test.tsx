import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../src/components/App";
import { Markdown } from "../src/components/Markdown";

describe("Markdown component", () => {
  it("renders safe links with noopener and never executes injected HTML", () => {
    const { container } = render(<Markdown source={"[site](https://example.com) [bad](javascript:alert(1))\n\n<img src=x onerror=alert(1)>"} />);
    const link = screen.getByRole("link", { name: /site/ });
    expect(link).toHaveAttribute("rel", "noopener noreferrer nofollow ugc");
    expect(screen.queryByRole("link", { name: /bad/ })).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toContain("<img src=x onerror=alert(1)>");
  });

  it("shifts heading levels so the page keeps a single h1", () => {
    render(<Markdown source="# Post heading" />);
    expect(screen.getByRole("heading", { level: 2, name: "Post heading" })).toBeInTheDocument();
  });
});

describe("App", () => {
  it("writes, previews, detects mood, publishes, filters and persists", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App now={() => 1_700_000_000_000} />);
    await user.type(screen.getByLabelText("Title"), "Good news");
    await user.type(screen.getByLabelText(/Post/), "I am so **happy** and grateful!");
    expect(screen.getByText(/Detected mood/)).toHaveTextContent("Joyful");
    await user.click(screen.getByRole("tab", { name: "Preview" }));
    expect(within(screen.getByRole("tabpanel")).getByText("happy").tagName).toBe("STRONG");
    await user.click(screen.getByRole("button", { name: "Publish" }));

    const article = screen.getByRole("article", { name: "Good news" });
    expect(article).toHaveTextContent("Joyful · 1 min read");
    expect(screen.getByRole("button", { name: /Joyful/ })).toHaveAttribute("aria-pressed", "false");

    unmount();
    render(<App />);
    expect(screen.getByRole("article", { name: "Good news" })).toBeInTheDocument(); // persisted
    expect(screen.getByLabelText("Title")).toHaveValue(""); // draft cleared after publish
  });

  it("keeps the draft across reloads and disables publish when empty", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
    await user.type(screen.getByLabelText(/Post/), "half-written thought");
    unmount();
    render(<App />);
    expect(screen.getByLabelText(/Post/)).toHaveValue("half-written thought");
  });

  it("survives corrupt storage", () => {
    localStorage.setItem("vibecheck:posts", "{oops");
    render(<App />);
    expect(screen.getByText("No posts yet.")).toBeInTheDocument();
  });
});

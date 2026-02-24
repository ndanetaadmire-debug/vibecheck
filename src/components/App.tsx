import { useMemo, useState } from "react";
import { usePersistentState } from "../hooks/usePersistentState";
import { parse, plainText } from "../lib/markdown";
import { detectMood, type Mood, MOOD_META, readingMinutes } from "../lib/mood";
import { Markdown } from "./Markdown";

export interface Post {
  id: string;
  title: string;
  body: string;
  mood: Mood | "neutral";
  createdAt: number;
}

const isPosts = (v: unknown): v is Post[] => Array.isArray(v) && v.every((p) => typeof p?.id === "string" && typeof p?.body === "string");
const isDraft = (v: unknown): v is { title: string; body: string } => typeof v === "object" && v !== null && typeof (v as { body: unknown }).body === "string";

export function App({ now = Date.now }: { now?: () => number }) {
  const [posts, setPosts] = usePersistentState<Post[]>("vibecheck:posts", () => [], isPosts);
  const [draft, setDraft] = usePersistentState("vibecheck:draft", () => ({ title: "", body: "" }), isDraft);
  const [filter, setFilter] = useState<Mood | "neutral" | "all">("all");
  const [tab, setTab] = useState<"write" | "preview">("write");

  const detected = useMemo(() => detectMood(plainText(parse(draft.body))), [draft.body]);
  const visible = filter === "all" ? posts : posts.filter((p) => p.mood === filter);
  const moodsInUse = [...new Set(posts.map((p) => p.mood))];

  function publish(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.title.trim() || !draft.body.trim()) return;
    setPosts((ps) => [{ id: `p${now()}`, title: draft.title.trim(), body: draft.body, mood: detected.mood, createdAt: now() }, ...ps]);
    setDraft({ title: "", body: "" });
    setTab("write");
  }

  return (
    <div className="app">
      <header>
        <h1>VibeCheck</h1>
        <p>Write how you feel. We'll read the mood, not your data: everything stays in your browser.</p>
      </header>

      <form onSubmit={publish} aria-labelledby="new-post">
        <h2 id="new-post">New post</h2>
        <label htmlFor="title">Title</label>
        <input id="title" value={draft.title} maxLength={120} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />

        <div role="tablist" aria-label="Editor mode">
          {(["write", "preview"] as const).map((t) => (
            <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls={`panel-${t}`} onClick={() => setTab(t)}>
              {t === "write" ? "Write" : "Preview"}
            </button>
          ))}
        </div>
        {tab === "write" ? (
          <div role="tabpanel" id="panel-write" aria-labelledby="tab-write">
            <label htmlFor="body">Post (Markdown supported)</label>
            <textarea id="body" rows={10} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
          </div>
        ) : (
          <div role="tabpanel" id="panel-preview" aria-labelledby="tab-preview" className="preview">
            <Markdown source={draft.body || "_Nothing to preview yet._"} />
          </div>
        )}

        <p aria-live="polite" className="mood-hint">
          Detected mood: <strong>{MOOD_META[detected.mood].emoji} {MOOD_META[detected.mood].label}</strong>
          {detected.drivers.length > 0 && <span> (from: {detected.drivers.join(", ")})</span>}
        </p>
        <button type="submit" disabled={!draft.title.trim() || !draft.body.trim()}>Publish</button>
      </form>

      <section aria-labelledby="feed">
        <h2 id="feed">Your posts</h2>
        {posts.length > 0 && (
          <div role="group" aria-label="Filter by mood" className="filters">
            {(["all", ...moodsInUse] as const).map((m) => (
              <button key={m} type="button" aria-pressed={filter === m} onClick={() => setFilter(m)}>
                {m === "all" ? "All" : `${MOOD_META[m].emoji} ${MOOD_META[m].label}`}
              </button>
            ))}
          </div>
        )}
        {visible.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          visible.map((p) => (
            <article key={p.id} aria-labelledby={`${p.id}-t`}>
              <h3 id={`${p.id}-t`}>{p.title}</h3>
              <p className="meta">
                {MOOD_META[p.mood].emoji} {MOOD_META[p.mood].label} · {readingMinutes(p.body)} min read
              </p>
              <Markdown source={p.body} />
            </article>
          ))
        )}
      </section>
    </div>
  );
}

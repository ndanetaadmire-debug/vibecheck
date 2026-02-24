/**
 * Lexicon-based mood detection with negation and intensifiers.
 * Deterministic and explainable (shows which words drove the result), runs in the browser,
 * and never sends a private draft to a third-party API.
 */
export type Mood = "joyful" | "calm" | "reflective" | "anxious" | "sad" | "angry";

const LEXICON: Record<string, Partial<Record<Mood, number>>> = {
  happy: { joyful: 2 }, joy: { joyful: 2 }, excited: { joyful: 2 }, grateful: { joyful: 1, calm: 1 }, love: { joyful: 2 },
  amazing: { joyful: 2 }, proud: { joyful: 2 }, celebrate: { joyful: 2 }, fun: { joyful: 1 }, great: { joyful: 1 },
  calm: { calm: 2 }, peaceful: { calm: 2 }, relaxed: { calm: 2 }, rest: { calm: 1 }, quiet: { calm: 1 }, gentle: { calm: 1 }, slow: { calm: 1 },
  think: { reflective: 1 }, wonder: { reflective: 2 }, remember: { reflective: 2 }, learned: { reflective: 2 }, lesson: { reflective: 2 },
  realise: { reflective: 2 }, realize: { reflective: 2 }, perspective: { reflective: 2 }, growth: { reflective: 1 },
  worried: { anxious: 2 }, anxious: { anxious: 2 }, nervous: { anxious: 2 }, stress: { anxious: 2 }, stressed: { anxious: 2 },
  overwhelmed: { anxious: 2 }, deadline: { anxious: 1 }, afraid: { anxious: 2 }, uncertain: { anxious: 1 },
  sad: { sad: 2 }, lonely: { sad: 2 }, miss: { sad: 1 }, tired: { sad: 1 }, cry: { sad: 2 }, lost: { sad: 1 }, grief: { sad: 2 },
  angry: { angry: 2 }, furious: { angry: 3 }, annoyed: { angry: 1 }, unfair: { angry: 2 }, hate: { angry: 2 }, frustrated: { angry: 2 },
};
const NEGATORS = new Set(["not", "never", "no", "hardly", "isn't", "wasn't", "don't", "didn't", "can't", "won't", "aren't"]);
const INTENSIFIERS: Record<string, number> = { very: 1.5, really: 1.5, so: 1.3, extremely: 2, incredibly: 2, slightly: 0.5, a_bit: 0.5 };
const OPPOSITE: Partial<Record<Mood, Mood>> = { joyful: "sad", calm: "anxious", anxious: "calm", sad: "joyful", angry: "calm" };

export interface MoodResult {
  mood: Mood | "neutral";
  scores: Record<Mood, number>;
  drivers: string[];
}

export function detectMood(text: string): MoodResult {
  const words = text.toLowerCase().replace(/a bit/g, "a_bit").match(/[a-z_']+/g) ?? [];
  const scores: Record<Mood, number> = { joyful: 0, calm: 0, reflective: 0, anxious: 0, sad: 0, angry: 0 };
  const drivers: string[] = [];
  words.forEach((w, i) => {
    const entry = LEXICON[w];
    if (!entry) return;
    const window = words.slice(Math.max(0, i - 3), i);
    const negated = window.some((x) => NEGATORS.has(x));
    const boost = window.reduce((acc, x) => acc * (INTENSIFIERS[x] ?? 1), 1);
    for (const [mood, weight] of Object.entries(entry) as Array<[Mood, number]>) {
      // "not happy" moves weight toward the opposite mood instead of simply cancelling it.
      const target = negated ? OPPOSITE[mood] : mood;
      if (target) scores[target] += weight * boost * (negated ? 0.7 : 1);
    }
    drivers.push(negated ? `not ${w}` : w);
  });
  const [top, topScore] = (Object.entries(scores) as Array<[Mood, number]>).sort((a, b) => b[1] - a[1])[0]!;
  return { mood: topScore >= 1.5 ? top : "neutral", scores, drivers: [...new Set(drivers)].slice(0, 6) };
}

export const MOOD_META: Record<Mood | "neutral", { emoji: string; label: string }> = {
  joyful: { emoji: "☀️", label: "Joyful" }, calm: { emoji: "🌿", label: "Calm" }, reflective: { emoji: "🌙", label: "Reflective" },
  anxious: { emoji: "🌀", label: "Anxious" }, sad: { emoji: "🌧️", label: "Low" }, angry: { emoji: "🔥", label: "Fired up" },
  neutral: { emoji: "⚪", label: "Neutral" },
};

export function readingMinutes(text: string): number {
  return Math.max(1, Math.round((text.trim().split(/\s+/).filter(Boolean).length) / 220));
}

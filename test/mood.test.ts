import { describe, expect, it } from "vitest";
import { detectMood, readingMinutes } from "../src/lib/mood";

describe("mood detection", () => {
  it.each([
    ["I am so happy and grateful today, we celebrate!", "joyful"],
    ["A slow, quiet, peaceful Sunday. I feel relaxed.", "calm"],
    ["I keep thinking about the lesson I learned and what I realise now.", "reflective"],
    ["The deadline has me stressed and overwhelmed, I'm worried.", "anxious"],
    ["I miss home and feel lonely and tired.", "sad"],
    ["This is unfair and I am furious and frustrated.", "angry"],
    ["We had lunch and then went to the shops.", "neutral"],
  ])("%s → %s", (text, mood) => expect(detectMood(text).mood).toBe(mood));

  it("handles negation by shifting toward the opposite mood", () => {
    const r = detectMood("I am not happy, really not happy at all.");
    expect(r.mood).toBe("sad");
    expect(r.drivers).toContain("not happy");
  });

  it("intensifiers raise the score", () => {
    expect(detectMood("very happy").scores.joyful).toBeGreaterThan(detectMood("happy").scores.joyful);
    expect(detectMood("a bit annoyed").scores.angry).toBeLessThan(detectMood("annoyed").scores.angry);
  });

  it("reading time", () => {
    expect(readingMinutes("word ".repeat(660))).toBe(3);
    expect(readingMinutes("hi")).toBe(1);
  });
});

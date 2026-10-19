import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  applyAnswer,
  buildPool,
  cardStatus,
  nextReview,
  parseFlashcards,
  pickNext,
  resetLessons,
  summarize,
  validateState,
} from "../cards.js";

const SAMPLE = `# Flashcards

Format example that must not become a card:
Q: <question>
A: <answer>

## Module 0

### 0.1 Terminal

\`\`\`
Q: What does 2>&1 do?
A: Sends stderr to wherever stdout points.
[ ] Q: Exit code for success?
A: 0
\`\`\`

## Module 1

### 1.3 Collections

\`\`\`
Q: Is a tuple mutable?
A: No.
\`\`\`
`;

const TODAY = new Date(2026, 9, 19);

describe("parseFlashcards", () => {
  it("reads lessons and cards and skips the format example before the first lesson", () => {
    const { cards, lessons, warnings } = parseFlashcards(SAMPLE);

    assert.equal(cards.length, 3);
    assert.deepEqual(
      lessons.map((lesson) => [lesson.id, lesson.title, lesson.module]),
      [
        ["0.1", "Terminal", "0"],
        ["1.3", "Collections", "1"],
      ],
    );
    assert.deepEqual(warnings, []);
  });

  it("ignores the [ ] mark so the card keeps its id", () => {
    const marked = parseFlashcards(SAMPLE).cards[1];
    const unmarked = parseFlashcards(SAMPLE.replace("[ ] Q:", "Q:")).cards[1];

    assert.equal(marked.question, "Exit code for success?");
    assert.equal(marked.id, unmarked.id);
  });

  it("gives a new id when the question text changes and keeps ids unique", () => {
    const before = parseFlashcards(SAMPLE).cards[0];
    const after = parseFlashcards(SAMPLE.replace("2>&1 do?", "2>&1 do exactly?")).cards[0];

    assert.notEqual(before.id, after.id);
    const ids = parseFlashcards(SAMPLE).cards.map((card) => card.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it("warns about a question without an answer and an answer without a question", () => {
    const broken = SAMPLE.replace("A: No.\n", "").replace(
      "Q: What does 2>&1 do?\n",
      "",
    );
    const { cards, warnings } = parseFlashcards(broken);

    assert.equal(cards.length, 1);
    assert.equal(warnings.length, 2);
    assert.match(warnings.join("\n"), /bez "Q:"/);
    assert.match(warnings.join("\n"), /bez "A:"/);
  });

  it("parses the real course/flashcards.md without warnings", () => {
    const markdown = readFileSync(new URL("../flashcards.md", import.meta.url), "utf8");
    const questionLines = markdown.split("\n").filter((line) => /^\s*(\[.?\]\s*)?Q:/.test(line));
    const { cards, warnings } = parseFlashcards(markdown);

    assert.deepEqual(warnings, []);
    // One "Q: <question>" line is the format example in the file header.
    assert.equal(cards.length, questionLines.length - 1);
  });
});

describe("scheduling", () => {
  it("moves a known card to level 1 for 7 days, then level 2 for 30 days", () => {
    const first = applyAnswer(undefined, true, TODAY);
    assert.deepEqual(first, { level: 1, due: "2026-10-26", wrong: 0 });
    assert.equal(cardStatus(first, new Date(2026, 9, 25)), "scheduled");
    assert.equal(cardStatus(first, new Date(2026, 9, 26)), "due");

    const second = applyAnswer(first, true, new Date(2026, 9, 26));
    assert.deepEqual(second, { level: 2, due: "2026-11-25", wrong: 0 });

    const third = applyAnswer(second, true, new Date(2026, 10, 25));
    assert.deepEqual(third, { level: 2, due: "2026-12-25", wrong: 0 });
  });

  it("sends an unknown card back to the pool and counts the mistake", () => {
    const known = { level: 2, due: "2026-11-25", wrong: 1 };

    const forgotten = applyAnswer(known, false, TODAY);

    assert.deepEqual(forgotten, { level: 0, due: null, wrong: 2 });
    assert.equal(cardStatus(forgotten, TODAY), "learning");
  });

  it("treats a missing record as a new card", () => {
    assert.equal(cardStatus(undefined, TODAY), "new");
  });
});

describe("session pool", () => {
  const { cards } = parseFlashcards(SAMPLE);
  const [redirect, exitCode, tuple] = cards;
  const progress = {
    [redirect.id]: { level: 1, due: "2026-10-26", wrong: 0 },
    [exitCode.id]: { level: 0, due: null, wrong: 3 },
  };

  it("contains only selected lessons and skips cards scheduled for later", () => {
    const pool = buildPool(cards, progress, new Set(["0.1"]), TODAY);

    assert.deepEqual(pool, [exitCode.id]);
  });

  it("contains every selected card in practice mode", () => {
    const pool = buildPool(cards, progress, new Set(["0.1", "1.3"]), TODAY, true);

    assert.deepEqual(pool, [redirect.id, exitCode.id, tuple.id]);
  });

  it("does not repeat the previous card when there is another one", () => {
    const pool = ["a", "b"];

    for (const value of [0, 0.5, 0.99]) {
      assert.equal(pickNext(pool, "a", () => value), "b");
    }
    assert.equal(pickNext(["a"], "a"), "a");
    assert.equal(pickNext([], "a"), null);
  });

  it("summarizes cards to review and finds the next review date", () => {
    assert.deepEqual(summarize(cards, progress, TODAY), { total: 3, toReview: 2 });
    assert.deepEqual(nextReview(cards, progress, TODAY), { date: "2026-10-26", count: 1 });
    assert.equal(nextReview([tuple], progress, TODAY), null);
  });

  it("resets only cards from the chosen lessons", () => {
    const withTuple = { ...progress, [tuple.id]: { level: 1, due: "2026-10-26", wrong: 0 } };

    const reset = resetLessons(withTuple, cards, new Set(["0.1"]));

    assert.deepEqual(Object.keys(reset), [tuple.id]);
  });
});

describe("validateState", () => {
  it("accepts a valid progress file and fills in a missing selection", () => {
    const state = validateState({ version: 1, cards: { "0.1:abc": { level: 0, due: null, wrong: 1 } } });

    assert.deepEqual(state.selection, []);
  });

  it("rejects files that are not progress exports", () => {
    assert.throws(() => validateState(null), /zła wersja/);
    assert.throws(() => validateState({ version: 2, cards: {} }), /zła wersja/);
    assert.throws(() => validateState({ version: 1, cards: [] }), /"cards"/);
    assert.throws(
      () => validateState({ version: 1, cards: { x: { level: 1, due: "jutro", wrong: 0 } } }),
      /Uszkodzony/,
    );
    assert.throws(() => validateState({ version: 1, cards: {}, selection: "0.1" }), /"selection"/);
  });
});

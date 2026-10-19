// Pure logic: parsing flashcards.md, scheduling reviews, building the session pool.
// No DOM and no localStorage here, so the same file runs in the browser and in `node --test`.

export const STORAGE_VERSION = 1;
export const REVIEW_INTERVAL_DAYS = [7, 30];

const LESSON_HEADING = /^###\s+(\d+\.[\w.]+)\s+(.+)$/;
const QUESTION_LINE = /^(?:\[[ xX]?\]\s*)?Q:\s*(.+)$/;
const ANSWER_LINE = /^A:\s*(.+)$/;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function hashText(text) {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

function normalize(text) {
  return text.replace(/\s+/g, " ").trim();
}

export function parseFlashcards(markdown) {
  const cards = [];
  const lessons = [];
  const warnings = [];
  const seenIds = new Set();
  let lesson = null;
  let pending = null;

  const dropPendingQuestion = () => {
    if (pending) {
      warnings.push(`Linia ${pending.line}: pytanie bez "A:" w lekcji ${pending.lessonId}.`);
    }
    pending = null;
  };

  markdown.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;

    const heading = LESSON_HEADING.exec(line);
    if (heading) {
      dropPendingQuestion();
      const [, id, title] = heading;
      lesson = { id, title: title.trim(), module: id.split(".")[0] };
      return;
    }
    if (!lesson) {
      return;
    }

    const question = QUESTION_LINE.exec(line);
    if (question) {
      dropPendingQuestion();
      pending = { question: normalize(question[1]), line: lineNumber, lessonId: lesson.id };
      return;
    }

    const answer = ANSWER_LINE.exec(line);
    if (!answer) {
      return;
    }
    if (!pending) {
      warnings.push(`Linia ${lineNumber}: odpowiedź bez "Q:" w lekcji ${lesson.id}.`);
      return;
    }

    const id = `${lesson.id}:${hashText(pending.question)}`;
    if (seenIds.has(id)) {
      warnings.push(`Linia ${pending.line}: powtórzone pytanie w lekcji ${lesson.id}, pomijam.`);
    } else {
      seenIds.add(id);
      if (!lessons.some((known) => known.id === lesson.id)) {
        lessons.push(lesson);
      }
      cards.push({
        id,
        module: lesson.module,
        lesson: lesson.id,
        lessonTitle: lesson.title,
        question: pending.question,
        answer: normalize(answer[1]),
      });
    }
    pending = null;
  });
  dropPendingQuestion();

  return { cards, lessons, warnings };
}

export function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

// "new": never answered; "learning": last answer was "Nie znam";
// "due": known, review date reached; "scheduled": known, review date in the future.
export function cardStatus(record, today) {
  if (!record) {
    return "new";
  }
  if (record.level === 0) {
    return "learning";
  }
  return record.due <= dateKey(today) ? "due" : "scheduled";
}

export function applyAnswer(record, known, today) {
  const wrong = record?.wrong ?? 0;
  if (!known) {
    return { level: 0, due: null, wrong: wrong + 1 };
  }
  const level = Math.min((record?.level ?? 0) + 1, REVIEW_INTERVAL_DAYS.length);
  const due = dateKey(addDays(today, REVIEW_INTERVAL_DAYS[level - 1]));
  return { level, due, wrong };
}

export function buildPool(cards, progress, selectedLessons, today, practice = false) {
  return cards
    .filter((card) => selectedLessons.has(card.lesson))
    .filter((card) => practice || cardStatus(progress[card.id], today) !== "scheduled")
    .map((card) => card.id);
}

export function pickNext(pool, previousId, random = Math.random) {
  if (pool.length === 0) {
    return null;
  }
  const candidates = pool.length > 1 ? pool.filter((id) => id !== previousId) : pool;
  return candidates[Math.floor(random() * candidates.length)];
}

export function summarize(cards, progress, today) {
  let toReview = 0;
  for (const card of cards) {
    if (cardStatus(progress[card.id], today) !== "scheduled") {
      toReview += 1;
    }
  }
  return { total: cards.length, toReview };
}

export function nextReview(cards, progress, today) {
  let date = null;
  let count = 0;
  for (const card of cards) {
    const record = progress[card.id];
    if (cardStatus(record, today) !== "scheduled") {
      continue;
    }
    if (date === null || record.due < date) {
      date = record.due;
      count = 1;
    } else if (record.due === date) {
      count += 1;
    }
  }
  return date === null ? null : { date, count };
}

export function resetLessons(progress, cards, lessonIds) {
  const removed = new Set(
    cards.filter((card) => lessonIds.has(card.lesson)).map((card) => card.id),
  );
  return Object.fromEntries(Object.entries(progress).filter(([id]) => !removed.has(id)));
}

function isValidRecord(record) {
  return (
    record !== null &&
    typeof record === "object" &&
    Number.isInteger(record.level) &&
    record.level >= 0 &&
    record.level <= REVIEW_INTERVAL_DAYS.length &&
    (record.level === 0 ? record.due === null : DATE_KEY.test(record.due)) &&
    Number.isInteger(record.wrong) &&
    record.wrong >= 0
  );
}

export function validateState(data) {
  if (data === null || typeof data !== "object" || data.version !== STORAGE_VERSION) {
    throw new Error("To nie jest plik postępu tej aplikacji (zła wersja lub format).");
  }
  if (data.cards === null || typeof data.cards !== "object" || Array.isArray(data.cards)) {
    throw new Error('Brak sekcji "cards" w pliku postępu.');
  }
  for (const [id, record] of Object.entries(data.cards)) {
    if (!isValidRecord(record)) {
      throw new Error(`Uszkodzony wpis dla karty ${id}.`);
    }
  }
  const selection = data.selection ?? [];
  if (!Array.isArray(selection) || !selection.every((id) => typeof id === "string")) {
    throw new Error('Pole "selection" musi być listą lekcji.');
  }
  return { version: STORAGE_VERSION, cards: data.cards, selection };
}

import {
  applyAnswer,
  buildPool,
  dateKey,
  nextReview,
  parseFlashcards,
  pickNext,
  resetLessons,
  STORAGE_VERSION,
  summarize,
  validateState,
} from "./cards.js";

const STATE_KEY = "sdet-flashcards:state";
const MARKDOWN_KEY = "sdet-flashcards:markdown";
// A tap on "Pokaż odpowiedź" must not land on "Znam", which appears in the same place.
const ANSWER_GUARD_MS = 400;
const PROPERTIES = new Set(["checked", "indeterminate"]);

const app = document.getElementById("app");
const expandedModules = new Set();

let deck = { cards: [], lessons: [], warnings: [], offline: false };
let cardsById = new Map();
let cardsByLesson = new Map();
let state = loadState();
let session = null;
let saveFailed = false;

function emptyState() {
  return { version: STORAGE_VERSION, cards: {}, selection: [] };
}

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) {
    return emptyState();
  }
  try {
    return validateState(JSON.parse(raw));
  } catch (error) {
    localStorage.setItem(`${STATE_KEY}:unreadable`, raw);
    console.warn("Saved progress is unreadable; a copy is kept under :unreadable.", error);
    return emptyState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (error) {
    if (!saveFailed) {
      saveFailed = true;
      alert("Nie mogę zapisać postępu w tej przeglądarce (tryb prywatny?). Odpowiedzi przepadną po zamknięciu strony.");
    }
  }
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") {
      node.className = value;
    } else if (key.startsWith("on")) {
      node.addEventListener(key.slice(2), value);
    } else if (PROPERTIES.has(key)) {
      node[key] = value;
    } else if (value === true) {
      node.setAttribute(key, "");
    } else if (value !== false && value != null) {
      node.setAttribute(key, value);
    }
  }
  node.append(...children.filter((child) => child != null));
  return node;
}

function render(...nodes) {
  app.replaceChildren(...nodes.filter((node) => node != null));
}

function richText(text) {
  return text
    .split(/(`[^`]+`)/)
    .filter(Boolean)
    .map((part) => (part.startsWith("`") && part.endsWith("`") ? el("code", {}, part.slice(1, -1)) : part));
}

function groupByModule(lessons) {
  const modules = new Map();
  for (const lesson of lessons) {
    if (!modules.has(lesson.module)) {
      modules.set(lesson.module, []);
    }
    modules.get(lesson.module).push(lesson);
  }
  return modules;
}

function cardsIn(lessonIds) {
  return [...lessonIds].flatMap((id) => cardsByLesson.get(id) ?? []);
}

function selectedLessons() {
  return new Set(state.selection.filter((id) => cardsByLesson.has(id)));
}

function setLessonsSelected(lessonIds, selected) {
  const current = new Set(state.selection);
  for (const id of lessonIds) {
    if (selected) {
      current.add(id);
    } else {
      current.delete(id);
    }
  }
  state.selection = [...current];
  saveState();
  renderStart();
}

function describeReview(review, now) {
  const [year, month, day] = review.date.split("-").map(Number);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((new Date(year, month - 1, day) - startOfToday) / 86_400_000);
  const when = days <= 1 ? "jutro" : `za ${days} dni`;
  return `${when} (${day}.${String(month).padStart(2, "0")}), kart: ${review.count}`;
}

function renderCount(cards, now) {
  const { toReview, total } = summarize(cards, state.cards, now);
  return el("span", { class: "count" }, el("strong", {}, String(toReview)), ` / ${total}`);
}

// Start screen

function renderStart() {
  session = null;
  const scrollY = window.scrollY;
  const now = new Date();
  const selected = selectedLessons();
  const selectedCards = cardsIn(selected);
  const all = summarize(deck.cards, state.cards, now);
  const allSelected = selected.size === deck.lessons.length;

  render(
    el("h1", {}, "SDET flashcards"),
    el("p", { class: "muted small" }, `Do powtórki dziś: ${all.toReview} z ${all.total} kart`),
    deck.offline ? el("div", { class: "banner" }, "Brak połączenia: pokazuję karty z ostatniego pobrania.") : null,
    deck.warnings.length > 0
      ? el(
          "details",
          { class: "banner" },
          el("summary", {}, `Problemy w flashcards.md: ${deck.warnings.length}`),
          el("ul", {}, ...deck.warnings.map((warning) => el("li", {}, warning))),
        )
      : null,
    el(
      "div",
      { class: "toolbar" },
      el("span", { class: "muted small" }, "do powtórki / wszystkie"),
      el(
        "button",
        {
          class: "link-button",
          onclick: () => setLessonsSelected(deck.lessons.map((lesson) => lesson.id), !allSelected),
        },
        allSelected ? "Odznacz wszystko" : "Zaznacz wszystko",
      ),
    ),
    renderTree(selected, now),
    renderActions(selected, selectedCards, now),
    renderFooter(),
  );
  window.scrollTo(0, scrollY);
}

function renderTree(selected, now) {
  const tree = el("div", { class: "tree" });
  for (const [module, lessons] of groupByModule(deck.lessons)) {
    const ids = lessons.map((lesson) => lesson.id);
    const chosen = ids.filter((id) => selected.has(id)).length;
    const expanded = expandedModules.has(module);
    const toggleExpanded = () => {
      if (expanded) {
        expandedModules.delete(module);
      } else {
        expandedModules.add(module);
      }
      renderStart();
    };

    tree.append(
      el(
        "div",
        { class: "row module" },
        el(
          "label",
          {},
          el("input", {
            type: "checkbox",
            checked: chosen === ids.length,
            indeterminate: chosen > 0 && chosen < ids.length,
            onchange: (event) => setLessonsSelected(ids, event.target.checked),
          }),
          el("span", { class: "name" }, `Module ${module}`),
        ),
        renderCount(cardsIn(ids), now),
        el(
          "button",
          {
            class: "toggle",
            "aria-expanded": String(expanded),
            "aria-label": `${expanded ? "Zwiń" : "Rozwiń"} moduł ${module}`,
            onclick: toggleExpanded,
          },
          expanded ? "▾" : "▸",
        ),
      ),
    );

    if (!expanded) {
      continue;
    }
    for (const lesson of lessons) {
      tree.append(
        el(
          "div",
          { class: "row lesson" },
          el(
            "label",
            {},
            el("input", {
              type: "checkbox",
              checked: selected.has(lesson.id),
              onchange: (event) => setLessonsSelected([lesson.id], event.target.checked),
            }),
            el("span", { class: "name" }, `${lesson.id} ${lesson.title}`),
          ),
          renderCount(cardsByLesson.get(lesson.id), now),
        ),
      );
    }
  }
  return tree;
}

function renderActions(selected, selectedCards, now) {
  const { toReview, total } = summarize(selectedCards, state.cards, now);
  const nothingSelected = selected.size === 0;
  let hint = null;
  if (nothingSelected) {
    hint = "Zaznacz moduł albo lekcje powyżej.";
  } else if (toReview === 0) {
    const review = nextReview(selectedCards, state.cards, now);
    hint = `Nic do powtórki w zaznaczonych lekcjach. Najbliższa powtórka: ${describeReview(review, now)}.`;
  }

  return el(
    "div",
    { class: "actions" },
    el(
      "button",
      { class: "button primary", disabled: toReview === 0, onclick: () => startSession(false) },
      `Start (${toReview})`,
    ),
    hint ? el("p", { class: "hint muted" }, hint) : null,
    el(
      "button",
      { class: "button", disabled: nothingSelected, onclick: () => startSession(true) },
      `Trening bez zapisu (${total})`,
    ),
    el(
      "button",
      { class: "button danger", disabled: nothingSelected, onclick: () => resetSelected(selected, selectedCards) },
      "Reset zaznaczonych",
    ),
  );
}

function renderFooter() {
  const fileInput = el("input", {
    type: "file",
    accept: "application/json,.json",
    hidden: true,
    onchange: (event) => importProgress(event.target.files[0]),
  });
  return el(
    "div",
    { class: "footer" },
    el("button", { class: "link-button", onclick: exportProgress }, "Eksportuj postęp"),
    el("button", { class: "link-button", onclick: () => fileInput.click() }, "Importuj postęp"),
    fileInput,
    el("p", { class: "hint muted small" }, "Postęp jest zapisany tylko na tym urządzeniu."),
  );
}

function resetSelected(selected, selectedCards) {
  const question = `Zresetować postęp w zaznaczonych lekcjach (lekcji: ${selected.size}, kart: ${selectedCards.length})? Tego nie da się cofnąć.`;
  if (!confirm(question)) {
    return;
  }
  state.cards = resetLessons(state.cards, deck.cards, selected);
  saveState();
  renderStart();
}

async function exportProgress() {
  const fileName = `sdet-flashcards-progress-${dateKey(new Date())}.json`;
  const file = new File([JSON.stringify(state, null, 2)], fileName, { type: "application/json" });
  const isTouchDevice = window.matchMedia("(pointer: coarse)").matches;

  if (isTouchDevice && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (error) {
      if (error.name === "AbortError") {
        return;
      }
    }
  }
  const url = URL.createObjectURL(file);
  const link = el("a", { href: url, download: fileName });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importProgress(file) {
  if (!file) {
    return;
  }
  try {
    const imported = validateState(JSON.parse(await file.text()));
    const count = Object.keys(imported.cards).length;
    if (!confirm(`Zastąpić obecny postęp danymi z pliku (kart z historią: ${count})?`)) {
      return;
    }
    state = imported;
    saveState();
    renderStart();
  } catch (error) {
    alert(`Nie udało się wczytać pliku: ${error.message}`);
  }
}

// Session

function startSession(practice) {
  const pool = buildPool(deck.cards, state.cards, selectedLessons(), new Date(), practice);
  if (pool.length === 0) {
    return;
  }
  session = { practice, pool, currentId: null, revealed: false, revealedAt: 0, known: 0, unknown: 0 };
  window.scrollTo(0, 0);
  showNextCard();
}

function showNextCard() {
  session.currentId = pickNext(session.pool, session.currentId);
  session.revealed = false;
  if (session.currentId) {
    renderCard();
  } else {
    renderDone(true);
  }
}

function reveal() {
  if (session && !session.revealed) {
    session.revealed = true;
    session.revealedAt = performance.now();
    renderCard();
  }
}

function answer(known) {
  if (!session?.revealed || performance.now() - session.revealedAt < ANSWER_GUARD_MS) {
    return;
  }
  const id = session.currentId;
  if (!session.practice) {
    state.cards[id] = applyAnswer(state.cards[id], known, new Date());
    saveState();
  }
  if (known) {
    session.known += 1;
    session.pool = session.pool.filter((poolId) => poolId !== id);
  } else {
    session.unknown += 1;
  }
  showNextCard();
}

function renderCard() {
  const card = cardsById.get(session.currentId);
  const bottom = session.revealed
    ? el(
        "div",
        { class: "bottom answer-buttons" },
        el("button", { class: "button unknown", onclick: () => answer(false) }, "Nie znam"),
        el("button", { class: "button known", onclick: () => answer(true) }, "Znam"),
      )
    : el("div", { class: "bottom" }, el("button", { class: "button primary", onclick: reveal }, "Pokaż odpowiedź"));

  render(
    el(
      "div",
      { class: "card-view" },
      el(
        "div",
        { class: "topbar" },
        el("span", { class: "lesson-label" }, `${card.lesson} ${card.lessonTitle}`),
        el("span", { class: "count" }, `Pozostało: ${session.pool.length}`),
        el("button", { class: "close", "aria-label": "Zakończ sesję", onclick: () => renderDone(false) }, "✕"),
      ),
      session.practice ? el("span", { class: "badge" }, "Trening, bez zapisu") : null,
      el(
        "div",
        { class: "card", onclick: reveal },
        el("p", { class: "question" }, ...richText(card.question)),
        session.revealed
          ? el("p", { class: "answer" }, ...richText(card.answer))
          : el("p", { class: "tap-hint muted" }, "Odpowiedz w myślach, potem stuknij."),
      ),
      bottom,
    ),
  );
}

function renderDone(finished) {
  const { practice, known, unknown } = session;
  session = null;
  const now = new Date();
  const review = practice ? null : nextReview(cardsIn(selectedLessons()), state.cards, now);

  render(
    el("h2", {}, finished ? "Pula skończona" : "Sesja przerwana"),
    el(
      "p",
      { class: "muted" },
      practice ? "Tryb treningu: postęp nie został zmieniony." : "Każda odpowiedź jest już zapisana.",
    ),
    el(
      "div",
      { class: "stats" },
      el("div", { class: "stat known" }, el("span", { class: "value" }, String(known)), "Znam"),
      el("div", { class: "stat unknown" }, el("span", { class: "value" }, String(unknown)), "Nie znam"),
    ),
    review ? el("p", {}, `Najbliższa powtórka: ${describeReview(review, now)}.`) : null,
    el("button", { class: "button primary", onclick: () => renderStart() }, "Wróć do listy"),
  );
}

document.addEventListener("keydown", (event) => {
  if (!session) {
    return;
  }
  if (event.key === "Escape") {
    renderDone(false);
  } else if (!session.revealed && (event.key === " " || event.key === "Enter")) {
    event.preventDefault();
    reveal();
  } else if (session.revealed && (event.key === "ArrowLeft" || event.key === "1")) {
    answer(false);
  } else if (session.revealed && (event.key === "ArrowRight" || event.key === "2")) {
    answer(true);
  }
});

// Loading

async function loadMarkdown() {
  try {
    const response = await fetch("flashcards.md", { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const text = await response.text();
    try {
      localStorage.setItem(MARKDOWN_KEY, text);
    } catch {
      // Offline copy is a convenience; the app works without it.
    }
    return { text, offline: false };
  } catch (error) {
    const cached = localStorage.getItem(MARKDOWN_KEY);
    if (cached) {
      return { text: cached, offline: true };
    }
    throw error;
  }
}

async function loadDeck() {
  const { text, offline } = await loadMarkdown();
  deck = { ...parseFlashcards(text), offline };
  cardsById = new Map(deck.cards.map((card) => [card.id, card]));
  cardsByLesson = new Map(deck.lessons.map((lesson) => [lesson.id, []]));
  for (const card of deck.cards) {
    cardsByLesson.get(card.lesson).push(card);
  }
}

async function init() {
  render(el("p", { class: "muted" }, "Ładowanie kart…"));
  try {
    await loadDeck();
    renderStart();
  } catch (error) {
    render(el("p", { class: "banner" }, `Nie udało się wczytać flashcards.md: ${error.message}`));
  }
}

// A home-screen app has no reload button, so pick up new cards when it comes back to the foreground.
document.addEventListener("visibilitychange", async () => {
  if (document.visibilityState !== "visible" || session) {
    return;
  }
  try {
    await loadDeck();
  } catch {
    return;
  }
  if (!session) {
    renderStart();
  }
});

init();

console.log("✅ script.js geladen");

// ============================
// 1) DATA: plak hier jouw lijst
// ============================
// Voorbeeld-structuur (zoals jij al gebruikt):
// { name: "Agrimonie", href: "thee/agrimonie.html", letter: "a", tags: ["slaap", "rust"] }

const DATA = [
  // <-- PLAK HIER JOUW VOLLEDIGE LIJST (die je al hebt)
];

// ============================
// 2) Helpers
// ============================
function normalize(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // haalt accenten weg
}

function uniqueByHref(items) {
  const seen = new Set();
  return items.filter((x) => {
    if (!x || !x.href) return false;
    if (seen.has(x.href)) return false;
    seen.add(x.href);
    return true;
  });
}

// ============================
// 3) DOM ophalen
// ============================
document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector(".search-input"); // jouw input heeft class="search-input"
  const clearBtn = document.querySelector("#clearBtn");
  const resultsEl = document.querySelector("#results");
  const noResultsEl = document.querySelector("#noResults");
  const countEl = document.querySelector("#count"); // als je die hebt, anders ok

  const chips = Array.from(document.querySelectorAll(".chip"));
  const azBtns = Array.from(document.querySelectorAll(".az-btn"));

  if (!resultsEl) {
    console.warn("⚠️ Ik vind #results niet. Controleer of je <div id='results'> hebt.");
    return;
  }

  // ============================
  // 4) State
  // ============================
  const state = {
    q: "",
    tag: "",     // chip filter (bv "slaap")
    letter: "",  // alfabet filter (bv "a")
  };

  // ============================
  // 5) Render + Filter
  // ============================
  function render(list) {
    resultsEl.innerHTML = "";

    list.forEach((item) => {
      const a = document.createElement("a");
      a.className = "cat-card";
      a.href = item.href;

      const span = document.createElement("span");
      span.className = "cat-title";
      span.textContent = item.name;

      a.appendChild(span);
      resultsEl.appendChild(a);
    });
  }

  function apply() {
    const hasAnyFilter =
      state.q.length > 0 || state.tag.length > 0 || state.letter.length > 0;

    // 👉 Belangrijk: als er nog niks gekozen/ingetikt is → laat leeg
    if (!hasAnyFilter) {
      resultsEl.innerHTML = "";
      if (noResultsEl) noResultsEl.style.display = "none";
      if (countEl) countEl.textContent = "";
      return;
    }

    const q = normalize(state.q);
    const tag = normalize(state.tag);
    const letter = normalize(state.letter);

    let filtered = DATA;

    // Letter-filter
    if (letter) {
      filtered = filtered.filter((x) => normalize(x.letter) === letter);
    }

    // Chip/tag-filter (kijkt in tags-array)
    if (tag) {
      filtered = filtered.filter((x) =>
        (x.tags || []).some((t) => normalize(t) === tag)
      );
    }

    // Tekst zoeken: in naam én in tags
    if (q) {
      filtered = filtered.filter((x) => {
        const inName = normalize(x.name).includes(q);
        const inTags = (x.tags || []).some((t) => normalize(t).includes(q));
        return inName || inTags;
      });
    }

    filtered = uniqueByHref(filtered);

    render(filtered);

    if (noResultsEl) {
      noResultsEl.style.display = filtered.length === 0 ? "block" : "none";
    }

    if (countEl) {
      const parts = [];
      if (state.q) parts.push(`zoek: "${state.q}"`);
      if (state.tag) parts.push(`chip: ${state.tag}`);
      if (state.letter) parts.push(`letter: ${state.letter.toUpperCase()}`);
      const extra = parts.length ? ` (${parts.join(", ")})` : "";
      countEl.textContent = `${filtered.length} resultaat/resultaten zichtbaar${extra}.`;
    }
  }

  function clearActive() {
    chips.forEach((b) => b.classList.remove("is-active"));
    azBtns.forEach((b) => b.classList.remove("is-active"));
  }

  // ============================
  // 6) Events
  // ============================
  if (input) {
    input.addEventListener("input", () => {
      state.q = input.value.trim();
      apply();
    });
  } else {
    console.warn("⚠️ Ik vind .search-input niet. Controleer class='search-input' op je input.");
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.q = "";
      state.tag = "";
      state.letter = "";
      if (input) input.value = "";
      clearActive();
      apply();
    });
  }

  // Chips toggle (aan/uit)
  chips.forEach((btn) => {
    btn.addEventListener("click", () => {
      const clicked = normalize(btn.dataset.filter || btn.textContent);
      const turnOn = !btn.classList.contains("is-active");

      chips.forEach((b) => b.classList.remove("is-active"));
      state.tag = turnOn ? clicked : "";
      if (turnOn) btn.classList.add("is-active");

      apply();
    });
  });

  // Alfabet toggle (aan/uit)
  azBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const clicked = normalize(btn.dataset.letter || btn.textContent);
      const turnOn = !btn.classList.contains("is-active");

      azBtns.forEach((b) => b.classList.remove("is-active"));
      state.letter = turnOn ? clicked : "";
      if (turnOn) btn.classList.add("is-active");

      apply();
    });
  });

  // Start leeg
  apply();
});

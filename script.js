document.addEventListener("DOMContentLoaded", async () => {
  // ====== 1) LIJST MET DETAILPAGINA'S ======
  // Voeg hier al jouw productpagina's toe (pad vanaf index.html).
  // Voorbeeld: "thee/agrimonie.html"
  const PAGES = [
    "thee/agrimonie.html",
    "thee/ashwagandha.html",
    "thee/brandnetel.html",
    "thee/kamille.html",
    "thee/pepermunt.html",
    // ... voeg de rest toe
  ];

  // ====== 2) ELEMENTEN IN INDEX.HTML ======
  const input = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearBtn");
  const countEl = document.getElementById("searchCount");
  const resultsEl = document.getElementById("results");
  const noResultsEl = document.getElementById("noResults");

  const chips = Array.from(document.querySelectorAll(".chip"));
  const azBtns = Array.from(document.querySelectorAll(".az-btn"));

  if (!resultsEl) return;

  // ====== 3) STATE ======
  const state = { q: "", tag: "", letter: "" };

  // ====== 4) NORMALIZE (spaties/koppelteken/é/ë etc.) ======
  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s\-_.]+/g, " ")
      .trim();
  }

  function normalizeForSearch(s) {
    // extra streng voor zoeken (spaties weg)
    return normalize(s).replace(/\s+/g, "");
  }

  function hasAnyFilter() {
    return state.q.length > 0 || state.tag.length > 0 || state.letter.length > 0;
  }

  // ====== 5) DATA OPBOUWEN DOOR HTML TE LEZEN ======
  async function loadOne(url) {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Kan pagina niet laden: ${url}`);
    const html = await res.text();

    const doc = new DOMParser().parseFromString(html, "text/html");

    // Naam: bij jou staat h1 in header (zoals Agrimonie) :contentReference[oaicite:1]{index=1}
    const h1 = doc.querySelector("h1");
    const name = h1 ? h1.textContent.trim() : url.split("/").pop();

    // Keywords/klachten: alle <li> uit de EERSTE gewone <ul> (zonder class)
    // (bij Agrimonie zijn dat de 7 bullets met werking/klachten) :contentReference[oaicite:2]{index=2}
    const firstPlainUl = doc.querySelector("article ul:not(.info-list)");
    const bulletLis = firstPlainUl ? Array.from(firstPlainUl.querySelectorAll("li")) : [];
    const bulletTexts = bulletLis.map(li => li.textContent.trim()).filter(Boolean);

    // Info-list: moment/werking/cafeïne
    const infoLis = Array.from(doc.querySelectorAll("ul.info-list li"));
    // Maak een tekstblok van die info (handig om op te zoeken)
    const infoText = infoLis.map(li => li.textContent.trim()).join(" | ");

    // Extra: maak tags voor chips op basis van "Moment" & "Cafeïne"
    // (Zo werken chips als "Ochtend", "Middag", "Avond", "Cafeïnevrij")
    const tags = [];
    const infoLower = normalize(infoText);

    if (infoLower.includes("ochtend")) tags.push("ochtend");
    if (infoLower.includes("middag")) tags.push("middag");
    if (infoLower.includes("avond")) tags.push("avond");
    if (infoLower.includes("cafe")) {
      // bij jou staat: "Cafeïne: nee" :contentReference[oaicite:3]{index=3}
      if (infoLower.includes("nee")) tags.push("cafeinevrij");
    }

    // Zoekblob: naam + bullets + info
    const searchBlob = [
      name,
      ...bulletTexts,
      infoText,
      ...tags
    ].map(normalizeForSearch).join(" ");

    return {
      name,
      href: url,
      tags,           // voor chips
      bullets: bulletTexts,
      infoText,
      searchBlob
    };
  }

  async function loadAll() {
    const out = [];
    for (const url of PAGES) {
      try {
        out.push(await loadOne(url));
      } catch (e) {
        console.warn(e);
      }
    }
    return out;
  }

  // ====== 6) RENDER ======
  function render(list) {
    resultsEl.innerHTML = "";

    list.forEach(item => {
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

  function setCount(text) {
    if (!countEl) return;
    countEl.textContent = text;
  }

  function showNoResults(show) {
    if (!noResultsEl) return;
    noResultsEl.style.display = show ? "block" : "none";
  }

  // ====== 7) FILTER LOGICA ======
  function matches(item) {
    // letter
    if (state.letter) {
      const first = normalize(item.name).charAt(0);
      if (first !== normalize(state.letter).charAt(0)) return false;
    }

    // chip/tag
    if (state.tag) {
      if (!item.tags.includes(state.tag)) return false;
    }

    // zoekterm (op volledige blob: naam + klachten + werking + moment)
    if (state.q) {
      if (!item.searchBlob.includes(state.q)) return false;
    }

    return true;
  }

  function apply(DATA) {
    if (!hasAnyFilter()) {
      render([]);
      setCount("");
      showNoResults(false);
      return;
    }

    const filtered = DATA.filter(matches);
    render(filtered);

    const parts = [];
    if (state.q) parts.push(`zoek: "${state.q}"`);
    if (state.tag) parts.push(`filter: ${state.tag}`);
    if (state.letter) parts.push(`letter: ${state.letter.toUpperCase()}`);
    const extra = parts.length ? ` (${parts.join(", ")})` : "";
    setCount(`${filtered.length} resultaat/resultaten zichtbaar${extra}.`);

    showNoResults(filtered.length === 0);
  }

  // ====== 8) UI EVENTS ======
  function clearActive() {
    chips.forEach(b => b.classList.remove("is-active"));
    azBtns.forEach(b => b.classList.remove("is-active"));
  }

  // ====== 9) LOAD DATA + START ======
  setCount("Bezig met laden…");
  const DATA = await loadAll();
  setCount("");         // leeg starten
  render([]);           // leeg starten
  showNoResults(false);

  if (input) {
    input.addEventListener("input", () => {
      state.q = normalizeForSearch(input.value);
      apply(DATA);
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      state.q = "";
      state.tag = "";
      state.letter = "";
      if (input) input.value = "";
      clearActive();
      apply(DATA);
    });
  }

  // chips toggle
  chips.forEach(btn => {
    btn.addEventListener("click", () => {
      const tag = normalizeForSearch(btn.dataset.filter || btn.textContent);
      const turnOn = !btn.classList.contains("is-active");

      chips.forEach(b => b.classList.remove("is-active"));
      state.tag = turnOn ? tag : "";
      if (turnOn) btn.classList.add("is-active");

      apply(DATA);
    });
  });

  // alfabet toggle
  azBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const letter = normalizeForSearch(btn.dataset.letter || btn.textContent);
      const turnOn = !btn.classList.contains("is-active");

      azBtns.forEach(b => b.classList.remove("is-active"));
      state.letter = turnOn ? letter : "";
      if (turnOn) btn.classList.add("is-active");

      apply(DATA);
    });
  });
});

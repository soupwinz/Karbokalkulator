/* Karbokalkulator – enkel, mobilvennlig, Koder/GitHub Pages */

/* === Standardvarer (endres kun i koden) === */
const STANDARD_ITEMS = [
  { id: "std_eple",    name: "Eple",          per100: 10 },
  { id: "std_banan",   name: "Banan",         per100: 20 },
  { id: "std_paere",   name: "Pære",          per100: 9  },
  { id: "std_appelsin",name: "Appelsin",      per100: 8  },
  { id: "std_drue",    name: "Drue",          per100: 16 },
  { id: "std_pasta",   name: "Pasta (Kokt)",         per100: 24 },
  { id: "std_ris",     name: "Ris (Kokt)",           per100: 25 },
  { id: "std_potet",   name: "Potet (Kokt)",         per100: 17 }
];

/* === Local storage for egne varer (kun på brukerens enhet) === */
const STORAGE_CUSTOM_KEY = "carbcalc_custom_items_v1";

/* Måltid lagres IKKE */
let meal = [];

/* Egne varer */
let customItems = loadCustomItems();

/* Aktiv vare */
let activeId = null;

/* --- Helpers --- */
function cryptoId() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function asNumber(v) {
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function roundInt(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.round(x);
}

function calcCarbs(per100, grams) {
  return roundInt((asNumber(per100) * asNumber(grams)) / 100);
}

function displayLabel(item) {
  // små bokstaver: g/100 g
  const per = (Number.isFinite(item.per100) ? item.per100 : 0);
  return `${item.name} (${per} g/100 g)`;
}

function setFeedback(msg, ok) {
  const el = document.getElementById("globalFeedback");
  el.textContent = msg || "";
  el.className = "feedback " + (msg ? (ok ? "ok" : "bad") : "");
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* --- Data merge --- */
function isStandardId(id) {
  return id && id.startsWith("std_");
}

function allItems() {
  // Standard først + egne etterpå, men vi sorterer på navn i visning
  return [...STANDARD_ITEMS, ...customItems];
}

function findItem(id) {
  return allItems().find(x => x.id === id) || null;
}

/* --- Storage --- */
function loadCustomItems() {
  try {
    const raw = localStorage.getItem(STORAGE_CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(x => x && typeof x.name === "string")
      .map(x => ({
        id: String(x.id || cryptoId()),
        name: String(x.name).trim(),
        per100: roundInt(asNumber(x.per100)) // vi holder standarden som heltall i visning
      }))
      .filter(x => x.name.length > 0);
  } catch {
    return [];
  }
}

function saveCustomItems() {
  localStorage.setItem(STORAGE_CUSTOM_KEY, JSON.stringify(customItems));
}

/* --- DOM refs --- */
const quickPer100 = document.getElementById("quickPer100");
const quickGrams  = document.getElementById("quickGrams");
const quickResult = document.getElementById("quickResult");
const quickResultMini = document.getElementById("quickResultMini");
const quickAddMeal = document.getElementById("quickAddMeal");
const quickReset = document.getElementById("quickReset");

const itemsCount = document.getElementById("itemsCount");
const itemsChips = document.getElementById("itemsChips");

const itemPanel = document.getElementById("itemPanel");
const activeItemName = document.getElementById("activeItemName");
const activeItemMeta = document.getElementById("activeItemMeta");
const itemPer100 = document.getElementById("itemPer100");
const itemGrams  = document.getElementById("itemGrams");
const itemResult = document.getElementById("itemResult");
const itemAddMeal = document.getElementById("itemAddMeal");
const itemClearGrams = document.getElementById("itemClearGrams");

const newName = document.getElementById("newName");
const newPer100 = document.getElementById("newPer100");
const addItemBtn = document.getElementById("addItem");
const resetCustomBtn = document.getElementById("resetCustom");

const mealList = document.getElementById("mealList");
const mealTotal = document.getElementById("mealTotal");
const clearMealBtn = document.getElementById("clearMeal");

/* === Hurtigkalkulator === */
function updateQuick() {
  const carbs = calcCarbs(quickPer100.value, quickGrams.value);
  quickResult.textContent = String(carbs);
  quickResultMini.textContent = carbs > 0 ? `${carbs} g` : "";
}

quickPer100.addEventListener("input", updateQuick);
quickGrams.addEventListener("input", updateQuick);

quickReset.addEventListener("click", () => {
  quickPer100.value = "";
  quickGrams.value = "";
  updateQuick();
  setFeedback("Nullstilt hurtigkalkulator.", true);
});

quickAddMeal.addEventListener("click", () => {
  const per100 = asNumber(quickPer100.value);
  const grams  = asNumber(quickGrams.value);

  if (per100 <= 0 || grams <= 0) {
    setFeedback("Fyll inn karbo per 100 g og gram først.", false);
    return;
  }

  const carbs = calcCarbs(per100, grams);
  meal.push({ id: cryptoId(), name: "Hurtig", grams: roundInt(grams), per100: roundInt(per100), carbs });
  renderMeal();
  setFeedback(`La til Hurtig: ${carbs} g`, true);
});

/* === Mine varer === */
function renderItems() {
  const items = allItems();
  itemsCount.textContent = `${items.length} varer`;

  // sorter alfabetisk
  const sorted = items.slice().sort((a, b) => a.name.localeCompare(b.name, "no"));
  itemsChips.innerHTML = "";

  for (const it of sorted) {
    const chip = document.createElement("div");
    chip.className = "chip" + (it.id === activeId ? " active" : "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chipBtn";
    btn.textContent = displayLabel(it);
    btn.addEventListener("click", () => setActive(it.id));

    chip.appendChild(btn);

    // X kun på egne varer
    if (!isStandardId(it.id)) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "chipX";
      x.setAttribute("aria-label", `Slett ${it.name}`);
      x.textContent = "×";
      x.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteCustomItem(it.id);
      });
      chip.appendChild(x);
    }

    itemsChips.appendChild(chip);
  }
}

function setActive(id) {
  activeId = id;
  const it = findItem(id);
  if (!it) {
    itemPanel.hidden = true;
    activeId = null;
    renderItems();
    return;
  }

  itemPanel.hidden = false;
  activeItemName.textContent = it.name;
  activeItemMeta.textContent = displayLabel(it);

  // standard = låst per100 i appen
  itemPer100.value = String(it.per100);
  itemPer100.disabled = isStandardId(it.id);

  itemGrams.value = "";
  itemResult.textContent = "0";

  renderItems();

  // fokus raskt på gram
  setTimeout(() => itemGrams.focus(), 0);
}

function updateItemCalc() {
  const it = findItem(activeId);
  if (!it) return;

  // kun egne varer kan oppdateres her
  if (!isStandardId(it.id)) {
    const per100 = roundInt(asNumber(itemPer100.value));
    it.per100 = per100;

    // oppdater i customItems-arrayet og lagre
    const idx = customItems.findIndex(x => x.id === it.id);
    if (idx >= 0) {
      customItems[idx].per100 = per100;
      saveCustomItems();
      renderItems(); // oppdater label i lista
    }
  } else {
    // sørg for at feltet holder standardverdi
    itemPer100.value = String(it.per100);
  }

  const carbs = calcCarbs(itemPer100.value, itemGrams.value);
  itemResult.textContent = String(carbs);
}

itemPer100.addEventListener("input", updateItemCalc);
itemGrams.addEventListener("input", updateItemCalc);

itemClearGrams.addEventListener("click", () => {
  itemGrams.value = "";
  updateItemCalc();
});

itemAddMeal.addEventListener("click", () => {
  const it = findItem(activeId);
  if (!it) return;

  const grams = asNumber(itemGrams.value);
  const per100 = asNumber(itemPer100.value);

  if (grams <= 0 || per100 <= 0) {
    setFeedback("Skriv inn gram først.", false);
    return;
  }

  const carbs = calcCarbs(per100, grams);
  meal.push({ id: cryptoId(), name: it.name, grams: roundInt(grams), per100: roundInt(per100), carbs });
  renderMeal();
  setFeedback(`La til ${it.name}: ${carbs} g`, true);
});

/* === Legg til egen matvare === */
addItemBtn.addEventListener("click", () => {
  const name = String(newName.value || "").trim();
  const per100 = roundInt(asNumber(newPer100.value));

  if (!name) {
    setFeedback("Skriv inn navn på matvare.", false);
    return;
  }
  if (per100 <= 0) {
    setFeedback("Skriv inn karbo per 100 g (må være > 0).", false);
    return;
  }

  // hvis finnes blant egne (samme navn), oppdater den
  const existing = customItems.find(x => x.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.per100 = per100;
    saveCustomItems();
    renderItems();
    setFeedback(`Oppdaterte ${existing.name}.`, true);
    setActive(existing.id);
    newName.value = "";
    newPer100.value = "";
    return;
  }

  const it = { id: "cus_" + cryptoId(), name, per100 };
  customItems.push(it);
  saveCustomItems();
  renderItems();
  setFeedback(`La til ${name}.`, true);

  newName.value = "";
  newPer100.value = "";
  setActive(it.id);
});

function deleteCustomItem(id) {
  const it = customItems.find(x => x.id === id);
  if (!it) return;

  customItems = customItems.filter(x => x.id !== id);
  saveCustomItems();

  if (activeId === id) {
    activeId = null;
    itemPanel.hidden = true;
  }

  renderItems();
  setFeedback("Vare slettet.", true);
}

resetCustomBtn.addEventListener("click", () => {
  customItems = [];
  saveCustomItems();

  activeId = null;
  itemPanel.hidden = true;

  renderItems();
  setFeedback("Alle egne varer er fjernet (standardvarer beholdes).", true);
});

/* === Måltid === */
function renderMeal() {
  if (!meal.length) {
    mealList.classList.add("emptyState");
    mealList.textContent = "Ingen varer i måltid ennå.";
    mealTotal.textContent = "0";
    return;
  }

  mealList.classList.remove("emptyState");
  mealList.innerHTML = "";

  let sum = 0;

  for (const row of meal) {
    sum += row.carbs;

    const el = document.createElement("div");
    el.className = "mealRow";

    const left = document.createElement("div");
    const title = document.createElement("div");
    title.innerHTML = `<strong>${escapeHtml(row.name)}</strong>`;
    const meta = document.createElement("div");
    meta.className = "mealMeta";
    meta.textContent = `${row.grams} g · ${row.per100} g/100 g`;
    left.appendChild(title);
    left.appendChild(meta);

    const carbs = document.createElement("div");
    carbs.className = "mealCarbs";
    carbs.textContent = `${row.carbs} g`;

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Slett";
    del.addEventListener("click", () => {
      meal = meal.filter(x => x.id !== row.id);
      renderMeal();
    });

    el.appendChild(left);
    el.appendChild(carbs);
    el.appendChild(del);

    mealList.appendChild(el);
  }

  mealTotal.textContent = String(roundInt(sum));
}

clearMealBtn.addEventListener("click", () => {
  meal = [];
  renderMeal();
  setFeedback("Måltid tømt.", true);
});

/* === Init === */
function init() {
  updateQuick();
  renderItems();
  renderMeal();

  // Velg første vare (alfabetisk) ved start
  const sorted = allItems().slice().sort((a, b) => a.name.localeCompare(b.name, "no"));
  if (sorted.length) setActive(sorted[0].id);

  setFeedback("", true);
}

init();
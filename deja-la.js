/* =========================================================
   deja-la.js — version avec ancres précises pour voir_aussi
   ---------------------------------------------------------
   Syntaxes supportées dans voir_aussi :
   - deja-la:<id-carte>        -> deja-la.html#id-carte
   - ressource:<id-ressource>  -> ressources.html#id-ressource
   - ressources:<id-ressource> -> ressources.html#id-ressource
   - tag:<tag>                 -> ressources.html?tag=tag
   - https://...               -> lien externe direct
   ========================================================= */

const CSV_URL = "deja-la.csv";

const franceGrid = document.getElementById("dejaFranceGrid");
const internationalGrid = document.getElementById("dejaInternationalGrid");
const historiqueGrid = document.getElementById("dejaHistoriqueGrid");
const dejaSearchInput = document.getElementById("dejaSearchInput");
const dejaTags = document.getElementById("dejaTags");

let allEntries = [];
let activeTag = "all";

async function loadCSV() {
  const response = await fetch(CSV_URL);

  if (!response.ok) {
    throw new Error("Impossible de charger le fichier deja-la.csv");
  }

  const text = await response.text();
  return parseCSV(text);
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ";" && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function parseCSV(text) {
  const cleanText = text.replace(/^\uFEFF/, "");
  const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== "");

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim());

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });

    return {
      id: row["ID"] || row["id"] || "",
      statut: row["statut"] || "",
      section: normalizeSection(row["section"] || ""),
      nom: row["nom"] || "",
      territoire: row["territoire"] || "",
      periode: row["periode"] || "",
      type: row["type"] || "",
      fait_quoi: row["fait_quoi"] || row["met_en_oeuvre"] || "",
      proche_de_la_ci: row["proche_de_la_ci"] || "",
      s_en_distingue: row["s_en_distingue"] || "",
      permet_de_penser: row["permet_de_penser"] || "",
      tags: parseListField(row["tags"] || ""),
      url: row["url"] || "",
      voir_aussi: parseListField(row["voir_aussi"] || ""),
      notes: row["notes"] || row["Notes"] || "",
      ordre: Number(row["ordre"] || "999")
    };
  }).filter(entry => entry.nom || entry.url || entry.fait_quoi);
}

function parseListField(value) {
  if (!value) return [];

  return String(value)
    .split(/[|,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeTag(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-");
}

function normalizeSection(value) {
  const normalized = normalizeTag(value);

  const map = {
    "france-aujourdhui": "france-aujourdhui",
    "france_aujourdhui": "france-aujourdhui",
    "franceaujourdhui": "france-aujourdhui",
    "international": "international",
    "reperes-historiques": "reperes-historiques",
    "reperes_historiques": "reperes-historiques",
    "repereshistoriques": "reperes-historiques"
  };

  return map[normalized] || normalized;
}

function formatTagLabel(tag) {
  const cleaned = normalizeTag(tag);

  const labels = {
    "zapatiste": "Zapatiste",
    "autonomie": "Autonomie",
    "cooperatives": "Coopératives",
    "cooperative": "Coopérative",
    "foncier": "Foncier",
    "ravitaillement": "Ravitaillement",
    "international": "International",
    "historique": "Historique",
    "securite-sociale": "Sécurité sociale",
    "terre": "Terre",
    "agriculture": "Agriculture",
    "permaculture": "Permaculture"
  };

  if (labels[cleaned]) return labels[cleaned];

  return cleaned
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.ordre !== b.ordre) return a.ordre - b.ordre;
    return a.nom.localeCompare(b.nom, "fr", { sensitivity: "base" });
  });
}

function buildMetaPills(entry) {
  const pills = [];

  if (entry.periode) {
    pills.push(`<span class="deja-pill">${escapeHTML(entry.periode)}</span>`);
  }

  if (entry.territoire) {
    pills.push(`<span class="deja-pill deja-pill--orange">${escapeHTML(entry.territoire)}</span>`);
  }

  if (pills.length === 0) return "";
  return `<div class="deja-meta">${pills.join("")}</div>`;
}

function buildSecondaryLine(entry) {
  if (!entry.type) return "";
  return `<p class="deja-small">Type : ${escapeHTML(entry.type)}</p>`;
}

function buildThinkingList(entry) {
  const items = [];

  if (entry.proche_de_la_ci) {
    items.push(`<li><strong>Proche de la CI par :</strong> ${escapeHTML(entry.proche_de_la_ci)}</li>`);
  }

  if (entry.s_en_distingue) {
    items.push(`<li><strong>S’en distingue par :</strong> ${escapeHTML(entry.s_en_distingue)}</li>`);
  }

  if (entry.permet_de_penser) {
    items.push(`<li><strong>Ce que cela permet de penser :</strong> ${escapeHTML(entry.permet_de_penser)}</li>`);
  }

  if (items.length === 0) return "";
  return `<ul class="deja-list">${items.join("")}</ul>`;
}

function buildSeeAlso(entry) {
  if (!entry.voir_aussi || entry.voir_aussi.length === 0) return "";

  const items = entry.voir_aussi.map(item => {
    const trimmed = item.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      return `<a href="${escapeHTML(trimmed)}" target="_blank" rel="noopener noreferrer">Voir aussi</a>`;
    }

    if (trimmed.startsWith("deja-la:")) {
      const target = trimmed.replace("deja-la:", "").trim();
      return `<a href="deja-la.html#${escapeHTML(target)}">Voir la carte liée dans Le déjà-là</a>`;
    }

    if (trimmed.startsWith("ressource:") || trimmed.startsWith("ressources:")) {
      const target = trimmed.split(":").slice(1).join(":").trim();
      return `<a href="ressources.html#${escapeHTML(target)}">Voir la ressource liée</a>`;
    }

    if (trimmed.startsWith("tag:")) {
      const target = trimmed.replace("tag:", "").trim();
      return `<a href="ressources.html?tag=${encodeURIComponent(normalizeTag(target))}">Voir les ressources liées</a>`;
    }

    return `<a href="ressources.html?tag=${encodeURIComponent(normalizeTag(trimmed))}">Voir les ressources liées</a>`;
  });

  return `<p class="deja-related">${items.join("<br>")}</p>`;
}

function buildCardTags(entry) {
  if (!entry.tags || entry.tags.length === 0) return "";

  const tags = entry.tags.map(tag => {
    const label = formatTagLabel(tag);
    return `<span class="deja-tag"><a href="ressources.html?tag=${encodeURIComponent(normalizeTag(tag))}">${escapeHTML(label)}</a></span>`;
  }).join("");

  return `<div class="deja-tags-row">${tags}</div>`;
}

function createCard(entry) {
  const article = document.createElement("article");
  article.className = "deja-card";
  article.id = entry.id || "";
  article.dataset.section = entry.section;
  article.dataset.tags = (entry.tags || []).map(normalizeTag).join(" ");
  article.dataset.search = buildSearchText(entry);

  article.innerHTML = `
    ${buildMetaPills(entry)}

    <div>
      <h3>${escapeHTML(entry.nom || "Sans nom")}</h3>
      ${buildSecondaryLine(entry)}
    </div>

    <p>${escapeHTML(entry.fait_quoi || "")}</p>

    ${buildThinkingList(entry)}

    ${buildSeeAlso(entry)}

    ${entry.url ? `<a class="deja-link" href="${escapeHTML(entry.url)}" target="_blank" rel="noopener noreferrer">Voir la structure</a>` : ""}

    ${buildCardTags(entry)}
  `;

  return article;
}

function buildSearchText(entry) {
  return [
    entry.nom,
    entry.territoire,
    entry.periode,
    entry.type,
    entry.fait_quoi,
    entry.proche_de_la_ci,
    entry.s_en_distingue,
    entry.permet_de_penser,
    (entry.tags || []).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function renderTagButtons(entries) {
  const allTagsSet = new Set();

  entries.forEach(entry => {
    (entry.tags || []).forEach(tag => allTagsSet.add(normalizeTag(tag)));
  });

  const sortedTags = Array.from(allTagsSet).sort();

  dejaTags.innerHTML = `
    <button class="resources-tag is-active" type="button" data-tag="all">Tout</button>
    ${sortedTags.map(tag => `
      <button class="resources-tag" type="button" data-tag="${escapeHTML(tag)}">${escapeHTML(formatTagLabel(tag))}</button>
    `).join("")}
  `;

  const buttons = dejaTags.querySelectorAll(".resources-tag");

  buttons.forEach(button => {
    button.addEventListener("click", () => {
      buttons.forEach(btn => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      activeTag = button.dataset.tag;
      updateDisplay();
    });
  });
}

function scoreEntry(entry, query) {
  if (!query) return 1;

  let score = 0;
  const q = normalizeTag(query);

  if (normalizeTag(entry.nom).includes(q)) score += 5;
  if ((entry.tags || []).some(tag => normalizeTag(tag).includes(q))) score += 4;
  if (normalizeTag(entry.territoire).includes(q)) score += 3;
  if (normalizeTag(entry.type).includes(q)) score += 2;
  if (normalizeTag(entry.fait_quoi).includes(q)) score += 1;
  if (normalizeTag(entry.proche_de_la_ci).includes(q)) score += 1;
  if (normalizeTag(entry.s_en_distingue).includes(q)) score += 1;
  if (normalizeTag(entry.permet_de_penser).includes(q)) score += 1;

  return score;
}

function renderSection(entries, grid, emptyText) {
  grid.innerHTML = "";

  if (!entries || entries.length === 0) {
    grid.innerHTML = `<p class="deja-empty">${escapeHTML(emptyText)}</p>`;
    return;
  }

  sortEntries(entries).forEach(entry => {
    grid.appendChild(createCard(entry));
  });
}

function updateDisplay() {
  const query = dejaSearchInput.value.trim();

  let filtered = allEntries.filter(entry => normalizeTag(entry.statut) === "valide");

  if (activeTag !== "all") {
    filtered = filtered.filter(entry =>
      (entry.tags || []).map(normalizeTag).includes(activeTag)
    );
  }

  filtered = filtered
    .map(entry => ({ ...entry, _score: scoreEntry(entry, query) }))
    .filter(entry => entry._score > 0);

  renderSection(
    filtered.filter(entry => entry.section === "france-aujourdhui"),
    franceGrid,
    "Aucune carte ne correspond à la recherche actuelle dans cette section."
  );

  renderSection(
    filtered.filter(entry => entry.section === "international"),
    internationalGrid,
    "Aucune carte ne correspond à la recherche actuelle dans cette section."
  );

  renderSection(
    filtered.filter(entry => entry.section === "reperes-historiques"),
    historiqueGrid,
    "Aucune carte ne correspond à la recherche actuelle dans cette section."
  );
}

async function initDejaLa() {
  allEntries = await loadCSV();
  allEntries = allEntries.filter(entry => normalizeTag(entry.statut) === "valide");

  renderTagButtons(allEntries);
  dejaSearchInput.addEventListener("input", updateDisplay);

  const params = new URLSearchParams(window.location.search);
  const initialTag = params.get("tag");
  if (initialTag) {
    activeTag = normalizeTag(initialTag);
    const button = dejaTags.querySelector(`[data-tag="${CSS.escape(activeTag)}"]`);
    if (button) {
      dejaTags.querySelectorAll(".resources-tag").forEach(btn => btn.classList.remove("is-active"));
      button.classList.add("is-active");
    }
  }

  updateDisplay();
}

initDejaLa().catch(error => {
  console.error(error);
  franceGrid.innerHTML = `<p class="deja-empty">Erreur de chargement du déjà-là.</p>`;
  internationalGrid.innerHTML = `<p class="deja-empty">Erreur de chargement du déjà-là.</p>`;
  historiqueGrid.innerHTML = `<p class="deja-empty">Erreur de chargement du déjà-là.</p>`;
});

/* =========================================================
   ressources.js — version avec ancres précises pour voir_aussi
   ---------------------------------------------------------
   Syntaxes supportées dans voir_aussi :
   - deja-la:<id-carte>        -> deja-la.html#id-carte
   - ressource:<id-ressource>  -> ressources.html#id-ressource
   - ressources:<id-ressource> -> ressources.html#id-ressource
   - tag:<tag>                 -> ressources.html?tag=tag
   - https://...               -> lien externe direct
   ========================================================= */

const CSV_URL = "ressources.csv";

const resourcesGrid = document.getElementById("resourcesGrid");
const searchInput = document.getElementById("searchInput");
const resourcesTags = document.getElementById("resourcesTags");

let allResources = [];
let activeTag = "all";

async function loadCSV() {
  const response = await fetch(CSV_URL);

  if (!response.ok) {
    throw new Error("Impossible de charger le fichier ressources.csv");
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

  if (lines.length < 2) {
    return [];
  }

  const headers = splitCSVLine(lines[0]).map(h => h.trim());

  return lines.slice(1)
    .map(line => {
      const values = splitCSVLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = (values[index] || "").trim();
      });

      return {
        id: row["ID"] || row["id"] || "",
        statut: row["statut"] || "",
        titre: row["titre"] || "",
        type: normalizeType(row["type"] || ""),
        source: row["source"] || "",
        url: row["url"] || "",
        resume: row["resume"] || "",
        duree: row["duree"] || "",
        tags: parseListField(row["tags"] || ""),
        voir_aussi: parseListField(row["voir_aussi"] || ""),
        notes: row["Notes"] || row["notes"] || ""
      };
    })
    .filter(resource => resource.titre || resource.url || resource.resume);
}

function parseListField(value) {
  if (!value) return [];

  return String(value)
    .split(/[|,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeTag(tag) {
  return String(tag || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_\s]+/g, "-");
}

function normalizeType(type) {
  return normalizeTag(type);
}

function escapeHTML(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTagLabel(tag) {
  const cleaned = normalizeTag(tag);

  const specialLabels = {
    "bernard-friot": "Bernard Friot",
    "securite-sociale": "Sécurité sociale",
    "cooperatives": "Coopératives",
    "cooperative": "Coopérative",
    "zapatiste": "Zapatiste",
    "international": "International",
    "video": "Vidéo",
    "audio": "Audio",
    "pdf": "PDF",
    "article": "Article",
    "site": "Site"
  };

  if (specialLabels[cleaned]) return specialLabels[cleaned];

  return cleaned
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function labelType(type) {
  const labels = {
    video: "Vidéo",
    audio: "Audio",
    pdf: "PDF",
    article: "Article",
    site: "Site"
  };

  return labels[type] || "Ressource";
}

function getYouTubeThumbnail(url) {
  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    }
  } catch (error) {
    return "";
  }

  return "";
}

function buildSeeAlsoHTML(resource) {
  if (!resource.voir_aussi || resource.voir_aussi.length === 0) {
    return "";
  }

  const items = resource.voir_aussi.map(item => {
    const trimmed = item.trim();

    if (/^https?:\/\//i.test(trimmed)) {
      return `<a class="resource-related-link" href="${escapeHTML(trimmed)}" target="_blank" rel="noopener noreferrer">Voir aussi</a>`;
    }

    if (trimmed.startsWith("deja-la:")) {
      const target = trimmed.replace("deja-la:", "").trim();
      return `<a class="resource-related-link" href="deja-la.html#${escapeHTML(target)}">Voir la carte liée dans Le déjà-là</a>`;
    }

    if (trimmed.startsWith("ressource:") || trimmed.startsWith("ressources:")) {
      const target = trimmed.split(":").slice(1).join(":").trim();
      return `<a class="resource-related-link" href="ressources.html#${escapeHTML(target)}">Voir la ressource liée</a>`;
    }

    if (trimmed.startsWith("tag:")) {
      const target = trimmed.replace("tag:", "").trim();
      return `<a class="resource-related-link" href="ressources.html?tag=${encodeURIComponent(normalizeTag(target))}">Voir les ressources liées</a>`;
    }

    return `<a class="resource-related-link" href="ressources.html?tag=${encodeURIComponent(normalizeTag(trimmed))}">Voir les ressources liées</a>`;
  });

  return `<div class="resource-related" style="margin-top:0.75rem;">${items.join("<br>")}</div>`;
}

function createCard(resource) {
  const article = document.createElement("article");
  article.className = "resource-card";
  article.dataset.id = resource.id || "";
  article.dataset.tags = resource.tags.map(normalizeTag).join(" ");
  article.id = resource.id || "";

  const tagsHTML = resource.tags
    .map(tag => `<span class="resource-tag">${escapeHTML(formatTagLabel(tag))}</span>`)
    .join("");

  const thumbnail = getYouTubeThumbnail(resource.url);
  const thumbHTML = thumbnail
    ? `<img class="resource-thumb-image" src="${escapeHTML(thumbnail)}" alt="Miniature de la ressource">`
    : `<div class="resource-thumb-text">${escapeHTML(labelType(resource.type))}</div>`;

  article.innerHTML = `
    <div class="resource-thumb">${thumbHTML}</div>

    <div class="resource-body">
      <div class="resource-meta">
        <span class="resource-pill type">${escapeHTML(labelType(resource.type))}</span>
        <span class="resource-pill time">${escapeHTML(resource.duree || "temps à préciser")}</span>
      </div>

      <h3 class="resource-title">${escapeHTML(resource.titre || "Sans titre")}</h3>
      <p class="resource-source">Source : ${escapeHTML(resource.source || "à préciser")}</p>
      <p class="resource-text">${escapeHTML(resource.resume || "")}</p>

      <div class="resource-tags">
        ${tagsHTML}
      </div>

      ${buildSeeAlsoHTML(resource)}

      <a class="resource-link" href="${escapeHTML(resource.url || "#")}" target="_blank" rel="noopener noreferrer">
        Ouvrir la ressource
      </a>
    </div>
  `;

  return article;
}

function renderResources(resources) {
  resourcesGrid.innerHTML = "";

  if (resources.length === 0) {
    resourcesGrid.innerHTML = `<p>Aucune ressource ne correspond à la recherche actuelle.</p>`;
    return;
  }

  resources.forEach(resource => {
    resourcesGrid.appendChild(createCard(resource));
  });
}

function renderTagButtons(resources) {
  const allTags = new Set();

  resources.forEach(resource => {
    resource.tags.forEach(tag => allTags.add(normalizeTag(tag)));
  });

  const sortedTags = Array.from(allTags).sort();

  resourcesTags.innerHTML = `
    <button class="resources-tag is-active" type="button" data-tag="all">Tout</button>
    ${sortedTags.map(tag => `
      <button class="resources-tag" type="button" data-tag="${escapeHTML(tag)}">${escapeHTML(formatTagLabel(tag))}</button>
    `).join("")}
  `;

  const tagButtons = resourcesTags.querySelectorAll(".resources-tag");

  tagButtons.forEach(button => {
    button.addEventListener("click", () => {
      tagButtons.forEach(btn => btn.classList.remove("is-active"));
      button.classList.add("is-active");
      activeTag = button.dataset.tag;
      updateDisplay();
    });
  });
}

function scoreResource(resource, query) {
  if (!query) return 1;

  let score = 0;
  const q = normalizeTag(query);

  if (normalizeTag(resource.titre).includes(q)) score += 5;
  if (resource.tags.some(tag => normalizeTag(tag).includes(q))) score += 4;
  if (normalizeTag(resource.source).includes(q)) score += 2;
  if (normalizeTag(resource.resume).includes(q)) score += 1;

  return score;
}

function getURLTag() {
  const params = new URLSearchParams(window.location.search);
  const tag = params.get("tag");
  return tag ? normalizeTag(tag) : null;
}

function updateDisplay() {
  const query = searchInput.value.trim();

  let filtered = allResources.filter(resource => normalizeTag(resource.statut) === "valide");

  if (activeTag !== "all") {
    filtered = filtered.filter(resource =>
      resource.tags.map(normalizeTag).includes(activeTag)
    );
  }

  filtered = filtered
    .map(resource => ({
      ...resource,
      _score: scoreResource(resource, query)
    }))
    .filter(resource => resource._score > 0)
    .sort((a, b) => b._score - a._score);

  renderResources(filtered);
}

async function initResources() {
  allResources = await loadCSV();
  allResources = allResources.filter(resource => normalizeTag(resource.statut) === "valide");

  renderTagButtons(allResources);

  const initialTag = getURLTag();
  if (initialTag) {
    activeTag = initialTag;
  }

  renderResources(allResources);
  searchInput.addEventListener("input", updateDisplay);
  updateDisplay();

  const button = resourcesTags.querySelector(`[data-tag="${CSS.escape(activeTag)}"]`);
  if (button) {
    resourcesTags.querySelectorAll(".resources-tag").forEach(btn => btn.classList.remove("is-active"));
    button.classList.add("is-active");
  }
}

initResources().catch(error => {
  console.error(error);
  resourcesGrid.innerHTML = `<p>Erreur de chargement des ressources.</p>`;
});

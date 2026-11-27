"use strict";

const grid = document.getElementById("game-grid");
const searchInput = document.getElementById("game-search");
const emptyState = document.getElementById("empty-state");
const resultCount = document.getElementById("results-count");
const favoriteCount = document.getElementById("favorite-count");
const gameCount = document.getElementById("game-count");
const allCount = document.getElementById("all-count");
const searchBox = document.querySelector(".search-box");

let games = [];
let currentFilter = "all";
let favorites = loadFavorites();

function loadFavorites() {
  try {
    const stored = JSON.parse(localStorage.getItem("hohogames-v2:favorites") || "[]");
    return new Set(Array.isArray(stored) ? stored.filter((item) => typeof item === "string") : []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  localStorage.setItem("hohogames-v2:favorites", JSON.stringify([...favorites]));
}

function encodedPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function makeCard(game) {
  const card = document.createElement("article");
  card.className = "game-card";

  const link = document.createElement("a");
  link.className = "game-card-link";
  link.href = `/${encodedPath(game.directory)}/index.html`;
  link.setAttribute("aria-label", `Play ${game.name}`);

  const art = document.createElement("div");
  art.className = "game-art";

  const fallback = document.createElement("span");
  fallback.className = "art-fallback";
  fallback.textContent = initials(game.name);
  art.append(fallback);

  if (game.image) {
    const image = document.createElement("img");
    image.src = `/${encodedPath(`${game.directory}/${game.image}`)}`;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.addEventListener("error", () => {
      image.remove();
      art.classList.add("art-missing");
    }, { once: true });
    art.append(image);
  } else {
    art.classList.add("art-missing");
  }

  const badge = document.createElement("span");
  badge.className = "game-badge";
  badge.textContent = game.recommended ? "FEATURED" : "PLAY NOW";
  art.append(badge);

  const favorite = document.createElement("button");
  favorite.className = "favorite-button";
  favorite.type = "button";
  favorite.setAttribute("aria-label", `${favorites.has(game.directory) ? "Remove" : "Add"} ${game.name} ${favorites.has(game.directory) ? "from" : "to"} favorites`);
  favorite.setAttribute("aria-pressed", String(favorites.has(game.directory)));
  favorite.textContent = favorites.has(game.directory) ? "♥" : "♡";
  if (favorites.has(game.directory)) favorite.classList.add("is-favorite");
  favorite.addEventListener("click", () => {
    if (favorites.has(game.directory)) {
      favorites.delete(game.directory);
    } else {
      favorites.add(game.directory);
    }
    saveFavorites();
    updateFavoriteCount();
    renderGames();
  });

  const info = document.createElement("div");
  info.className = "game-info";
  const title = document.createElement("span");
  title.className = "game-name";
  title.textContent = game.name;
  title.title = game.name;
  const playMark = document.createElement("span");
  playMark.className = "play-mark";
  playMark.setAttribute("aria-hidden", "true");
  playMark.textContent = "↗";
  info.append(title, playMark);
  link.append(art, info);
  card.append(link, favorite);
  return card;
}

function updateFavoriteCount() {
  favoriteCount.textContent = String(favorites.size);
}

function renderShowcase() {
  const collage = document.getElementById("showcase-collage");
  const featured = games.filter((game) => game.recommended && game.image).slice(0, 3);
  const picks = featured.length ? featured : games.filter((game) => game.image).slice(0, 3);

  for (const game of picks) {
    const card = document.createElement("div");
    card.className = "showcase-card";
    const image = document.createElement("img");
    image.src = `/${encodedPath(`${game.directory}/${game.image}`)}`;
    image.alt = "";
    image.loading = "eager";
    image.addEventListener("error", () => card.remove(), { once: true });
    card.append(image);
    collage.append(card);
  }
}

function renderGames() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const visibleGames = games.filter((game) => {
    const matchesSearch = `${game.name} ${game.directory}`.toLocaleLowerCase().includes(query);
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "featured" && game.recommended) ||
      (currentFilter === "favorites" && favorites.has(game.directory));
    return matchesSearch && matchesFilter;
  });

  grid.replaceChildren(...visibleGames.map(makeCard));
  emptyState.hidden = visibleGames.length > 0;
  grid.hidden = visibleGames.length === 0;
  resultCount.textContent = `${visibleGames.length} ${visibleGames.length === 1 ? "game" : "games"}`;
}

function setFilter(filter) {
  currentFilter = filter;
  document.querySelector(".header-nav .nav-link[href='#library']").classList.toggle("active", filter !== "favorites");
  document.querySelector(".header-nav .nav-link[data-filter='favorites']").classList.toggle("active", filter === "favorites");
  document.querySelectorAll("[data-filter]").forEach((button) => {
    if (button.classList.contains("filter-tab")) {
      button.classList.toggle("active", button.dataset.filter === filter);
      button.setAttribute("aria-pressed", String(button.dataset.filter === filter));
    }
  });
  renderGames();
  if (filter === "favorites") {
    searchBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function playRandomGame() {
  const candidates = games.filter((game) => game.directory);
  if (!candidates.length) return;
  const game = candidates[Math.floor(Math.random() * candidates.length)];
  window.location.assign(`/${encodedPath(game.directory)}/index.html`);
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => setFilter(button.dataset.filter));
});

document.querySelectorAll("[data-random]").forEach((button) => {
  button.addEventListener("click", playRandomGame);
});

searchInput.addEventListener("input", renderGames);
document.addEventListener("keydown", (event) => {
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
  if (event.key === "Escape" && document.activeElement === searchInput) {
    searchInput.value = "";
    searchInput.blur();
    renderGames();
  }
});

fetch("/games/catalog.json")
  .then((response) => {
    if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
    return response.json();
  })
  .then((catalog) => {
    if (!Array.isArray(catalog)) throw new Error("The game catalog has an invalid format");
    games = catalog
      .filter((game) => game && typeof game.name === "string" && typeof game.directory === "string")
      .sort((a, b) => a.name.localeCompare(b.name));
    gameCount.textContent = String(games.length);
    allCount.textContent = String(games.length);
    updateFavoriteCount();
    renderShowcase();
    renderGames();
  })
  .catch((error) => {
    grid.replaceChildren();
    const message = document.createElement("p");
    message.className = "loading-state";
    message.textContent = `The arcade could not be loaded. ${error.message}`;
    grid.append(message);
  });

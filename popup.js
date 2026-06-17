const STORAGE_KEY = "yt_paused_videos";

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function buildLink(videoId, time) {
  return `https://www.youtube.com/watch?v=${videoId}&t=${time}`;
}

function relativeTime(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "только что";
  if (mins < 60) return `${mins} мин назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
}

function showStatus(msg) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 1500);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(
    () => showStatus("Скопировано!"),
    () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      showStatus("Скопировано!");
    }
  );
}

function openVideo(videoId, time) {
  chrome.tabs.create({ url: buildLink(videoId, time) });
}

async function loadSaved() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] || [];
}

function renderCurrentTab(videos) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    const url = new URL(tabs[0].url);
    if (!url.hostname.includes("youtube.com")) return;

    const params = new URLSearchParams(url.search);
    const videoId = params.get("v");
    if (!videoId) return;

    const video = tabs[0].title.replace(" - YouTube", "").trim();
    const current = videos.find((v) => v.id === videoId);

    const section = document.getElementById("currentVideo");
    section.classList.remove("hidden");

    document.getElementById("currentTitle").textContent = video;
    document.getElementById("currentTime").textContent = current
      ? `Пауза: ${formatTime(current.time)}`
      : "Видео";

    document.getElementById("copyCurrent").onclick = () => {
      const time = current ? current.time : 0;
      copyToClipboard(buildLink(videoId, time));
    };
  });
}

function renderList(videos) {
  const container = document.getElementById("savedList");
  const empty = document.getElementById("empty");

  if (videos.length === 0) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  videos.forEach((item) => {
    const div = document.createElement("div");
    div.className = "saved-item";
    div.innerHTML = `
      <img class="saved-thumb" src="${item.thumbnail}" alt="" loading="lazy" />
      <div class="saved-info">
        <div class="saved-title">${item.title}</div>
        <div class="saved-meta">${formatTime(item.time)} · ${relativeTime(item.savedAt)}</div>
      </div>
      <div class="saved-actions">
        <button class="btn-icon" data-action="copy" title="Копировать ссылку">📋</button>
        <button class="btn-icon" data-action="delete" title="Удалить">✕</button>
      </div>
    `;

    div.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]")?.dataset.action;
      if (action === "delete") {
        deleteItem(item.id);
        div.remove();
        if (videos.length <= 1) empty.classList.remove("hidden");
        return;
      }
      if (action === "copy") {
        copyToClipboard(buildLink(item.id, item.time));
        return;
      }
      openVideo(item.id, item.time);
    });

    container.appendChild(div);
  });
}

async function deleteItem(videoId) {
  const videos = await loadSaved();
  const updated = videos.filter((v) => v.id !== videoId);
  chrome.storage.local.set({ [STORAGE_KEY]: updated });
}

async function init() {
  const videos = await loadSaved();
  renderCurrentTab(videos);
  renderList(videos);

  document.getElementById("clearAll").addEventListener("click", async () => {
    if (!confirm("Очистить историю?")) return;
    chrome.storage.local.set({ [STORAGE_KEY]: [] });
    document.getElementById("savedList").innerHTML = "";
    document.getElementById("empty").classList.remove("hidden");
    showStatus("История очищена");
  });
}

init();

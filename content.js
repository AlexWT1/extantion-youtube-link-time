(() => {
  const STORAGE_KEY = "yt_paused_videos";

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("v");
  }

  function getVideoTitle() {
    const el = document.querySelector(
      "h1.ytd-watch-metadata yt-formatted-string"
    );
    return el ? el.textContent.trim() : document.title;
  }

  function savePaused(videoId, time, title, thumbnail) {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const videos = result[STORAGE_KEY] || [];
      const existing = videos.findIndex((v) => v.id === videoId);
      const entry = {
        id: videoId,
        time: Math.floor(time),
        title,
        thumbnail,
        savedAt: new Date().toISOString(),
      };

      if (existing >= 0) {
        videos[existing] = entry;
      } else {
        videos.unshift(entry);
      }

      if (videos.length > 50) videos.pop();

      chrome.storage.local.set({ [STORAGE_KEY]: videos });
    });
  }

  function setupListener() {
    const video = document.querySelector("video");
    if (!video) return;

    video.removeEventListener("pause", onPaused);
    video.addEventListener("pause", onPaused);
  }

  function onPaused() {
    const videoId = getVideoId();
    if (!videoId) return;

    const video = document.querySelector("video");
    if (!video || video.currentTime < 1) return;

    const title = getVideoTitle();
    const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    savePaused(videoId, video.currentTime, title, thumbnail);
  }

  setupListener();

  const observer = new MutationObserver(() => {
    const video = document.querySelector("video");
    if (video) setupListener();
  });

  observer.observe(document.body, { childList: true, subtree: true });
})();

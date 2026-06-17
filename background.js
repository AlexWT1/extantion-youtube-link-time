chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("yt_paused_videos", (result) => {
    if (!result.yt_paused_videos) {
      chrome.storage.local.set({ yt_paused_videos: [] });
    }
  });
});

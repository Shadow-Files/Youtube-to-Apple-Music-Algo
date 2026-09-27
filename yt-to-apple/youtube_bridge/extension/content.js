(() => {
  const SEND_INTERVAL_MS = 3000;
  const COMMAND_INTERVAL_MS = 500;

  let lastSent = null;
  let lastCommand = null;

  function getVideoId() {
    const url = new URL(window.location.href);
    return url.searchParams.get("v");
  }

  function getTitle() {
    const el = document.querySelector(
      "h1.ytd-watch-metadata yt-formatted-string, ytd-watch-metadata h1 yt-formatted-string"
    );

    if (el && el.textContent.trim()) {
      return el.textContent.trim();
    }

    return document.title
      .replace(/ - YouTube$/, "")
      .trim();
  }

  function getVideoElement() {
    return (
      document.querySelector("video.html5-main-video") ||
      document.querySelector("video")
    );
  }

  function buildState() {
    const videoId = getVideoId();

    if (!videoId) {
      return null;
    }

    const video = getVideoElement();

    return {
      videoId: videoId,
      title: getTitle(),
      url: window.location.href,
      isPlaying: video
        ? !video.paused && !video.ended
        : false,
      timestamp: Date.now()
    };
  }

  function stateChanged(a, b) {
    if (!a || !b) {
      return a !== b;
    }

    return (
      a.videoId !== b.videoId ||
      a.isPlaying !== b.isPlaying ||
      a.title !== b.title
    );
  }

  function report(force = false) {
    const state = buildState();

    if (!state) {
      return;
    }

    if (force || stateChanged(lastSent, state)) {
      lastSent = state;

      chrome.runtime.sendMessage({
        type: "NOW_PLAYING",
        payload: state
      });
    }
  }

  setInterval(() => {
    report(false);
  }, SEND_INTERVAL_MS);

  document.addEventListener(
    "yt-navigate-finish",
    () => {
      report(true);
    }
  );

  function attachVideoListeners() {
    const video = getVideoElement();

    if (!video || video.dataset.bridgeAttached) {
      return;
    }

    video.dataset.bridgeAttached = "true";

    video.addEventListener("play", () => {
      report(true);
    });

    video.addEventListener("pause", () => {
      report(true);
    });
  }

  setInterval(attachVideoListeners, 1000);

  report(true);

  async function checkCommands() {
    try {
      const response = await fetch(
        "http://localhost:5005/command"
      );

      if (!response.ok) {
        return;
      }

      const data = await response.json();

      if (
        data.commandId === lastCommand
      ) {
        return;
      }

      if (data.action === "PAUSE_YOUTUBE") {
        lastCommand = data.commandId;

        const video = getVideoElement();

        if (video && !video.paused) {
          console.log(
            "[yt-bridge] PAUSING YOUTUBE"
          );

          video.pause();
          report(true);
        }

        return;
      }

      if (data.action === "OPEN_APPLE_MUSIC") {
        lastCommand = data.commandId;

        if (data.url) {
          console.log(
            "[yt-bridge] OPENING APPLE MUSIC:",
            data.url
          );

          chrome.runtime.sendMessage({
            type: "OPEN_APPLE_MUSIC",
            url: data.url
          });
        }
      }

    } catch (error) {
      // Ignore connection errors.
    }
  }

  setInterval(
    checkCommands,
    COMMAND_INTERVAL_MS
  );
})();

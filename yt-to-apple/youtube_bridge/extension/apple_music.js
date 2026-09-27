(() => {
  const CHECK_INTERVAL_MS = 500;
  const MAX_WAIT_MS = 60000;

  let target = null;
  let started = false;
  let startedAt = Date.now();


  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }


  function titleMatches(wanted, actual) {

    wanted = normalize(wanted);
    actual = normalize(actual);

    if (!wanted || !actual) {
      return false;
    }

    return (
      actual.includes(wanted) ||
      wanted.includes(actual)
    );
  }


  function artistMatches(wanted, text) {

    wanted = normalize(wanted);
    text = normalize(text);

    if (!wanted) {
      return true;
    }

    return text.includes(wanted);
  }


  function findMatchingButton() {

    if (!target) {
      return null;
    }

    const wantedTitle = normalize(
      target.title
    );

    const wantedArtist = normalize(
      target.artist
    );


    console.log(
      "[yt-bridge] Searching Apple Music for:",
      target.title,
      "|",
      target.artist
    );


    const rows = [
      ...document.querySelectorAll(
        ".songs-list-row__song-name"
      )
    ];


    for (const songName of rows) {

      const actualTitle =
        songName.textContent.trim();

      if (!titleMatches(
        wantedTitle,
        actualTitle
      )) {
        continue;
      }


      const column =
        songName.closest(
          ".songs-list__col--song"
        );

      if (!column) {
        continue;
      }


      const row =
        column.parentElement;

      const rowText =
        row?.innerText || "";


      if (!artistMatches(
        wantedArtist,
        rowText
      )) {
        continue;
      }


      const button =
        column.querySelector(
          'button[data-testid="play-button"]'
        );


      if (button) {
        return button;
      }
    }


    // Fallback: inspect all play buttons.
    const buttons = [
      ...document.querySelectorAll(
        'button[data-testid="play-button"]'
      )
    ];


    for (const button of buttons) {

      const label =
        button.getAttribute(
          "aria-label"
        ) || "";


      const cleaned =
        label.replace(
          /^Explicit,\s*/i,
          ""
        );


      const labelWithoutPlay =
        cleaned.replace(
          /^Play\s+/i,
          ""
        );


      if (
        titleMatches(
          wantedTitle,
          labelWithoutPlay
        ) &&
        artistMatches(
          wantedArtist,
          labelWithoutPlay
        )
      ) {
        return button;
      }
    }


    return null;
  }


  function tryPlay() {

    if (started) {
      return;
    }


    const button =
      findMatchingButton();


    if (button) {

      started = true;


      console.log(
        "[yt-bridge] MATCH FOUND:"
      );

      console.log(
        "[yt-bridge] Play button:",
        button.getAttribute(
          "aria-label"
        )
      );


      button.click();


      console.log(
        "[yt-bridge] APPLE MUSIC PLAY CLICKED"
      );


      return;
    }


    if (
      Date.now() - startedAt <
      MAX_WAIT_MS
    ) {

      setTimeout(
        tryPlay,
        CHECK_INTERVAL_MS
      );

    } else {

      console.warn(
        "[yt-bridge] Could not find matching Apple Music song."
      );
    }
  }


  chrome.runtime.onMessage.addListener(
    (message) => {

      if (
        message?.type !==
        "PLAY_APPLE_MUSIC_MATCH"
      ) {
        return;
      }


      target = {
        title: message.title || "",
        artist: message.artist || ""
      };


      started = false;
      startedAt = Date.now();


      console.log(
        "[yt-bridge] Received Apple Music target:",
        target.title,
        "|",
        target.artist
      );


      tryPlay();
    }
  );


  console.log(
    "[yt-bridge] Apple Music content script loaded:",
    window.location.href
  );
})();

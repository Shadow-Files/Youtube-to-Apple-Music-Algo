const ENDPOINT = "http://localhost:5005/now-playing";

let pendingAppleMusicTarget = null;


// --------------------------------------------------
// Send YouTube state to Python service
// --------------------------------------------------

chrome.runtime.onMessage.addListener((message) => {

  if (message?.type === "NOW_PLAYING") {

    fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(message.payload)
    }).catch((err) => {

      console.warn(
        "[yt-bridge] failed to reach local service:",
        err.message
      );

    });

    return;
  }

});


// --------------------------------------------------
// Poll Python commands
// --------------------------------------------------

async function checkCommand() {

  try {

    const response = await fetch(
      "http://localhost:5005/command"
    );

    if (!response.ok) {
      return;
    }

    const data = await response.json();

    if (
      !data.commandId ||
      data.commandId === checkCommand.lastCommandId
    ) {
      return;
    }

    checkCommand.lastCommandId =
      data.commandId;


    // ----------------------------------------------
    // Open Apple Music
    // ----------------------------------------------

    if (
      data.action === "OPEN_APPLE_MUSIC"
    ) {

      const url = data.url;

      if (
        !url ||
        !url.startsWith(
          "https://music.apple.com/"
        )
      ) {

        console.warn(
          "[yt-bridge] Invalid Apple Music URL:",
          url
        );

        return;
      }


      pendingAppleMusicTarget = {

        title: data.title || "",

        artist: data.artist || "",

        url: url

      };


      console.log(
        "[yt-bridge] Apple Music target:",
        pendingAppleMusicTarget
      );


      const tab = await chrome.tabs.create({
        url: url,
        active: true
      });


      console.log(
        "[yt-bridge] Apple Music tab created:",
        tab.id
      );


      return;
    }


    // ----------------------------------------------
    // Pause YouTube
    // ----------------------------------------------

    if (
      data.action === "PAUSE_YOUTUBE"
    ) {

      const tabs =
        await chrome.tabs.query({});

      for (const tab of tabs) {

        if (
          tab.id &&
          tab.url &&
          tab.url.includes(
            "youtube.com/watch"
          )
        ) {

          try {

            await chrome.tabs.sendMessage(
              tab.id,
              {
                type: "PAUSE_YOUTUBE"
              }
            );

          } catch (error) {

            console.warn(
              "[yt-bridge] Could not pause YouTube:",
              error.message
            );

          }

        }

      }

    }

  } catch (error) {

    // Local service may not be running.
    // Ignore connection errors.

  }

}


checkCommand.lastCommandId = null;


setInterval(
  checkCommand,
  500
);


// --------------------------------------------------
// Apple Music tab finished loading
// --------------------------------------------------

chrome.tabs.onUpdated.addListener(
  async (tabId, changeInfo, tab) => {

    if (
      changeInfo.status !== "complete"
    ) {
      return;
    }


    if (
      !tab.url ||
      !tab.url.startsWith(
        "https://music.apple.com/"
      )
    ) {
      return;
    }


    if (!pendingAppleMusicTarget) {
      return;
    }


    const target =
      pendingAppleMusicTarget;


    console.log(
      "[yt-bridge] Apple Music loaded."
    );

    console.log(
      "[yt-bridge] Sending target to Apple Music:",
      target.title,
      "|",
      target.artist
    );


    try {

      await chrome.tabs.sendMessage(
        tabId,
        {
          type: "PLAY_APPLE_MUSIC_MATCH",

          title: target.title,

          artist: target.artist
        }
      );


      console.log(
        "[yt-bridge] Target sent successfully."
      );


      pendingAppleMusicTarget = null;

    } catch (error) {

      console.warn(
        "[yt-bridge] Apple Music content script not ready:",
        error.message
      );

    }

  }
);

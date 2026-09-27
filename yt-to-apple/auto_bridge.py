import time
import json
import urllib.parse
import urllib.request

from ytmusicapi import YTMusic


SERVICE_URL = "http://localhost:5005"
BROWSER_JSON = "browser.json"

CHECK_INTERVAL = 3

yt = YTMusic(BROWSER_JSON)

last_video_id = None
last_sent_url = None


def get_state():
    try:
        with urllib.request.urlopen(
            f"{SERVICE_URL}/now-playing",
            timeout=2
        ) as response:
            return json.load(response)

    except Exception:
        return None


def send_command(action, url=None, title=None, artist=None):
    data = {
        "action": action
    }

    if url:
        data["url"] = url

    if title:
        data["title"] = title

    if artist:
        data["artist"] = artist

    request = urllib.request.Request(
        f"{SERVICE_URL}/command",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json"
        },
        method="POST"
    )

    with urllib.request.urlopen(
        request,
        timeout=2
    ) as response:
        return json.load(response)


def search_apple_music(title, artist):
    query = f"{title} {artist}"

    params = urllib.parse.urlencode({
        "term": query,
        "media": "music",
        "entity": "song",
        "limit": 5
    })

    url = (
        "https://itunes.apple.com/search?"
        + params
    )

    with urllib.request.urlopen(
        url,
        timeout=10
    ) as response:
        data = json.load(response)

    return data.get("results", [])


def get_youtube_track(video_id):

    result = yt.get_watch_playlist(
        videoId=video_id,
        radio=True,
        limit=1
    )

    tracks = result.get("tracks", [])

    if not tracks:
        return None

    track = tracks[0]

    title = track.get(
        "title",
        ""
    )

    artists = ", ".join(
        artist["name"]
        for artist in track.get(
            "artists",
            []
        )
    )

    return {
        "title": title,
        "artist": artists
    }


def find_apple_match(title, artist):

    results = search_apple_music(
        title,
        artist
    )

    if not results:
        return None

    wanted_artist = artist.lower()

    # First try an artist match.
    for result in results:

        result_artist = result.get(
            "artistName",
            ""
        ).lower()

        if (
            wanted_artist
            and wanted_artist in result_artist
        ):
            return result

    # Otherwise use the first result.
    return results[0]


def clean_apple_url(url):

    if not url:
        return None

    # Prefer the India storefront.
    if url.startswith(
        "https://music.apple.com/us/"
    ):
        url = url.replace(
            "https://music.apple.com/us/",
            "https://music.apple.com/in/",
            1
        )

    return url


def main():

    global last_video_id
    global last_sent_url

    print()
    print("======================================")
    print(" YouTube → Apple Music Bridge")
    print("======================================")
    print()
    print("Watching localhost:5005...")
    print()

    while True:

        state = get_state()

        if not state:
            time.sleep(CHECK_INTERVAL)
            continue

        video_id = state.get(
            "videoId"
        )

        is_playing = state.get(
            "isPlaying"
        )

        if not video_id:
            time.sleep(CHECK_INTERVAL)
            continue

        if not is_playing:
            time.sleep(CHECK_INTERVAL)
            continue

        if video_id == last_video_id:
            time.sleep(CHECK_INTERVAL)
            continue

        last_video_id = video_id

        print()
        print("--------------------------------------")
        print("YouTube detected")
        print("Video ID:", video_id)

        try:

            track = get_youtube_track(
                video_id
            )

            if not track:

                print(
                    "❌ Could not identify YouTube track."
                )

                continue

            title = track["title"]
            artist = track["artist"]

            print()
            print("YouTube:")
            print(
                f"  {title} — {artist}"
            )

            print()
            print("Searching Apple Music...")

            match = find_apple_match(
                title,
                artist
            )

            if not match:

                print(
                    "❌ No Apple Music match found."
                )

                continue

            apple_title = match.get(
                "trackName",
                ""
            )

            apple_artist = match.get(
                "artistName",
                ""
            )

            apple_url = match.get(
                "trackViewUrl"
            )

            apple_url = clean_apple_url(
                apple_url
            )

            print()
            print("Apple Music:")
            print(
                f"  {apple_title} — {apple_artist}"
            )

            print()
            print("Clean Apple Music URL:")
            print(
                f"  {apple_url}"
            )

            if not apple_url:

                print(
                    "❌ Apple Music result has no URL."
                )

                continue

            if apple_url == last_sent_url:

                print(
                    "Already sent this Apple Music URL."
                )

                continue

            last_sent_url = apple_url

            print()
            print("Opening Apple Music...")

            send_command(
                "OPEN_APPLE_MUSIC",
                url=apple_url,
                title=title,
                artist=artist
            )

            time.sleep(2)

            print(
                "Pausing YouTube..."
            )

            send_command(
                "PAUSE_YOUTUBE"
            )

            print()
            print(
                "✅ Bridge handoff complete."
            )

        except Exception as e:

            print()
            print("❌ Error:")
            print(e)

        time.sleep(
            CHECK_INTERVAL
        )


if __name__ == "__main__":
    main()

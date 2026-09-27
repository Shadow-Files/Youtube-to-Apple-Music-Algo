from ytmusicapi import YTMusic

# Put the ID from a normal YouTube music URL here.
# Example:
# https://www.youtube.com/watch?v=dQw4w9WgXcQ
# VIDEO_ID = "dQw4w9WgXcQ"

VIDEO_ID = "Bea019pOw5w"

yt = YTMusic("browser.json")

print("\nGetting YouTube recommendations...\n")

try:
    result = yt.get_watch_playlist(
        videoId=VIDEO_ID,
        radio=True,
        limit=10
    )

    tracks = result.get("tracks", [])

    if not tracks:
        print("❌ No tracks were returned.")
        exit()

    print("CURRENT:")
    current = tracks[0]

    artists = ", ".join(
        artist["name"]
        for artist in current.get("artists", [])
    )

    print(f"🎵 {current['title']} — {artists}")

    print("\nRECOMMENDATIONS:")

    for i, track in enumerate(tracks[1:], 1):
        artists = ", ".join(
            artist["name"]
            for artist in track.get("artists", [])
        )

        print(f"{i}. {track['title']} — {artists}")

except Exception as e:
    print("\n❌ Error:")
    print(e)

import json
import urllib.parse
import urllib.request


def search_apple_music(title, artist):
    query = f"{title} {artist}"

    params = urllib.parse.urlencode({
        "term": query,
        "media": "music",
        "entity": "song",
        "limit": 5
    })

    url = f"https://itunes.apple.com/search?{params}"

    with urllib.request.urlopen(url) as response:
        data = json.load(response)

    return data["results"]


if __name__ == "__main__":
    title = "After Dark"
    artist = "Mr.Kitty"

    results = search_apple_music(title, artist)

    print(f"Found {len(results)} results:\n")

    for i, song in enumerate(results, 1):
        print(f"{i}. {song.get('trackName')}")
        print(f"   Artist: {song.get('artistName')}")
        print(f"   Album: {song.get('collectionName')}")
        print(f"   Apple Music: {song.get('trackViewUrl')}")
        print()

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timezone

app = Flask(__name__)
CORS(app)

state = {
    "videoId": None,
    "title": None,
    "url": None,
    "isPlaying": False,
    "timestamp": None,
    "received_at": None,
}

command = {
    "action": None,
    "url": None,
    "title": None,
    "artist": None,
    "commandId": 0,
}


@app.route("/now-playing", methods=["GET"])
def get_now_playing():
    return jsonify(state), 200


@app.route("/now-playing", methods=["POST"])
def receive_now_playing():

    data = request.get_json(silent=True)

    if not data or "videoId" not in data:
        return jsonify({
            "error": "expected JSON with at least a videoId field"
        }), 400

    state.update({
        "videoId": data.get("videoId"),
        "title": data.get("title"),
        "url": data.get("url"),
        "isPlaying": bool(
            data.get("isPlaying", False)
        ),
        "timestamp": data.get("timestamp"),
        "received_at": datetime.now(
            timezone.utc
        ).isoformat(),
    })

    return jsonify({
        "ok": True,
        "state": state
    }), 200


@app.route("/command", methods=["GET"])
def get_command():

    return jsonify({
        "action": command["action"],
        "url": command["url"],
        "title": command["title"],
        "artist": command["artist"],
        "commandId": command["commandId"]
    }), 200


@app.route("/command", methods=["POST"])
def set_command():

    data = request.get_json(silent=True) or {}

    action = data.get("action")

    if action not in [
        "PAUSE_YOUTUBE",
        "OPEN_APPLE_MUSIC"
    ]:
        return jsonify({
            "error": "unknown command"
        }), 400


    if action == "OPEN_APPLE_MUSIC":

        url = data.get("url")
        title = data.get("title")
        artist = data.get("artist")

        if (
            not url
            or not url.startswith(
                "https://music.apple.com/"
            )
        ):
            return jsonify({
                "error": (
                    "OPEN_APPLE_MUSIC requires "
                    "a valid Apple Music URL"
                )
            }), 400

        command["url"] = url
        command["title"] = title or ""
        command["artist"] = artist or ""


    else:

        command["url"] = None
        command["title"] = None
        command["artist"] = None


    command["commandId"] += 1
    command["action"] = action


    print(
        f"[COMMAND] {action} "
        f"(id={command['commandId']})"
    )


    if command["url"]:
        print(
            f"[COMMAND] URL: "
            f"{command['url']}"
        )

        print(
            f"[COMMAND] TITLE: "
            f"{command['title']}"
        )

        print(
            f"[COMMAND] ARTIST: "
            f"{command['artist']}"
        )


    return jsonify({
        "ok": True,
        "action": action,
        "url": command["url"],
        "title": command["title"],
        "artist": command["artist"],
        "commandId": command["commandId"]
    }), 200


if __name__ == "__main__":

    print()
    print("======================================")
    print(" YouTube → Apple Music Local Service")
    print("======================================")
    print()
    print(
        "Listening on "
        "http://localhost:5005"
    )
    print()

    app.run(
        host="127.0.0.1",
        port=5005,
        debug=False
    )

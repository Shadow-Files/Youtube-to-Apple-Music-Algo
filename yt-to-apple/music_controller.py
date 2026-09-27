import subprocess


def music_command(script):
    result = subprocess.run(
        ["osascript", "-e", script],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip())

    return result.stdout.strip()


def play():
    music_command('tell application "Music" to play')


def pause():
    music_command('tell application "Music" to pause')


def next_track():
    music_command('tell application "Music" to next track')


def current_track():
    result = music_command(
        'tell application "Music" to get {name of current track, artist of current track}'
    )

    return result


if __name__ == "__main__":
    print("Current:", current_track())

    print("Pausing...")
    pause()

    print("Playing...")
    play()

    print("Done.")

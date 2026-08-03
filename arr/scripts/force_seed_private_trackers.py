import json
import time
import urllib.request

BASE_URL = "http://gluetun:8088"
TRACKER_PATTERNS = ("myanonamouse", "torrentleech", "tleechreload")
POLL_INTERVAL_SECONDS = 900


def get(path):
    with urllib.request.urlopen(f"{BASE_URL}{path}", timeout=15) as resp:
        return json.load(resp)


def post(path, body):
    req = urllib.request.Request(f"{BASE_URL}{path}", data=body.encode(), method="POST")
    urllib.request.urlopen(req, timeout=15)


def is_private_tracker_torrent(torrent_hash):
    trackers = get(f"/api/v2/torrents/trackers?hash={torrent_hash}")
    return any(p in t["url"].lower() for t in trackers for p in TRACKER_PATTERNS)


def run_once():
    for torrent in get("/api/v2/torrents/info"):
        if torrent.get("force_start"):
            continue
        if is_private_tracker_torrent(torrent["hash"]):
            post("/api/v2/torrents/setForceStart", f"hashes={torrent['hash']}&value=true")
            print(f"forced: {torrent['name']}", flush=True)


while True:
    try:
        run_once()
    except Exception as e:
        print(f"error: {e}", flush=True)
    time.sleep(POLL_INTERVAL_SECONDS)

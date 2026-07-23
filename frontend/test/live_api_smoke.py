import json
import os
import sys
from urllib.error import HTTPError
from urllib.request import urlopen


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

base_url = os.environ.get("LOCATION_GUIDE_URL", "http://127.0.0.1:3199")
paths = [
    "/",
    "/api/data-sources",
    "/api/places?lat=37.5665&lng=126.978&radiusKm=1&category=cafe&limit=5",
    "/api/benefits?limit=5",
    "/api/cafes?limit=5",
]
results = []

for path in paths:
    try:
        with urlopen(base_url + path, timeout=35) as response:
            body = response.read().decode("utf-8")
            payload = json.loads(body) if path.startswith("/api/") else None
            results.append({
                "path": path,
                "status": response.status,
                "items": len(payload.get("items", [])) if payload else None,
            })
    except HTTPError as error:
        payload = json.loads(error.read().decode("utf-8"))
        results.append({
            "path": path,
            "status": error.code,
            "errorCode": payload.get("error", {}).get("code"),
        })

print(json.dumps(results, ensure_ascii=False, indent=2))
assert results[0]["status"] == 200
assert results[1]["status"] == 200 and isinstance(results[1]["items"], int)
assert results[2]["status"] == 200 and results[2]["items"] > 0
assert results[3]["status"] in (200, 502, 503)
if results[3]["status"] == 502:
    assert results[3]["errorCode"] == "BENEFIT_API_AUTH_ERROR"
assert results[4]["status"] in (200, 503)

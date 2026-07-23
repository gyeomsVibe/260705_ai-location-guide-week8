import json
import os
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

base_url = os.environ.get("LOCATION_GUIDE_URL", "http://127.0.0.1:3213")
screenshot = Path(os.environ.get("LIVE_REACT_SCREENSHOT", r"C:\tmp\ai-location-react-live-results.png"))
screenshot.parent.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1728, "height": 1100})
    page_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.goto(base_url, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_load_state("networkidle", timeout=30000)

    page.get_by_role("button", name="카페", exact=True).click()
    expect(page.locator(".place-card").first).to_be_visible(timeout=30000)
    result_count = page.locator(".place-card").count()
    assert result_count > 0
    page.screenshot(path=str(screenshot), full_page=True)

    page.get_by_role("tab", name="정부 혜택").click()
    expect(page.get_by_role("heading", name="동네에서 뭐 할까?")).to_have_count(0)
    page.get_by_role("button", name="소상공인").click()
    expect(page.get_by_role("link", name="정부24에서 계속 찾기")).to_be_visible(timeout=30000)
    assert not page_errors, page_errors
    browser.close()
    print(json.dumps({"status": "passed", "placeResults": result_count, "screenshot": str(screenshot)}, ensure_ascii=False))

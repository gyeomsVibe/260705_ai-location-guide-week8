import json
import os
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = os.environ.get("LOCATION_GUIDE_URL", "http://127.0.0.1:3101")
ARTIFACT_DIR = Path(os.environ.get("MIA_ARTIFACT_DIR", r"C:\tmp\ai-location-react-mia"))
ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)


def place_payload(url):
    category = parse_qs(urlparse(url).query).get("category", ["restaurant"])[0]
    label = {"cafe": "카페", "park": "공원", "gym": "헬스장"}.get(category, "식당")
    return {
        "items": [
            {
                "id": f"node-{category}-1",
                "name": f"서울 테스트 {label}",
                "category": category,
                "address": "서울 중구 세종대로",
                "lat": 37.567,
                "lng": 126.979,
                "distanceKm": 0.3,
                "sourceUrl": "https://www.openstreetmap.org/node/1",
            },
            {
                "id": f"node-{category}-2",
                "name": f"두 번째 {label}",
                "category": category,
                "address": "서울 중구 을지로",
                "lat": 37.568,
                "lng": 126.98,
                "distanceKm": 0.7,
                "sourceUrl": "https://www.openstreetmap.org/node/2",
            },
        ],
        "count": 2,
        "attribution": "© OpenStreetMap contributors",
    }


def prepare_page(browser, viewport, geo_mode="success"):
    page = browser.new_page(viewport=viewport)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.route("https://*.tile.openstreetmap.org/**", lambda route: route.abort())
    page.route(
        "**/api/places?**",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(place_payload(route.request.url), ensure_ascii=False),
        ),
    )
    page.route(
        "**/api/benefits?**",
        lambda route: route.fulfill(
            status=503,
            content_type="application/json",
            body='{"error":{"code":"PUBLIC_API_NOT_CONFIGURED","message":"not configured"}}',
        ),
    )
    page.route(
        "**/api/data-sources",
        lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body='{"items":[],"checkedAt":"2026-07-24T00:00:00.000Z"}',
        ),
    )
    page.add_init_script(
        f"""
        Object.defineProperty(navigator, 'geolocation', {{ configurable: true, value: {{
          getCurrentPosition(success, error) {{
            if ('{geo_mode}' === 'denied') return error({{ code: 1 }});
            success({{ coords: {{ latitude: 37.5665, longitude: 126.978 }} }});
          }}
        }} }});
        """
    )
    page.goto(BASE_URL, wait_until="domcontentloaded")
    page.wait_for_load_state("networkidle")
    return page, errors


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)

    page, errors = prepare_page(browser, {"width": 1728, "height": 1100})
    expect(page.get_by_role("heading", name="오늘, 어디로 갈까요?")).to_be_visible()
    expect(page.get_by_label("서울시청 주변 지도")).to_be_visible()
    assert page.locator(".category").count() == 6
    layout = page.evaluate(
        """() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          workspaceHeight: document.querySelector('.explore-workspace').getBoundingClientRect().height,
          mapWidth: document.querySelector('.map-frame').getBoundingClientRect().width,
          bodyHasVerticalScroll: document.documentElement.scrollHeight > innerHeight
        })"""
    )
    assert layout["documentWidth"] <= layout["viewportWidth"]
    assert layout["workspaceHeight"] == 1028
    assert layout["mapWidth"] > 1200
    assert layout["bodyHasVerticalScroll"] is False

    page.get_by_role("button", name="카페", exact=True).click()
    expect(page.get_by_text("서울 테스트 카페")).to_be_visible()
    expect(page.get_by_text("0.3km · cafe")).to_be_visible()
    page.screenshot(path=str(ARTIFACT_DIR / "desktop-explore.png"), full_page=True)

    page.get_by_role("tab", name="정부 혜택").click()
    expect(page.get_by_role("heading", name="놓치기 쉬운 혜택, 조건부터 좁혀보세요.")).to_be_visible()
    expect(page.get_by_role("heading", name="동네에서 뭐 할까?")).to_have_count(0)
    expect(page.get_by_role("button", name="소상공인")).to_be_visible()
    assert page.locator(".benefit-presets button").count() == 4
    page.get_by_role("button", name="소상공인").click()
    expect(page.get_by_role("link", name="정부24에서 계속 찾기")).to_be_visible()
    expect(page.get_by_text("API키")).to_have_count(0)
    page.screenshot(path=str(ARTIFACT_DIR / "desktop-benefits.png"), full_page=True)
    assert not errors, errors
    page.close()

    denied_page, denied_errors = prepare_page(browser, {"width": 1280, "height": 800}, "denied")
    denied_page.get_by_role("button", name="내 위치").click()
    expect(denied_page.get_by_text("위치 권한이 꺼져 있습니다. 위 지역 목록으로 계속 탐색할 수 있어요.")).to_be_visible()
    expect(denied_page.get_by_label("탐색 기준")).to_be_enabled()
    assert not denied_errors, denied_errors
    denied_page.close()

    mobile, mobile_errors = prepare_page(browser, {"width": 390, "height": 844})
    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth")
    expect(mobile.get_by_label("서울시청 주변 지도")).to_be_visible()
    mobile.get_by_role("tab", name="정부 혜택").click()
    expect(mobile.get_by_role("heading", name="동네에서 뭐 할까?")).to_have_count(0)
    assert mobile.locator(".benefit-presets button").count() == 4
    assert mobile.evaluate("document.documentElement.scrollWidth <= innerWidth")
    mobile.screenshot(path=str(ARTIFACT_DIR / "mobile-benefits.png"), full_page=True)
    assert not mobile_errors, mobile_errors
    mobile.close()

    browser.close()
    print(json.dumps({"status": "passed", "layout": layout, "artifacts": str(ARTIFACT_DIR)}, ensure_ascii=False))

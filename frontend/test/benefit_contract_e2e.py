import json
import os
import re
import sys

from playwright.sync_api import expect, sync_playwright


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

base_url = os.environ.get("LOCATION_GUIDE_URL", "http://127.0.0.1:5173")


def fulfill_api(route):
    path = route.request.url
    if "/api/benefits" in path:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {
                    "items": [
                        {
                            "id": "official-small-business",
                            "name": "소상공인 지원사업 공식 확인",
                            "summary": "현재 모집 중인 공식 지원사업을 확인합니다.",
                            "agency": "소상공인시장진흥공단",
                            "supportType": "공식 지원 정보",
                            "detailUrl": "https://www.sbiz24.kr/",
                        }
                    ],
                    "count": 1,
                    "degraded": True,
                },
                ensure_ascii=False,
            ),
        )
        return
    if "/api/geocode" in path:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {
                    "items": [
                        {
                            "label": "서면 · 부산광역시 · 대한민국",
                            "lat": 35.1577,
                            "lng": 129.0592,
                        }
                    ],
                    "count": 1,
                    "attribution": "test",
                },
                ensure_ascii=False,
            ),
        )
        return
    if "/api/places" in path:
        route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(
                {
                    "items": [
                        {
                            "id": "place-1",
                            "name": "서면 테스트 장소",
                            "category": "cafe",
                            "address": "부산광역시 부산진구",
                            "lat": 35.1578,
                            "lng": 129.0593,
                            "distanceKm": 0.2,
                        }
                    ],
                    "count": 1,
                    "attribution": "test",
                },
                ensure_ascii=False,
            ),
        )
        return
    route.fulfill(status=200, content_type="application/json", body='{"items":[]}')


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 960},
        permissions=[],
    )
    page = context.new_page()
    page_errors = []
    console_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on(
        "console",
        lambda message: console_errors.append(message.text)
        if message.type == "error"
        else None,
    )
    page.route("**/api/**", fulfill_api)
    page.goto(base_url, wait_until="networkidle", timeout=60000)

    region_input = page.get_by_role("textbox", name="전국 지역 검색")
    region_input.fill("부산 서면")
    page.get_by_role("button", name="이동").click()
    expect(page.get_by_text(re.compile(r"서면 · 부산광역시.*중심으로"))).to_be_visible()

    page.get_by_role("button", name="동네 모임").click()
    expect(page.get_by_text("서면 테스트 장소", exact=True)).to_be_visible()

    page.get_by_role("tab", name="정부 지원 정보").click()
    expect(page.get_by_role("heading", name="공식 지원사업, 확인 경로부터 찾으세요.")).to_be_visible()
    expect(page.get_by_text("원시 API 오류 대신 공식 확인 경로까지 이어드립니다.")).to_have_count(0)

    page.get_by_role("button", name="소상공인").click()
    expect(page.get_by_role("heading", name="공식 확인 경로")).to_be_visible()
    expect(page.get_by_role("heading", name="소상공인 지원사업 공식 확인")).to_be_visible()
    expect(page.get_by_text(re.compile(r"맞춤 판정 결과가 아니라"))).to_be_visible()
    expect(page.get_by_role("link", name="상세 확인")).to_have_attribute(
        "href", "https://www.sbiz24.kr/"
    )

    assert not page_errors, page_errors
    assert not console_errors, console_errors
    browser.close()
    print(
        json.dumps(
            {
                "status": "passed",
                "flows": [
                    "nationwide-region-search",
                    "neighborhood-scenario",
                    "government-support-contract",
                ],
            },
            ensure_ascii=False,
        )
    )

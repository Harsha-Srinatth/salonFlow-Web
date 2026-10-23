"""
End-to-end test of the full-screen service photo viewer (customer booking page).

usage (from fn/):  python e2e/service_photo_viewer.py [--headed]
needs: backend on :18081, this frontend's dev server on :55000 (open as 127.0.0.1 so the
session cookie is same-site), and the local QA accounts (`node bn/scripts/qa-accounts.mjs create`).

Nothing is written to any database. The test signs in as the QA customer, then intercepts the
services API to give three real catalog services 5 / 1 / 0 photos, and answers the photo URLs
(Cloudinary-shaped, so the app's resize transforms are exercised) from inside the test, with one
photo returning 404. Screenshots go to e2e/.out/. Exit code 1 on any failed check.
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

API = "http://127.0.0.1:18081"
APP = "http://127.0.0.1:55000"
HERE = Path(__file__).resolve().parent
OUT = HERE / ".out"
CREDS = HERE.parent.parent / "bn" / ".qa-accounts.local.json"
CDN = "https://res.cloudinary.com/sahasra-e2e/image/upload/qa"
PHOTOS = [f"{CDN}/p1.svg", f"{CDN}/p2.svg", f"{CDN}/p3.svg", f"{CDN}/missing.svg", f"{CDN}/p4.svg"]
SIZES = {"p1": (1600, 1200), "p2": (900, 1600), "p3": (1200, 1200), "p4": (2400, 800)}
VIEWPORTS = [("desktop", 1440, 900), ("laptop", 1366, 768), ("tablet", 768, 1024), ("mobile", 390, 844)]

failures = []


def check(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + ("" if ok or not detail else f"  -> {detail}"))
    if not ok:
        failures.append(name)


def svg(name):
    w, h = SIZES[name]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
        f'<rect width="100%" height="100%" fill="#2f6f4f"/><text x="50%" y="50%" fill="#fff" font-size="{w // 10}" '
        f'font-family="sans-serif" text-anchor="middle" dominant-baseline="middle">{name} {w}x{h}</text></svg>'
    )


def login_cookie():
    creds = json.loads(CREDS.read_text())["USER"]
    req = urllib.request.Request(f"{API}/api/auth/login", data=json.dumps(creds).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req) as res:
        for header in res.headers.get_all("Set-Cookie"):
            name, _, rest = header.partition("=")
            value = rest.split(";")[0]
            if name == "app_access_token" and value:
                return value
    raise SystemExit("could not sign in as the QA customer")


def main(headed):
    OUT.mkdir(exist_ok=True)
    token = login_cookie()
    picked = {}
    photo_requests = []

    def services_route(route):
        response = route.fetch()
        data = response.json()
        services = data["services"]
        multi, single, none = services[0], services[1], services[2]
        multi.update(image=PHOTOS[0], gallery=PHOTOS[1:], images=PHOTOS)
        single.update(image=PHOTOS[2], gallery=[], images=[PHOTOS[2]])
        none.update(image=None, gallery=[], images=[])
        picked.update(multi=multi["name"], single=single["name"], none=none["name"])
        # Fresh headers: the API gzips JSON, and the rewritten body is not compressed.
        route.fulfill(status=200, json=data)

    def photo_route(route):
        url = route.request.url
        photo_requests.append(url)
        name = url.rsplit("/", 1)[-1].removesuffix(".svg")
        if name not in SIZES:
            return route.fulfill(status=404, body="")
        route.fulfill(status=200, content_type="image/svg+xml", body=svg(name))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=not headed)
        for label, width, height in VIEWPORTS:
            mobile = width < 768
            ctx = browser.new_context(viewport={"width": width, "height": height}, has_touch=mobile, is_mobile=mobile, device_scale_factor=1)
            ctx.add_cookies([{"name": "app_access_token", "value": token, "url": API}])
            page = ctx.new_page()
            photo_requests.clear()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.route(re.compile(r".*/api/customer/services(\?.*)?$"), services_route)
            page.route(re.compile(r"^https://res\.cloudinary\.com/sahasra-e2e/.*"), photo_route)
            page.goto(f"{APP}/user-dashboard/appointments")
            # First visit may show the birthday prompt; it is not part of this test.
            try:
                page.get_by_role("button", name="Maybe later").click(timeout=4000)
            except Exception:
                pass
            multi_btn = page.get_by_role("button", name=f"{picked['multi']}: view 5 photos full screen")
            multi_btn.wait_for(timeout=15000)
            print(f"\n== {label} {width}x{height}")
            check(f"[{label}] cards ask for card-sized photos, not full size", not any("w_1600" in u for u in photo_requests))
            check(f"[{label}] service without photos has no photo button", page.evaluate("n => [...document.querySelectorAll('button[aria-label$=\"full screen\"]')].filter(b => b.getAttribute('aria-label').startsWith(n + ':')).length", picked["none"]) == 0)
            check(f"[{label}] service without photos still opens details", page.get_by_role("button", name=f"{picked['none']}: view details").count() == 1)

            page.mouse.wheel(0, 200)
            page.wait_for_timeout(300)
            scroll_before = page.evaluate("(document.querySelector('main') || document.scrollingElement).scrollTop")
            photo_requests.clear()
            multi_btn.click()
            dialog = page.get_by_role("dialog")
            dialog.wait_for()
            counter = dialog.locator("header [aria-live]")
            check(f"[{label}] opens on the tapped service with a 1 / 5 counter", counter.inner_text().endswith("1 / 5"), counter.inner_text())
            check(f"[{label}] title is the service name", dialog.get_by_role("heading").inner_text() == picked["multi"])
            dialog.evaluate("el => Promise.all(el.getAnimations().map(a => a.finished))")
            box = dialog.bounding_box()
            check(f"[{label}] viewer covers the whole viewport", box and box["width"] == width and box["height"] == height, box)
            check(f"[{label}] page behind is scroll-locked", page.evaluate("getComputedStyle(document.body).overflow") == "hidden")
            page.wait_for_function("() => [...document.querySelectorAll('[role=dialog] [aria-roledescription=slide] img')].some(i => i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === '1')")
            full = [u for u in photo_requests if "w_1600" in u]
            check(f"[{label}] only the shown photo and its neighbour are downloaded full size", sorted(u.rsplit('/', 1)[-1] for u in full) == ["p1.svg", "p2.svg"], full)
            img = dialog.locator("[aria-roledescription=slide] img").first
            fit = img.evaluate("i => [getComputedStyle(i).objectFit, i.getBoundingClientRect().width / i.getBoundingClientRect().height]")
            check(f"[{label}] photo is whole (object-fit contain, 4:3 kept)", fit[0] == "contain" and abs(fit[1] - 4 / 3) < 0.02, fit)
            inside = img.evaluate("i => { const r = i.getBoundingClientRect(), s = i.parentElement.getBoundingClientRect(); return [r.top >= s.top - 1 && r.bottom <= s.bottom + 1 && r.left >= s.left - 1 && r.right <= s.right + 1, [r.top, r.bottom], [s.top, s.bottom]] }")
            check(f"[{label}] photo fits inside its slide (not under the controls)", inside[0], inside)
            page.screenshot(path=str(OUT / f"viewer-{label}-1.png"))

            if mobile:
                check(f"[{label}] arrows are hidden on phones (swipe instead)", not dialog.get_by_role("button", name="Next photo").is_visible())
                # A horizontal swipe is a horizontal scroll of the track; scroll-snap settles it.
                track = dialog.locator("[aria-roledescription=slide]").first.locator("xpath=..")
                track.evaluate("t => t.scrollBy({ left: t.clientWidth, behavior: 'instant' })")
                page.wait_for_timeout(400)
                check(f"[{label}] swiping moves to 2 / 5", counter.inner_text().endswith("2 / 5"), counter.inner_text())
                track.evaluate("t => t.scrollBy({ left: -t.clientWidth, behavior: 'instant' })")
                page.wait_for_timeout(400)

            page.keyboard.press("ArrowRight")
            page.wait_for_function("() => { const i = document.querySelectorAll('[role=dialog] [aria-roledescription=slide]')[1].querySelector('img'); return i && i.complete && i.naturalWidth > 0 }")
            page.wait_for_timeout(700)
            portrait = dialog.locator("[aria-roledescription=slide]").nth(1).locator("img").evaluate("i => { const r = i.getBoundingClientRect(), s = i.parentElement.getBoundingClientRect(); return [r.top >= s.top - 1 && r.bottom <= s.bottom + 1, Math.abs(r.width / r.height - 900 / 1600) < 0.02] }")
            check(f"[{label}] portrait photo fits the height and keeps 9:16", portrait == [True, True], portrait)
            page.screenshot(path=str(OUT / f"viewer-{label}-portrait.png"))
            page.keyboard.press("Home")
            page.wait_for_timeout(700)
            # Three quick presses must all count (the glide to the next photo is still running).
            page.keyboard.press("ArrowRight")
            page.keyboard.press("ArrowRight")
            page.keyboard.press("ArrowRight")
            check(f"[{label}] rapid arrow keys land on 4 / 5", counter.inner_text().endswith("4 / 5"), counter.inner_text())
            page.wait_for_timeout(900)
            slide4 = dialog.locator("[aria-roledescription=slide]").nth(3)
            check(f"[{label}] a missing photo shows a clear message, not a broken image", "couldn't load" in slide4.inner_text())
            page.keyboard.press("End")
            page.wait_for_timeout(700)
            check(f"[{label}] End goes to the last photo", counter.inner_text().endswith("5 / 5"))
            page.keyboard.press("ArrowRight")
            page.wait_for_timeout(300)
            check(f"[{label}] navigation stops at the last photo", counter.inner_text().endswith("5 / 5"))
            if not mobile:
                check(f"[{label}] Next is disabled on the last photo", dialog.get_by_role("button", name="Next photo").is_disabled())
                dialog.get_by_role("button", name="Show photo 2").click()
                page.wait_for_timeout(700)
                check(f"[{label}] thumbnail jumps to 2 / 5", counter.inner_text().endswith("2 / 5"), counter.inner_text())
                dialog.get_by_role("button", name="Previous photo").click()
                page.wait_for_timeout(700)
                check(f"[{label}] Previous goes to 1 / 5", counter.inner_text().endswith("1 / 5"), counter.inner_text())
            page.screenshot(path=str(OUT / f"viewer-{label}-2.png"))

            page.keyboard.press("Escape")
            dialog.wait_for(state="detached")
            check(f"[{label}] Escape closes the viewer", page.get_by_role("dialog").count() == 0)
            check(f"[{label}] page scroll is released", page.evaluate("getComputedStyle(document.body).overflow") != "hidden")
            scroll_after = page.evaluate("(document.querySelector('main') || document.scrollingElement).scrollTop")
            check(f"[{label}] page position is kept", abs(scroll_after - scroll_before) < 2, (scroll_before, scroll_after))
            focused = page.evaluate("document.activeElement?.getAttribute('aria-label') || ''")
            check(f"[{label}] focus returns to the photo that opened it", focused.startswith(picked["multi"]), focused)

            page.get_by_role("button", name=f"{picked['single']}: view photo full screen").click()
            dialog = page.get_by_role("dialog")
            dialog.wait_for()
            check(f"[{label}] single photo shows 1 / 1", dialog.locator("header [aria-live]").inner_text().endswith("1 / 1"))
            check(f"[{label}] single photo has no arrows or thumbnails", dialog.get_by_role("button", name="Next photo").count() == 0 and dialog.locator("footer").count() == 0)
            dialog.get_by_role("button", name="Close photos").click()
            dialog.wait_for(state="detached")
            # Same viewer from inside the service details (carousel -> full screen -> back to details).
            page.get_by_role("button", name=f"{picked['multi']}: view details").click()
            page.get_by_role("button", name="View photo 1 full screen").click()
            viewer = page.get_by_role("dialog", name=picked["multi"]).filter(has=page.locator("header [aria-live]"))
            viewer.wait_for()
            check(f"[{label}] details carousel opens the same viewer at 1 / 5", viewer.locator("header [aria-live]").inner_text().endswith("1 / 5"))
            page.keyboard.press("Escape")
            viewer.wait_for(state="detached")
            check(f"[{label}] Escape closes only the viewer; details stay open", page.get_by_role("dialog").count() == 1)
            page.keyboard.press("Escape")
            check(f"[{label}] no page errors", not errors, errors)
            ctx.close()
        browser.close()
    print(f"\n{len(failures)} failed" if failures else "\nall passed")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main("--headed" in sys.argv)

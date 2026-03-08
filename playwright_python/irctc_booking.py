import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import requests
from playwright.async_api import TimeoutError as PlaywrightTimeoutError
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
BOOKING_DATA_PATH = ROOT / "cypress" / "fixtures" / "passenger_data.json"
OCR_SERVER_SCRIPT = ROOT / "irctc-captcha-solver" / "app-server.py"
CAPTCHA_SOLVER_URL = os.getenv("CAPTCHA_SOLVER_URL", "http://localhost:5000/extract-text")
MAX_CAPTCHA_ATTEMPTS = int(os.getenv("MAX_CAPTCHA_ATTEMPTS", "25"))
UPI_REGEX = re.compile(r"^[a-zA-Z0-9]+@[a-zA-Z0-9.]+$")

TATKAL_OPEN_TIMINGS = {
    "2A": "10:00",
    "3A": "10:00",
    "3E": "10:00",
    "1A": "10:00",
    "CC": "10:00",
    "EC": "10:00",
    "2S": "11:00",
    "SL": "11:00",
}


def load_booking_data():
    return json.loads(BOOKING_DATA_PATH.read_text())


def format_travel_date(input_date: str) -> str:
    dt = datetime.strptime(input_date, "%d/%m/%Y")
    return dt.strftime("%a, %d %b")


def has_tatkal_opened(coach: str) -> bool:
    open_time = TATKAL_OPEN_TIMINGS.get(coach)
    if not open_time:
        return True
    now = datetime.now()
    hour, minute = map(int, open_time.split(":"))
    return (now.hour, now.minute) >= (hour, minute)




def parse_solver_host_port(url: str) -> tuple[str, int]:
    parsed = urlparse(url)
    return parsed.hostname or "127.0.0.1", parsed.port or 5000


def wait_for_ocr_server(url: str, timeout_seconds: int = 30):
    start = time.time()
    health_url = url.rsplit("/", 1)[0] + "/"
    while time.time() - start < timeout_seconds:
        try:
            response = requests.get(health_url, timeout=2)
            if response.ok:
                return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError(f"OCR server did not become ready within {timeout_seconds}s: {health_url}")


def start_ocr_server() -> subprocess.Popen:
    host, port = parse_solver_host_port(CAPTCHA_SOLVER_URL)
    cmd = [sys.executable, str(OCR_SERVER_SCRIPT), "--host", host, "--port", str(port)]
    process = subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wait_for_ocr_server(CAPTCHA_SOLVER_URL)
    return process

def solve_captcha_via_ocr(image_src: str) -> str:
    response = requests.post(CAPTCHA_SOLVER_URL, json={"image": image_src}, timeout=20)
    response.raise_for_status()
    payload = response.json()
    extracted = payload.get("extracted_text", "")
    if not extracted:
        raise RuntimeError("OCR solver returned empty captcha")
    return extracted


async def get_or_create_page(browser):
    if browser.contexts and browser.contexts[0].pages:
        page = browser.contexts[0].pages[0]
    else:
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = await context.new_page()
    return page


async def solve_captcha(page, manual_captcha: bool):
    for _ in range(MAX_CAPTCHA_ATTEMPTS):
        body_text = await page.locator("body").inner_text()
        if "Logout" in body_text or "Payment Methods" in body_text:
            return

        if manual_captcha:
            await page.locator("#captcha").focus()
            await page.wait_for_timeout(2000)
            continue

        image_src = await page.locator(".captcha-img").get_attribute("src")
        if not image_src:
            raise RuntimeError("Captcha image not found")

        captcha_text = solve_captcha_via_ocr(image_src)
        await page.locator("#captcha").fill(captcha_text)
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(700)

    raise RuntimeError(f"Captcha solve exceeded attempts ({MAX_CAPTCHA_ATTEMPTS})")


async def run_booking(cdp_url: str, manual_captcha: bool, auto_start_ocr: bool):
    booking = load_booking_data()
    username = os.getenv("USERNAME")
    password = os.getenv("PASSWORD")
    upi_id = os.getenv("UPI_ID", booking.get("UPI_ID_CONFIG", ""))

    if not username or not password:
        raise RuntimeError("Please set USERNAME and PASSWORD env vars")

    if booking.get("TATKAL") and booking.get("PREMIUM_TATKAL"):
        raise RuntimeError("Only one of TATKAL or PREMIUM_TATKAL can be true")

    ocr_process = start_ocr_server() if auto_start_ocr else None

    try:
        async with async_playwright() as p:
            browser = await p.chromium.connect_over_cdp(cdp_url)
            page = await get_or_create_page(browser)

            await page.goto("https://www.irctc.co.in/nget/train-search", wait_until="domcontentloaded", timeout=90000)

            await page.locator(".h_head1 > .search_btn").click()
            await page.locator('input[placeholder="User Name"]').fill(username)
            await page.locator('input[placeholder="Password"]').fill(password)

            await solve_captcha(page, manual_captcha)

            body_text = await page.locator("body").inner_text()
            if "Your Last Transaction" in body_text:
                await page.locator(".ui-dialog-footer .text-center .btn").click()

            await page.locator(".ui-autocomplete > .ng-tns-c57-8").fill(booking["SOURCE_STATION"])
            await page.locator("#p-highlighted-option").first.click()

            await page.locator(".ui-autocomplete > .ng-tns-c57-9").fill(booking["DESTINATION_STATION"])
            await page.locator("#p-highlighted-option").first.click()

            await page.locator(".ui-calendar").click()
            await page.keyboard.press("Control+A")
            await page.keyboard.press("Backspace")
            await page.locator(".ui-calendar").fill(booking["TRAVEL_DATE"])

            if booking.get("TATKAL") or booking.get("PREMIUM_TATKAL"):
                await page.locator("#journeyQuota .ui-dropdown").click()
                await page.locator(":nth-child(6) > .ui-dropdown-item" if booking.get("TATKAL") else ":nth-child(7) > .ui-dropdown-item").click()

            await page.locator(".col-md-3 > .search_btn").click()

            if booking.get("TATKAL") and not has_tatkal_opened(booking["TRAIN_COACH"]):
                expected = TATKAL_OPEN_TIMINGS[booking["TRAIN_COACH"]]
                await page.locator("div.h_head1").filter(has_text=expected).wait_for(timeout=300000)

            train_cards = page.locator(":nth-child(n) > .bull-back")
            count = await train_cards.count()
            opened = False

            for idx in range(count):
                card = train_cards.nth(idx)
                text = await card.inner_text()
                if booking["TRAIN_NO"] in text and booking["TRAIN_COACH"] in text:
                    await card.locator(f'text={booking["TRAIN_COACH"]}').first.click()
                    await page.locator(":nth-child(n) > .bull-back > app-train-avl-enq > :nth-child(1) > :nth-child(7) > :nth-child(1)").filter(
                        has_text=format_travel_date(booking["TRAVEL_DATE"])
                    ).first.click()
                    await page.locator(":nth-child(n) > .bull-back > app-train-avl-enq > [style='padding-top: 10px; padding-bottom: 20px;']").filter(
                        has_text="Book Now"
                    ).first.click()
                    opened = True
                    break

            if not opened:
                raise RuntimeError("Could not find matching train/coach block")

            if upi_id and UPI_REGEX.match(upi_id):
                print("Valid UPI configured; payment step can continue automatically.")

            print("Booking flow reached passenger/payment stages successfully.")
    finally:
        if ocr_process is not None:
            ocr_process.terminate()


async def main():
    parser = argparse.ArgumentParser(description="IRCTC booking via Playwright Python using CDP attach.")
    parser.add_argument("--cdp-url", default="http://127.0.0.1:9222", help="Brave/Chromium remote debugging URL")
    parser.add_argument("--manual-captcha", action="store_true", help="Use manual captcha entry instead of OCR")
    parser.add_argument("--auto-start-ocr", action="store_true", help="Start local OCR server automatically (Python-only mode)")
    args = parser.parse_args()

    try:
        await run_booking(args.cdp_url, args.manual_captcha, args.auto_start_ocr)
    except PlaywrightTimeoutError as exc:
        raise RuntimeError(f"Playwright timeout: {exc}") from exc


if __name__ == "__main__":
    asyncio.run(main())

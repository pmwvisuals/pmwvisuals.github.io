#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
AUTOMATION_DIR = ROOT / "automation"
STATE_PATH = AUTOMATION_DIR / "pinterest-state.json"
TOKEN_PATH = AUTOMATION_DIR / "pinterest-token.enc"
LAST_RUN_PATH = AUTOMATION_DIR / "pinterest-last-run.json"

API_BASE = "https://api.pinterest.com/v5"
SITE_BASE = "https://pmwvisuals.com/"
LOCAL_TZ = ZoneInfo(os.getenv("PINTEREST_TIMEZONE", "Asia/Colombo"))
DAILY_LIMIT = 13
DEFAULT_BATCH_SIZE = 4
SCOPES = "boards:read boards:write pins:read pins:write"


def log(message: str) -> None:
    print(message, flush=True)


def set_gh_output(name: str, value: Any) -> None:
    output = os.getenv("GITHUB_OUTPUT")
    if not output:
        return
    with open(output, "a", encoding="utf-8") as handle:
        handle.write(f"{name}={str(value).lower() if isinstance(value, bool) else value}\n")


def extract_assigned_json(path: Path, variable: str, opening: str) -> Any:
    """Extract a JSON array/object assigned to a JS global without evaluating JS."""
    text = path.read_text(encoding="utf-8")
    marker = text.find(variable)
    if marker < 0:
        raise ValueError(f"Could not find {variable!r} in {path}")
    eq = text.find("=", marker)
    if eq < 0:
        raise ValueError(f"Could not find assignment for {variable!r} in {path}")
    start = text.find(opening, eq)
    if start < 0:
        raise ValueError(f"Could not find JSON start for {variable!r} in {path}")

    closing = "]" if opening == "[" else "}"
    depth = 0
    in_string = False
    escaped = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
            continue
        if char == '"':
            in_string = True
            continue
        if char == opening:
            depth += 1
        elif char == closing:
            depth -= 1
            if depth == 0:
                return json.loads(text[start : index + 1])
    raise ValueError(f"Unterminated JSON assignment for {variable!r} in {path}")


def pick(item: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        value = item.get(key)
        if value not in (None, "", []):
            return value
    return None


def normalize_category(raw: Any) -> str:
    if isinstance(raw, list):
        raw = raw[0] if raw else None
    value = str(raw or "Other").strip()
    return value or "Other"


def image_url(item: dict[str, Any]) -> str | None:
    return pick(item, "image", "imageUrl", "image_url", "full", "fullImage", "download", "preview", "thumbnail")


def item_key(device: str, item: dict[str, Any]) -> str:
    return f"{device}:{item.get('id')}"


def board_name(device: str, category: str) -> str:
    clean = category.strip()
    if device == "desktop":
        clean = re.sub(r"\bdesktop\b", "", clean, flags=re.IGNORECASE).strip()
        if clean.lower().endswith("wallpapers"):
            clean = clean[: -len("wallpapers")].strip()
        return f"{clean} Desktop Wallpapers"[:180]
    if clean.lower().endswith("wallpapers"):
        return clean[:180]
    return f"{clean} Wallpapers"[:180]


def board_description(device: str, category: str) -> str:
    if device == "desktop":
        return (
            f"Free {category.lower()} desktop wallpapers from PMW Visuals for laptops, PCs, "
            "monitors and widescreen displays."
        )[:500]
    return (
        f"Free {category.lower()} mobile and phone wallpapers from PMW Visuals, "
        "curated for vertical screens and lock screens."
    )[:500]


def title_for_pin(device: str, item: dict[str, Any]) -> str:
    title = str(item.get("title") or "PMW Visuals Wallpaper").strip()
    suffix = "Desktop Wallpaper" if device == "desktop" else "Phone Wallpaper"
    if "wallpaper" not in title.lower():
        title = f"{title} | {suffix}"
    return title[:100].rstrip(" |-")


def description_for_pin(device: str, item: dict[str, Any], category: str) -> str:
    original = str(item.get("description") or "").strip()
    tags = [str(tag).strip() for tag in (item.get("tags") or []) if str(tag).strip()]
    device_phrase = "desktop, laptop and PC screens" if device == "desktop" else "phones and lock screens"
    fallback = (
        f"Download {item.get('title', 'this wallpaper')}, a free {category.lower()} wallpaper "
        f"from PMW Visuals for {device_phrase}."
    )
    text = original or fallback
    if "pmw visuals" not in text.lower():
        text = f"{text.rstrip('.')} — free from PMW Visuals."
    useful = []
    for tag in tags:
        if tag.lower() not in text.lower() and len(tag) <= 40:
            useful.append(tag)
        if len(useful) >= 3:
            break
    if useful:
        text = f"{text} Explore: {', '.join(useful)}."
    return text[:500].rstrip()


def canonical_link(device: str, item: dict[str, Any], page_map: dict[str, str]) -> str:
    item_id = str(item.get("id") or "")
    relative = page_map.get(item_id)
    if relative:
        return urllib.parse.urljoin(SITE_BASE, relative)
    if device == "desktop":
        return "https://pmwvisuals.com/?device=desktop#latest-wallpapers"
    return f"https://pmwvisuals.com/#wallpaper-{urllib.parse.quote(item_id)}"


def load_catalog() -> tuple[list[dict[str, Any]], dict[str, str]]:
    mobile = extract_assigned_json(ROOT / "wallpapers-data.js", "window.PMW_WALLPAPERS", "[")
    desktop = extract_assigned_json(ROOT / "desktop-wallpapers-data.js", "window.PMW_DESKTOP_WALLPAPERS", "[")
    page_map = extract_assigned_json(ROOT / "wallpaper-pages.js", "window.PMW_WALLPAPER_PAGES", "{")

    catalog: list[dict[str, Any]] = []
    seen: set[str] = set()
    for device, items in (("mobile", mobile), ("desktop", desktop)):
        for index, raw in enumerate(items):
            if not isinstance(raw, dict) or raw.get("visible") is False:
                continue
            item_id = str(raw.get("id") or "").strip()
            media = image_url(raw)
            if not item_id or not media:
                continue
            key = item_key(device, raw)
            if key in seen:
                continue
            seen.add(key)
            category = normalize_category(pick(raw, "category", "type", "categories", "types"))
            catalog.append(
                {
                    "key": key,
                    "device": device,
                    "index": index,
                    "id": item_id,
                    "title": str(raw.get("title") or item_id),
                    "description": str(raw.get("description") or ""),
                    "category": category,
                    "tags": raw.get("tags") or [],
                    "media_url": str(media),
                    "link": canonical_link(device, raw, page_map),
                    "board_name": board_name(device, category),
                    "board_description": board_description(device, category),
                    "pin_title": title_for_pin(device, raw),
                    "pin_description": description_for_pin(device, raw, category),
                }
            )
    return catalog, page_map


def interleave_by_category(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[str, deque[dict[str, Any]]] = defaultdict(deque)
    for item in items:
        grouped[item["board_name"]].append(item)
    names = sorted(grouped, key=str.casefold)
    output: list[dict[str, Any]] = []
    while names:
        next_names: list[str] = []
        for name in names:
            group = grouped[name]
            if group:
                output.append(group.popleft())
            if group:
                next_names.append(name)
        names = next_names
    return output


def ordered_catalog(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    mobile = interleave_by_category([item for item in catalog if item["device"] == "mobile"])
    desktop = interleave_by_category([item for item in catalog if item["device"] == "desktop"])
    return mobile + desktop


def fresh_state() -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    return {
        "version": 1,
        "posted": {},
        "failures": {},
        "daily_success": {},
        "boards": {},
        "created_at": now,
        "updated_at": now,
    }


def load_state() -> dict[str, Any]:
    if not STATE_PATH.exists():
        return fresh_state()
    state = json.loads(STATE_PATH.read_text(encoding="utf-8"))
    base = fresh_state()
    base.update(state)
    for key in ("posted", "failures", "daily_success", "boards"):
        base.setdefault(key, {})
    return base


def save_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def api_request(
    method: str,
    path: str,
    token: str,
    *,
    body: dict[str, Any] | None = None,
    query: dict[str, Any] | None = None,
    timeout: int = 45,
) -> dict[str, Any]:
    url = API_BASE + path
    if query:
        url += "?" + urllib.parse.urlencode(query)
    data = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            details = json.loads(raw)
        except Exception:
            details = {"raw": raw}
        error = RuntimeError(f"Pinterest API {method} {path} failed: HTTP {exc.code}: {details}")
        setattr(error, "status", exc.code)
        setattr(error, "details", details)
        raise error from exc


def refresh_access_token() -> str:
    """Exchange the GitHub-secret refresh token for a fresh access token."""
    app_id = os.getenv("PINTEREST_APP_ID", "").strip()
    app_secret = os.getenv("PINTEREST_APP_SECRET", "").strip()
    refresh_token = os.getenv("PINTEREST_REFRESH_TOKEN", "").strip()
    if not app_id or not app_secret or not refresh_token:
        raise RuntimeError(
            "PINTEREST_APP_ID, PINTEREST_APP_SECRET and PINTEREST_REFRESH_TOKEN are required"
        )

    credentials = base64.b64encode(f"{app_id}:{app_secret}".encode("utf-8")).decode("ascii")
    form = urllib.parse.urlencode(
        {"grant_type": "refresh_token", "refresh_token": refresh_token}
    ).encode("utf-8")
    request = urllib.request.Request(
        API_BASE + "/oauth/token",
        data=form,
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            data = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Pinterest token refresh failed: HTTP {exc.code}: {raw}") from exc

    access_token = data.get("access_token")
    if not access_token:
        raise RuntimeError(f"Pinterest token refresh returned no access token: {data}")
    return str(access_token)


def list_boards(token: str) -> dict[str, str]:
    by_name: dict[str, str] = {}
    bookmark: str | None = None
    while True:
        query: dict[str, Any] = {"page_size": 250}
        if bookmark:
            query["bookmark"] = bookmark
        data = api_request("GET", "/boards", token, query=query)
        for item in data.get("items", []) or []:
            name = str(item.get("name") or "").strip()
            board_id = str(item.get("id") or "").strip()
            if name and board_id:
                by_name[name.casefold()] = board_id
        bookmark = data.get("bookmark")
        if not bookmark:
            break
    return by_name


def ensure_board(token: str, state: dict[str, Any], item: dict[str, Any], remote: dict[str, str]) -> str:
    name = item["board_name"]
    cached = state["boards"].get(name)
    if cached:
        return str(cached)
    existing = remote.get(name.casefold())
    if existing:
        state["boards"][name] = existing
        return existing
    created = api_request(
        "POST",
        "/boards",
        token,
        body={"name": name, "description": item["board_description"], "privacy": "PUBLIC"},
    )
    board_id = str(created.get("id") or "")
    if not board_id:
        raise RuntimeError(f"Pinterest created board {name!r} but returned no id: {created}")
    state["boards"][name] = board_id
    remote[name.casefold()] = board_id
    log(f"Created board: {name}")
    return board_id


def create_pin(token: str, board_id: str, item: dict[str, Any]) -> dict[str, Any]:
    payload = {
        "board_id": board_id,
        "title": item["pin_title"],
        "description": item["pin_description"],
        "link": item["link"],
        "alt_text": item["title"][:500],
        "media_source": {
            "source_type": "image_url",
            "url": item["media_url"],
            "is_standard": True,
        },
    }
    return api_request("POST", "/pins", token, body=payload)


def today_key() -> str:
    return datetime.now(LOCAL_TZ).date().isoformat()


def queue_for(state: dict[str, Any], catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    posted = state.get("posted", {})
    return [item for item in ordered_catalog(catalog) if item["key"] not in posted]


def record_failure(state: dict[str, Any], item: dict[str, Any], exc: Exception) -> None:
    existing = state["failures"].get(item["key"], {})
    attempts = int(existing.get("attempts", 0)) + 1
    state["failures"][item["key"]] = {
        "attempts": attempts,
        "last_error": str(exc)[:2000],
        "last_attempt_at": datetime.now(timezone.utc).isoformat(),
        "title": item["title"],
        "link": item["link"],
    }


def run(dry_run: bool, max_pins: int, delay_seconds: int) -> int:
    AUTOMATION_DIR.mkdir(parents=True, exist_ok=True)
    catalog, _ = load_catalog()
    state = load_state()
    initial_queue = queue_for(state, catalog)
    day = today_key()
    already_today = int(state["daily_success"].get(day, 0))
    allowance = max(0, DAILY_LIMIT - already_today)
    planned = min(max_pins, allowance, len(initial_queue))

    log(f"Catalog: {len(catalog)} wallpapers | remaining: {len(initial_queue)}")
    log(f"Daily cap: {DAILY_LIMIT} | already posted today: {already_today} | this run: up to {planned}")

    if dry_run:
        preview_count = planned or min(max_pins, len(initial_queue))
        for item in initial_queue[:preview_count]:
            log(f"DRY RUN -> [{item['device']}] {item['title']} -> {item['board_name']} -> {item['link']}")
        summary = {
            "dry_run": True,
            "catalog_total": len(catalog),
            "remaining": len(initial_queue),
            "planned": planned,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        save_json(LAST_RUN_PATH, summary)
        set_gh_output("queue_empty", len(initial_queue) == 0)
        set_gh_output("remaining", len(initial_queue))
        return 0

    if not initial_queue:
        summary = {
            "dry_run": False,
            "catalog_total": len(catalog),
            "remaining": 0,
            "posted_this_run": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        save_json(LAST_RUN_PATH, summary)
        set_gh_output("queue_empty", True)
        set_gh_output("remaining", 0)
        return 0

    if allowance <= 0:
        log("Daily hard cap already reached; no Pins will be created in this run.")
        set_gh_output("queue_empty", False)
        set_gh_output("remaining", len(initial_queue))
        return 0

    token = refresh_access_token()
    remote_boards = list_boards(token)
    posted_this_run = 0
    attempted = 0

    queue = list(initial_queue)
    index = 0
    while posted_this_run < planned and index < len(queue):
        item = queue[index]
        index += 1
        attempted += 1
        try:
            board_id = ensure_board(token, state, item, remote_boards)
            result = create_pin(token, board_id, item)
            pin_id = str(result.get("id") or "")
            if not pin_id:
                raise RuntimeError(f"Pinterest returned no Pin id: {result}")
            state["posted"][item["key"]] = {
                "pin_id": pin_id,
                "posted_at": datetime.now(timezone.utc).isoformat(),
                "device": item["device"],
                "title": item["title"],
                "board": item["board_name"],
                "link": item["link"],
            }
            state["failures"].pop(item["key"], None)
            posted_this_run += 1
            state["daily_success"][day] = int(state["daily_success"].get(day, 0)) + 1
            log(f"POSTED {state['daily_success'][day]}/{DAILY_LIMIT} today: {item['title']} (Pin {pin_id})")
            if posted_this_run < planned and delay_seconds > 0:
                time.sleep(delay_seconds)
        except Exception as exc:
            record_failure(state, item, exc)
            log(f"FAILED: {item['title']} -> {exc}")
            status = getattr(exc, "status", None)
            if status in {401, 403, 429}:
                break
            continue

    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    save_json(STATE_PATH, state)
    remaining = len(queue_for(state, catalog))
    summary = {
        "dry_run": False,
        "catalog_total": len(catalog),
        "posted_total": len(state["posted"]),
        "posted_today": int(state["daily_success"].get(day, 0)),
        "posted_this_run": posted_this_run,
        "attempted_this_run": attempted,
        "remaining": remaining,
        "failures_open": len(state["failures"]),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    save_json(LAST_RUN_PATH, summary)
    log(json.dumps(summary, indent=2))
    set_gh_output("queue_empty", remaining == 0)
    set_gh_output("remaining", remaining)
    set_gh_output("posted_this_run", posted_this_run)
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="PMW Visuals Pinterest autopilot")
    parser.add_argument("--dry-run", action="store_true", help="Preview the next Pins without contacting Pinterest")
    parser.add_argument("--max-pins", type=int, default=DEFAULT_BATCH_SIZE, help="Maximum Pins to publish in this run")
    parser.add_argument("--delay-seconds", type=int, default=300, help="Delay between successful Pin creations")
    args = parser.parse_args()
    if args.max_pins < 1:
        parser.error("--max-pins must be at least 1")
    if args.delay_seconds < 0:
        parser.error("--delay-seconds cannot be negative")
    try:
        return run(args.dry_run, args.max_pins, args.delay_seconds)
    except Exception as exc:
        log(f"FATAL: {exc}")
        set_gh_output("queue_empty", False)
        return 1


if __name__ == "__main__":
    sys.exit(main())

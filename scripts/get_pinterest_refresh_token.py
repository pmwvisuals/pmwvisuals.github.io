#!/usr/bin/env python3
"""One-time helper to obtain a Pinterest OAuth refresh token safely on your computer.

Before running:
1. In Pinterest Developers > My apps > Configure, register this exact redirect URI:
   http://localhost:8765/callback
2. Reset the app secret if it has ever been exposed publicly.
3. Run: python scripts/get_pinterest_refresh_token.py

The script never writes the app secret or token to the repository.
"""

from __future__ import annotations

import base64
import getpass
import json
import secrets
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, HTTPServer

HOST = "127.0.0.1"
PORT = 8765
REDIRECT_URI = f"http://localhost:{PORT}/callback"
SCOPES = "boards:read,boards:write,pins:read,pins:write"
AUTHORIZE_URL = "https://www.pinterest.com/oauth/"
TOKEN_URL = "https://api.pinterest.com/v5/oauth/token"


class CallbackHandler(BaseHTTPRequestHandler):
    code: str | None = None
    returned_state: str | None = None
    error: str | None = None
    event = threading.Event()

    def do_GET(self) -> None:  # noqa: N802
        parsed = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed.query)
        CallbackHandler.code = (query.get("code") or [None])[0]
        CallbackHandler.returned_state = (query.get("state") or [None])[0]
        CallbackHandler.error = (query.get("error") or query.get("error_description") or [None])[0]

        if CallbackHandler.error:
            message = "Pinterest authorization failed. You can close this tab."
        elif CallbackHandler.code:
            message = "Pinterest authorization received. You can close this tab and return to the terminal."
        else:
            message = "No authorization code was received. You can close this tab."

        body = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>PMW Pinterest OAuth</title></head>
<body style="font-family:system-ui;padding:40px;max-width:720px;margin:auto">
<h1>PMW Visuals Pinterest setup</h1><p>{message}</p>
</body></html>""".encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        CallbackHandler.event.set()

    def log_message(self, format: str, *args) -> None:
        return


def exchange_code(app_id: str, app_secret: str, code: str) -> dict:
    credentials = base64.b64encode(f"{app_id}:{app_secret}".encode("utf-8")).decode("ascii")
    form = urllib.parse.urlencode(
        {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": REDIRECT_URI,
        }
    ).encode("utf-8")

    request = urllib.request.Request(
        TOKEN_URL,
        data=form,
        method="POST",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Pinterest token exchange failed: HTTP {exc.code}: {details}") from exc


def main() -> int:
    print("PMW Visuals — Pinterest refresh-token setup")
    print()
    print("Registered redirect URI must be exactly:")
    print(f"  {REDIRECT_URI}")
    print()

    app_id = input("Pinterest App ID: ").strip()
    app_secret = getpass.getpass("Pinterest App secret (hidden): ").strip()

    if not app_id or not app_secret:
        print("App ID and app secret are required.")
        return 1

    state = secrets.token_urlsafe(24)
    params = {
        "client_id": app_id,
        "redirect_uri": REDIRECT_URI,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
    }
    auth_url = AUTHORIZE_URL + "?" + urllib.parse.urlencode(params)

    server = HTTPServer((HOST, PORT), CallbackHandler)
    thread = threading.Thread(target=server.handle_request, daemon=True)
    thread.start()

    print("Opening Pinterest authorization in your browser...")
    print("Approve access to boards and Pins.")
    if not webbrowser.open(auth_url):
        print("\nOpen this URL manually:\n")
        print(auth_url)

    if not CallbackHandler.event.wait(timeout=300):
        server.server_close()
        print("Timed out waiting for Pinterest authorization.")
        return 1

    server.server_close()

    if CallbackHandler.error:
        print(f"Pinterest returned an error: {CallbackHandler.error}")
        return 1
    if CallbackHandler.returned_state != state:
        print("State verification failed. Do not use this authorization code.")
        return 1
    if not CallbackHandler.code:
        print("No authorization code was received.")
        return 1

    token = exchange_code(app_id, app_secret, CallbackHandler.code)
    refresh_token = token.get("refresh_token")
    access_token = token.get("access_token")
    scope = token.get("scope")
    refresh_expires = token.get("refresh_token_expires_in")

    if not refresh_token:
        print("Pinterest did not return a refresh token.")
        print(json.dumps({k: v for k, v in token.items() if "token" not in k}, indent=2))
        return 1

    print("\nSUCCESS")
    print(f"Granted scopes: {scope}")
    if refresh_expires:
        print(f"Refresh token lifetime reported by Pinterest: {refresh_expires} seconds")
    print("\nCopy ONLY the value below into the GitHub Actions secret named:")
    print("PINTEREST_REFRESH_TOKEN")
    print("\n--- REFRESH TOKEN (keep private) ---")
    print(refresh_token)
    print("--- END REFRESH TOKEN ---")
    print("\nDo not paste the token into chat, source code, commits, screenshots, or public notes.")
    if access_token:
        print("A short-lived access token was also generated, but the autopilot does not need you to store it.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Serve the Five by Five browser game as static files."""

from __future__ import annotations

import argparse
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.abspath(__file__))


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Five by Five in a browser.")
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="Port to listen on (default 8000)",
    )
    args = parser.parse_args()

    os.chdir(ROOT)
    socketserver.TCPServer.allow_reuse_address = True
    handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("127.0.0.1", args.port), handler) as httpd:
        print("Five by Five is in the browser: http://127.0.0.1:%s/" % args.port)
        httpd.serve_forever()


if __name__ == "__main__":
    main()

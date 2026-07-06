#!/usr/bin/env python3
"""Redact credentials from database URIs for safe sharing."""
from __future__ import annotations

import re
import sys
from urllib.parse import urlsplit, urlunsplit


def redact_uri(value: str) -> str:
    value = value.strip()
    if not value:
        return value
    try:
        parts = urlsplit(value)
    except Exception:
        return re.sub(r"(?i)(password|pwd|pass|token|secret)=([^;&\s]+)", r"\1=***", value)

    if parts.netloc and "@" in parts.netloc:
        creds, host = parts.netloc.rsplit("@", 1)
        if ":" in creds:
            user, _password = creds.split(":", 1)
            safe_netloc = f"{user}:***@{host}"
        else:
            safe_netloc = f"***@{host}"
        value = urlunsplit((parts.scheme, safe_netloc, parts.path, parts.query, parts.fragment))

    value = re.sub(r"(?i)(password|pwd|pass|token|secret)=([^;&\s]+)", r"\1=***", value)
    return value


def main() -> int:
    if len(sys.argv) > 1:
        inputs = sys.argv[1:]
    else:
        inputs = [line.rstrip("\n") for line in sys.stdin]
    for item in inputs:
        print(redact_uri(item))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

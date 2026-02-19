# Sonolus Chart Copier

A small web app for copying chart JSON from Sonolus-compatible servers.

## Features

- Works with **custom Sonolus server URLs** (not hardcoded to one host).
- Accepts either a plain level name (`my-chart`) or a full level URL.
- Tries multiple common API routes to support different Sonolus server setups.
- Copy loaded chart JSON to clipboard or download it as a `.json` file.
- Optional CORS proxy input for servers that block browser-origin requests.

## Run

Because this is a static app, you can open `index.html` directly, or serve it:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Notes

- Some servers disable CORS. Use your own proxy URL when needed.
- This tool only reads publicly available chart payloads that the target server allows.

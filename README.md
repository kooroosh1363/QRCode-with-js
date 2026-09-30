# QRForge — Trust-Aware QR Payload Workbench

QRForge is a browser-based QR payload workbench built from the repository's original 2023 JavaScript QR exercise. It keeps the original idea—generate QR codes in the browser—but turns it into a focused engineering demo around payload correctness, state integrity, privacy boundaries, and accessible interaction.

## Why this project exists

The original project rendered one hard-coded YouTube URL with a CDN-loaded QR library. That was useful as a learning exercise, but it did not demonstrate payload modeling, validation, state management, testing, deployment, or trust-boundary decisions.

QRForge preserves the repository history while evolving that exercise into a small, credible front-end system rather than adding an unnecessary backend or framework.

## What was modernized

- hard-coded QR output → structured URL, text, email, and Wi-Fi payload modes
- CDN dependency → bundled `qrcode` package
- implicit string handling → pure payload policy functions
- stale UI state → generation invalidation and async race protection
- persistent raw payload history → in-memory session history only
- weak Wi-Fi rules → protocol-aware SSID and WPA/WEP validation
- silent email truncation/case mutation → explicit validation with local-part preservation
- ad-hoc files → Vite build, Node tests, CI, and GitHub Pages workflow
- minimal README → architecture, data flow, security, scope, and deployment documentation

## Features

- URL payloads with automatic HTTPS normalization
- rejection of unsupported URL schemes and embedded URL credentials
- text payloads that preserve intentional whitespace
- email / `mailto:` payload generation
- Wi-Fi payloads with reserved-character escaping
- 32-byte SSID validation
- WPA/WPA2 passphrase and hexadecimal PSK validation
- legacy WEP key validation
- open-network payloads without password fields
- QR size controls
- error-correction levels L / M / Q / H
- exact encoded-payload preview
- copy-to-clipboard and PNG export
- bounded, deduplicated session history
- automatic invalidation of stale Copy/Download state after input changes
- protection against out-of-order asynchronous QR generation results
- keyboard focus styles, skip navigation, live status messages, and reduced-motion support

## Architecture

```text
index.html
   │
   ▼
assets/main.js ───────────────► qrcode
   │                              │
   │                              └─ PNG data URL generation
   │
   ├────────► src/payload.js
   │            ├─ mode normalization
   │            ├─ URL policy
   │            ├─ mailto construction
   │            ├─ Wi-Fi validation / escaping
   │            └─ display summaries
   │
   └────────► src/history.js
                ├─ session history normalization
                ├─ bounded deduplication
                └─ legacy localStorage cleanup
```

The project intentionally stays framework-free. Its complexity is concentrated in explicit policy modules instead of UI-framework abstractions that would not improve this scope.

## Data and state flow

```text
User input
  ↓
collectValues()
  ↓
normalizeInput()
  ├─ invalid → visible status + no export state
  └─ valid
       ↓
QRCode.toDataURL()
       ↓
request-version check
  ├─ stale async result → discard
  └─ current result
       ↓
preview + exact payload + copy/download state
       ↓
appendHistory() → in-memory session history
```

Any input change increments the generation version and invalidates the previous export. This prevents a user from editing the form and then accidentally copying or downloading an older payload that no longer matches the visible inputs.

## Security and privacy considerations

QRForge is a front-end demo with an explicit trust boundary:

- QR generation happens locally in the browser.
- No application backend receives payload content.
- New payload history is held in memory only and disappears on reload or tab close.
- The previous QRForge revision stored exact payload history in `localStorage`, which could include Wi-Fi credentials. The current app removes the legacy `qrforge:history:v1` key on load and does not write replacement payload history to persistent browser storage.
- URLs containing embedded usernames or passwords are rejected.
- User-controlled values are rendered with DOM text APIs rather than injected as HTML.
- No API keys, tokens, passwords, or environment secrets are required by the application.

A QR code does **not** prove that a URL or action is safe. QRForge does not perform malware scanning, phishing detection, destination reputation checks, or server-side verification.

## Local development

Requirements:

- Node.js 22+
- npm

Install and run:

```bash
npm install
npm run dev
```

## Tests

Run the Node test suite:

```bash
npm test
```

The suite covers URL rules, credential rejection, text semantics, email normalization and bounds, Wi-Fi escaping, WPA/WEP validation, open-network formatting, SSID byte limits, option normalization, payload summaries, history bounds, malformed history, and legacy storage cleanup.

## Production build

```bash
npm run build
npm run preview
```

Run the complete local quality gate with:

```bash
npm run check
```

That command performs JavaScript syntax checks, all Node tests, and a Vite production build.

## CI

`.github/workflows/quality.yml` runs on pull requests and pushes to `main` using Node.js 22. It installs dependencies and executes the same `npm run check` quality gate used locally.

The repository currently uses `npm install` rather than `npm ci` because no lockfile is maintained in this small repository. Dependency versions are pinned exactly in `package.json` to reduce drift.

## Deployment

The project is compatible with GitHub Pages.

1. Open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Run **Actions → Deploy Pages → Run workflow**.

The deployment workflow sets a Pages-specific Vite base path without changing local builds.

## Scope and limitations

QRForge is deliberately a browser-only QR generation workbench. It does not include:

- authentication
- a database
- server-side payload storage
- analytics
- URL reputation services
- malware or phishing detection
- QR scanning
- account synchronization

Those features are outside the purpose of this repository and would add complexity without strengthening its core engineering story.

## License

MIT.

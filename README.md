# QRForge — QR Payload & Export Lab

QRForge modernizes the original 2023 QR-code exercise into a browser-based payload engineering and export demo.

The original repository rendered one hard-coded YouTube channel URL with `qrcodejs` from a CDN. QRForge adds structured payload modes, explicit validation, local history, PNG export, tests, CI, and a bundled QR dependency.

## Features

- URL QR payloads
- plain-text QR payloads
- email / `mailto:` payloads
- Wi-Fi payloads
- URL normalization
- email validation
- Wi-Fi escaping rules
- QR size control
- error-correction levels L / M / Q / H
- local QR generation
- exact payload preview
- copy payload
- PNG download
- bounded local history
- corrupted-history fallback
- responsive and accessible UI

## Trust boundary

A QR code is only an encoded container. QRForge deliberately shows the exact payload before export.

The demo:

- generates QR codes in the browser;
- does not send payloads to a backend;
- stores only recent payload history in localStorage;
- does not guarantee that a scanned URL or action is trustworthy.

Users should still verify URLs and actions after scanning.

## Architecture

```text
payload.js
  ├── mode validation
  ├── URL normalization
  ├── mailto construction
  ├── Wi-Fi formatting
  └── human-readable summaries

history.js
  └── bounded local history

main.js
  ├── form orchestration
  ├── QR rendering
  ├── clipboard
  └── PNG export

qrcode
  └── bundled renderer
```

## Local development

Requirements:

- Node.js 20+

Run:

```bash
npm install
npm run dev
```

## Tests

```bash
npm test
```

The suite covers URL handling, text bounds, mailto payloads, Wi-Fi escaping, normalization, summaries, history bounds, deduplication, and clearing.

## Quality gate

```bash
npm run check
```

This runs JavaScript syntax checks, Node tests, and a Vite production build.

## GitHub Pages

Enable:

**Settings → Pages → Source → GitHub Actions**

Then run:

**Actions → Deploy Pages → Run workflow**

## Scope

QRForge is a front-end QR generation demo. It does not provide malware detection, phishing detection, URL reputation checks, or server-side validation.

## License

MIT.

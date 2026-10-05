# PassPorto — Passport Scanner & Document Manager

A professional, local-first web app for scanning passport images/PDFs, reviewing extracted fields, generating Excel (`.xlsx`) files, and managing those documents privately in your browser.

## Features

- Drag-and-drop / camera upload (JPG, JPEG, PNG, PDF)
- Browser-side OCR (Tesseract.js) + MRZ parsing (`mrz`)
- Editable review screen with confidence highlighting
- Excel generation with embedded passport photograph (ExcelJS)
- Documents library: view, download, rename, delete, search & filter
- Dashboard stats and quick actions
- Optional local PIN lock (PBKDF2) — data never leaves the device

## Privacy

- Passport images are **not** sent to third-party AI/OCR cloud APIs
- Documents are stored in **IndexedDB** in your browser only
- Passport numbers are masked in the UI by default
- Sensitive values are not placed in URLs
- Deleting a document removes the Excel blob and field snapshot

This app is for legitimate document-management use. It does not bypass passport security features or alter official passport data.

## Requirements

- Node.js 20+ (recommended)
- A modern browser with WebAssembly support (Chrome, Edge, Firefox, Safari)

## Environment variables

None required for local use. The app runs entirely in the browser.

If you later add a backend, keep passport binaries and PII off public URLs and enforce per-user authorization.

## How to run

```bash
npm install
npm run dev
```

### Port

The Vite development server runs on **port `5173`**.

Open the app at:

```text
http://localhost:5173
```

If Vite prints a different port (for example `5174`), use that instead.

### Opening the app from a Cursor Cloud Agent

When the app is started by a Cloud Agent, it runs on the **remote agent machine**, not on your laptop.

1. Open **Cursor Desktop**
2. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
3. Choose **Open Agents Window**
4. Open this Cloud Agent chat
5. In the **top-right of the agent panel**, click the **plug / connector icon** (Forwarded Ports)
6. Find port **`5173`**
7. Click **Open in Browser**

After forwarding, open:

```text
http://localhost:5173
```

If local port `5173` is already in use, Cursor may map it to another local port — use the exact URL shown in the Ports menu.

Note: the plug icon is only in **Cursor Desktop → Agents Window**. It is not available the same way on `cursor.com/agents` in a regular browser tab.

## How OCR works

1. The uploaded image (or first PDF page rendered via PDF.js) stays in memory.
2. **Tesseract.js** runs OCR in a Web Worker inside the browser.
3. The OCR text is scanned for **MRZ** lines (TD3 passport format preferred).
4. The `mrz` library parses checksum-backed fields (name, number, DOB, expiry, etc.).
5. Label-based OCR heuristics fill additional visible fields (issue date, place of birth, authority) when found.
6. OCR and MRZ values are compared; mismatches are flagged for review — **values are never invented**.
7. A heuristic skin-tone/region detector attempts to crop the passport photograph for the review screen and Excel embed.

## Where documents are stored

- Browser **IndexedDB** database: `passport-scanner-local`
- Object stores: `documents` (Excel blobs + metadata), `settings`
- Clearing site data for this origin permanently deletes stored passports/exports

## Production build

```bash
npm run build
npm run preview
```

Serve the `dist/` folder over **HTTPS** in production.

## Limitations

- OCR accuracy depends on image quality, lighting, and language/script
- Non-Latin passports may need additional Tesseract language data
- Photograph cropping is heuristic (not a neural face detector) and may miss atypical layouts
- MRZ detection can fail on skewed, cropped, or low-resolution scans
- IndexedDB storage is device/browser-specific and not synced across devices
- This is not a substitute for certified identity verification systems

## Project structure

```
src/
  components/   # UI building blocks (uploader, form, documents, dialogs)
  context/      # App state (documents, settings, toasts)
  lib/          # OCR, MRZ, Excel, storage, validation, privacy
  pages/        # Dashboard, Scan, Documents, Settings
  types/        # Shared TypeScript types
```

## Scripts

| Command        | Description              |
|----------------|--------------------------|
| `npm run dev`  | Start Vite dev server    |
| `npm run build`| Typecheck + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run oxlint               |

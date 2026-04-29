# jobmeta — pre-submission cheat-sheet (2026-04-27, Stage 1 of canon)

Reality-checked against current store policy text. Anything marked `[VERIFIED]` came from official policy URLs fetched today; `[PRACTICE]` is from documented industry behaviour / dev-blog confirmations.

## Quick sanity table

| Limit / rule                       | Chrome Web Store                                  | Firefox AMO                          | Edge Add-ons                                |
|------------------------------------|---------------------------------------------------|--------------------------------------|---------------------------------------------|
| Name max chars                     | 75                                                | (use `name` from manifest)           | (use manifest `name`)                       |
| Short description                  | **132** chars / locale `[VERIFIED]`               | summary **250** chars `[VERIFIED]`   | comes from **manifest `short_description`** — no separate input — must edit manifest + reupload `[VERIFIED]` |
| Detailed description               | no hard limit; ≤4 000 review-friendly             | no hard limit                        | min **250**, max **10 000** chars / lang     |
| Icon (manifest)                    | 128×128 PNG                                       | 32×32 + 64×64 PNG/JPEG/SVG           | 128×128 minimum, 300×300 recommended         |
| Promo / store tile                 | 440×280 small + 1400×560 marquee (Featured only)  | n/a                                  | 440×280 + 1400×560 (both optional)           |
| Screenshots                        | **1280×800** (or 640×400), 1–5, ≥1 required       | 1280×800 recommended, 1.6:1 ratio    | 640×480 OR 1280×800, up to 6                 |
| Search terms / tags                | n/a                                               | tags free-form                       | **7 phrases**, 30 chars each, total ≤21 words |
| Source-code submission             | not required (but no remote code)                 | **REQUIRED** if webpack/vite/uglify  | no obfuscation; reviewers may request unminified |
| Single-purpose                     | mandatory `[VERIFIED]`                            | recommended                          | mandatory `[VERIFIED]`                       |
| Min runtime                        | MV3 (`service_worker`, no `unsafe-eval`)          | **140.0** for built-in consent UI    | latest Chromium-Edge                          |
| Test creds for review              | volunteered = avoid review-clock reset            | optional                             | **mandatory for paid** (1.3.1)               |

## CWS — what to check before zipping

- **Short description (132 chars per locale).** Plain text only. The 132 cap applies per locale — auto-rejection if any locale overshoots.
- **No keyword spam.** Don't list ATS brand names ("LinkedIn, Workday, Greenhouse, Lever, Ashby, BambooHR…") in description; reviewers will reject under "Yellow Argon — Keyword Spam". Pick 3–4 names max, write in prose ("supports leading ATS platforms like LinkedIn, Workday, Greenhouse, and many others"). Don't repeat the same keyword >5 times.
- **No brand grep-bait.** Don't say "ChatGPT-style", "GPT-powered", "Claude-grade". Say "AI-powered", "LLM-backed".
- **Single-purpose sentence (CWS dashboard field).** Frame as ONE purpose: *"Helps job seekers complete job applications by auto-filling forms and generating tailored cover letters."* Avoid the word "and" connecting two unrelated verbs.
- **Permission justifications** — write one for each:
  - `host_permissions` (specific ATS hosts, **not `<all_urls>`**) — *"to detect and fill application form fields on supported ATS platforms"*
  - `storage` — *"Store the user's resume profile and preferences locally for autofill."*
  - `scripting` — *"Inject the autofill engine into application form pages on user click."*
  - `activeTab` — *"Read field labels on the current job-application page only when the user clicks the jobmeta toolbar icon."*
  - **NO** `tabs` permission unless mandatory.
  - **NO** `identity` unless we ship Google OAuth (we don't yet).
- **No remote code.** All JS bundled in the zip. Loading a CDN-hosted helper in the popup = instant Blue Argon rejection.
- **Privacy Practices form** — check all three of: *no sale*, *no unrelated transfer*, *no creditworthiness*. Data types declared must match privacy policy verbatim — declare **PII** + **Website content**. Don't try to skirt with "Technical/Interaction".
- **Resume-on-server disclosure.** Description AND privacy policy must say: *"Cover letters are generated server-side. Resume content sent to our servers is not retained beyond 24 hours."*

## AMO — what to check before zipping

- **`data_collection_permissions` mandatory.** Manifest snippet for jobmeta:
  ```json
  "browser_specific_settings": {
    "gecko": {
      "id": "jobmeta@voiddo.com",
      "strict_min_version": "140.0",
      "data_collection_permissions": {
        "required": ["personallyIdentifyingInfo", "websiteContent"],
        "optional": ["technicalAndInteraction"]
      }
    }
  }
  ```
  - `technicalAndInteraction` **cannot** be in `required`.
  - If we ever add anonymous analytics → `optional`.
- **min Firefox 140.0.** This makes the install-time consent UI handle disclosure for us. Drop below 140 = we must build an in-extension consent screen on first run.
- **Source code package required.** Build is Vite/esbuild → AMO will demand a `src.zip`. Include README with exact build commands (`nvm use 20; npm ci; npm run build`). All deps must come from npm registry — no `curl | bash`, no private git deps without tarball.
- **Listed vs Self-distributed** — both go through the same review and same data_collection_permissions rules.

## Edge — what to check before zipping

- **Microsoft Partner Center developer account.** Free for individuals but requires registration to the Edge program specifically (separate from a generic MS account).
- **Short description = manifest field.** Edge has NO separate short-desc input on the dashboard. To change short desc, edit `manifest.json` `short_description` and re-upload the zip.
- **Description ≥250 chars per language.** Pad if necessary — sub-250 char descriptions are auto-rejected.
- **Privacy policy must mention "Microsoft Edge" specifically** (1.5.2). Generic *"this extension"* / *"your browser"* gets flagged. Boilerplate per-extension pages need a paragraph: *"This privacy policy applies to jobmeta when used in the Microsoft Edge browser…"*
- **Don't reference other browsers** in the description ("Now on Edge too!" → flagged under 1.1.2).
- **No obfuscation** (1.1.7) — minification is allowed but reviewers may request unminified source. Plan to ship a `src.zip` per AMO anyway.
- **Test creds mandatory for paid features (1.3.1).** Include in certification notes from first submission; otherwise certification will fail and re-clock the review.
- **Search terms**: 7 phrases × 30 chars × ≤21 words total.

## Cross-store gotchas for jobmeta specifically

- **Don't name brand-specific integrations** ("Workday, Greenhouse, LinkedIn") in title or short desc — generic phrasing only ("supported ATS platforms").
- **AI provider disclosure** — say "AI-powered" / "LLM-backed" in description. Name "Google Gemini" only in privacy policy ("Cover letters are generated using third-party LLM APIs (Google Gemini)."). Naming providers in the title gets flagged as brand spam.
- **No "guaranteed" claims.** Phrases that auto-reject: *"100% accurate", "guaranteed to land you a job", "passes any ATS", "beats AI detection", "100% human-written", "outperforms recruiters"*. Use hedges: *"tailored"*, *"drafted"*, *"a starting point you should review"*.
- **No "scrapes job postings"** — Edge 2.8 prohibits unauthorized access to website content. Frame as *"reads the page you're looking at, with your click"*.
- **Free/Pro paywall UX** — Pro CTAs must clearly say "Upgrade required" before clicking, never *"Try AI feature"* → paywall. Edge in particular rejects "deceptive paid features".
- **First-run consent modal** — Edge 1.5.1 requires *"clearly state the data handling practices at the time of installation"*. We'll show a modal: *"jobmeta saves your resume locally. Cover letters use Google Gemini and are deleted after 24h."* + Got-it + link to privacy.
- **COPPA effective 22 Apr 2026.** Adult tool — declare "No" to under-13s in Edge Partner Center + the equivalent CWS Privacy form audience field.

## Locked freemium model (build target)

| Tier | Price | Letters | Match scores | Profiles | Features |
|------|-------|---------|--------------|----------|----------|
| **Free** | $0 forever | **10/mo** (anonymous install_id) | **5/mo** | 1 | unlimited autofill on 11 ATS |
| **Pro** | $4.99/mo or $39/yr | unlimited (100/day cap) | unlimited (100/day cap) | up to 5 | + AI question-rewriter (next), + sync, + priority queue |
| **Pack (legacy)** | $14.99 one-time | 100 / 90 days | n/a | 1 | retained for users who bought v1 |

Backend endpoints live as of 2026-04-27:
- `POST /api/v1/ext/jobmeta/cover-letter`        — `X-License-Key` (Pro/Pack)
- `POST /api/v1/ext/jobmeta/cover-letter-free`   — `X-Install-Id` (Free)
- `POST /api/v1/ext/jobmeta/match-score`         — `X-License-Key` (Pro)
- `POST /api/v1/ext/jobmeta/match-score-free`    — `X-Install-Id` (Free)

Net-margin floor ≥98% on all paths (Gemini 2.5 Flash, ~$0.00026/call worst case).

## Icon decision (locked 2026-04-27)

The flat purple-briefcase rounded-square (matches `extensions.voiddo.com`
portal tile) is the canonical jobmeta icon — used for both the portal
marketing surface AND the extension manifest. The earlier painterly
briefcase (v1.0.0–v1.0.2) is archived in `_archive_v1.0.2/`. Brand
consistency wins over artistic variety; users discover us through the
portal first, the extension icon should match.

Source: `/var/www/voiddo.com/images/tools/jobmeta.png` (200×200 RGBA).
Sizes shipped: 16 / 32 / 48 / 128 / 512 (last is for CWS store-listing).

## Single-purpose sentence (use across all 3 listings, identical)

> Helps job seekers complete job applications by auto-filling forms and generating tailored cover letters.

## Frozen description block (English, ≤132 short / detailed below)

**Short (≤132):**
> Apply to jobs faster. Auto-fill forms across supported ATS platforms and draft a tailored cover letter — privacy by default.

(127 chars — within budget.)

**Detailed (≥250 for Edge):** drafted in Stage 5 landing copy + reused for all 3 stores. Must include the resume-on-server disclosure and the AI-disclosure paragraph.

## Submission timeline reality

- **CWS**: typical 1–7 days; 14+ days if reviewer escalates. Volunteered test creds in cert notes shave the back-and-forth.
- **AMO**: 1–10 days. Source-code zip on first submit avoids the "we need source" delay.
- **Edge**: 7+ days normally; **2-step certification** (automated + human). Test creds + Edge-specific privacy policy mention up-front avoid round 2.

## When the user says "X published" → portal-tile light-up checklist

When user sends "Chrome live" / "AMO approved" / "Edge published":
1. Update tile chip on `extensions.voiddo.com` index from dim → live + add real store URL.
2. Update landing hero CTA from dim → live store badge.
3. If all 3 green → flip the listing's status pill to "all 3 stores live".
4. One-line entry in `voiddo.com/log/`.

## Sources (current as of 2026-04-27)

- developer.chrome.com/docs/webstore/cws-dashboard-listing
- developer.chrome.com/docs/webstore/cws-dashboard-privacy
- developer.chrome.com/docs/webstore/program-policies
- developer.chrome.com/docs/webstore/troubleshooting
- developer.chrome.com/docs/webstore/program-policies/listing-requirements
- extensionworkshop.com/documentation/develop/create-an-appealing-listing
- extensionworkshop.com/documentation/develop/firefox-builtin-data-consent
- extensionworkshop.com/documentation/publish/source-code-submission
- blog.mozilla.org/addons/2025/06/23/updated-add-on-policies-simplified-clarified
- blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions
- learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies
- ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312 (COPPA effective 2026-04-22)

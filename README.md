# jobmeta

> autofill 11 ATS, score your fit, draft a tailored cover letter — without leaving the job page.

A browser extension for Chrome, Firefox, and Edge. Manifest V3.

Live: [extensions.voiddo.com/jobmeta/](https://extensions.voiddo.com/jobmeta/)

## What it does

Three things every applicant repeats forty times a week, compressed into one floating button:

1. **Autofill on 11 ATS** — Greenhouse, Lever, Ashby, BambooHR, iCIMS, Jobvite, SmartRecruiters, SuccessFactors, Taleo, Breezy, Workday. One profile, every system.
2. **Match-meter score** — fit score, matched skills, gaps to address. On every job page.
3. **Tailored cover letters** — three paragraphs, your tone, in eleven languages. Reads the job description on the page; never invents experience.

Free for 10 letters and 5 match-scores a month. Pro $4.99/mo or $39.99/yr.

## Install

- Chrome / Brave / Opera: *in review on Chrome Web Store*
- Firefox / LibreWolf: *in review on AMO*
- Edge: *in review on Microsoft Edge Add-ons*

Sideload (now): see browser-specific load steps in [DOCS-CHEATSHEET.md](DOCS-CHEATSHEET.md).

## Build

```
./build.sh             # build all 3 browsers into dist/
./build.sh --zip       # build + produce store-ready zips
./build.sh chrome      # build chrome only
```

Per-browser manifest in `manifests/<browser>.json`. Source is in `src/` — no minification, no bundler, all JS is human-readable.

## License

MIT. See [LICENSE](LICENSE).

---

Built by [vøiddo](https://voiddo.com/) — a small studio shipping AI-flavoured products, free dev tools, Chrome extensions and weird browser games.

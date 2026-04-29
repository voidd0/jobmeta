# jobmeta

[![License: MIT](https://img.shields.io/badge/license-MIT-A0573A.svg)](LICENSE)
[![Manifest V3](https://img.shields.io/badge/manifest-v3-1F1A14)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Built by vøiddo](https://img.shields.io/badge/built%20by-v%C3%B8iddo-1F1A14)](https://voiddo.com/)

> autofill 11 ATS, score your fit, draft a tailored cover letter — without leaving the job page.

A browser extension for Chrome, Firefox, and Edge. Manifest V3. Live: [extensions.voiddo.com/jobmeta/](https://extensions.voiddo.com/jobmeta/).

## Why jobmeta exists

Applying to forty jobs a month means doing the same three tasks forty times: filling out the same form, judging the same fit, and writing a cover letter that always claims "deep alignment with your mission". Every applicant tracking system has a slightly different field layout, every job page has a different culture statement, and the cover letter you used three jobs ago has rotted because the role name changed.

jobmeta compresses those three tasks into one floating button on every job page. You stop thinking about the mechanics and start thinking about which jobs to actually apply to.

## What it does

1. **Autofill on 11 ATS** — Greenhouse, Lever, Ashby, BambooHR, iCIMS, Jobvite, SmartRecruiters, SuccessFactors, Taleo, Breezy, Workday. One profile, every system. We map your fields once and the extension figures out which DOM hooks each platform exposes.
2. **Match-meter score** — fit score, matched skills, gaps to address. Reads the job description in place; doesn't pull it to a backend it doesn't need to.
3. **Tailored cover letters** — three paragraphs, your tone, in eleven languages. Grounded in the JD on the page; never invents experience you didn't list. Free for 10 letters / 5 match-scores per month. Pro $4.99/mo or $39.99/yr (100 letters, 500 scores).

## Compared to alternatives

We are not Teal HQ or Simplify.jobs. They are job-search dashboards — they want you logged in, browsing their tracker, paying for premium analytics. They are good at it.

jobmeta is the opposite shape: a tool that lives on the job posting itself, doesn't try to track your applications, doesn't know which jobs you've saved, and doesn't email you about market trends. If your workflow is `open job page → decide if it's worth applying → apply or close tab`, jobmeta speeds the apply path. If your workflow is `manage 200 active applications across a quarter`, use Teal.

| feature | jobmeta | Simplify.jobs | Teal HQ |
|---|---|---|---|
| ATS autofill | 11 platforms | 22 platforms | manual |
| AI cover letter | ✅ on the page | ✅ in dashboard | ✅ in dashboard |
| Match score | ✅ on the page | ✅ in dashboard | tracker-only |
| Application tracker | ❌ (intentional) | ✅ | ✅ |
| Resume builder | ❌ | ✅ | ✅ |
| Free tier | 10 letters/mo | 5 letters/mo | unlimited tracking |
| Account required | no | yes | yes |

## FAQ

**Does it ship my resume to a server?** Only the bits needed to draft a letter — the JD on the active page and the profile fields you saved locally. Nothing is stored after the response is returned.

**Is "AI cover letter" just GPT-4 with a system prompt?** No. We use Gemini Flash in production, with a prompt forcing it to ground every paragraph in either the JD specifics or your stated experience. If you list no experience with `Kubernetes` and the JD requires it, the letter will not pretend you have it.

**What if my ATS isn't on the list of 11?** Open an issue. We add platforms based on actual demand — the 11 cover ~75% of postings on LinkedIn / Indeed by volume.

**Can I use my own LLM key (BYOK)?** Not in v1. The latency / quality / cost balance is hard for end-users to tune; we'd rather absorb that. Pro plan is $4.99/mo with hard daily caps so a runaway prompt can't bill you.

**Why "jobmeta"?** It does the meta-work around a job posting (form filling, fit estimation, cover letter), so you can spend the saved hours on the meta-work that actually matters: deciding which postings deserve an apply.

## Install

- Chrome / Brave / Opera: *in review on Chrome Web Store*
- Firefox / LibreWolf: *in review on AMO*
- Edge: *in review on Microsoft Edge Add-ons*

Sideload (now): see browser-specific load steps in [DOCS-CHEATSHEET.md](DOCS-CHEATSHEET.md).

## Build

```bash
./build.sh             # build all 3 browsers into dist/
./build.sh --zip       # build + produce store-ready zips
./build.sh chrome      # build chrome only
```

Per-browser manifest in `manifests/<browser>.json`. Source is in `src/` — no minification, no bundler, all JS human-readable.

## Privacy

The job description on your active tab and the fields you save are sent to `scrb.voiddo.com/api/v1/ext/jobmeta/...` for cover-letter generation and match scoring. Nothing is stored after the response. No tracking IDs. No analytics SDK. The Firefox manifest declares `data_collection_permissions.required: ["none"]`.

## More from the studio

This is one extension out of many — see [`from-the-studio.md`](from-the-studio.md) for the full lineup of vøiddo products (free CLI tools, other extensions, the studio's flagship products and games).

## License

MIT. See [LICENSE](LICENSE).

---

Built by [vøiddo](https://voiddo.com/) — a small studio shipping AI-flavoured products, free dev tools, Chrome extensions and weird browser games.

# Ravidu Sadaruwan Abeywardana · Portfolio

A dark, cinematic portfolio for a business and data analyst. Static HTML, CSS and JavaScript with no build step, made for Cloudflare Pages.

## What's in it

- **Intro query:** runs once per visit and skips on any key, scroll or tap.
- **Analyst lens:** move the cursor over the portrait (or touch it on a phone) to see it in true colour, with a grid and readout.
- **Approach line:** lights up word by word as you scroll.
- **Skill chart:** 32 tools fall into a bar chart grouped by area.
- **Selected work:** five case studies that scroll sideways on large screens. Each chart draws real CV figures.
- **Timeline:** experience and education, with a red progress line.
- **Close:** email (with a copy button), LinkedIn, and the data science portfolio.

Every figure on the page comes from the CV. The phone number is deliberately left out.

## Files

```
site/                 ← the website (Cloudflare's output directory)
  index.html
  styles.css
  main.js
  404.html
  _headers            ← security + cache headers for Cloudflare
  favicon.svg
  share.png           ← link preview image (1200×630)
  assets/ravidu.jpg   ← portrait (plus ravidu-sm.jpg for phones)
  fonts/              ← self-hosted fonts
PRODUCT.md            ← who the site is for and what it may claim
DESIGN.md             ← the design system (colours, type, components)
wrangler.toml         ← Cloudflare Pages project config
```

## Preview locally

```bash
cd site && python3 -m http.server 8080
# open http://localhost:8080
```

(Opening `index.html` straight from disk works, but browsers block the self-hosted fonts over `file://`.)

## Deploy to Cloudflare Pages (project `ravabe99`)

**Option A: connect the GitHub repo (auto-deploys on every push)**

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
2. Pick this repository. Project name: `ravabe99`.
3. Framework preset: **None**. Build command: *(leave empty)*. Build output directory: **`site`**.
4. Deploy. The site goes live at `https://ravabe99.pages.dev`.

**Option B: upload from your machine**

```bash
npx wrangler pages deploy        # reads wrangler.toml, uploads ./site
```

### When you buy a domain

1. Pages project → Custom domains → Set up a domain.
2. Update the domain in `site/index.html`: the `canonical`, `og:url` and `og:image` tags currently point at `ravabe99.pages.dev`.

## Editing content

All text lives in `site/index.html`. To swap the portrait, replace `site/assets/ravidu.jpg` (portrait, about 2:3) and `ravidu-sm.jpg` (560px wide), then regenerate `share.png`.

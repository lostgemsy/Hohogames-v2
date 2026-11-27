# Hohogames V2

A static arcade website. The game library, catalog, artwork, and game files are
served directly as static assets; no server or build step is required.

## Deploy to Cloudflare Pages

Create a Pages project from this repository and use:

- **Framework preset:** None
- **Build command:** `exit 0`
- **Build output directory:** `.` (the repository root)

The site starts at `index.html`; the library is in `games/`. Game folders stay
at the repository root to preserve the paths used by their assets. Browser-side
JavaScript is used for the game library and game runtimes; Node.js is not
required.

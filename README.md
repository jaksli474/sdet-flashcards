# SDET flashcards

A static site (HTML + CSS + JS, no build step) for reviewing the flashcards from `course/flashcards.md`.
It works on an iPhone in Chrome and is hosted on GitHub Pages for free.

The app UI is in Polish; button names below are quoted as they appear on screen.

## How it works

- Start screen: a tree of modules and lessons. Each row shows `to review / all`.
  You select whole modules or single lessons (the selection is remembered).
- **Start**: a random card from the pool of selected lessons, "Pokaż odpowiedź" (show answer), then **Znam** (I know) / **Nie znam** (I don't know).
  - **Znam**: the card leaves the pool and comes back in 7 days, then every 30 days after the next "Znam".
  - **Nie znam**: the card stays in the pool and comes back in the same session (the error counter goes up).
- **Trening bez zapisu** (practice, no saving): all cards from the selected lessons; nothing is saved.
- **Reset zaznaczonych** (reset selected): clears progress only in the selected lessons.
- **Eksportuj / Importuj postęp** (export / import progress): a JSON file (on the iPhone via "Share", then "Save to Files").
- A new card in `flashcards.md` is a new card in the pool. Editing a question's text creates a new card (the old card's progress is lost).
  `[ ]` marks in front of `Q:` are ignored.
- Progress lives in the browser's `localStorage`, on this device only. No server, no login.

## Files

| File | Role |
| --- | --- |
| `index.html`, `style.css`, `app.js` | user interface |
| `cards.js` | pure logic: parser, 7/30-day schedule, pool, import validation |
| `tests/cards.test.js` | logic tests (`node --test`) |
| `flashcards.md` | copy from the course, overwritten automatically by a GitHub Action |
| `setup/publish-flashcards.yml` | workflow to copy into the course repo |
| `.nojekyll` | turns off Jekyll on GitHub Pages |

## Run locally

```bash
cd ~/Projects/sdet-app
npm test                      # or: node --test tests/
python3 -m http.server 8000   # then open http://localhost:8000
```

Opening `index.html` straight from disk does not work: browsers block `fetch` and ES modules on `file://`.

## Setup on your private GitHub (step by step)

This assumes that `ssh -T git@github.com` already works on the private Mac and that the `sdet-learning-lab` repo is on GitHub.
Replace `<login>` with your GitHub login.

### 1. Public repo for the site

1. On github.com, click `+` in the top right corner, then **New repository**.
2. Repository name: `sdet-flashcards`, **Public**.
   Do not add a README, .gitignore or license; the repo must be empty. Click **Create repository**.

The repo must be public because free GitHub Pages works only from public repos.
Only the app and `flashcards.md` go there, never `solutions/` or other course files.

### 2. Push the app

```bash
cd ~/Projects/sdet-app
git init -b main
git add .
git commit -m "feat: add flashcards web app"
git remote add origin git@github.com:<login>/sdet-flashcards.git
git push -u origin main
```

### 3. Turn on GitHub Pages

1. In the `sdet-flashcards` repo: **Settings**, then **Pages** in the left menu.
2. Build and deployment, Source: **Deploy from a branch**.
3. Branch: **main**, folder **/ (root)**, **Save**.
4. Wait 1-2 minutes (the **Actions** tab shows "pages build and deployment").
5. Open `https://<login>.github.io/sdet-flashcards/`.

### 4. Token for the automatic sync

1. Avatar in the top right corner, **Settings**, then **Developer settings** at the bottom of the left menu.
2. **Personal access tokens**, **Fine-grained tokens**, **Generate new token**.
3. Token name: `sdet-flashcards-deploy`. Expiration: for example 1 year (write down the date).
4. Repository access: **Only select repositories**, choose **sdet-flashcards** (only this one).
5. Permissions, Repository permissions, **Contents: Read and write** (Metadata: Read-only is added automatically).
6. Click **Generate token** and copy it right away (GitHub shows it only once).

### 5. Secret in the course repo

1. In the `sdet-learning-lab` repo (private): **Settings**, **Secrets and variables**, **Actions**.
2. **New repository secret**. Name: `FLASHCARDS_DEPLOY_TOKEN`, Secret: paste the token, **Add secret**.

### 6. Workflow in the course repo

```bash
cd ~/Projects/sdet-learning-lab
mkdir -p .github/workflows
cp ~/Projects/sdet-app/setup/publish-flashcards.yml .github/workflows/
git add .github/workflows/publish-flashcards.yml
git commit -m "chore: publish flashcards to the sdet-flashcards site"
git push
```

The workflow starts on its own only when a push changes `course/flashcards.md`.

### 7. First run by hand

1. In the `sdet-learning-lab` repo: **Actions**, then **Publish flashcards** on the left.
2. **Run workflow**, branch `main`, **Run workflow**.
3. It should be green. "flashcards.md is unchanged" in the log is also fine.

### 8. End-to-end check

1. Add one card to `course/flashcards.md`, commit, push.
2. Actions in `sdet-learning-lab`: "Publish flashcards" is green.
3. In `sdet-flashcards` you see a commit "chore: sync flashcards.md from course repo", followed by a Pages deploy.
4. After 1-10 minutes the card count on the site goes up by 1 (the GitHub Pages CDN caches files for up to ~10 minutes).

### 9. iPhone

1. In Chrome, open `https://<login>.github.io/sdet-flashcards/`.
2. Tap the share icon in the address bar, then **Add to Home Screen**.
3. Always use the same place (the home-screen icon or the Chrome tab), because they may keep progress separately.
   To move progress: export in one, import in the other.

## Things to watch

- **Backups.** iOS can delete data for a site you have not used for a long time. Use "Eksportuj postęp" from time to time.
- **Expired token.** The workflow fails with an authentication error. Generate a new token (step 4) and replace the secret (step 5).
- **Cost.** GitHub Pages from a public repo is free. The workflow takes a few seconds of the 2000 free minutes per month for private repos.
- **Course.** GitHub Actions is taught in lesson 3.5. This workflow is a ready-made tool, not a course exercise.

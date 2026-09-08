# Test Checker — deploy notes (free Gemini version)

This version uses Google's Gemini API, which has a free tier — no credit
card required. Your key stays private on Netlify's server; it's never
visible to anyone using the site.

## 1. Get a free Gemini API key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with a Google account and click "Create API key" — no billing
   setup required for the free tier.
3. Copy the key.

Free tier (subject to change by Google): roughly 10 requests/minute and
250 requests/day on the Flash model used here — comfortably enough to
grade a full class in one sitting.

## 2. Deploy to Netlify

Drag-and-drop deploy does **not** support the server function, so use one
of these instead:

**Option A — Netlify CLI (simplest)**
```
npm install -g netlify-cli
cd this-project-folder
netlify deploy --prod
```
Follow the prompts to log in / create a new site.

**Option B — GitHub + Netlify**
1. Push this folder to a new GitHub repo.
2. On netlify.com → "Add new site" → "Import an existing project" → pick the repo.
3. Build settings can stay blank (there's no build step needed).

## 3. Add your key on Netlify

1. Netlify dashboard → your site → **Site configuration → Environment variables**.
2. Add `GEMINI_API_KEY` = the key you copied in step 1.
3. (Recommended) Add `ACCESS_CODE` = any word/phrase you choose — anyone
   using the app will need to type this in before grading works, so a
   stranger who finds the link can't burn through your daily free quota.
4. Redeploy (Netlify usually does this automatically after saving env vars;
   trigger it manually if not).

## Note on the free tier

Free-tier usage on Google's side may be used to improve their products —
this is different from a paid plan's data terms. Don't upload anything
you wouldn't want reviewed for that purpose (for a school test-grading
tool this is normally a non-issue, but worth knowing).

If the class ever outgrows the free daily quota, upgrading later is just
enabling billing on the same Google Cloud project — nothing else in this
app needs to change.

# AmirReza Farzaneh — Personal Site

A static, responsive personal/academic website built from your CV. No build step, no server required — it's plain HTML/CSS/JS.

## Files

```
index.html          the whole page
assets/styles.css    all styling (design tokens at the top)
assets/data.js       your CV content, in one place
assets/app.js        rendering + the admin editor
assets/profile.png   your photo (fallback)
assets/profile.webp  your photo (smaller, used first)
```

## Opening it locally

Double-click `index.html`, or from a terminal in this folder:

```
python3 -m http.server 8000
```

then visit `http://localhost:8000`.

## Putting it online (free options)

- **GitHub Pages**: create a repo, push these files, enable Pages on the `main` branch. Your professors can then reach it at `https://<username>.github.io/<repo>/`.
- **Netlify / Vercel**: drag-and-drop this folder onto their dashboard for an instant URL.
- **A university web space**, if your department offers student pages, also works — just upload the files as-is.

## Editing content yourself

Click **"Site owner? Edit this page"** at the very bottom of the page.

- Default password: `amirreza` — change it right away from the edit bar ("Change password").
- In edit mode, click directly on any text (name, dates, project titles, grades, etc.) to change it. Click away to save.
- Every list section (Experience, Education, Skills, Projects, Research, Certificates, Honors, Languages, Grades) has a **"+ Add"** button, and each entry gets a small **×** to remove it.
- Click **"Change photo"** on your portrait to replace it.
- **Export backup** downloads your current content as a JSON file — do this occasionally. **Import backup** loads one back in.
- **Reset to default** restores the original CV-based content.

### Important limitation to know about

Edits are saved in your browser's local storage, on that one device/browser — they are **not** automatically visible to someone else opening the site from a different computer, and they don't change the files themselves, unless you turn on **GitHub sync** (below).

Also worth knowing: the password only deters casual visitors — anyone who reads the page source can bypass it. It's a convenience lock, not real security. Don't rely on it to protect anything sensitive.

## GitHub sync (push edits live automatically)

Once your site is on GitHub Pages, you can connect the admin panel to that same repo so edits go out for real, without ever touching a file by hand.

1. In edit mode, click **"GitHub sync"** in the bottom bar.
2. Create a token at [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new):
   - Under "Repository access," choose **"Only select repositories"** and pick this one repo. Don't grant access to all repos.
   - Under "Permissions" → "Repository permissions," set **Contents** to **Read and write**. Leave everything else as "No access."
   - Generate the token and copy it (GitHub only shows it once).
3. Back in the sync panel, fill in your GitHub username, the repo name, the branch (`main`), and paste the token.
4. Optionally tick **"Automatically push after every edit"** — a few seconds after you stop typing, changes go straight to GitHub.
5. Click **"Push now"** to sync immediately, or just **"Save settings"** if you only want auto-push going forward.

Each push updates `assets/data.js` in the repo directly (and, if you changed your photo, uploads it as `assets/profile-custom.<ext>` too) and creates a normal commit — you'll see it in the repo's commit history. GitHub Pages picks it up within about a minute.

**About the token:** it's stored only in this browser's local storage and is sent only to `api.github.com` — never to any other server. Scoping it to one repo with Contents-only access (step 2) means that even if it leaked, the damage is limited to that one repo's files. Use **"Forget token"** in the sync panel if you ever want to disconnect a device. Still, only enable this on a computer you trust, and treat the token like a password.

If you'd rather not use a token at all, **Export backup** / **Import backup** in the same bar still work exactly as before, for a fully manual, no-token workflow.

## A couple of things worth double-checking

- Your CV lists the email as `amirfh033@gamil.com` — that's likely a typo for `gmail.com`. I kept it exactly as written on the CV; fix it in edit mode if so.
- I left out date of birth, marital status, and military-service status from the public page — that's personal information a professor or lab doesn't need, and Iranian-style CV conventions don't always translate well to a public academic website. Let me know if you'd like any of it added back.
- The GitHub link points to `github.com/AmirFH04`, taken from the "AmirFH04" handle on your CV — confirm that's your actual GitHub username.

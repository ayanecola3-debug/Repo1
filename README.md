# Birthday Surprise

Create a personalised interactive birthday experience, publish it, and share one link.

## Deploy on Netlify (no database or server to set up)
1. Create a GitHub repo and push the contents of this folder (the folder that contains `netlify.toml`).
2. Netlify -> Add new site -> Import from Git -> pick the repo. Settings are read from `netlify.toml`; just click Deploy.
3. Open your Netlify URL. Anyone can create, customise, publish and share `/birthday/<id>` links.

Data and photos are stored in Netlify Blobs, which is built in. Nothing else to configure.

## Local development
`npm install` then `npx netlify dev` (runs the site and the function together, with local blob storage).
Tests (function logic): `npm test`.

## Notes
- No accounts: the creator's browser keeps a secret edit token (localStorage). Clearing browser data loses edit access to that project; published links keep working.
- Photos are resized to 1600px in the browser before upload; the server accepts JPEG/PNG/GIF/WebP by content check, max 4 MB.
- Images are served from `/media/<random id>`, so anyone with an image URL can view it.
# Repo1

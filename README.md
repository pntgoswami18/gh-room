# gh-room

3D room portfolio (Three.js) driven by your GitHub profile. Based on the freeCodeCamp "cute room portfolio" course, with content pulled from GitHub instead of hardcoded.

| Object   | Shows                                  | Click opens            |
|----------|----------------------------------------|------------------------|
| Monitor  | pinned repos (canvas texture)          | pinned repo list       |
| Poster   | avatar, name, bio, stats               | profile card           |
| Calendar | contribution heatmap                   | total, best streak     |
| Books    | 1 book per repo: color=lang, height=stars, thickness=forks | that repo |

## Run

```bash
npm i
npm run data:sample            # offline sample data, or:
GITHUB_TOKEN=ghp_xxx npm run data pntgoswami18   # real data (GraphQL: pinned + calendar)
npm run data pntgoswami18      # no token: REST only (top-starred as "pinned", no calendar)
npm run dev
```

## Data flow

`scripts/fetch-github.mjs` -> `public/github.json` -> scene reads it at load.
The token never reaches the browser. On fetch failure, the old JSON is kept.

## Deploy (Vercel)

1. Push the repo to GitHub, import it in Vercel (framework: Vite). Build = `npm run build`.
2. Optional: add a repo secret `GH_PAT` (fine-grained PAT, public read only). Without it the Actions token is used.
3. `.github/workflows/refresh-data.yml` refetches daily and commits; the push triggers a Vercel redeploy.

## Swap in your Blender room

Export to `public/models/room.glb` (compress with `gltf-transform optimize`). It's auto-detected; the placeholder is used if missing. Name these objects:

- `Screen`, `Poster`, `Calendar`: flat meshes, UV-unwrapped to fill 0..1 (aspect 16:9, 3:4, ~4.4:1)
- `BookshelfAnchor`: an Empty at the middle of the bottom shelf; books spawn along its local X axis. Tune `width`/`shelves` in `buildBookshelf()` to match your model.

Baked lighting: give the baked room `MeshBasicMaterial` with the baked texture, as in the course; the GitHub textures already use `MeshBasicMaterial`.

## Ideas
- Plant that grows with yearly contributions (`calendar.total`)
- Sticky notes from recent commits (REST `/users/<u>/events/public`)
- Blog posts from curiositas.in RSS on a notice board

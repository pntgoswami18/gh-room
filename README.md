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

## Next step: swap in your Blender room

`public/models/room.glb` is auto-detected; the placeholder room is used if it's missing.

### 1. Model the room
- Units in meters; origin at floor center; room about 6 x 6 m.
- Walls on the **-X** and **-Y** sides in Blender (back wall along -Y). Blender Y becomes glTF -Z, which matches the camera limits (open sides face +X / +Z in three.js).

### 2. Content surfaces
Flat planes with these exact names:

| Name       | Aspect  | Where         |
|------------|---------|---------------|
| `Screen`   | 16:9    | monitor       |
| `Poster`   | 3:4     | wall          |
| `Calendar` | ~4.4:1  | wall          |

- Normal faces into the room.
- UV unwrap to fill the full 0..1 square (Reset, or Project from View (Bounds)).
- Exclude them from the bake; their materials get replaced at runtime.

### 3. Bookshelf anchor
- Add an Empty named `BookshelfAnchor` at floor level, centered under the shelf, local X axis along the shelf.
- Note shelf inner width and each board's height (code default: 2 m wide, boards at 0.32 / 0.92 / 1.52 m).

### 4. Bake and export
- Bake per the course.
- File > Export > glTF Binary (.glb): +Y Up on, Apply Modifiers on, **compression off** (no Draco decoder wired up yet).

### 5. Optimize and test
```bash
npx @gltf-transform/cli optimize room.glb public/models/room.glb --compress false --texture-compress webp
npm run dev
```
Commit and push; Vercel redeploys.

### 6. Code tweaks needed for a real model
- [ ] `main.js`: pass your shelf size to `buildBookshelf(shelf, data.repos, { frame: false, width, shelves })`.
- [ ] Baked look: glTF imports as lit `MeshStandardMaterial`, which double-lights baked textures. Traverse the model and swap to `MeshBasicMaterial({ map: bakedTexture })`, as in the course.
- [ ] Camera: retune `controls.target`, `min/maxDistance`, polar/azimuth limits to the room's proportions.
- [ ] Optional: add `DRACOLoader` / `MeshoptDecoder` to `GLTFLoader` to allow full compression and a smaller file.

## Ideas
- Plant that grows with yearly contributions (`calendar.total`)
- Sticky notes from recent commits (REST `/users/<u>/events/public`)
- Blog posts from curiositas.in RSS on a notice board

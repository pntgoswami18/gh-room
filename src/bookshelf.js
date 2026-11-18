import * as THREE from 'three';

/**
 * One book per repo, as a single InstancedMesh (one draw call).
 * Spine color = primary language color, height = log(stars), thickness = forks.
 * Books are laid out along the anchor's local X axis, bottom at each shelf Y.
 */
export function buildBookshelf(anchor, repos, {
  width = 2.0, shelves = [0.32, 0.92, 1.52], depth = 0.3, frame = true,
} = {}) {
  if (frame) {
    const wood = new THREE.MeshStandardMaterial({ color: '#a47551', roughness: 0.8 });
    for (const y of shelves) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(width + 0.08, 0.04, depth + 0.04), wood);
      b.position.set(0, y - 0.02, 0); anchor.add(b);
    }
    for (const sx of [-1, 1]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.04, shelves.at(-1) + 0.62, depth + 0.04), wood);
      s.position.set(sx * (width / 2 + 0.04), (shelves.at(-1) + 0.62) / 2 - 0.04, 0); anchor.add(s);
    }
  }

  const list = repos.slice(0, 120);
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0); // pivot at bottom
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.65 });
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(list.length, 1));

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  let x = -width / 2 + 0.02, row = 0, n = 0;
  for (const r of list) {
    const t = 0.045 + Math.min(r.forks, 20) / 20 * 0.04;
    const h = 0.26 + Math.min(Math.log2(r.stars + 1) / 8, 1) * 0.26;
    if (x + t > width / 2 - 0.02) { row++; x = -width / 2 + 0.02; }
    if (row >= shelves.length) break;
    const tilt = (Math.random() - 0.5) * 0.04;
    q.setFromEuler(new THREE.Euler(0, 0, tilt));
    m.compose(new THREE.Vector3(x + t / 2, shelves[row], 0), q, new THREE.Vector3(t, h, depth * 0.85));
    mesh.setMatrixAt(n, m);
    mesh.setColorAt(n, c.set(r.color || '#9ca3af'));
    x += t + 0.006; n++;
  }
  mesh.count = n;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.userData = { key: 'book', repos: list };
  anchor.add(mesh);
  return mesh;
}

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

  // pad leftover shelf space with props so sparse shelves don't look empty
  const ends = shelves.map((_, i) => (i < row ? null : i === row ? x : -width / 2 + 0.02));
  ends.forEach((start, i) => start !== null && addProps(anchor, shelves[i], start + 0.05, width / 2 - 0.04, depth, i));
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.userData = { key: 'book', repos: list };
  anchor.add(mesh);
  return mesh;
}

// ---------- shelf props ----------
const pm = (color, rough = 0.8) => new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: true });
const M = {
  pot: pm('#d97757'), potAlt: pm('#e8c39e'), leaf: pm('#6aa56b'), leafAlt: pm('#8cc084'),
  boxA: pm('#e9b384'), boxB: pm('#b7d3df'), boxC: pm('#f4a6a6'), lid: pm('#c98d5f'),
  globe: pm('#7fb3d5', 0.5), stand: pm('#a47551'), cream: pm('#fff3e4'), mug: pm('#f6d365'),
};

// Each prop: [width, builder(group)] — builders place geometry with its bottom at y=0, centered on x=0.
const PROPS = [
  [0.22, (g) => { // potted plant
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.13, 8), M.pot); pot.position.y = 0.065;
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 0), M.leaf); leaf.position.y = 0.21; leaf.scale.set(1, 1.25, 1);
    g.add(pot, leaf);
  }],
  [0.3, (g) => { // stacked storage boxes
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.15, 0.22), M.boxA); a.position.y = 0.075;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.18), M.boxB); b.position.y = 0.21; b.rotation.y = 0.15;
    g.add(a, b);
  }],
  [0.24, (g) => { // globe
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 10), M.stand); base.position.y = 0.015;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), M.stand); pole.position.y = 0.07;
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.1, 1), M.globe); ball.position.y = 0.2; ball.rotation.z = 0.4;
    g.add(base, pole, ball);
  }],
  [0.3, (g) => { // books lying flat + mug
    [['#f6d365', 0.22], ['#9b8bd6', 0.2], ['#7bc96f', 0.18]].forEach(([c, w], i) => {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(w, 0.035, 0.16), pm(c)); bk.position.set(-0.03, 0.0175 + i * 0.036, 0); bk.rotation.y = (i - 1) * 0.12; g.add(bk);
    });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 10), M.cream); mug.position.set(0.1, 0.04, 0.03); g.add(mug);
  }],
  [0.2, (g) => { // cactus
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.09, 8), M.potAlt); pot.position.y = 0.045;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.12, 3, 8), M.leafAlt); body.position.y = 0.18;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.05, 3, 6), M.leafAlt); arm.position.set(0.05, 0.19, 0); arm.rotation.z = -0.6;
    g.add(pot, body, arm);
  }],
  [0.24, (g) => { // lidded box
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.2), M.boxC); a.position.y = 0.07;
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.235, 0.025, 0.215), M.lid); lid.position.y = 0.152;
    g.add(a, lid);
  }],
];

function addProps(anchor, y, start, end, depth, rowIdx) {
  let x = start, k = rowIdx * 2; // offset per row so shelves don't repeat the same sequence
  while (true) {
    const [w, build] = PROPS[k++ % PROPS.length];
    if (x + w > end) break;
    const g = new THREE.Group();
    build(g);
    g.position.set(x + w / 2, y, (k % 2 ? -0.02 : 0.02) * depth);
    anchor.add(g);
    x += w + 0.1; // breathing room between props
  }
}

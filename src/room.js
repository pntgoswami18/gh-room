import * as THREE from 'three';

/**
 * Slots = the meshes/anchors that get GitHub content:
 *   screen   – mesh whose material gets the pinned-repos texture
 *   poster   – mesh for the profile poster
 *   calendar – mesh for the contribution heatmap
 *   shelf    – empty Object3D; books are spawned along its local X axis
 *
 * Placeholder room below, OR name these objects in Blender and use slotsFromModel().
 */

const std = (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
const box = (w, h, d, color) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), std(color));
const plane = (w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#000' }));

export function buildPlaceholderRoom() {
  const g = new THREE.Group();
  const add = (o, x, y, z) => { o.position.set(x, y, z); g.add(o); return o; };

  add(box(6, 0.2, 6, '#e8cfb8'), 0, -0.1, 0);              // floor
  add(box(0.2, 4, 6, '#f6e3d1'), -3.1, 2, 0);              // left wall
  add(box(6.4, 4, 0.2, '#f1dbc6'), 0.1, 2, -3.1);          // back wall
  add(box(2.6, 0.02, 2, '#d9a5a0'), 0.8, 0.01, 0.2);       // rug

  // desk + monitor on back wall
  add(box(2.2, 0.08, 0.9, '#b98b64'), 0.8, 1.0, -2.5);
  for (const [lx, lz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(box(0.06, 1, 0.06, '#8b6447'), 0.8 + lx * 1.0, 0.5, -2.5 + lz * 0.38);
  add(box(1.3, 0.8, 0.06, '#2b2b33'), 0.8, 1.6, -2.78);
  add(box(0.1, 0.18, 0.06, '#2b2b33'), 0.8, 1.11, -2.78);
  const screen = add(plane(1.22, 0.69), 0.8, 1.6, -2.745);

  // chair
  add(box(0.6, 0.06, 0.6, '#f4a6a6'), 0.8, 0.55, -1.7);
  add(box(0.6, 0.7, 0.06, '#f4a6a6'), 0.8, 0.9, -1.4);
  add(box(0.06, 0.55, 0.06, '#666'), 0.8, 0.27, -1.7);

  // plant
  add(box(0.3, 0.35, 0.3, '#d97757'), 2.4, 0.175, -2.6);
  const leaves = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), std('#6aa56b')), 2.4, 0.62, -2.6);
  leaves.scale.set(1, 1.3, 1);

  // poster on back wall, calendar on left wall
  const poster = add(plane(0.9, 1.2), -1.6, 2.3, -2.99);
  const calendar = add(plane(2.4, 0.55), -2.99, 2.75, -0.4);
  calendar.rotation.y = Math.PI / 2;

  // bookshelf on left wall (local X runs along the wall)
  const shelf = add(new THREE.Object3D(), -2.82, 0, -0.4);
  shelf.rotation.y = Math.PI / 2;

  return { group: g, slots: { screen, poster, calendar, shelf }, fromModel: false };
}

/** Blender: name objects Screen, Poster, Calendar (UV-unwrapped to fill 0..1) and an Empty "BookshelfAnchor". */
export function slotsFromModel(root) {
  const get = (n) => root.getObjectByName(n);
  return {
    group: root,
    slots: { screen: get('Screen'), poster: get('Poster'), calendar: get('Calendar'), shelf: get('BookshelfAnchor') },
    fromModel: true,
  };
}

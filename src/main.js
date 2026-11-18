import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { screenTexture, heatmapTexture, posterTexture, setMaxAnisotropy } from './textures.js';
import { buildBookshelf } from './bookshelf.js';
import { buildPlaceholderRoom, slotsFromModel } from './room.js';
import { openModal, modalOpen, views } from './modal.js';

const canvas = document.getElementById('scene');
const tooltip = document.getElementById('tooltip');

// ---------- renderer / scene ----------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
scene.background = new THREE.Color('#f7e9dc');
scene.add(new THREE.HemisphereLight('#fff6ee', '#c9a58a', 2.2));
const sun = new THREE.DirectionalLight('#ffe8d0', 1.6);
sun.position.set(4, 6, 3); scene.add(sun);

const camera = new THREE.PerspectiveCamera(35, innerWidth / innerHeight, 0.1, 100);
const controls = new OrbitControls(camera, canvas);
controls.target.set(-0.3, 1.3, -0.8);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5; controls.maxDistance = 13;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = Math.PI / 2.15;
controls.minAzimuthAngle = 0.05; controls.maxAzimuthAngle = Math.PI / 2 - 0.05; // keep camera outside the two walls

const camDistance = () => (innerWidth / innerHeight < 1 ? 13 : 9); // pull back on portrait/mobile
const camPos = () => new THREE.Vector3(1, 0.55, 1).normalize().multiplyScalar(camDistance()).add(controls.target);

// ---------- load data + room ----------
const data = await fetch('/github.json').then((r) => r.json());

async function hasModel(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.ok && !(r.headers.get('content-type') || '').includes('text/html'); // Vite serves index.html for missing files
  } catch { return false; }
}

const MODEL = '/models/room.glb';
const room = (await hasModel(MODEL))
  ? slotsFromModel((await new GLTFLoader().loadAsync(MODEL)).scene)
  : buildPlaceholderRoom();
scene.add(room.group);
room.group.updateMatrixWorld(true);

// ---------- bind GitHub data to slots ----------
function applyTexture(mesh, tex) {
  if (!mesh) return;
  tex.flipY = !room.fromModel; // glTF UVs expect flipY=false
  mesh.material = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}
const { screen, poster, calendar, shelf } = room.slots;
applyTexture(screen, screenTexture(data));
applyTexture(poster, posterTexture(data));
applyTexture(calendar, heatmapTexture(data));
const books = shelf ? buildBookshelf(shelf, data.repos, { frame: !room.fromModel }) : null;

// ---------- interactivity ----------
// Invisible, enlarged hitboxes make small targets tappable on mobile.
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const hitboxes = [];
function addHitbox(target, key, label, grow = 1.25) {
  if (!target) return;
  const b = new THREE.Box3().setFromObject(target);
  const size = b.getSize(new THREE.Vector3()).multiplyScalar(grow).max(new THREE.Vector3(0.15, 0.15, 0.15));
  const hb = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitMat);
  b.getCenter(hb.position);
  hb.userData = { key, label, target, baseScale: target.scale.clone() };
  scene.add(hb); hitboxes.push(hb);
}
addHitbox(screen, 'monitor', 'pinned projects');
addHitbox(poster, 'poster', 'about me');
addHitbox(calendar, 'calendar', 'contributions');

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let hovered = null; // { key, target?, repo?, label }
let down = null;

function pick(clientX, clientY) {
  pointer.set((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(pointer, camera);
  const objs = books ? [books, ...hitboxes] : hitboxes;
  const hit = raycaster.intersectObjects(objs, false)[0];
  if (!hit) return null;
  if (hit.object === books) {
    const repo = books.userData.repos[hit.instanceId];
    return repo && { key: 'book', repo, label: `${repo.name} ★${repo.stars}` };
  }
  return hit.object.userData;
}

function setHover(h, x, y) {
  const same = h && hovered && h.key === hovered.key && h.repo === hovered.repo;
  if (!same) {
    if (hovered?.target) gsap.to(hovered.target.scale, { ...vec(hovered.baseScale), duration: 0.3 });
    if (h?.target) gsap.to(h.target.scale, { ...vec(h.baseScale.clone().multiplyScalar(1.06)), duration: 0.3, ease: 'back.out(2)' });
    hovered = h;
  }
  canvas.style.cursor = h ? 'pointer' : 'grab';
  tooltip.classList.toggle('show', !!h);
  if (h) { tooltip.textContent = h.label; tooltip.style.left = `${x}px`; tooltip.style.top = `${y}px`; }
}
const vec = (v) => ({ x: v.x, y: v.y, z: v.z });

canvas.addEventListener('pointermove', (e) => {
  if (modalOpen() || e.pointerType === 'touch') return;
  setHover(pick(e.clientX, e.clientY), e.clientX, e.clientY);
});
canvas.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY }));
canvas.addEventListener('pointerup', (e) => {
  if (!down || modalOpen() || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return; // ignore drags
  const h = pick(e.clientX, e.clientY);
  if (!h) return;
  openModal(h.key === 'book' ? views.book(data, h.repo) : views[h.key](data));
  setHover(null);
});

// ---------- resize / loop / intro ----------
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

camera.position.copy(camPos()).multiplyScalar(1.8);
document.getElementById('loader').remove();
gsap.to(camera.position, { ...vec(camPos()), duration: 2, ease: 'power3.out' });

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

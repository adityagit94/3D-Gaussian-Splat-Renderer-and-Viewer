import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  SparkRenderer,
  SplatMesh,
  SplatFileType,
  FpsMovement,
  PointerControls,
} from "@sparkjsdev/spark";

/**
 * v4.3 Stable
 * - Removes custom HDR render-target + GLSL tonemap (can be black/glitchy on some GPUs)
 * - Uses THREE built-in tone mapping + exposure (stable)
 * - Z-up default (uses a Z-up convention by default)
 * - Auto-center on load
 * - Double-click focus uses Spark raycast (stable)
 */

THREE.Object3D.DEFAULT_UP.set(0, 0, 1);

const appEl = document.getElementById("app");
const statusEl = document.getElementById("status");

const fileEl = document.getElementById("file");
const clearEl = document.getElementById("clear");
const controlsModeEl = document.getElementById("controlsMode");
const projectionEl = document.getElementById("projection");
const upAxisEl = document.getElementById("upAxis");
const flipEl = document.getElementById("flip");

const renderQualityEl = document.getElementById("renderQuality");
const lodEl = document.getElementById("lod");

const speedEl = document.getElementById("speed");
const speedValEl = document.getElementById("speedVal");
const exposureEl = document.getElementById("exposure");
const exposureValEl = document.getElementById("exposureVal");

const zoomToCursorEl = document.getElementById("zoomToCursor");
const focusDblEl = document.getElementById("focusDbl");

const fitEl = document.getElementById("fit");
const homeEl = document.getElementById("home");
const bgEl = document.getElementById("bg");
const shotEl = document.getElementById("shot");

const exportStateEl = document.getElementById("exportState");
const importStateEl = document.getElementById("importState");

const helpEl = document.getElementById("help");
const helpModalEl = document.getElementById("helpModal");
const helpCloseEl = document.getElementById("helpClose");

let renderer, scene, camera;
let orbitControls = null;

let fpsMovement = null;
let pointerControls = null;

let spark = null;
let splatMesh = null;
let currentBlobUrl = null;

let bgOn = true;
let flipped = false;

// FPS vertical movement (Q down, E up)
let keyDownQ = false;
let keyDownE = false;

const clock = new THREE.Clock();
const homeState = {
  camPos: new THREE.Vector3(0, 0, 3),
  target: new THREE.Vector3(0, 0, 0),
};

const baseSpeeds = {
  orbit: { zoom: 1.0, rotate: 0.8, pan: 0.8 },
  fps: { move: 1.0 },
  pointer: { rotate: 0.002, slide: 0.006, scroll: 0.0015 },
};

const renderQualityPresets = {
  low: { pixelRatioScale: 0.75 },
  balanced: { pixelRatioScale: 1.0 },
  high: { pixelRatioScale: 1.25 },
  ultra: { pixelRatioScale: 1.5 },
};

// Spark 0.1 renderer knobs (not true hierarchical LoD)
const lodPresets = {
  low: { maxStdDev: Math.sqrt(5), minAlpha: 2.0 / 255.0, maxPixelRadius: 192.0, focalAdjustment: 1.0 },
  balanced: { maxStdDev: Math.sqrt(8), minAlpha: 0.5 * (1.0 / 255.0), maxPixelRadius: 512.0, focalAdjustment: 1.0 },
  high: { maxStdDev: Math.sqrt(9), minAlpha: 0.25 * (1.0 / 255.0), maxPixelRadius: 512.0, focalAdjustment: 1.2 },
  ultra: { maxStdDev: Math.sqrt(9), minAlpha: 0.15 * (1.0 / 255.0), maxPixelRadius: 512.0, focalAdjustment: 1.4 },
};

init();
bindUI();
animate();

function init() {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(computePixelRatio());

  if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = parseFloat(exposureEl?.value || "1.0");

  appEl.appendChild(renderer.domElement);

  scene = new THREE.Scene();
  setBackground(bgOn);

  camera = createCamera(projectionEl.value);
  createOrbitControls();

  spark = new SparkRenderer({ renderer });
  scene.add(spark);
  applyLodPreset(lodEl.value);

  const axes = new THREE.AxesHelper(1);
  axes.material.transparent = true;
  axes.material.opacity = 0.25;
  scene.add(axes);

  renderer.domElement.addEventListener("wheel", (e) => e.preventDefault(), { passive: false });

  renderer.domElement.addEventListener("dblclick", (e) => {
    if (!focusDblEl.checked) return;
    if (!splatMesh || controlsModeEl.value !== "orbit") return;
    focusAtPointer(e.clientX, e.clientY);
  });

// Keyboard: add Q/E for down/up in FPS mode
window.addEventListener("keydown", (e) => {
  const t = e.target;
  const tag = (t && t.tagName) ? t.tagName.toLowerCase() : "";
  if (tag === "input" || tag === "select" || tag === "textarea") return;

  const k = e.key.toLowerCase();
  if (k === "q") keyDownQ = true;
  if (k === "e") keyDownE = true;
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (k === "q") keyDownQ = false;
  if (k === "e") keyDownE = false;
});

window.addEventListener("blur", () => {
  keyDownQ = false;
  keyDownE = false;
});

window.addEventListener("resize", onResize);
  enableDragAndDrop(renderer.domElement);

  applySpeed(parseFloat(speedEl.value));
  applyZoomToCursor();
  setExposure(parseFloat(exposureEl.value));
  applyUpAxis(upAxisEl.value);
}

function bindUI() {
  fileEl.addEventListener("change", async () => {
    const file = fileEl.files?.[0];
    if (!file) return;
    await loadLocalFile(file);
    fileEl.value = "";
  });

  clearEl.addEventListener("click", () => clearSplat());
  controlsModeEl.addEventListener("change", () => setControlsMode(controlsModeEl.value));
  projectionEl.addEventListener("change", () => setProjection(projectionEl.value));
  upAxisEl.addEventListener("change", () => applyUpAxis(upAxisEl.value));
  flipEl.addEventListener("click", () => toggleFlip());

  renderQualityEl.addEventListener("change", () => {
    renderer.setPixelRatio(computePixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);
    setStatus(`Render: ${renderQualityEl.value}`);
  });

  lodEl.addEventListener("change", () => {
    applyLodPreset(lodEl.value);
    setStatus(`LOD: ${lodEl.value}`);
  });

  speedEl.addEventListener("input", () => applySpeed(parseFloat(speedEl.value)));
  exposureEl.addEventListener("input", () => setExposure(parseFloat(exposureEl.value)));
  zoomToCursorEl.addEventListener("change", () => applyZoomToCursor());

  fitEl.addEventListener("click", () => fitToSplat());
  homeEl.addEventListener("click", () => resetCamera());

  bgEl.addEventListener("click", () => { bgOn = !bgOn; setBackground(bgOn); });
  shotEl.addEventListener("click", () => takeScreenshot());

  exportStateEl.addEventListener("click", () => exportState());
  importStateEl.addEventListener("change", async () => {
    const f = importStateEl.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      importState(JSON.parse(text));
      setStatus("Imported state.");
    } catch (e) {
      console.error(e);
      setStatus("Import failed: invalid JSON.");
    } finally {
      importStateEl.value = "";
    }
  });

  helpEl.addEventListener("click", () => helpModalEl.classList.remove("hidden"));
  helpCloseEl.addEventListener("click", () => helpModalEl.classList.add("hidden"));
  helpModalEl.addEventListener("click", (e) => { if (e.target === helpModalEl) helpModalEl.classList.add("hidden"); });
}

function enableDragAndDrop(target) {
  target.addEventListener("dragover", (e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; });
  target.addEventListener("drop", async (e) => { e.preventDefault(); const file = e.dataTransfer.files?.[0]; if (file) await loadLocalFile(file); });
}

async function loadLocalFile(file) {
  clearSplat();
  const ext = getExt(file.name);
  const fileType = guessSparkFileType(ext);

  currentBlobUrl = URL.createObjectURL(file);
  setStatus(`Loading ${file.name} ...`);

  splatMesh = new SplatMesh({
    url: currentBlobUrl,
    fileType,
    onLoad: (mesh) => {
      mesh.visible = true;
      setStatus(`Loaded: ${file.name} (${mesh.numSplats ?? "?"} splats)`);
      autoCenterAndFrame();
    },
  });

  splatMesh.visible = false;
  scene.add(splatMesh);

  flipped = false;
  applyUpAxis(upAxisEl.value);
}

function clearSplat() {
  if (splatMesh) {
    scene.remove(splatMesh);
    if (typeof splatMesh.dispose === "function") { try { splatMesh.dispose(); } catch {} }
    splatMesh = null;
  }
  if (currentBlobUrl) { URL.revokeObjectURL(currentBlobUrl); currentBlobUrl = null; }
  setStatus("Cleared.");
}

function applyLodPreset(name) {
  const p = lodPresets[name] ?? lodPresets.balanced;
  if (!spark) return;
  spark.maxStdDev = p.maxStdDev;
  spark.minAlpha = p.minAlpha;
  spark.maxPixelRadius = p.maxPixelRadius;
  spark.focalAdjustment = p.focalAdjustment;
}

function applySpeed(mult) {
  const m = Number.isFinite(mult) ? Math.min(Math.max(mult, 0.2), 3.0) : 1.0;
  if (speedValEl) speedValEl.textContent = `${m.toFixed(2)}×`;
  if (orbitControls) {
    orbitControls.zoomSpeed = baseSpeeds.orbit.zoom * m;
    orbitControls.panSpeed = baseSpeeds.orbit.pan * m;
    orbitControls.rotateSpeed = baseSpeeds.orbit.rotate * Math.sqrt(m);
  }
  if (fpsMovement) fpsMovement.moveSpeed = baseSpeeds.fps.move * m;
  if (pointerControls) {
    pointerControls.scrollSpeed = baseSpeeds.pointer.scroll * m;
    pointerControls.slideSpeed = baseSpeeds.pointer.slide * m;
    pointerControls.rotateSpeed = baseSpeeds.pointer.rotate * Math.sqrt(m);
  }
}

function setExposure(v) {
  const x = Number.isFinite(v) ? Math.min(Math.max(v, 0.2), 2.5) : 1.0;
  if (exposureValEl) exposureValEl.textContent = `${x.toFixed(2)}×`;
  renderer.toneMappingExposure = x;
}

function applyZoomToCursor() { if (orbitControls) orbitControls.zoomToCursor = !!zoomToCursorEl.checked; }

function applyUpAxis(axis) {
  const up = axis === "y" ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  camera.up.copy(up);
  camera.updateProjectionMatrix();
  orbitControls?.update();
}

function toggleFlip() {
  if (!splatMesh) return;
  flipped = !flipped;
  splatMesh.rotation.x = flipped ? Math.PI : 0;
  setStatus(flipped ? "Flipped model." : "Unflipped model.");
}

function createOrbitControls() {
  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.07;
  orbitControls.rotateSpeed = baseSpeeds.orbit.rotate;
  orbitControls.zoomSpeed = baseSpeeds.orbit.zoom;
  orbitControls.panSpeed = baseSpeeds.orbit.pan;
  orbitControls.screenSpacePanning = true;
  if (orbitControls.touches) { orbitControls.touches.ONE = THREE.TOUCH.ROTATE; orbitControls.touches.TWO = THREE.TOUCH.DOLLY_PAN; }
  orbitControls.update();
}

function setControlsMode(mode) {
  applySpeed(parseFloat(speedEl.value));
  if (mode === "fps") {
    orbitControls && (orbitControls.enabled = false);
    if (!pointerControls) {
      pointerControls = new PointerControls({
        canvas: renderer.domElement,
        rotateSpeed: baseSpeeds.pointer.rotate,
        slideSpeed: baseSpeeds.pointer.slide,
        scrollSpeed: baseSpeeds.pointer.scroll,
        moveInertia: 0.15,
        rotateInertia: 0.15,
      });
    }
    if (!fpsMovement) fpsMovement = new FpsMovement({ moveSpeed: baseSpeeds.fps.move, rotateSpeed: 2.0 });
    setStatus("Controls: FPS");
    return;
  }
  orbitControls && (orbitControls.enabled = true);
  setStatus("Controls: Orbit");
}

function setProjection(mode) {
  // Preserve current view (position + target + apparent framing)
  const prevTarget = orbitControls ? orbitControls.target.clone() : homeState.target.clone();
  const prevPos = camera.position.clone();
  const prevQuat = camera.quaternion.clone();
  const prevAspect = window.innerWidth / window.innerHeight;

  const prevWasPersp = camera.isPerspectiveCamera;
  const prevFov = prevWasPersp ? camera.fov : 60;

  // For ortho -> persp, compute an equivalent fov from ortho height at the target distance.
  const dist = prevPos.distanceTo(prevTarget);
  let targetFov = prevFov;

  if (!prevWasPersp && dist > 1e-6) {
    const orthoHeight = (camera.top - camera.bottom) / (camera.zoom || 1);
    targetFov = THREE.MathUtils.radToDeg(2 * Math.atan((orthoHeight * 0.5) / dist));
    if (!Number.isFinite(targetFov) || targetFov < 10) targetFov = 60;
  }

  // Create new camera
  if (mode === "ortho") {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 5000);
    cam.up.copy(camera.up);
    camera = cam;
  } else {
    const cam = new THREE.PerspectiveCamera(targetFov, prevAspect, 0.01, 5000);
    cam.up.copy(camera.up);
    camera = cam;
  }

  // Restore pose
  camera.position.copy(prevPos);
  camera.quaternion.copy(prevQuat);
  camera.updateProjectionMatrix();

  // Rebind OrbitControls
  orbitControls?.dispose();
  createOrbitControls();
  orbitControls.target.copy(prevTarget);
  orbitControls.update();

  // If switching to ortho, match apparent framing at the target distance.
  if (camera.isOrthographicCamera && dist > 1e-6) {
    const fovRad = THREE.MathUtils.degToRad(prevWasPersp ? prevFov : targetFov);
    const height = 2 * dist * Math.tan(fovRad / 2);
    const width = height * prevAspect;

    camera.left = -width / 2;
    camera.right = width / 2;
    camera.top = height / 2;
    camera.bottom = -height / 2;
    camera.zoom = 1;
    camera.updateProjectionMatrix();
  }

  applyUpAxis(upAxisEl.value);
}

function createCamera(mode) {
  const aspect = window.innerWidth / window.innerHeight;
  if (mode === "ortho") {
    const frustumHeight = 2;
    const frustumWidth = frustumHeight * aspect;
    const cam = new THREE.OrthographicCamera(-frustumWidth/2, frustumWidth/2, frustumHeight/2, -frustumHeight/2, 0.01, 5000);
    cam.up.set(0, 0, 1);
    cam.position.copy(homeState.camPos);
    cam.lookAt(homeState.target);
    return cam;
  }
  const cam = new THREE.PerspectiveCamera(60, aspect, 0.01, 5000);
  cam.up.set(0, 0, 1);
  cam.position.copy(homeState.camPos);
  cam.lookAt(homeState.target);
  return cam;
}

function resetCamera() {
  camera.position.copy(homeState.camPos);
  camera.lookAt(homeState.target);
  if (orbitControls) { orbitControls.target.copy(homeState.target); orbitControls.update(); }
  setStatus("Camera reset.");
}

function fitToSplat() {
  if (!splatMesh) return;
  let box = null;
  try { box = splatMesh.getBoundingBox?.(false) || splatMesh.getBoundingBox?.() || null; } catch { box = null; }
  if (!box) { const tmp = new THREE.Box3(); tmp.setFromObject(splatMesh); box = tmp; }
  if (!box || !isFiniteBox(box)) { setStatus("Fit: bounding box not available yet."); return; }
  centerAndFrameToBox(box);
}

async function autoCenterAndFrame(attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    if (!splatMesh) return;
    let box = null;
    try { box = splatMesh.getBoundingBox?.(false) || splatMesh.getBoundingBox?.() || null; } catch { box = null; }
    if (box && isFiniteBox(box)) { centerAndFrameToBox(box); return; }
    await new Promise((r) => requestAnimationFrame(r));
  }
}

function centerAndFrameToBox(box) {
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxSize = Math.max(size.x, size.y, size.z);
  const dir = new THREE.Vector3(1, 1, 0.8).normalize();

  if (camera.isPerspectiveCamera) {
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitHeightDistance = maxSize / (2 * Math.tan(fov / 2));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = 1.25 * Math.max(fitHeightDistance, fitWidthDistance);
    camera.position.copy(center).addScaledVector(dir, distance);
    camera.near = Math.max(distance / 1000, 0.001);
    camera.far = distance * 2000;
    camera.updateProjectionMatrix();
  } else {
    camera.position.copy(center).addScaledVector(dir, 10);
    const aspect = window.innerWidth / window.innerHeight;
    const frustumHeight = maxSize * 1.25;
    const frustumWidth = frustumHeight * aspect;
    camera.left = -frustumWidth / 2; camera.right = frustumWidth / 2;
    camera.top = frustumHeight / 2; camera.bottom = -frustumHeight / 2;
    camera.near = 0.01; camera.far = 20000;
    camera.updateProjectionMatrix();
  }

  if (orbitControls) {
    orbitControls.target.copy(center);
    orbitControls.minDistance = Math.max(maxSize * 0.02, 0.01);
    orbitControls.maxDistance = Math.max(maxSize * 200, 10);
    orbitControls.update();
  }

  homeState.camPos.copy(camera.position);
  homeState.target.copy(orbitControls ? orbitControls.target : center);
  setStatus("Centered view.");
}

function focusAtPointer(clientX, clientY) {
  if (!splatMesh || !orbitControls) return;
  const rect = renderer.domElement.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * 2 - 1;
  const y = -(((clientY - rect.top) / rect.height) * 2 - 1);

  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x, y }, camera);
  const hits = raycaster.intersectObject(splatMesh, true);
  if (!hits || hits.length === 0) return;

  const hit = hits[0];
  const oldTarget = orbitControls.target.clone();
  const offset = camera.position.clone().sub(oldTarget);

  orbitControls.target.copy(hit.point);
  camera.position.copy(hit.point).add(offset);
  camera.lookAt(hit.point);
  orbitControls.update();
  setStatus("Focused.");
}

function animate() {
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (controlsModeEl.value === "orbit") {
      orbitControls?.enabled && orbitControls.update();
    } else {
      pointerControls?.update(dt, camera);
      fpsMovement?.update(dt, camera);

// Q/E vertical movement (down/up) in FPS mode
if (keyDownQ || keyDownE) {
  const up = camera.up.clone().normalize();
  const speed = (fpsMovement?.moveSpeed ?? 1.0);
  const dir = (keyDownE ? 1 : 0) - (keyDownQ ? 1 : 0);
  camera.position.addScaledVector(up, dir * speed * dt);
}

    }
    renderer.render(scene, camera);
  });
}

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  renderer.setPixelRatio(computePixelRatio());
  if (camera.isPerspectiveCamera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
  else {
    const aspect = w / h;
    const frustumHeight = 2;
    camera.left = -(frustumHeight * aspect) / 2;
    camera.right = (frustumHeight * aspect) / 2;
    camera.top = frustumHeight / 2;
    camera.bottom = -frustumHeight / 2;
    camera.updateProjectionMatrix();
  }
}

function computePixelRatio() {
  const preset = renderQualityPresets[renderQualityEl?.value || "balanced"] ?? renderQualityPresets.balanced;
  const dpr = window.devicePixelRatio || 1;
  return Math.min(dpr * preset.pixelRatioScale, 2);
}

function setBackground(on) { scene.background = on ? new THREE.Color(0x111215) : null; }
function setStatus(msg) { statusEl.textContent = msg; }
function getExt(name) { const i = name.lastIndexOf("."); return i >= 0 ? name.slice(i + 1).toLowerCase() : ""; }

function guessSparkFileType(ext) {
  const T = SplatFileType;
  if (!ext) return undefined;
  const key = ext.toUpperCase();
  if (T && key in T) return T[key];
  if (ext === "splat") return T?.SPLAT;
  if (ext === "ksplat") return T?.KSPLAT;
  if (ext === "spz") return T?.SPZ;
  if (ext === "sog") return T?.SOG || T?.SOGS || T?.PCSOGS || T?.PCSOGSZIP;
  if (ext === "ply") return T?.PLY;
  return undefined;
}

function isFiniteBox(box) {
  const min = box.min, max = box.max;
  return [min.x, min.y, min.z, max.x, max.y, max.z].every(Number.isFinite);
}

function takeScreenshot() {
  renderer.render(scene, camera);
  renderer.domElement.toBlob((blob) => {
    if (!blob) return setStatus("Screenshot failed.");
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    downloadBlob(blob, `gs-viewer-${ts}.png`);
    setStatus("Screenshot saved.");
  }, "image/png");
}

function exportState() {
  const state = {
    version: 3,
    projection: camera.isOrthographicCamera ? "ortho" : "persp",
    upAxis: upAxisEl.value,
    flipped,
    exposure: renderer.toneMappingExposure,
    camera: {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.isPerspectiveCamera ? camera.fov : undefined,
      zoom: camera.isOrthographicCamera ? camera.zoom : undefined,
      near: camera.near,
      far: camera.far,
    },
    orbit: orbitControls ? { target: orbitControls.target.toArray() } : undefined,
    ui: {
      controlsMode: controlsModeEl.value,
      renderQuality: renderQualityEl.value,
      lod: lodEl.value,
      bgOn,
      speed: parseFloat(speedEl.value),
      zoomToCursor: !!zoomToCursorEl.checked,
    },
  };
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  downloadBlob(blob, `gs-viewer-state-${ts}.json`);
  setStatus("Exported state.");
}

function importState(state) {
  if (!state || typeof state !== "object") return;

  if (state.ui?.controlsMode) { controlsModeEl.value = state.ui.controlsMode; setControlsMode(state.ui.controlsMode); }
  if (state.ui?.renderQuality && state.ui.renderQuality in renderQualityPresets) {
    renderQualityEl.value = state.ui.renderQuality;
    renderer.setPixelRatio(computePixelRatio());
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  if (state.ui?.lod && state.ui.lod in lodPresets) { lodEl.value = state.ui.lod; applyLodPreset(lodEl.value); }
  if (typeof state.ui?.bgOn === "boolean") { bgOn = state.ui.bgOn; setBackground(bgOn); }
  if (typeof state.ui?.speed === "number") { speedEl.value = String(state.ui.speed); applySpeed(parseFloat(speedEl.value)); }
  if (typeof state.ui?.zoomToCursor === "boolean") { zoomToCursorEl.checked = state.ui.zoomToCursor; applyZoomToCursor(); }

  if (typeof state.exposure === "number") { exposureEl.value = String(state.exposure); setExposure(parseFloat(exposureEl.value)); }
  if (state.upAxis === "y" || state.upAxis === "z") { upAxisEl.value = state.upAxis; applyUpAxis(state.upAxis); }

  const proj = state.projection === "ortho" ? "ortho" : "persp";
  projectionEl.value = proj;
  camera = createCamera(proj);
  orbitControls?.dispose();
  createOrbitControls();

  const cam = state.camera;
  if (cam?.position) camera.position.fromArray(cam.position);
  if (cam?.quaternion) camera.quaternion.fromArray(cam.quaternion);
  if (camera.isPerspectiveCamera && typeof cam?.fov === "number") camera.fov = cam.fov;
  if (camera.isOrthographicCamera && typeof cam?.zoom === "number") camera.zoom = cam.zoom;
  if (typeof cam?.near === "number") camera.near = cam.near;
  if (typeof cam?.far === "number") camera.far = cam.far;
  camera.updateProjectionMatrix();

  if (state.orbit?.target) orbitControls.target.fromArray(state.orbit.target);
  orbitControls.update();

  flipped = !!state.flipped;
  if (splatMesh) splatMesh.rotation.x = flipped ? Math.PI : 0;

  homeState.camPos.copy(camera.position);
  homeState.target.copy(orbitControls.target);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

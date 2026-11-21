"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function createSoftboxTexture(shape: "radial" | "strip" = "radial"): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    if (shape === "strip") {
      const gradX = ctx.createLinearGradient(0, 0, size, 0);
      gradX.addColorStop(0.0, "rgba(255,255,255,0)");
      gradX.addColorStop(0.22, "rgba(255,255,255,0.75)");
      gradX.addColorStop(0.5, "rgba(255,255,255,1)");
      gradX.addColorStop(0.78, "rgba(255,255,255,0.75)");
      gradX.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = gradX;
      ctx.fillRect(0, 0, size, size);

      ctx.globalCompositeOperation = "destination-in";
      const gradY = ctx.createLinearGradient(0, 0, 0, size);
      gradY.addColorStop(0.0, "rgba(255,255,255,0)");
      gradY.addColorStop(0.18, "rgba(255,255,255,1)");
      gradY.addColorStop(0.82, "rgba(255,255,255,1)");
      gradY.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = gradY;
      ctx.fillRect(0, 0, size, size);
    } else {
      const cx = size / 2;
      const grad = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      grad.addColorStop(0.0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.85)");
      grad.addColorStop(0.7, "rgba(255,255,255,0.28)");
      grad.addColorStop(1.0, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  return texture;
}

function createStudioEnvironment() {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x111318);

  const radialTex = createSoftboxTexture("radial");
  const stripTex = createSoftboxTexture("strip");

  const addPanel = (
    color: number,
    intensity: number,
    width: number,
    height: number,
    pos: [number, number, number],
    {
      shape = "radial",
      roll = 0,
      target = [0, 0, 0],
    }: { shape?: "radial" | "strip"; roll?: number; target?: [number, number, number] } = {},
  ) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      map: shape === "strip" ? stripTex : radialTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.position.set(...pos);
    mesh.lookAt(...target);
    if (roll) mesh.rotateZ(roll);
    envScene.add(mesh);
  };

  // Primary diagonal front-upper-left softbox (warm-neutral key gradient across +Z)
  addPanel(0xfff7ed, 4.6, 17, 13, [-5.5, 5.5, 10], { shape: "radial", roll: -0.35 });
  // Broad overhead studio bank for top bevels
  addPanel(0xfafcff, 3.8, 18, 9, [0, 10, 4], { shape: "strip" });
  // Crisp cool right-side vertical strip for edge definition
  addPanel(0xc8dcff, 5.2, 4.5, 16, [11, 1.5, 3], { shape: "strip" });
  // Left-back cool strip for side walls when rotated
  addPanel(0xdbe8ff, 3.4, 5, 14, [-10, 2, -6], { shape: "strip" });
  // Back overhead rim for 360-degree spin
  addPanel(0xe8f1ff, 3.6, 16, 6, [0, 7, -10], { shape: "strip" });
  // Subtle cool lower bounce so underside bevels stay legible
  addPanel(0x8ea4c2, 1.1, 16, 6, [3, -8.5, 6], { shape: "radial" });

  return { envScene, textures: [radialTex, stripTex] };
}

// avatar-intro.svg: viewBox height 61.28; the model (outline + bevel) spans 58.88 + 2 * 0.736 of it.
const MODEL_SHARE = (58.88 + 2 * 0.736) / 61.28;
const HOLD_MS = 600;
const FADE_MS = 900;
const DOCK_DELAY_MS = 200;
const DOCKED_HEIGHT_PX = 64;

const IDLE_RAD_PER_SEC = 0.6;
const EASE_RATE = 1.6;
const DRAG_RAD_PER_PX = 0.008;
const MORPH_RATE = 9;
const TAP_MAX_DIST_PX = 6;
const TAP_MAX_DURATION_MS = 300;

interface AvatarIntroProps {
  slotRef: React.RefObject<HTMLButtonElement | null>;
  isExpanded: boolean;
  skipIntro?: boolean;
  onIntroComplete: () => void;
  onCollapse: () => void;
}

export function AvatarIntro({
  slotRef,
  isExpanded,
  skipIntro = false,
  onIntroComplete,
  onCollapse,
}: AvatarIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const introImgRef = useRef<HTMLImageElement>(null);

  const isExpandedRef = useRef(isExpanded);
  const onIntroCompleteRef = useRef(onIntroComplete);
  const onCollapseRef = useRef(onCollapse);

  useEffect(() => {
    isExpandedRef.current = isExpanded;
    onIntroCompleteRef.current = onIntroComplete;
    onCollapseRef.current = onCollapse;
  }, [isExpanded, onIntroComplete, onCollapse]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const intro = introRef.current;
    const introImg = introImgRef.current;
    if (!canvas || !intro || !introImg) return;

    let disposed = false;
    let dockTimerId: number | undefined;
    let holdTimerId: number | undefined;

    let introShownAt = 0;
    const introShown = introImg
      .decode()
      .catch(() => {})
      .then(() =>
        Promise.all(intro.getAnimations().map((a) => a.finished)).catch(() => {}),
      )
      .then(() => {
        introShownAt = performance.now();
      });

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const { envScene: studioScene, textures: studioTextures } =
      createStudioEnvironment();
    const envRT = pmrem.fromScene(studioScene, 0.028);
    scene.environment = envRT.texture;
    studioScene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    studioTextures.forEach((tex) => tex.dispose());
    pmrem.dispose();

    const keyLight = new THREE.DirectionalLight(0xfff7ee, 1.65);
    keyLight.position.set(-4.5, 5.5, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xc8dcff, 1.45);
    rimLight.position.set(5.5, 2.5, -4.5);
    scene.add(rimLight);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const spinner = new THREE.Group();
    scene.add(spinner);

    let modelHeight = 0;
    let revealed = skipIntro;
    let velocity = 0;
    let spinUp = skipIntro ? 1 : 0;
    let fadeStart = 0;
    let introDone = skipIntro;

    if (skipIntro) {
      intro.style.display = "none";
    }

    // morph: 0 = full-size centered (46vmin), 1 = docked in 64px slot
    let morph = isExpandedRef.current ? 0 : 1;

    let dragging = false;
    let pointerDownX = 0;
    let pointerDownY = 0;
    let pointerDownTime = 0;
    let totalDragDist = 0;
    let lastX = 0;
    let lastT = 0;
    let dragVel = 0;

    let viewportW = canvas.clientWidth || window.innerWidth;
    let viewportH = canvas.clientHeight || window.innerHeight;
    let slotCenterX = viewportW / 2;
    let slotCenterY = viewportH / 2;

    const measureSlot = () => {
      const slot = slotRef.current;
      if (!slot) return;
      const rect = slot.getBoundingClientRect();
      slotCenterX = rect.left + rect.width / 2;
      slotCenterY = rect.top + rect.height / 2;
    };

    const updateCamera = () => {
      if (!modelHeight || viewportH <= 0 || viewportW <= 0) return;

      const fallbackExpandedHeight = Math.min(0.68 * viewportW, 0.46 * viewportH);
      const expandedHeight =
        intro.style.display !== "none"
          ? intro.getBoundingClientRect().height || fallbackExpandedHeight
          : fallbackExpandedHeight;

      const currentHeight = THREE.MathUtils.lerp(
        expandedHeight,
        DOCKED_HEIGHT_PX,
        morph,
      );
      const currentX = THREE.MathUtils.lerp(viewportW / 2, slotCenterX, morph);
      const currentY = THREE.MathUtils.lerp(viewportH / 2, slotCenterY, morph);

      const frac = (currentHeight / viewportH) * MODEL_SHARE;
      const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));

      camera.position.set(0, 0, modelHeight / (2 * tanHalf * frac));
      camera.lookAt(0, 0, 0);
      camera.setViewOffset(
        viewportW,
        viewportH,
        viewportW / 2 - currentX,
        viewportH / 2 - currentY,
        viewportW,
        viewportH,
      );
      camera.updateProjectionMatrix();
    };

    const handleResize = () => {
      viewportW = canvas.clientWidth || window.innerWidth;
      viewportH = canvas.clientHeight || window.innerHeight;
      renderer.setSize(viewportW, viewportH, false);
      camera.aspect = viewportW / viewportH;
      measureSlot();
      updateCamera();
    };

    const handleScroll = () => {
      measureSlot();
      updateCamera();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isExpandedRef.current && introDone) {
        onCollapseRef.current();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(canvas);

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("keydown", handleKeyDown);
    handleResize();

    new GLTFLoader().load("/avatar.glb", (gltf) => {
      if (disposed) return;

      const model = gltf.scene;
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          obj.material.envMapIntensity = 1.6;
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      model.position.sub(box.getCenter(new THREE.Vector3()));
      spinner.add(model);
      modelHeight = box.getSize(new THREE.Vector3()).y;

      measureSlot();
      updateCamera();
      renderer.compile(scene, camera);

      if (skipIntro) {
        handleResize();
        canvas.style.visibility = "visible";
      } else {
        introShown.then(() => {
          if (disposed) return;
          handleResize();
          canvas.style.visibility = "visible";
          const wait = Math.max(0, HOLD_MS - (performance.now() - introShownAt));
          holdTimerId = window.setTimeout(() => {
            if (!disposed) {
              fadeStart = performance.now();
            }
          }, wait);
        });
      }
    });

    const onPointerDown = (e: PointerEvent) => {
      if (!revealed || !isExpandedRef.current) return;
      dragging = true;
      pointerDownX = e.clientX;
      pointerDownY = e.clientY;
      pointerDownTime = performance.now();
      totalDragDist = 0;
      lastX = e.clientX;
      lastT = pointerDownTime;
      dragVel = 0;
      canvas.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      const dt = Math.max((now - lastT) / 1000, 1 / 240);
      totalDragDist = Math.max(
        totalDragDist,
        Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY),
      );
      spinner.rotation.y += dx * DRAG_RAD_PER_PX;
      dragVel = THREE.MathUtils.lerp(
        dragVel,
        (dx * DRAG_RAD_PER_PX) / dt,
        0.5,
      );
      lastX = e.clientX;
      lastT = now;
    };

    const releasePointer = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const now = performance.now();
      const wasTap =
        e.type === "pointerup" &&
        totalDragDist <= TAP_MAX_DIST_PX &&
        now - pointerDownTime <= TAP_MAX_DURATION_MS;

      spinUp = 1;
      velocity =
        now - lastT > 80 ? IDLE_RAD_PER_SEC * Math.sign(dragVel || 1) : dragVel;

      if (wasTap && introDone && isExpandedRef.current) {
        onCollapseRef.current();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", releasePointer);
    canvas.addEventListener("pointercancel", releasePointer);

    const clock = new THREE.Clock();
    renderer.setAnimationLoop(() => {
      const dt = Math.min(clock.getDelta(), 0.05);

      if (fadeStart) {
        const p = Math.min(1, (performance.now() - fadeStart) / FADE_MS);
        intro.style.opacity = String(1 - p * p * (3 - 2 * p));
        if (p > 0.75) revealed = true;
        if (p >= 1) {
          intro.style.display = "none";
          fadeStart = 0;
          dockTimerId = window.setTimeout(() => {
            if (!disposed) {
              introDone = true;
              onIntroCompleteRef.current();
            }
          }, DOCK_DELAY_MS);
        }
      }

      if (revealed && !dragging) {
        spinUp = Math.min(1, spinUp + dt / 1.6);
        const ramp = spinUp * spinUp * (3 - 2 * spinUp);
        const targetVel = IDLE_RAD_PER_SEC * ramp * Math.sign(velocity || 1);
        if (Math.abs(velocity) > IDLE_RAD_PER_SEC * ramp) {
          velocity += (targetVel - velocity) * (1 - Math.exp(-EASE_RATE * dt));
        } else {
          velocity = targetVel;
        }
        spinner.rotation.y += velocity * dt;
      }

      const targetMorph = isExpandedRef.current ? 0 : 1;
      if (Math.abs(targetMorph - morph) > 0.0005) {
        morph += (targetMorph - morph) * (1 - Math.exp(-MORPH_RATE * dt));
        if (Math.abs(targetMorph - morph) <= 0.0005) {
          morph = targetMorph;
        }
        measureSlot();
        updateCamera();
      }

      renderer.render(scene, camera);
    });

    return () => {
      disposed = true;
      if (holdTimerId !== undefined) window.clearTimeout(holdTimerId);
      if (dockTimerId !== undefined) window.clearTimeout(dockTimerId);

      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("keydown", handleKeyDown);

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", releasePointer);
      canvas.removeEventListener("pointercancel", releasePointer);

      spinner.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });

      envRT.dispose();
      renderer.dispose();
    };
  }, [slotRef]);

  return (
    <>
      <div
        ref={introRef}
        className="avatar-intro-svg pointer-events-none fixed top-1/2 left-1/2 z-30 aspect-[597/613] h-[min(68vw,46dvh)] max-w-none -translate-x-1/2 -translate-y-1/2 select-none"
      >
        <img
          ref={introImgRef}
          src="/avatar-intro.svg"
          alt=""
          width={597}
          height={613}
          fetchPriority="high"
          className="block size-full max-w-none"
        />
        <div className="avatar-intro-shimmer pointer-events-none absolute inset-0" />
      </div>
      <canvas
        ref={canvasRef}
        className={`fixed inset-0 z-20 block size-full touch-none ${
          isExpanded
            ? "pointer-events-auto cursor-grab active:cursor-grabbing"
            : "pointer-events-none"
        }`}
        style={{ visibility: "hidden" }}
      />
    </>
  );
}

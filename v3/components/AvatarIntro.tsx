"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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
  onIntroComplete: () => void;
  onCollapse: () => void;
}

export function AvatarIntro({
  slotRef,
  isExpanded,
  onIntroComplete,
  onCollapse,
}: AvatarIntroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const introRef = useRef<HTMLImageElement>(null);

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
    if (!canvas || !intro) return;

    let disposed = false;
    let dockTimerId: number | undefined;
    let holdTimerId: number | undefined;

    let introShownAt = 0;
    const introShown = intro
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
    renderer.toneMappingExposure = 1.5;

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.5);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const spinner = new THREE.Group();
    scene.add(spinner);

    let modelHeight = 0;
    let revealed = false;
    let velocity = 0;
    let spinUp = 0;
    let fadeStart = 0;
    let introDone = false;

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

    let viewportW = window.innerWidth;
    let viewportH = window.innerHeight;
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
      viewportW = window.innerWidth;
      viewportH = window.innerHeight;
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

      introShown.then(() => {
        if (disposed) return;
        canvas.style.visibility = "visible";
        const wait = Math.max(0, HOLD_MS - (performance.now() - introShownAt));
        holdTimerId = window.setTimeout(() => {
          if (!disposed) {
            fadeStart = performance.now();
          }
        }, wait);
      });
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
      pmrem.dispose();
      renderer.dispose();
    };
  }, [slotRef]);

  return (
    <>
      <img
        ref={introRef}
        src="/avatar-intro.svg"
        alt=""
        width={597}
        height={613}
        fetchPriority="high"
        className="avatar-intro-svg pointer-events-none fixed top-1/2 left-1/2 z-30 h-[min(68vw,46dvh)] w-auto -translate-x-1/2 -translate-y-1/2 select-none"
      />
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

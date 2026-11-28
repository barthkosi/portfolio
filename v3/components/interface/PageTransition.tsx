"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type ComponentProps,
  createContext,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  useTransition,
} from "react";

type TransitionPhase = "idle" | "loading" | "sweeping";

type NavigateOptions = {
  onCovered?: () => void;
};

type PageTransitionContextValue = {
  navigate: (href: string, options?: NavigateOptions) => void;
  isTransitioning: boolean;
};

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

type GlEngine = {
  gl: WebGLRenderingContext;
  blurProgram: WebGLProgram;
  trailProgram: WebGLProgram;
  compositeProgram: WebGLProgram;
  quad: WebGLBuffer;
  width: number;
  height: number;
  pixelWidth: number;
  pixelHeight: number;
  fieldWidth: number;
  fieldHeight: number;
  fieldScale: number;
  trailWidth: number;
  trailHeight: number;
  oldField: Target | null;
  newField: Target | null;
  trails: [Target, Target] | null;
  background: [number, number, number];
};

type ClipRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

const PageTransitionContext = createContext<PageTransitionContextValue | null>(
  null,
);

const MAX_DPR = 1.5;
const MAX_FIELD_DIM = 960;
const FIELD_SCALE = 0.5;
const TRAIL_SCALE = 0.25;
const BLUR_SIGMAS: [number, number, number] = [3, 8, 18];
const SWEEP_DURATION_MS = 850;
const IDLE_MS = 2200;
const CONTENT_WAIT_TIMEOUT_MS = 2500;
const IMAGE_WAIT_TIMEOUT_MS = 2500;
const VIDEO_WAIT_TIMEOUT_MS = 1500;
const ROUTE_TIMEOUT_MS = 15000;
const PENDING_CONTENT_SELECTOR = '[data-transition-pending="true"]';

const VERTEX_SHADER = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const BLUR_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D source;
uniform vec2 direction;
uniform vec3 sigmas;
uniform float fromMask;

vec4 fetch(vec2 uv) {
  vec4 color = texture2D(source, uv);
  if (fromMask > 0.5) {
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    return vec4(lum * color.a);
  }
  return color;
}

void main() {
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int i = -16; i <= 16; i++) {
    float t = float(i) * (3.0 / 16.0);
    float weight = exp(-0.5 * t * t);
    vec3 offset = t * sigmas;
    sum.x += weight * fetch(vUv + direction * offset.x).g;
    sum.y += weight * fetch(vUv + direction * offset.y).b;
    sum.z += weight * fetch(vUv + direction * offset.z).a;
    total += weight;
  }
  gl_FragColor = vec4(fetch(vUv).r, sum / total);
}`;

const TRAIL_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D previous;
uniform vec2 resolution;
uniform float revealFromY;
uniform float revealToY;
uniform float revealRadius;
uniform float revealStrength;
uniform float waveAmp;
uniform float decay;
uniform float fade;
uniform float time;

void main() {
  vec2 px = vUv * resolution;
  vec2 flow = vec2(
    sin(px.y * 0.032 + time * 2.1),
    cos(px.x * 0.028 - time * 1.7) * 0.5 + 0.7
  ) * 0.85;
  vec2 sampleUv = vUv - flow / resolution;
  float inBounds = step(0.0, sampleUv.y) * step(sampleUv.y, 1.0);
  float previousHeat = texture2D(previous, sampleUv).r * inBounds;

  float revealWave = (
    sin(vUv.x * 9.0 + time * 2.4) * 0.65 +
    sin(vUv.x * 21.0 - time * 1.8) * 0.35
  ) * waveAmp;
  float yFrom = revealFromY + revealWave;
  float yTo = revealToY + revealWave;
  float dReveal = max(max(min(yFrom, yTo) - px.y, px.y - max(yFrom, yTo)), 0.0);
  float revealSplat =
    revealStrength * exp(-(dReveal * dReveal) / (revealRadius * revealRadius));

  float heat = max(previousHeat * decay - fade, 0.0) + revealSplat;
  gl_FragColor = vec4(min(heat, 1.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D oldMask;
uniform sampler2D newMask;
uniform sampler2D trail;
uniform vec2 resolution;
uniform float time;
uniform float maskY;
uniform float maskFeather;
uniform vec3 background;

const vec3 CYAN = vec3(0.0, 0.69, 0.94);
const vec3 YELLOW = vec3(1.0, 0.93, 0.0);
const vec3 GREEN = vec3(0.0, 0.62, 0.33);
const vec3 CORE = vec3(0.0);

vec3 heatRamp(float h) {
  vec3 color = mix(background, CYAN, smoothstep(0.01, 0.14, h));
  color = mix(color, YELLOW, smoothstep(0.14, 0.34, h));
  color = mix(color, GREEN, smoothstep(0.34, 0.56, h));
  return mix(color, CORE, smoothstep(0.56, 0.85, h));
}

void main() {
  float influence = smoothstep(0.0, 1.0, texture2D(trail, vUv).r);
  if (influence <= 0.004) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 px = vUv * resolution;
  float wave = sin(px.x * 0.045 + time * 3.0 + sin(px.y * 0.035 - time * 2.2) * 2.0);
  vec2 warp = vec2(
    sin(px.y * 0.06 + time * 2.4),
    cos(px.x * 0.05 - time * 2.1)
  ) * 3.0 * influence;
  vec2 warpedUv = clamp(vUv + warp / resolution, 0.0, 1.0);
  float fieldMix = smoothstep(maskY - maskFeather, maskY + maskFeather, px.y);
  vec4 field = mix(
    texture2D(oldMask, warpedUv),
    texture2D(newMask, warpedUv),
    fieldMix
  );
  float level = clamp(influence * (0.85 + 0.25 * wave), 0.0, 1.0) * 3.0;
  float h = mix(field.r, field.g, clamp(level, 0.0, 1.0));
  h = mix(h, field.b, clamp(level - 1.0, 0.0, 1.0));
  h = mix(h, field.a, clamp(level - 2.0, 0.0, 1.0));
  h = clamp(h * (1.0 + influence * 3.5), 0.0, 1.0);
  float alpha = smoothstep(0.01, 0.2, influence);
  gl_FragColor = vec4(heatRamp(h) * alpha, alpha);
}`;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function setElementMask(element: HTMLElement, value: string) {
  element.style.maskImage = value;
  if (value) {
    element.style.setProperty("-webkit-mask-image", value);
  } else {
    element.style.removeProperty("-webkit-mask-image");
  }
}

function compileProgram(gl: WebGLRenderingContext, fragmentSource: string) {
  const program = gl.createProgram();
  const shaders = [
    [gl.VERTEX_SHADER, VERTEX_SHADER],
    [gl.FRAGMENT_SHADER, fragmentSource],
  ] as const;

  for (const [type, source] of shaders) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
    gl.attachShader(program, shader);
  }

  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  return program;
}

function createTexture(gl: WebGLRenderingContext) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function createTarget(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
): Target {
  const texture = createTexture(gl);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null,
  );
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  return { texture, framebuffer };
}

function deleteTarget(gl: WebGLRenderingContext, target: Target | null) {
  if (!target) return;
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}

function toRgb(color: string): [number, number, number] {
  const context = document.createElement("canvas").getContext("2d");
  if (!context) return [0.039, 0.039, 0.039];
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function getBackgroundRgb(): [number, number, number] {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue("--background-primary")
    .trim();
  return toRgb(value || "#0a0a0a");
}

function isSameOriginUrl(url: string): boolean {
  if (!url) return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function isInternalHref(href: string): boolean {
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  return isSameOriginUrl(href);
}

function normalizePath(href: string): string {
  try {
    const url = new URL(href, window.location.href);
    return `${url.pathname}${url.search}`;
  } catch {
    return href;
  }
}

function isHomePath(pathname: string | null): boolean {
  return !pathname || pathname === "/";
}

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0
  );
}

function getEffectiveOpacity(el: Element, root: Element): number {
  let opacity = 1;
  let current: Element | null = el;
  while (current && current !== root.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === "none" || style.visibility === "hidden") {
      return 0;
    }
    opacity *= Number.parseFloat(style.opacity || "1");
    if (opacity <= 0.05) return 0;
    if (current === root) break;
    current = current.parentElement;
  }
  return opacity;
}

function getAncestorClipRect(
  el: Element,
  root: Element,
  vw: number,
  vh: number,
): ClipRect | null {
  let left = 0;
  let top = 0;
  let right = vw;
  let bottom = vh;
  if (getComputedStyle(el).position === "fixed") {
    return { left, top, right, bottom };
  }
  let current: Element | null = el.parentElement;

  while (current && current !== root.parentElement) {
    const style = getComputedStyle(current);
    if (
      style.overflow !== "visible" ||
      style.overflowX !== "visible" ||
      style.overflowY !== "visible"
    ) {
      const rect = current.getBoundingClientRect();
      left = Math.max(left, rect.left);
      top = Math.max(top, rect.top);
      right = Math.min(right, rect.right);
      bottom = Math.min(bottom, rect.bottom);
      if (right <= left || bottom <= top) return null;
    }
    if (style.position === "fixed" || current === root) break;
    current = current.parentElement;
  }

  return { left, top, right, bottom };
}

function traceRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r > 0) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.rect(x, y, w, h);
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  objectFit: string,
) {
  if (objectFit === "cover" && srcW > 0 && srcH > 0 && dw > 0 && dh > 0) {
    const srcAspect = srcW / srcH;
    const dstAspect = dw / dh;
    let sx = 0;
    let sy = 0;
    let sw = srcW;
    let sh = srcH;
    if (srcAspect > dstAspect) {
      sw = srcH * dstAspect;
      sx = (srcW - sw) / 2;
    } else {
      sh = srcW / dstAspect;
      sy = (srcH - sh) / 2;
    }
    ctx.drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh);
    return;
  }
  ctx.drawImage(source, dx, dy, dw, dh);
}

type Occluder = {
  element: Element;
  rect: DOMRect;
  radius: number;
  zIndex: number;
};

function isOpaqueCssColor(color: string): boolean {
  if (!color || color === "transparent") return false;
  const slashMatch = color.match(/\/\s*([\d.]+%?)\s*\)$/);
  if (slashMatch) {
    const raw = slashMatch[1];
    const alpha = raw.endsWith("%")
      ? Number.parseFloat(raw) / 100
      : Number.parseFloat(raw);
    return alpha >= 0.99;
  }
  const rgbaMatch = color.match(
    /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i,
  );
  if (rgbaMatch) {
    return Number.parseFloat(rgbaMatch[1]) >= 0.99;
  }
  return true;
}

function getEffectiveZIndex(el: Element, root: Element): number {
  let effective = 0;
  let current: Element | null = el;
  while (current && current !== root.parentElement) {
    const style = getComputedStyle(current);
    const z = Number.parseInt(style.zIndex, 10);
    if (style.position !== "static" && !Number.isNaN(z)) {
      effective = z;
    }
    if (current === root) break;
    current = current.parentElement;
  }
  return effective;
}

function drawScreenMask(
  root: HTMLElement,
  width: number,
  height: number,
  scale: number,
): HTMLCanvasElement {
  const surface = document.createElement("canvas");
  surface.width = Math.max(1, Math.round(width * scale));
  surface.height = Math.max(1, Math.round(height * scale));
  const ctx = surface.getContext("2d");
  if (!ctx) return surface;

  ctx.scale(scale, scale);

  const occluders: Occluder[] = [];
  for (const header of root.querySelectorAll("header")) {
    const style = getComputedStyle(header);
    if (style.position !== "fixed" || !isOpaqueCssColor(style.backgroundColor)) {
      continue;
    }
    if (getEffectiveOpacity(header, root) <= 0.95) continue;
    const rect = header.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) continue;
    occluders.push({
      element: header,
      rect,
      radius: Number.parseFloat(style.borderTopLeftRadius) || 0,
      zIndex: getEffectiveZIndex(header, root),
    });
  }

  const applyOcclusionClip = (el: Element) => {
    if (occluders.length === 0) return;
    const elZ = getEffectiveZIndex(el, root);
    for (const occ of occluders) {
      if (occ.element === el || occ.element.contains(el)) continue;
      if (elZ > occ.zIndex) continue;
      ctx.beginPath();
      ctx.rect(0, 0, width, height);
      const r = Math.max(
        0,
        Math.min(occ.radius, occ.rect.width / 2, occ.rect.height / 2),
      );
      if (r > 0) {
        ctx.roundRect(
          occ.rect.left,
          occ.rect.top,
          occ.rect.width,
          occ.rect.height,
          r,
        );
      } else {
        ctx.rect(occ.rect.left, occ.rect.top, occ.rect.width, occ.rect.height);
      }
      ctx.clip("evenodd");
    }
  };

  const elements = root.querySelectorAll(
    "header, button, a, figure, pre, input, textarea, img, video, canvas",
  );

  for (const el of elements) {
    const tag = el.tagName;
    if (tag === "CANVAS" && el.getAttribute("aria-hidden") === "true") {
      continue;
    }

    const rect = el.getBoundingClientRect();
    if (
      rect.width < 2 ||
      rect.height < 2 ||
      rect.bottom <= 0 ||
      rect.top >= height ||
      rect.right <= 0 ||
      rect.left >= width
    ) {
      continue;
    }

    const opacity = getEffectiveOpacity(el, root);
    if (opacity <= 0.05) continue;

    const clip = getAncestorClipRect(el, root, width, height);
    if (!clip) continue;
    if (
      rect.right <= clip.left ||
      rect.left >= clip.right ||
      rect.bottom <= clip.top ||
      rect.top >= clip.bottom
    ) {
      continue;
    }

    const style = getComputedStyle(el);
    const radius = Number.parseFloat(style.borderTopLeftRadius) || 0;

    if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") {
      const parentRadius = el.parentElement
        ? Number.parseFloat(getComputedStyle(el.parentElement).borderTopLeftRadius) || 0
        : 0;
      const effectiveRadius = Math.max(radius, parentRadius);

      ctx.save();
      applyOcclusionClip(el);
      ctx.beginPath();
      ctx.rect(
        clip.left,
        clip.top,
        clip.right - clip.left,
        clip.bottom - clip.top,
      );
      ctx.clip();
      traceRoundedRect(
        ctx,
        rect.left,
        rect.top,
        rect.width,
        rect.height,
        effectiveRadius,
      );
      ctx.clip();
      ctx.globalAlpha = opacity;

      let drewNative = false;
      if (tag === "IMG") {
        const img = el as HTMLImageElement;
        if (
          img.complete &&
          img.naturalWidth > 0 &&
          isSameOriginUrl(img.currentSrc || img.src)
        ) {
          try {
            drawCoverImage(
              ctx,
              img,
              img.naturalWidth,
              img.naturalHeight,
              rect.left,
              rect.top,
              rect.width,
              rect.height,
              style.objectFit,
            );
            drewNative = true;
          } catch {
            drewNative = false;
          }
        }
      } else if (tag === "CANVAS") {
        const srcCanvas = el as HTMLCanvasElement;
        if (srcCanvas.width > 0 && srcCanvas.height > 0) {
          try {
            ctx.drawImage(
              srcCanvas,
              rect.left,
              rect.top,
              rect.width,
              rect.height,
            );
            drewNative = true;
          } catch {
            drewNative = false;
          }
        }
      }

      if (!drewNative) {
        const gradient = ctx.createLinearGradient(
          rect.left,
          rect.top,
          rect.right,
          rect.bottom,
        );
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.14)");
        gradient.addColorStop(0.5, "rgba(255, 255, 255, 0.09)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0.15)");
        ctx.fillStyle = gradient;
        ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
        traceRoundedRect(
          ctx,
          rect.left + 1,
          rect.top + 1,
          Math.max(0, rect.width - 2),
          Math.max(0, rect.height - 2),
          effectiveRadius,
        );
        ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
      continue;
    }

    if (rect.width >= width * 0.98 && rect.height >= height * 0.98) {
      continue;
    }

    const bg = style.backgroundColor;
    const hasSurface =
      bg !== "rgba(0, 0, 0, 0)" &&
      bg !== "transparent" &&
      bg !== "rgb(10, 10, 10)";
    const borderWidth = Number.parseFloat(style.borderTopWidth) || 0;
    const hasBorder =
      borderWidth > 0 && style.borderTopColor !== "rgba(0, 0, 0, 0)";

    if (!hasSurface && !hasBorder) continue;

    ctx.save();
    applyOcclusionClip(el);
    ctx.beginPath();
    ctx.rect(
      clip.left,
      clip.top,
      clip.right - clip.left,
      clip.bottom - clip.top,
    );
    ctx.clip();
    ctx.globalAlpha = opacity;
    traceRoundedRect(ctx, rect.left, rect.top, rect.width, rect.height, radius);
    if (hasSurface) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
      ctx.fill();
    }
    ctx.strokeStyle = hasBorder
      ? "rgba(255, 255, 255, 0.36)"
      : "rgba(255, 255, 255, 0.24)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  ctx.textBaseline = "alphabetic";
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent ?? "";
    if (!parent || !text.trim()) continue;
    const parentTag = parent.tagName;
    if (
      parentTag === "SCRIPT" ||
      parentTag === "STYLE" ||
      parentTag === "NOSCRIPT"
    ) {
      continue;
    }

    const opacity = getEffectiveOpacity(parent, root);
    if (opacity <= 0.05) continue;

    const clip = getAncestorClipRect(parent, root, width, height);
    if (!clip) continue;

    const parentRect = parent.getBoundingClientRect();
    if (
      parentRect.bottom <= clip.top ||
      parentRect.top >= clip.bottom ||
      parentRect.right <= clip.left ||
      parentRect.left >= clip.right
    ) {
      continue;
    }

    const style = getComputedStyle(parent);
    ctx.save();
    applyOcclusionClip(parent);
    ctx.beginPath();
    ctx.rect(
      clip.left,
      clip.top,
      clip.right - clip.left,
      clip.bottom - clip.top,
    );
    ctx.clip();
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.letterSpacing =
      style.letterSpacing === "normal" ? "0px" : style.letterSpacing;

    const pattern = /\S+/g;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getClientRects()[0];
      if (
        !rect ||
        rect.bottom <= clip.top ||
        rect.top >= clip.bottom ||
        rect.right <= clip.left ||
        rect.left >= clip.right
      ) {
        continue;
      }
      const ascent = ctx.measureText(match[0]).fontBoundingBoxAscent;
      ctx.fillText(match[0], rect.left, rect.top + ascent);
    }
    ctx.restore();
  }

  return surface;
}

function captureFrozenPage(appScroll: HTMLElement): HTMLElement {
  const sourceElements = [
    appScroll,
    ...Array.from(appScroll.querySelectorAll("*")),
  ];
  const scrollOffsets = new Map<number, { top: number; left: number }>();
  const videoSnapshots = new Map<number, HTMLCanvasElement>();
  const canvasSnapshots = new Map<number, HTMLCanvasElement>();

  for (let i = 0; i < sourceElements.length; i += 1) {
    const el = sourceElements[i];
    if (el.scrollTop > 0 || el.scrollLeft > 0) {
      scrollOffsets.set(i, { top: el.scrollTop, left: el.scrollLeft });
    }
    if (el instanceof HTMLVideoElement && el.readyState >= 2) {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const frame = document.createElement("canvas");
        frame.width = Math.max(1, Math.round(rect.width));
        frame.height = Math.max(1, Math.round(rect.height));
        frame.className = el.className;
        frame.setAttribute("style", el.getAttribute("style") ?? "");
        const ctx = frame.getContext("2d");
        if (ctx) {
          try {
            drawCoverImage(
              ctx,
              el,
              el.videoWidth || frame.width,
              el.videoHeight || frame.height,
              0,
              0,
              frame.width,
              frame.height,
              getComputedStyle(el).objectFit,
            );
            videoSnapshots.set(i, frame);
          } catch {
            // Cross-origin video cannot be read; fall back to cloned element.
          }
        }
      }
    } else if (
      el instanceof HTMLCanvasElement &&
      el.width > 0 &&
      el.height > 0
    ) {
      const copy = document.createElement("canvas");
      copy.width = el.width;
      copy.height = el.height;
      const ctx = copy.getContext("2d");
      if (ctx) {
        try {
          ctx.drawImage(el, 0, 0);
          canvasSnapshots.set(i, copy);
        } catch {
          // Ignore tainted canvases.
        }
      }
    }
  }

  const clone = appScroll.cloneNode(true) as HTMLElement;
  const clonedElements = [clone, ...Array.from(clone.querySelectorAll("*"))];

  for (let i = 0; i < clonedElements.length; i += 1) {
    const el = clonedElements[i];
    if (el.hasAttribute("id")) {
      el.removeAttribute("id");
    }
    if (el instanceof HTMLElement) {
      el.style.animation = "none";
      el.style.transition = "none";
    }
    const videoFrame = videoSnapshots.get(i);
    if (videoFrame && el.parentNode) {
      el.parentNode.replaceChild(videoFrame, el);
      continue;
    }
    if (el instanceof HTMLVideoElement) {
      el.autoplay = false;
      el.pause();
    }
    const canvasCopy = canvasSnapshots.get(i);
    if (canvasCopy && el instanceof HTMLCanvasElement) {
      el.width = canvasCopy.width;
      el.height = canvasCopy.height;
      const ctx = el.getContext("2d");
      ctx?.drawImage(canvasCopy, 0, 0);
    }
  }

  (
    clone as HTMLElement & {
      __restoreScroll?: () => void;
    }
  ).__restoreScroll = () => {
    for (const [index, offset] of scrollOffsets) {
      const target = clonedElements[index];
      if (target) {
        target.scrollTop = offset.top;
        target.scrollLeft = offset.left;
      }
    }
  };

  return clone;
}

function waitWithTimeout(promise: Promise<unknown>, ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms);
    promise.finally(() => {
      window.clearTimeout(timer);
      resolve();
    });
  });
}

function waitForPendingContent(root: HTMLElement): Promise<void> {
  if (!root.querySelector(PENDING_CONTENT_SELECTOR)) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      observer.disconnect();
      requestAnimationFrame(() => resolve());
    };

    const observer = new MutationObserver(() => {
      if (!root.querySelector(PENDING_CONTENT_SELECTOR)) {
        finish();
      }
    });

    const timer = window.setTimeout(finish, CONTENT_WAIT_TIMEOUT_MS);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-transition-pending"],
    });

    if (!root.querySelector(PENDING_CONTENT_SELECTOR)) {
      finish();
    }
  });
}

async function waitForPageAssets(root: HTMLElement): Promise<void> {
  const fontWait = document.fonts?.ready
    ? waitWithTimeout(document.fonts.ready, 1000)
    : Promise.resolve();

  await waitForPendingContent(root);

  const vh = window.innerHeight;
  const vw = window.innerWidth;

  const imgs = Array.from(root.querySelectorAll("img"));
  const imageWaits: Promise<void>[] = [];
  for (const img of imgs) {
    const rect = img.getBoundingClientRect();
    const clip = getAncestorClipRect(img, root, vw, vh);
    if (
      !clip ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.top >= clip.bottom ||
      rect.bottom <= clip.top ||
      rect.right <= clip.left ||
      rect.left >= clip.right
    ) {
      continue;
    }
    if (!img.complete) {
      imageWaits.push(
        new Promise<void>((resolve) => {
          const done = () => {
            img.removeEventListener("load", done);
            img.removeEventListener("error", done);
            resolve();
          };
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
      );
    } else if (typeof img.decode === "function") {
      imageWaits.push(img.decode().catch(() => {}));
    }
  }

  const videos = Array.from(root.querySelectorAll("video"));
  const videoWaits: Promise<void>[] = [];
  for (const video of videos) {
    const rect = video.getBoundingClientRect();
    const clip = getAncestorClipRect(video, root, vw, vh);
    if (
      !clip ||
      rect.width <= 0 ||
      rect.height <= 0 ||
      rect.top >= clip.bottom ||
      rect.bottom <= clip.top ||
      rect.right <= clip.left ||
      rect.left >= clip.right
    ) {
      continue;
    }
    if (video.readyState < 2) {
      videoWaits.push(
        new Promise<void>((resolve) => {
          const done = () => {
            video.removeEventListener("loadeddata", done);
            video.removeEventListener("error", done);
            resolve();
          };
          video.addEventListener("loadeddata", done, { once: true });
          video.addEventListener("error", done, { once: true });
        }),
      );
    }
  }

  await Promise.all([
    fontWait,
    imageWaits.length > 0
      ? waitWithTimeout(Promise.all(imageWaits), IMAGE_WAIT_TIMEOUT_MS)
      : Promise.resolve(),
    videoWaits.length > 0
      ? waitWithTimeout(Promise.all(videoWaits), VIDEO_WAIT_TIMEOUT_MS)
      : Promise.resolve(),
  ]);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function buildFieldFromSurface(
  engine: GlEngine,
  surface: HTMLCanvasElement,
): Target {
  const { gl, blurProgram, fieldWidth, fieldHeight, fieldScale } = engine;
  const uniform = (name: string) => gl.getUniformLocation(blurProgram, name);

  const maskTexture = createTexture(gl);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  try {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      surface,
    );
  } catch {
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      fieldWidth,
      fieldHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
  }

  const horizontal = createTarget(gl, fieldWidth, fieldHeight);
  const field = createTarget(gl, fieldWidth, fieldHeight);

  gl.useProgram(blurProgram);
  gl.viewport(0, 0, fieldWidth, fieldHeight);
  gl.uniform1i(uniform("source"), 0);
  gl.uniform3f(
    uniform("sigmas"),
    BLUR_SIGMAS[0] * fieldScale,
    BLUR_SIGMAS[1] * fieldScale,
    BLUR_SIGMAS[2] * fieldScale,
  );
  gl.activeTexture(gl.TEXTURE0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, maskTexture);
  gl.uniform2f(uniform("direction"), 1 / fieldWidth, 0);
  gl.uniform1f(uniform("fromMask"), 1);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
  gl.bindTexture(gl.TEXTURE_2D, horizontal.texture);
  gl.uniform2f(uniform("direction"), 0, 1 / fieldHeight);
  gl.uniform1f(uniform("fromMask"), 0);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  gl.deleteTexture(maskTexture);
  deleteTarget(gl, horizontal);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return field;
}

export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [phaseState, setPhaseState] = useState<TransitionPhase>(() =>
    isHomePath(pathname) ? "idle" : "loading",
  );
  const [initialCoverActive, setInitialCoverActive] = useState(
    () => !isHomePath(pathname),
  );

  const snapshotHostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GlEngine | null>(null);
  const phaseRef = useRef<TransitionPhase>(
    isHomePath(pathname) ? "idle" : "loading",
  );
  const transitionKindRef = useRef<"navigation" | "initial" | null>(
    isHomePath(pathname) ? null : "initial",
  );
  const shouldPlayInitialRevealRef = useRef(!isHomePath(pathname));
  const startPathnameRef = useRef(pathname);
  const sawPendingRef = useRef(false);
  const preparingSweepRef = useRef(false);
  const runIdRef = useRef(0);
  const rafRef = useRef(0);
  const routeTimeoutRef = useRef<number | undefined>(undefined);

  const setPhase = useCallback((next: TransitionPhase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const clearSnapshot = useCallback(() => {
    const host = snapshotHostRef.current;
    if (host) {
      host.style.display = "none";
      host.style.backgroundColor = "";
      setElementMask(host, "");
      host.replaceChildren();
    }
    setInitialCoverActive(false);
  }, []);

  const cleanupTransition = useCallback(() => {
    runIdRef.current += 1;
    preparingSweepRef.current = false;
    transitionKindRef.current = null;
    if (routeTimeoutRef.current !== undefined) {
      window.clearTimeout(routeTimeoutRef.current);
      routeTimeoutRef.current = undefined;
    }
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    clearSnapshot();

    const engine = engineRef.current;
    if (engine) {
      const { gl } = engine;
      deleteTarget(gl, engine.oldField);
      deleteTarget(gl, engine.newField);
      engine.oldField = null;
      engine.newField = null;
      if (engine.trails) {
        for (const target of engine.trails) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
          gl.viewport(0, 0, engine.trailWidth, engine.trailHeight);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, engine.pixelWidth, engine.pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }

    setPhase("idle");
  }, [clearSnapshot, setPhase]);

  const startSweep = useCallback(
    ({ revealOnly = false }: { revealOnly?: boolean } = {}) => {
      const engine = engineRef.current;
      const canvas = canvasRef.current;
      const host = snapshotHostRef.current;
      const appScroll = document.getElementById("app-scroll");
      if (!engine || !canvas || !host || !appScroll) {
        cleanupTransition();
        return;
      }

      const { gl, trailProgram, compositeProgram } = engine;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const maxDim = Math.max(width, height, 1);
      const fieldScale = Math.min(FIELD_SCALE, MAX_FIELD_DIM / maxDim);

      engine.width = width;
      engine.height = height;
      engine.pixelWidth = Math.max(1, Math.round(width * dpr));
      engine.pixelHeight = Math.max(1, Math.round(height * dpr));
      engine.fieldScale = fieldScale;
      engine.fieldWidth = Math.max(1, Math.round(width * fieldScale));
      engine.fieldHeight = Math.max(1, Math.round(height * fieldScale));
      engine.trailWidth = Math.max(1, Math.round(width * TRAIL_SCALE));
      engine.trailHeight = Math.max(1, Math.round(height * TRAIL_SCALE));
      engine.background = getBackgroundRgb();

      canvas.width = engine.pixelWidth;
      canvas.height = engine.pixelHeight;

      deleteTarget(gl, engine.oldField);
      deleteTarget(gl, engine.newField);
      engine.trails?.forEach((target) => deleteTarget(gl, target));

      const newSurface = drawScreenMask(appScroll, width, height, fieldScale);
      engine.newField = buildFieldFromSurface(engine, newSurface);
      if (revealOnly) {
        engine.oldField = null;
      } else {
        const oldSurface = drawScreenMask(host, width, height, fieldScale);
        engine.oldField = buildFieldFromSurface(engine, oldSurface);
      }
      engine.trails = [
        createTarget(gl, engine.trailWidth, engine.trailHeight),
        createTarget(gl, engine.trailWidth, engine.trailHeight),
      ];

      const revealRadius = Math.max(48, Math.min(96, height * 0.085));
      const waveAmp = revealRadius * 0.32;
      const maskLag = waveAmp + revealRadius * 0.42;
      const maskFeather = revealRadius * 0.22;
      const startOffset = revealRadius * 1.1;
      const endOffset = maskLag + maskFeather + revealRadius * 0.7;
      const fadeStartOffset = maskLag + maskFeather + revealRadius * 0.15;

      const trailUniform = (name: string) =>
        gl.getUniformLocation(trailProgram, name);
      const compositeUniform = (name: string) =>
        gl.getUniformLocation(compositeProgram, name);

      const runId = runIdRef.current;
      let elapsedMs = 0;
      let lastFrame = 0;
      let lastActive = performance.now();
      let prevY = -startOffset;
      let snapshotCleared = false;
      let currentMaskGlY = height + maskLag + maskFeather;

      setPhase("sweeping");

      const render = (now: number) => {
        rafRef.current = 0;
        if (
          runId !== runIdRef.current ||
          (!revealOnly && !engine.oldField) ||
          !engine.newField ||
          !engine.trails
        ) {
          return;
        }

        const isFirstFrame = lastFrame === 0;
        const dt = isFirstFrame
          ? 1 / 60
          : Math.min(Math.max(now - lastFrame, 0) / 1000, 0.05) || 1 / 60;
        lastFrame = now;
        const time = now / 1000;

        if (!isFirstFrame) {
          elapsedMs += dt * 1000;
        }

        const rawProgress = Math.min(1, elapsedMs / SWEEP_DURATION_MS);
        const sweeping = rawProgress < 1 || prevY < height + endOffset;
        let revealFromGlY = -5000;
        let revealToGlY = -5000;
        let revealStrength = 0;

        if (sweeping) {
          const smooth = rawProgress * rawProgress * (3 - 2 * rawProgress);
          const eased = 0.55 * rawProgress + 0.45 * smooth;
          const startY = -startOffset;
          const endY = height + endOffset;
          const currY = startY + (endY - startY) * eased;
          const entryEnv = smoothstep(startY, -revealRadius * 0.25, currY);
          const exitEnv =
            1 - smoothstep(height + fadeStartOffset, endY, currY);
          const envelope = entryEnv * exitEnv;

          revealFromGlY = height - prevY;
          revealToGlY = height - currY;
          revealStrength =
            Math.min(
              1 - Math.exp(-26 * dt) + Math.abs(currY - prevY) / (revealRadius * 1.1),
              0.95,
            ) * envelope;

          const maskCssY = currY - maskLag;
          currentMaskGlY = height - maskCssY;
          const maskStart = maskCssY - maskFeather;
          const maskEnd = maskCssY + maskFeather;

          if (!snapshotCleared) {
            if (maskStart >= height) {
              clearSnapshot();
              snapshotCleared = true;
            } else if (maskEnd > 0) {
              setElementMask(
                host,
                `linear-gradient(to bottom, transparent ${maskStart.toFixed(1)}px, #000 ${maskEnd.toFixed(1)}px)`,
              );
            }
          }

          prevY = currY;
          lastActive = now;
        }

        const [read, write] = engine.trails;
        gl.useProgram(trailProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
        gl.viewport(0, 0, engine.trailWidth, engine.trailHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, read.texture);
        gl.uniform1i(trailUniform("previous"), 0);
        gl.uniform2f(trailUniform("resolution"), width, height);
        gl.uniform1f(trailUniform("revealFromY"), revealFromGlY);
        gl.uniform1f(trailUniform("revealToY"), revealToGlY);
        gl.uniform1f(trailUniform("revealRadius"), revealRadius);
        gl.uniform1f(trailUniform("revealStrength"), revealStrength);
        gl.uniform1f(trailUniform("waveAmp"), waveAmp);
        gl.uniform1f(trailUniform("decay"), Math.pow(0.935, dt * 60));
        gl.uniform1f(trailUniform("fade"), 0.22 * dt);
        gl.uniform1f(trailUniform("time"), time);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        engine.trails = [write, read];

        gl.useProgram(compositeProgram);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, engine.pixelWidth, engine.pixelHeight);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(
          gl.TEXTURE_2D,
          (engine.oldField ?? engine.newField).texture,
        );
        gl.uniform1i(compositeUniform("oldMask"), 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, engine.newField.texture);
        gl.uniform1i(compositeUniform("newMask"), 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, write.texture);
        gl.uniform1i(compositeUniform("trail"), 2);
        gl.uniform2f(compositeUniform("resolution"), width, height);
        gl.uniform1f(compositeUniform("time"), time);
        gl.uniform1f(compositeUniform("maskY"), currentMaskGlY);
        gl.uniform1f(compositeUniform("maskFeather"), maskFeather);
        gl.uniform3f(compositeUniform("background"), ...engine.background);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        if (now - lastActive < IDLE_MS) {
          rafRef.current = requestAnimationFrame(render);
        } else {
          cleanupTransition();
        }
      };

      rafRef.current = requestAnimationFrame(render);
    },
    [cleanupTransition, clearSnapshot, setPhase],
  );

  const beginRevealAfterAssets = useEffectEvent(() => {
    if (preparingSweepRef.current) return;
    preparingSweepRef.current = true;
    const runId = runIdRef.current;
    if (routeTimeoutRef.current !== undefined) {
      window.clearTimeout(routeTimeoutRef.current);
      routeTimeoutRef.current = undefined;
    }

    const appScroll = document.getElementById("app-scroll");
    if (!appScroll) {
      cleanupTransition();
      return;
    }
    appScroll.scrollTop = 0;

    waitForPageAssets(appScroll)
      .catch(() => {})
      .then(() => {
        if (runId !== runIdRef.current || phaseRef.current !== "loading") {
          return;
        }
        startSweep();
      });
  });

  const beginInitialReveal = useEffectEvent(() => {
    if (!shouldPlayInitialRevealRef.current) {
      if (snapshotHostRef.current) {
        snapshotHostRef.current.style.display = "none";
      }
      return;
    }

    const appScroll = document.getElementById("app-scroll");
    const host = snapshotHostRef.current;
    if (
      !engineRef.current ||
      !appScroll ||
      !host ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      shouldPlayInitialRevealRef.current = false;
      cleanupTransition();
      return;
    }

    runIdRef.current += 1;
    preparingSweepRef.current = true;
    transitionKindRef.current = "initial";
    const runId = runIdRef.current;

    host.style.display = "block";
    host.style.backgroundColor = "var(--background-primary)";
    setElementMask(host, "");
    host.replaceChildren();
    setPhase("loading");

    routeTimeoutRef.current = window.setTimeout(() => {
      if (runId === runIdRef.current && phaseRef.current === "loading") {
        shouldPlayInitialRevealRef.current = false;
        cleanupTransition();
      }
    }, ROUTE_TIMEOUT_MS);

    waitForPageAssets(appScroll)
      .catch(() => {})
      .then(() => {
        if (runId !== runIdRef.current || phaseRef.current !== "loading") {
          return;
        }
        if (routeTimeoutRef.current !== undefined) {
          window.clearTimeout(routeTimeoutRef.current);
          routeTimeoutRef.current = undefined;
        }
        shouldPlayInitialRevealRef.current = false;
        startSweep({ revealOnly: true });
      });
  });

  useEffect(() => {
    if (
      phaseRef.current !== "loading" ||
      transitionKindRef.current !== "navigation"
    ) {
      return;
    }

    if (isPending) {
      sawPendingRef.current = true;
      return;
    }

    if (pathname !== startPathnameRef.current || sawPendingRef.current) {
      beginRevealAfterAssets();
    }
  }, [isPending, pathname, phaseState]);

  const onPopState = useEffectEvent(() => {
    shouldPlayInitialRevealRef.current = false;
    if (phaseRef.current !== "idle") {
      cleanupTransition();
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      beginInitialReveal();
      return;
    }

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) {
      beginInitialReveal();
      return;
    }

    const blurProgram = compileProgram(gl, BLUR_SHADER);
    const trailProgram = compileProgram(gl, TRAIL_SHADER);
    const compositeProgram = compileProgram(gl, COMPOSITE_SHADER);
    if (!blurProgram || !trailProgram || !compositeProgram) {
      if (blurProgram) gl.deleteProgram(blurProgram);
      if (trailProgram) gl.deleteProgram(trailProgram);
      if (compositeProgram) gl.deleteProgram(compositeProgram);
      beginInitialReveal();
      return;
    }

    const quad = gl.createBuffer();
    if (!quad) {
      gl.deleteProgram(blurProgram);
      gl.deleteProgram(trailProgram);
      gl.deleteProgram(compositeProgram);
      beginInitialReveal();
      return;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    engineRef.current = {
      gl,
      blurProgram,
      trailProgram,
      compositeProgram,
      quad,
      width: 0,
      height: 0,
      pixelWidth: 0,
      pixelHeight: 0,
      fieldWidth: 0,
      fieldHeight: 0,
      fieldScale: FIELD_SCALE,
      trailWidth: 0,
      trailHeight: 0,
      oldField: null,
      newField: null,
      trails: null,
      background: getBackgroundRgb(),
    };

    window.addEventListener("popstate", onPopState);
    beginInitialReveal();

    return () => {
      window.removeEventListener("popstate", onPopState);
      cleanupTransition();
      const engine = engineRef.current;
      if (engine) {
        deleteTarget(gl, engine.oldField);
        deleteTarget(gl, engine.newField);
        engine.trails?.forEach((target) => deleteTarget(gl, target));
        gl.deleteBuffer(quad);
        gl.deleteProgram(blurProgram);
        gl.deleteProgram(trailProgram);
        gl.deleteProgram(compositeProgram);
        engineRef.current = null;
      }
    };
  }, [cleanupTransition]);

  const navigate = useCallback(
    (href: string, options?: NavigateOptions) => {
      if (!isInternalHref(href)) {
        window.location.assign(href);
        return;
      }

      const targetNormalized = normalizePath(href);
      const currentNormalized = `${window.location.pathname}${window.location.search}`;
      if (targetNormalized === currentNormalized) {
        options?.onCovered?.();
        return;
      }

      if (phaseRef.current !== "idle") {
        return;
      }

      const appScroll = document.getElementById("app-scroll");
      const host = snapshotHostRef.current;
      if (
        !engineRef.current ||
        !appScroll ||
        !host ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        options?.onCovered?.();
        router.push(href);
        return;
      }

      runIdRef.current += 1;
      preparingSweepRef.current = false;
      transitionKindRef.current = "navigation";
      const runId = runIdRef.current;

      const frozen = captureFrozenPage(appScroll) as HTMLElement & {
        __restoreScroll?: () => void;
      };
      host.style.display = "block";
      host.style.backgroundColor = "var(--background-primary)";
      setElementMask(host, "");
      host.replaceChildren(frozen);
      frozen.__restoreScroll?.();
      delete frozen.__restoreScroll;

      options?.onCovered?.();

      startPathnameRef.current = pathname;
      sawPendingRef.current = false;
      setPhase("loading");

      routeTimeoutRef.current = window.setTimeout(() => {
        if (runId === runIdRef.current && phaseRef.current === "loading") {
          cleanupTransition();
        }
      }, ROUTE_TIMEOUT_MS);

      startTransition(() => {
        router.push(href);
      });
    },
    [cleanupTransition, pathname, router, setPhase],
  );

  const isLoading = phaseState === "loading";

  return (
    <PageTransitionContext.Provider
      value={{
        navigate,
        isTransitioning: phaseState !== "idle",
      }}
    >
      {children}
      <div
        ref={snapshotHostRef}
        aria-hidden="true"
        inert
        className={`fixed inset-0 z-[90] translate-z-0 overflow-hidden ${
          initialCoverActive ? "bg-background-primary motion-reduce:hidden " : ""
        }${isLoading ? "pointer-events-auto" : "pointer-events-none"}`}
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-[100] block size-full"
      />
    </PageTransitionContext.Provider>
  );
}

export function usePageTransition(): PageTransitionContextValue | null {
  return useContext(PageTransitionContext);
}

type TransitionLinkProps = ComponentProps<typeof Link> & {
  onCovered?: () => void;
};

export function TransitionLink({
  href,
  onClick,
  onCovered,
  target,
  ...props
}: TransitionLinkProps) {
  const transition = usePageTransition();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      isModifiedEvent(event) ||
      (target && target !== "_self") ||
      !transition
    ) {
      return;
    }

    const hrefString =
      typeof href === "string"
        ? href
        : `${href.pathname ?? ""}${href.search ?? ""}${href.hash ?? ""}`;

    if (!isInternalHref(hrefString)) {
      return;
    }

    event.preventDefault();
    transition.navigate(hrefString, { onCovered });
  };

  return <Link href={href} target={target} onClick={handleClick} {...props} />;
}

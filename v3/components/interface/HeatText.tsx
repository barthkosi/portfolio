"use client";

import { useEffect, useRef, type ReactNode } from "react";

const MAX_DPR = 2;
const TRAIL_SCALE = 0.25;
const BLUR_SIGMAS: [number, number, number] = [2.5, 6, 14];
const SPLAT_RADIUS = 60;
const IDLE_MS = 2400;

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
  return fromMask > 0.5 ? vec4(color.a) : color;
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
uniform vec2 pointerFrom;
uniform vec2 pointerTo;
uniform float radius;
uniform float strength;
uniform float decay;
uniform float fade;
uniform float time;

float segmentDistance(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec2 px = vUv * resolution;
  vec2 flow = vec2(
    sin(px.y * 0.045 + time * 2.1),
    cos(px.x * 0.04 - time * 1.7) * 0.5 + 0.7
  ) * 0.6;
  float previousHeat = texture2D(previous, vUv - flow / resolution).r;
  float d = segmentDistance(px, pointerFrom, pointerTo);
  float splat = strength * exp(-(d * d) / (radius * radius));
  float heat = max(previousHeat * decay - fade, 0.0) + splat;
  gl_FragColor = vec4(min(heat, 1.0), 0.0, 0.0, 1.0);
}`;

const COMPOSITE_SHADER = `
precision highp float;
varying vec2 vUv;
uniform sampler2D mask;
uniform sampler2D trail;
uniform vec2 resolution;
uniform float time;
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
  vec2 px = vUv * resolution;
  float wave = sin(px.x * 0.07 + time * 3.0 + sin(px.y * 0.05 - time * 2.2) * 2.0);
  vec2 warp = vec2(
    sin(px.y * 0.09 + time * 2.4),
    cos(px.x * 0.07 - time * 2.1)
  ) * 2.0 * influence;
  vec4 field = texture2D(mask, vUv + warp / resolution);
  float level = clamp(influence * (0.85 + 0.25 * wave), 0.0, 1.0) * 3.0;
  float h = mix(field.r, field.g, clamp(level, 0.0, 1.0));
  h = mix(h, field.b, clamp(level - 1.0, 0.0, 1.0));
  h = mix(h, field.a, clamp(level - 2.0, 0.0, 1.0));
  h = clamp(h * (1.0 + influence * 3.5), 0.0, 1.0);
  float alpha = smoothstep(0.01, 0.2, influence);
  gl_FragColor = vec4(heatRamp(h) * alpha, alpha);
}`;

type Target = { texture: WebGLTexture; framebuffer: WebGLFramebuffer };

function compile(gl: WebGLRenderingContext, fragmentSource: string) {
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

function createTarget(gl: WebGLRenderingContext, width: number, height: number): Target {
  const texture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
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
  if (!context) return [0, 0, 0];
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255];
}

function drawTextMask(container: HTMLElement, canvasRect: DOMRect, dpr: number) {
  const surface = document.createElement("canvas");
  surface.width = Math.round(canvasRect.width * dpr);
  surface.height = Math.round(canvasRect.height * dpr);
  const context = surface.getContext("2d");
  if (!context) return surface;
  context.scale(dpr, dpr);
  context.fillStyle = "#ffffff";
  context.textBaseline = "alphabetic";

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    const text = node.textContent ?? "";
    if (!parent || !text.trim()) continue;
    const style = getComputedStyle(parent);
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    context.letterSpacing = style.letterSpacing === "normal" ? "0px" : style.letterSpacing;

    const pattern = /\S+/g;
    for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getClientRects()[0];
      if (!rect) continue;
      const ascent = context.measureText(match[0]).fontBoundingBoxAscent;
      context.fillText(
        match[0],
        rect.left - canvasRect.left,
        rect.top - canvasRect.top + ascent,
      );
    }
  }
  return surface;
}

export function HeatText({
  children,
  className,
  disabled = false,
}: {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const disabledRef = useRef(disabled);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const hoverQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!hoverQuery.matches || motionQuery.matches) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
    if (!gl) return;

    const blurProgram = compile(gl, BLUR_SHADER);
    const trailProgram = compile(gl, TRAIL_SHADER);
    const compositeProgram = compile(gl, COMPOSITE_SHADER);
    if (!blurProgram || !trailProgram || !compositeProgram) return;

    const quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const uniform = (program: WebGLProgram, name: string) =>
      gl.getUniformLocation(program, name);

    let width = 0;
    let height = 0;
    let pixelWidth = 0;
    let pixelHeight = 0;
    let trailWidth = 0;
    let trailHeight = 0;
    let maskTexture: WebGLTexture | null = null;
    let field: Target | null = null;
    let trails: [Target, Target] | null = null;
    let background: [number, number, number] = [0, 0, 0];

    const pointer = { x: 0, y: 0, lastX: 0, lastY: 0, inside: false };
    let lastActive = -Infinity;
    let lastFrame = 0;
    let frame = 0;
    let disposed = false;

    const drawQuad = () => gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const build = () => {
      if (disposed) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      pixelWidth = Math.max(1, Math.round(width * dpr));
      pixelHeight = Math.max(1, Math.round(height * dpr));
      trailWidth = Math.max(1, Math.round(width * TRAIL_SCALE));
      trailHeight = Math.max(1, Math.round(height * TRAIL_SCALE));
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;

      background = toRgb(
        getComputedStyle(document.documentElement).getPropertyValue("--background-primary") ||
          "#0a0a0a",
      );

      if (maskTexture) gl.deleteTexture(maskTexture);
      deleteTarget(gl, field);
      trails?.forEach((target) => deleteTarget(gl, target));

      maskTexture = createTexture(gl);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        drawTextMask(container, rect, dpr),
      );

      const horizontal = createTarget(gl, pixelWidth, pixelHeight);
      field = createTarget(gl, pixelWidth, pixelHeight);
      trails = [
        createTarget(gl, trailWidth, trailHeight),
        createTarget(gl, trailWidth, trailHeight),
      ];

      gl.useProgram(blurProgram);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.uniform1i(uniform(blurProgram, "source"), 0);
      gl.uniform3f(
        uniform(blurProgram, "sigmas"),
        BLUR_SIGMAS[0] * dpr,
        BLUR_SIGMAS[1] * dpr,
        BLUR_SIGMAS[2] * dpr,
      );
      gl.activeTexture(gl.TEXTURE0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, horizontal.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, maskTexture);
      gl.uniform2f(uniform(blurProgram, "direction"), 1 / pixelWidth, 0);
      gl.uniform1f(uniform(blurProgram, "fromMask"), 1);
      drawQuad();

      gl.bindFramebuffer(gl.FRAMEBUFFER, field.framebuffer);
      gl.bindTexture(gl.TEXTURE_2D, horizontal.texture);
      gl.uniform2f(uniform(blurProgram, "direction"), 0, 1 / pixelHeight);
      gl.uniform1f(uniform(blurProgram, "fromMask"), 0);
      drawQuad();

      deleteTarget(gl, horizontal);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    };

    const render = (now: number) => {
      frame = 0;
      if (disposed || !field || !trails) return;
      const dt = Math.min((now - (lastFrame || now)) / 1000, 0.05) || 1 / 60;
      lastFrame = now;
      const time = now / 1000;

      const moved = Math.hypot(pointer.x - pointer.lastX, pointer.y - pointer.lastY);
      const active = pointer.inside && !disabledRef.current;
      const strength = active ? Math.min(dt * 2 + moved / 90, 0.6) : 0;

      const [read, write] = trails;
      gl.useProgram(trailProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, write.framebuffer);
      gl.viewport(0, 0, trailWidth, trailHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, read.texture);
      gl.uniform1i(uniform(trailProgram, "previous"), 0);
      gl.uniform2f(uniform(trailProgram, "resolution"), width, height);
      gl.uniform2f(uniform(trailProgram, "pointerFrom"), pointer.lastX, height - pointer.lastY);
      gl.uniform2f(uniform(trailProgram, "pointerTo"), pointer.x, height - pointer.y);
      gl.uniform1f(uniform(trailProgram, "radius"), SPLAT_RADIUS);
      gl.uniform1f(uniform(trailProgram, "strength"), strength);
      gl.uniform1f(uniform(trailProgram, "decay"), Math.pow(0.955, dt * 60));
      gl.uniform1f(uniform(trailProgram, "fade"), 0.2 * dt);
      gl.uniform1f(uniform(trailProgram, "time"), time);
      drawQuad();
      trails = [write, read];
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;

      gl.useProgram(compositeProgram);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, pixelWidth, pixelHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, field.texture);
      gl.uniform1i(uniform(compositeProgram, "mask"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, write.texture);
      gl.uniform1i(uniform(compositeProgram, "trail"), 1);
      gl.uniform2f(uniform(compositeProgram, "resolution"), width, height);
      gl.uniform1f(uniform(compositeProgram, "time"), time);
      gl.uniform3f(uniform(compositeProgram, "background"), ...background);
      drawQuad();

      if (active) lastActive = now;
      if (now - lastActive < IDLE_MS) {
        frame = requestAnimationFrame(render);
      } else {
        lastFrame = 0;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch" || disabledRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;
      if (inside && !pointer.inside) {
        pointer.lastX = x;
        pointer.lastY = y;
      }
      pointer.x = x;
      pointer.y = y;
      pointer.inside = inside;
      if (inside && !frame) {
        lastActive = performance.now();
        frame = requestAnimationFrame(render);
      }
    };

    const handlePointerLeave = () => {
      pointer.inside = false;
    };

    let resizeFrame = 0;
    const scheduleBuild = () => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(build);
    };

    const resizeObserver = new ResizeObserver(scheduleBuild);
    resizeObserver.observe(container);
    document.fonts.ready.then(scheduleBuild);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(resizeFrame);
      resizeObserver.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener("pointerleave", handlePointerLeave);
      if (maskTexture) gl.deleteTexture(maskTexture);
      deleteTarget(gl, field);
      trails?.forEach((target) => deleteTarget(gl, target));
      gl.deleteBuffer(quad);
      gl.deleteProgram(blurProgram);
      gl.deleteProgram(trailProgram);
      gl.deleteProgram(compositeProgram);
    };
  }, []);

  return (
    <div ref={containerRef} className={className}>
      {children}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 -left-8 h-[calc(100%+64px)] w-[calc(100%+64px)]"
      />
    </div>
  );
}

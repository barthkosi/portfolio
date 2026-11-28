(() => {
  const init = () => {
    if (window.__ptBootstrap || window.__ptProviderClaimedInitial) return;
    const p = location.pathname;
    if (!p || p === "/") return;
    const host = document.getElementById("page-transition-cover");
    const canvas = document.getElementById("page-transition-canvas");
    const app = document.getElementById("app-scroll");
    if (!host || !canvas || !app) return;
    if (app.querySelector('[data-transition-pending="true"]')) return;

  const setMask = (el, v) => {
    el.style.maskImage = v;
    if (v) el.style.setProperty("-webkit-mask-image", v);
    else el.style.removeProperty("-webkit-mask-image");
  };
  const hideCover = () => {
    host.style.display = "none";
    host.style.backgroundColor = "";
    host.style.pointerEvents = "";
    setMask(host, "");
  };

  let resolveDone;
  const done = new Promise((r) => {
    resolveDone = r;
  });
  let cancelled = false;
  let rafId = 0;
  let finished = false;
  let gl = null;
  let blurProg = null;
  let trailProg = null;
  let compProg = null;
  let quad = null;
  let newField = null;
  let trails = null;

  const delTarget = (t) => {
    if (!gl || !t) return;
    gl.deleteTexture(t.t);
    gl.deleteFramebuffer(t.f);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
    window.removeEventListener("popstate", onAbort);
    hideCover();
    if (gl) {
      delTarget(newField);
      newField = null;
      if (trails) {
        trails.forEach(delTarget);
        trails = null;
      }
      if (quad) {
        gl.deleteBuffer(quad);
        quad = null;
      }
      if (blurProg) {
        gl.deleteProgram(blurProg);
        blurProg = null;
      }
      if (trailProg) {
        gl.deleteProgram(trailProg);
        trailProg = null;
      }
      if (compProg) {
        gl.deleteProgram(compProg);
        compProg = null;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width || 1, canvas.height || 1);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    boot.state = "done";
    resolveDone();
  };

  const onAbort = () => {
    cancelled = true;
    finish();
  };
  const boot = { state: "running", done, cancel: onAbort };
  window.__ptBootstrap = boot;

  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    finish();
    return;
  }

  gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
  });
  if (!gl) {
    finish();
    return;
  }

  const VS =
    "attribute vec2 position;varying vec2 vUv;void main(){vUv=position*0.5+0.5;gl_Position=vec4(position,0.0,1.0);}";
  const BS =
    "precision highp float;varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;uniform vec3 sigmas;uniform float fromMask;vec4 fetch(vec2 uv){vec4 c=texture2D(source,uv);if(fromMask>0.5){float l=dot(c.rgb,vec3(0.299,0.587,0.114));return vec4(l*c.a);}return c;}void main(){vec3 s=vec3(0.0);float tot=0.0;for(int i=-16;i<=16;i++){float t=float(i)*(3.0/16.0);float w=exp(-0.5*t*t);vec3 o=t*sigmas;s.x+=w*fetch(vUv+direction*o.x).g;s.y+=w*fetch(vUv+direction*o.y).b;s.z+=w*fetch(vUv+direction*o.z).a;tot+=w;}gl_FragColor=vec4(fetch(vUv).r,s/tot);}";
  const TS =
    "precision highp float;varying vec2 vUv;uniform sampler2D previous;uniform vec2 resolution;uniform float revealFromY;uniform float revealToY;uniform float revealRadius;uniform float revealStrength;uniform float waveAmp;uniform float decay;uniform float fade;uniform float time;void main(){vec2 px=vUv*resolution;vec2 flow=vec2(sin(px.y*0.032+time*2.1),cos(px.x*0.028-time*1.7)*0.5+0.7)*0.85;vec2 su=vUv-flow/resolution;float ib=step(0.0,su.y)*step(su.y,1.0);float ph=texture2D(previous,su).r*ib;float rw=(sin(vUv.x*9.0+time*2.4)*0.65+sin(vUv.x*21.0-time*1.8)*0.35)*waveAmp;float yf=revealFromY+rw;float yt=revealToY+rw;float dr=max(max(min(yf,yt)-px.y,px.y-max(yf,yt)),0.0);float rs=revealStrength*exp(-(dr*dr)/(revealRadius*revealRadius));float h=max(ph*decay-fade,0.0)+rs;gl_FragColor=vec4(min(h,1.0),0.0,0.0,1.0);}";
  const CS =
    "precision highp float;varying vec2 vUv;uniform sampler2D mask;uniform sampler2D trail;uniform vec2 resolution;uniform float time;uniform vec3 background;const vec3 CYAN=vec3(0.0,0.69,0.94);const vec3 YELLOW=vec3(1.0,0.93,0.0);const vec3 GREEN=vec3(0.0,0.62,0.33);const vec3 CORE=vec3(0.0);vec3 heatRamp(float h){vec3 c=mix(background,CYAN,smoothstep(0.01,0.14,h));c=mix(c,YELLOW,smoothstep(0.14,0.34,h));c=mix(c,GREEN,smoothstep(0.34,0.56,h));return mix(c,CORE,smoothstep(0.56,0.85,h));}void main(){float inf=smoothstep(0.0,1.0,texture2D(trail,vUv).r);if(inf<=0.004){gl_FragColor=vec4(0.0);return;}vec2 px=vUv*resolution;float wv=sin(px.x*0.045+time*3.0+sin(px.y*0.035-time*2.2)*2.0);vec2 wp=vec2(sin(px.y*0.06+time*2.4),cos(px.x*0.05-time*2.1))*3.0*inf;vec2 wu=clamp(vUv+wp/resolution,0.0,1.0);vec4 fd=texture2D(mask,wu);float lv=clamp(inf*(0.85+0.25*wv),0.0,1.0)*3.0;float h=mix(fd.r,fd.g,clamp(lv,0.0,1.0));h=mix(h,fd.b,clamp(lv-1.0,0.0,1.0));h=mix(h,fd.a,clamp(lv-2.0,0.0,1.0));h=clamp(h*(1.0+inf*3.5),0.0,1.0);float a=smoothstep(0.01,0.2,inf);gl_FragColor=vec4(heatRamp(h)*a,a);}";

  const compile = (fs) => {
    const prog = gl.createProgram();
    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fsh = gl.createShader(gl.FRAGMENT_SHADER);
    if (!prog || !vs || !fsh) return null;
    gl.shaderSource(vs, VS);
    gl.compileShader(vs);
    gl.shaderSource(fsh, fs);
    gl.compileShader(fsh);
    if (
      !gl.getShaderParameter(vs, gl.COMPILE_STATUS) ||
      !gl.getShaderParameter(fsh, gl.COMPILE_STATUS)
    ) {
      return null;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fsh);
    gl.bindAttribLocation(prog, 0, "position");
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fsh);
    return gl.getProgramParameter(prog, gl.LINK_STATUS) ? prog : null;
  };

  blurProg = compile(BS);
  trailProg = compile(TS);
  compProg = compile(CS);
  if (!blurProg || !trailProg || !compProg) {
    finish();
    return;
  }

  quad = gl.createBuffer();
  if (!quad) {
    finish();
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

  window.addEventListener("popstate", onAbort);

  const mkTex = () => {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  const mkTarget = (w, h) => {
    const t = mkTex();
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      w,
      h,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    const f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      t,
      0,
    );
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { t, f };
  };
  const ss = (e0, e1, x) => {
    const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
  };
  const sameOrigin = (u) => {
    if (!u) return false;
    try {
      return new URL(u, location.href).origin === location.origin;
    } catch {
      return false;
    }
  };
  const getBg = () => {
    const v =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--background-primary")
        .trim() || "#0a0a0a";
    const hm = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hm) {
      const hex = hm[1];
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16) / 255,
          parseInt(hex[1] + hex[1], 16) / 255,
          parseInt(hex[2] + hex[2], 16) / 255,
        ];
      }
      return [
        parseInt(hex.slice(0, 2), 16) / 255,
        parseInt(hex.slice(2, 4), 16) / 255,
        parseInt(hex.slice(4, 6), 16) / 255,
      ];
    }
    const rm = v.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i);
    if (rm) {
      return [
        parseFloat(rm[1]) / 255,
        parseFloat(rm[2]) / 255,
        parseFloat(rm[3]) / 255,
      ];
    }
    return [10 / 255, 10 / 255, 10 / 255];
  };
  const getOp = (el) => {
    let op = 1;
    let cur = el;
    while (cur && cur !== app.parentElement) {
      const s = getComputedStyle(cur);
      if (s.display === "none" || s.visibility === "hidden") return 0;
      op *= parseFloat(s.opacity || "1");
      if (op <= 0.05) return 0;
      if (cur === app) break;
      cur = cur.parentElement;
    }
    return op;
  };
  const getClip = (el, vw, vh) => {
    let l = 0;
    let t = 0;
    let r = vw;
    let b = vh;
    if (getComputedStyle(el).position === "fixed") return { l, t, r, b };
    let cur = el.parentElement;
    while (cur && cur !== app.parentElement) {
      const s = getComputedStyle(cur);
      if (
        s.overflow !== "visible" ||
        s.overflowX !== "visible" ||
        s.overflowY !== "visible"
      ) {
        const rc = cur.getBoundingClientRect();
        l = Math.max(l, rc.left);
        t = Math.max(t, rc.top);
        r = Math.min(r, rc.right);
        b = Math.min(b, rc.bottom);
        if (r <= l || b <= t) return null;
      }
      if (s.position === "fixed" || cur === app) break;
      cur = cur.parentElement;
    }
    return { l, t, r, b };
  };
  const isOpaque = (c) => {
    if (!c || c === "transparent") return false;
    const sm = c.match(/\/\s*([\d.]+%?)\s*\)$/);
    if (sm) {
      const r = sm[1];
      return (r.endsWith("%") ? parseFloat(r) / 100 : parseFloat(r)) >= 0.99;
    }
    const rm = c.match(
      /^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i,
    );
    return rm ? parseFloat(rm[1]) >= 0.99 : true;
  };
  const getZ = (el) => {
    let eff = 0;
    let cur = el;
    while (cur && cur !== app.parentElement) {
      const s = getComputedStyle(cur);
      const z = parseInt(s.zIndex, 10);
      if (s.position !== "static" && !isNaN(z)) eff = z;
      if (cur === app) break;
      cur = cur.parentElement;
    }
    return eff;
  };
  const rrect = (ctx, x, y, w, h, rad) => {
    const r = Math.max(0, Math.min(rad, w / 2, h / 2));
    ctx.beginPath();
    if (r > 0) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  };
  const drawCover = (ctx, src, sw, sh, dx, dy, dw, dh, fit) => {
    if (fit === "cover" && sw > 0 && sh > 0 && dw > 0 && dh > 0) {
      const sa = sw / sh;
      const da = dw / dh;
      let sx = 0;
      let sy = 0;
      let cw = sw;
      let ch = sh;
      if (sa > da) {
        cw = sh * da;
        sx = (sw - cw) / 2;
      } else {
        ch = sw / da;
        sy = (sh - ch) / 2;
      }
      ctx.drawImage(src, sx, sy, cw, ch, dx, dy, dw, dh);
      return;
    }
    ctx.drawImage(src, dx, dy, dw, dh);
  };

  const drawMask = (w, h, sc) => {
    const sf = document.createElement("canvas");
    sf.width = Math.max(1, Math.round(w * sc));
    sf.height = Math.max(1, Math.round(h * sc));
    const ctx = sf.getContext("2d");
    if (!ctx) return sf;
    ctx.scale(sc, sc);

    const occs = [];
    for (const hd of app.querySelectorAll("header")) {
      const st = getComputedStyle(hd);
      if (
        st.position !== "fixed" ||
        !isOpaque(st.backgroundColor) ||
        getOp(hd) <= 0.95
      ) {
        continue;
      }
      const rc = hd.getBoundingClientRect();
      if (rc.width < 2 || rc.height < 2) continue;
      occs.push({
        el: hd,
        rc,
        rad: parseFloat(st.borderTopLeftRadius) || 0,
        z: getZ(hd),
      });
    }
    const clipOcc = (el) => {
      if (!occs.length) return;
      const ez = getZ(el);
      for (const o of occs) {
        if (o.el === el || o.el.contains(el) || ez > o.z) continue;
        ctx.beginPath();
        ctx.rect(0, 0, w, h);
        const r = Math.max(
          0,
          Math.min(o.rad, o.rc.width / 2, o.rc.height / 2),
        );
        if (r > 0)
          ctx.roundRect(o.rc.left, o.rc.top, o.rc.width, o.rc.height, r);
        else ctx.rect(o.rc.left, o.rc.top, o.rc.width, o.rc.height);
        ctx.clip("evenodd");
      }
    };

    for (const el of app.querySelectorAll(
      "header,button,a,figure,pre,input,textarea,img,video,canvas",
    )) {
      const tag = el.tagName;
      if (tag === "CANVAS" && el.getAttribute("aria-hidden") === "true")
        continue;
      const rc = el.getBoundingClientRect();
      if (
        rc.width < 2 ||
        rc.height < 2 ||
        rc.bottom <= 0 ||
        rc.top >= h ||
        rc.right <= 0 ||
        rc.left >= w
      ) {
        continue;
      }
      const op = getOp(el);
      if (op <= 0.05) continue;
      const cl = getClip(el, w, h);
      if (
        !cl ||
        rc.right <= cl.l ||
        rc.left >= cl.r ||
        rc.bottom <= cl.t ||
        rc.top >= cl.b
      ) {
        continue;
      }
      const st = getComputedStyle(el);
      const rad = parseFloat(st.borderTopLeftRadius) || 0;

      if (tag === "IMG" || tag === "VIDEO" || tag === "CANVAS") {
        const prad = el.parentElement
          ? parseFloat(getComputedStyle(el.parentElement).borderTopLeftRadius) ||
            0
          : 0;
        const erad = Math.max(rad, prad);
        ctx.save();
        clipOcc(el);
        ctx.beginPath();
        ctx.rect(cl.l, cl.t, cl.r - cl.l, cl.b - cl.t);
        ctx.clip();
        rrect(ctx, rc.left, rc.top, rc.width, rc.height, erad);
        ctx.clip();
        ctx.globalAlpha = op;
        let drew = false;
        if (
          tag === "IMG" &&
          el.complete &&
          el.naturalWidth > 0 &&
          sameOrigin(el.currentSrc || el.src)
        ) {
          try {
            drawCover(
              ctx,
              el,
              el.naturalWidth,
              el.naturalHeight,
              rc.left,
              rc.top,
              rc.width,
              rc.height,
              st.objectFit,
            );
            drew = true;
          } catch {}
        } else if (tag === "CANVAS" && el.width > 0 && el.height > 0) {
          try {
            ctx.drawImage(el, rc.left, rc.top, rc.width, rc.height);
            drew = true;
          } catch {}
        }
        if (!drew) {
          const g = ctx.createLinearGradient(
            rc.left,
            rc.top,
            rc.right,
            rc.bottom,
          );
          g.addColorStop(0, "rgba(255,255,255,0.14)");
          g.addColorStop(0.5, "rgba(255,255,255,0.09)");
          g.addColorStop(1, "rgba(255,255,255,0.15)");
          ctx.fillStyle = g;
          ctx.fillRect(rc.left, rc.top, rc.width, rc.height);
          rrect(
            ctx,
            rc.left + 1,
            rc.top + 1,
            Math.max(0, rc.width - 2),
            Math.max(0, rc.height - 2),
            erad,
          );
          ctx.strokeStyle = "rgba(255,255,255,0.65)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        ctx.restore();
        continue;
      }

      if (rc.width >= w * 0.98 && rc.height >= h * 0.98) continue;
      const bg = st.backgroundColor;
      const hasSurf =
        bg !== "rgba(0, 0, 0, 0)" &&
        bg !== "transparent" &&
        bg !== "rgb(10, 10, 10)";
      const bw = parseFloat(st.borderTopWidth) || 0;
      const hasBord = bw > 0 && st.borderTopColor !== "rgba(0, 0, 0, 0)";
      if (!hasSurf && !hasBord) continue;

      ctx.save();
      clipOcc(el);
      ctx.beginPath();
      ctx.rect(cl.l, cl.t, cl.r - cl.l, cl.b - cl.t);
      ctx.clip();
      ctx.globalAlpha = op;
      rrect(ctx, rc.left, rc.top, rc.width, rc.height, rad);
      if (hasSurf) {
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.fill();
      }
      ctx.strokeStyle = hasBord
        ? "rgba(255,255,255,0.36)"
        : "rgba(255,255,255,0.24)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    ctx.textBaseline = "alphabetic";
    const wk = document.createTreeWalker(app, NodeFilter.SHOW_TEXT);
    const rg = document.createRange();
    for (let n = wk.nextNode(); n; n = wk.nextNode()) {
      const pa = n.parentElement;
      const tx = n.textContent || "";
      if (!pa || !tx.trim()) continue;
      const pt = pa.tagName;
      if (pt === "SCRIPT" || pt === "STYLE" || pt === "NOSCRIPT") continue;
      const op = getOp(pa);
      if (op <= 0.05) continue;
      const cl = getClip(pa, w, h);
      if (!cl) continue;
      const pr = pa.getBoundingClientRect();
      if (
        pr.bottom <= cl.t ||
        pr.top >= cl.b ||
        pr.right <= cl.l ||
        pr.left >= cl.r
      ) {
        continue;
      }
      const st = getComputedStyle(pa);
      ctx.save();
      clipOcc(pa);
      ctx.beginPath();
      ctx.rect(cl.l, cl.t, cl.r - cl.l, cl.b - cl.t);
      ctx.clip();
      ctx.fillStyle = "rgba(255,255,255," + op + ")";
      ctx.font =
        st.fontStyle +
        " " +
        st.fontWeight +
        " " +
        st.fontSize +
        " " +
        st.fontFamily;
      ctx.letterSpacing =
        st.letterSpacing === "normal" ? "0px" : st.letterSpacing;
      const re = /\S+/g;
      for (let m = re.exec(tx); m; m = re.exec(tx)) {
        rg.setStart(n, m.index);
        rg.setEnd(n, m.index + m[0].length);
        const r = rg.getClientRects()[0];
        if (
          !r ||
          r.bottom <= cl.t ||
          r.top >= cl.b ||
          r.right <= cl.l ||
          r.left >= cl.r
        ) {
          continue;
        }
        const asc = ctx.measureText(m[0]).fontBoundingBoxAscent;
        ctx.fillText(m[0], r.left, r.top + asc);
      }
      ctx.restore();
    }
    return sf;
  };

  const waitCap = (pr, ms) =>
    new Promise((res) => {
      const tm = setTimeout(res, ms);
      pr.finally(() => {
        clearTimeout(tm);
        res();
      });
    });

  const waitFastAssets = async () => {
    const vw = innerWidth;
    const vh = innerHeight;
    const fw =
      document.fonts && document.fonts.ready
        ? waitCap(document.fonts.ready, 150)
        : Promise.resolve();
    const imgW = [];
    for (const img of app.querySelectorAll("img")) {
      const rc = img.getBoundingClientRect();
      const cl = getClip(img, vw, vh);
      if (
        !cl ||
        rc.width <= 0 ||
        rc.height <= 0 ||
        rc.top >= cl.b ||
        rc.bottom <= cl.t ||
        rc.right <= cl.l ||
        rc.left >= cl.r
      ) {
        continue;
      }
      if (!img.complete) {
        imgW.push(
          new Promise((res) => {
            const ok = () => {
              img.removeEventListener("load", ok);
              img.removeEventListener("error", ok);
              res();
            };
            img.addEventListener("load", ok, { once: true });
            img.addEventListener("error", ok, { once: true });
          }),
        );
      } else if (typeof img.decode === "function") {
        imgW.push(img.decode().catch(() => {}));
      }
    }
    const vidW = [];
    for (const v of app.querySelectorAll("video")) {
      const rc = v.getBoundingClientRect();
      const cl = getClip(v, vw, vh);
      if (
        !cl ||
        rc.width <= 0 ||
        rc.height <= 0 ||
        rc.top >= cl.b ||
        rc.bottom <= cl.t ||
        rc.right <= cl.l ||
        rc.left >= cl.r
      ) {
        continue;
      }
      if (v.readyState < 2) {
        vidW.push(
          new Promise((res) => {
            const ok = () => {
              v.removeEventListener("loadeddata", ok);
              v.removeEventListener("error", ok);
              res();
            };
            v.addEventListener("loadeddata", ok, { once: true });
            v.addEventListener("error", ok, { once: true });
          }),
        );
      }
    }
    await Promise.all([
      fw,
      imgW.length ? waitCap(Promise.all(imgW), 150) : Promise.resolve(),
      vidW.length ? waitCap(Promise.all(vidW), 150) : Promise.resolve(),
    ]);
    await new Promise((r) => requestAnimationFrame(() => r()));
  };

  const runSweep = () => {
    if (cancelled || finished) return;
    const w = innerWidth;
    const h = innerHeight;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    const fsc = Math.min(0.5, 960 / Math.max(w, h, 1));
    const fw = Math.max(1, Math.round(w * fsc));
    const fh = Math.max(1, Math.round(h * fsc));
    const tw = Math.max(1, Math.round(w * 0.25));
    const th = Math.max(1, Math.round(h * 0.25));
    const bg = getBg();

    canvas.width = pw;
    canvas.height = ph;

    const sf = drawMask(w, h, fsc);
    const mtex = mkTex();
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sf);
    } catch {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        fw,
        fh,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null,
      );
    }

    const horiz = mkTarget(fw, fh);
    newField = mkTarget(fw, fh);
    const bu = (n) => gl.getUniformLocation(blurProg, n);
    gl.useProgram(blurProg);
    gl.viewport(0, 0, fw, fh);
    gl.uniform1i(bu("source"), 0);
    gl.uniform3f(bu("sigmas"), 3 * fsc, 8 * fsc, 18 * fsc);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, horiz.f);
    gl.bindTexture(gl.TEXTURE_2D, mtex);
    gl.uniform2f(bu("direction"), 1 / fw, 0);
    gl.uniform1f(bu("fromMask"), 1);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, newField.f);
    gl.bindTexture(gl.TEXTURE_2D, horiz.t);
    gl.uniform2f(bu("direction"), 0, 1 / fh);
    gl.uniform1f(bu("fromMask"), 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.deleteTexture(mtex);
    delTarget(horiz);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    trails = [mkTarget(tw, th), mkTarget(tw, th)];

    const rRad = Math.max(48, Math.min(96, h * 0.085));
    const wAmp = rRad * 0.32;
    const mLag = wAmp + rRad * 0.42;
    const mFth = rRad * 0.22;
    const sOff = rRad * 1.1;
    const eOff = mLag + mFth + rRad * 0.7;
    const fOff = mLag + mFth + rRad * 0.15;
    const tu = (n) => gl.getUniformLocation(trailProg, n);
    const cu = (n) => gl.getUniformLocation(compProg, n);

    host.style.pointerEvents = "none";
    let elapsed = 0;
    let last = 0;
    let lastAct = performance.now();
    let prevY = -sOff;
    let cleared = false;

    const render = (now) => {
      rafId = 0;
      if (cancelled || finished || !newField || !trails) return;
      const first = last === 0;
      const dt = first
        ? 1 / 60
        : Math.min(Math.max(now - last, 0) / 1000, 0.05) || 1 / 60;
      last = now;
      const tm = now / 1000;
      if (!first) elapsed += dt * 1000;

      const prog = Math.min(1, elapsed / 850);
      const sweeping = prog < 1 || prevY < h + eOff;
      let rf = -5000;
      let rt = -5000;
      let rs = 0;
      if (sweeping) {
        const sm = prog * prog * (3 - 2 * prog);
        const ea = 0.55 * prog + 0.45 * sm;
        const sy = -sOff;
        const ey = h + eOff;
        const cy = sy + (ey - sy) * ea;
        const env = ss(sy, -rRad * 0.25, cy) * (1 - ss(h + fOff, ey, cy));
        rf = h - prevY;
        rt = h - cy;
        rs =
          Math.min(
            1 - Math.exp(-26 * dt) + Math.abs(cy - prevY) / (rRad * 1.1),
            0.95,
          ) * env;
        const mcy = cy - mLag;
        const ms = mcy - mFth;
        const me = mcy + mFth;
        if (!cleared) {
          if (ms >= h) {
            hideCover();
            cleared = true;
          } else if (me > 0) {
            setMask(
              host,
              "linear-gradient(to bottom, transparent " +
                ms.toFixed(1) +
                "px, #000 " +
                me.toFixed(1) +
                "px)",
            );
          }
        }
        prevY = cy;
        lastAct = now;
      }

      const rd = trails[0];
      const wr = trails[1];
      gl.useProgram(trailProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, wr.f);
      gl.viewport(0, 0, tw, th);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, rd.t);
      gl.uniform1i(tu("previous"), 0);
      gl.uniform2f(tu("resolution"), w, h);
      gl.uniform1f(tu("revealFromY"), rf);
      gl.uniform1f(tu("revealToY"), rt);
      gl.uniform1f(tu("revealRadius"), rRad);
      gl.uniform1f(tu("revealStrength"), rs);
      gl.uniform1f(tu("waveAmp"), wAmp);
      gl.uniform1f(tu("decay"), Math.pow(0.935, dt * 60));
      gl.uniform1f(tu("fade"), 0.22 * dt);
      gl.uniform1f(tu("time"), tm);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      trails = [wr, rd];

      gl.useProgram(compProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, pw, ph);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, newField.t);
      gl.uniform1i(cu("mask"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, wr.t);
      gl.uniform1i(cu("trail"), 1);
      gl.uniform2f(cu("resolution"), w, h);
      gl.uniform1f(cu("time"), tm);
      gl.uniform3f(cu("background"), bg[0], bg[1], bg[2]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (now - lastAct < 950) {
        rafId = requestAnimationFrame(render);
      } else {
        finish();
      }
    };
    rafId = requestAnimationFrame(render);
  };

  const waitForStyles = () => {
    const links = Array.from(
      document.querySelectorAll('link[rel="stylesheet"]'),
    ).filter(
      (l) =>
        !l.disabled &&
        (!l.media || l.media === "all" || l.media === "screen") &&
        !l.sheet,
    );
    if (!links.length) return Promise.resolve();
    return waitCap(
      Promise.all(
        links.map(
          (l) =>
            new Promise((res) => {
              if (l.sheet) {
                res();
                return;
              }
              const ok = () => {
                l.removeEventListener("load", ok);
                l.removeEventListener("error", ok);
                res();
              };
              l.addEventListener("load", ok, { once: true });
              l.addEventListener("error", ok, { once: true });
            }),
        ),
      ),
      2500,
    );
  };

  waitForStyles()
    .then(() => waitFastAssets())
    .catch(() => {})
    .then(() => {
      try {
        runSweep();
      } catch {
        finish();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();

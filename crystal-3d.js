import { trackHeroScroll } from './hero-scroll.js';

// Real faceted geometry, up to three draw calls, no textures or rendering library.
// The renderer runs only during a short entrance/interaction and stays idle otherwise.
const vertexSource = `
  attribute vec3 position;
  attribute vec3 normal;
  uniform vec3 angle;
  uniform vec3 placement;
  uniform float aspect;
  varying vec3 facet;
  varying vec3 point;
  varying float tableFace;
  varying vec3 localPoint;
  mat3 rotation(vec3 a) {
    float x=cos(a.x), X=sin(a.x), y=cos(a.y), Y=sin(a.y), z=cos(a.z), Z=sin(a.z);
    return mat3(z,Z,0.,-Z,z,0.,0.,0.,1.) * mat3(y,0.,-Y,0.,1.,0.,Y,0.,y) * mat3(1.,0.,0.,0.,x,X,0.,-X,x);
  }
  void main() {
    mat3 r=rotation(angle);
    vec3 p=r*position*placement.z;
    facet=r*normal;
    tableFace=step(.98,normal.z);
    localPoint=position;
    point=p;
    p.xy+=placement.xy;
    float perspective=4.0/(4.0-p.z);
    gl_Position=vec4(p.x*.83/aspect*perspective,p.y*.83*perspective,-p.z*.2,1.);
  }`;

const fragmentSource = `
  precision mediump float;
  uniform vec3 tint;
  varying vec3 facet;
  varying vec3 point;
  varying float tableFace;
  void main() {
    vec3 n=normalize(facet);
    vec3 light=normalize(vec3(-.7,.9,1.5));
    float diffuse=max(dot(n,light),0.);
    float rim=pow(1.-abs(n.z),2.);
    float flash=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),42.);
    vec3 reflectedRay=reflect(vec3(0.,0.,-1.),n);
    float reflected=smoothstep(.24,.44,abs(reflectedRay.x*.75+reflectedRay.y*.65));
    float darkBand=smoothstep(.76,.84,abs(reflectedRay.y-reflectedRay.x*.35));
    vec3 col=tint*(.42+.5*diffuse);
    col=mix(col,vec3(1.,.985,.945),reflected*.8);
    col=mix(col,tint*.26,darkBand*.55);
    col=mix(col,tint*.75+vec3(.18,.18,.17),tableFace*.85);
    col+=vec3(.12,.13,.14)*rim+vec3(.8,.83,.86)*flash;
    gl_FragColor=vec4(col,1.);
  }`;

export function gemstone(sides = 12) {
  const data = [];
  const ring = (radius, z) =>
    Array.from({ length: sides }, (_, i) => {
      const a = (i * Math.PI * 2) / sides;
      return [Math.cos(a) * radius, Math.sin(a) * radius, z];
    });
  const triangle = (a, b, c) => {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((x, i) => x - a[i]);
    const n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const len = Math.hypot(...n);
    for (const p of [a, b, c]) data.push(...p, ...n.map((x) => x / len));
  };
  const top = ring(0.38, 0.42),
    edge = ring(1, 0.02),
    lower = ring(0.98, -0.08);
  for (let i = 0; i < sides; i++) {
    const j = (i + 1) % sides;
    const a = ((i + 0.5) * Math.PI * 2) / sides;
    const crown = [Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0.28];
    triangle([0, 0, 0.425], top[i], top[j]);
    triangle(top[i], edge[i], crown);
    triangle(edge[i], edge[j], crown);
    triangle(edge[j], top[j], crown);
    triangle(top[j], top[i], crown);
    triangle(edge[i], lower[i], lower[j]);
    triangle(edge[i], lower[j], edge[j]);
    triangle(lower[i], [0, 0, -0.78], lower[j]);
  }
  return new Float32Array(data);
}

// An octagonal table, star facets, sixteen girdle faces, and a pointed pavilion.
// Different ring counts keep the brilliant cut from looking like a radial fan.
function brilliantGemstone() {
  const data = [];
  const ring = (count, radius, z, phase = 0) => Array.from({ length: count }, (_, i) => {
    const a = i * Math.PI * 2 / count + phase;
    return [Math.cos(a) * radius, Math.sin(a) * radius, z];
  });
  const triangle = (a, b, c) => {
    const u = b.map((x, i) => x - a[i]), v = c.map((x, i) => x - a[i]);
    const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
    const length = Math.hypot(...normal);
    for (const p of [a, b, c]) data.push(...p, ...normal.map(x => x / length));
  };
  const table = ring(8, .43, .42), stars = ring(8, .72, .26, Math.PI / 8);
  const edge = ring(16, 1, .015), lower = ring(16, .995, -.055);
  for (let i = 0; i < 8; i++) {
    const next = (i+1)%8, previous = (i+7)%8, j = i*2;
    triangle([0,0,.42], table[i], table[next]);
    triangle(table[i], stars[i], table[next]);
    triangle(table[i], stars[previous], stars[i]);
    triangle(stars[i], edge[j], edge[j+1]);
    triangle(stars[i], edge[j+1], edge[(j+2)%16]);
    triangle(stars[i], edge[(j+2)%16], stars[next]);
  }
  for (let i = 0; i < 16; i++) {
    const next = (i+1)%16;
    triangle(edge[i], lower[i], lower[next]);
    triangle(edge[i], lower[next], edge[next]);
    triangle(lower[i], [0,0,-.78], lower[next]);
  }
  return new Float32Array(data);
}

// A studio-light environment for the large home jewel. Procedural reflections
// keep the material detailed without textures, downloads, or a rendering library.
const showcaseFragmentSource = `
  precision mediump float;
  uniform vec3 tint;
  varying vec3 facet;
  varying vec3 point;
  varying float tableFace;
  varying vec3 localPoint;
  void main() {
    vec3 n = normalize(facet);
    vec3 v = normalize(vec3(0.,0.,4.) - point);
    vec3 r = reflect(-v, n);
    float fresnel = .13 + .87 * pow(1. - abs(dot(n, v)), 5.);
    float key = max(dot(n, normalize(vec3(-.6, .9, 1.2))), 0.);
    float fill = max(dot(n, normalize(vec3(.9, -.3, .6))), 0.);
    float windowA = smoothstep(.28,.34,r.x + r.y * .7) * (1. - smoothstep(.56,.65,r.x + r.y * .7));
    float windowB = smoothstep(.68,.77,abs(r.y - r.x*.4));
    float shadow = smoothstep(.05,.15,abs(r.x - r.y*.6));
    float azimuth = atan(point.y, point.x);
    float internal = pow(abs(cos(azimuth * 8. + point.z*4.)), 9.);
    float center = 1. - smoothstep(.12, .6, length(point.xy));
    vec3 body = tint * (.25 + key*.55 + fill*.23);
    body = mix(body, tint * .10, (1.-shadow)*.7);
    body = mix(body, tint*.3 + vec3(.3,.34,.26), internal * center * .12 * (1.-tableFace));
    float strip = smoothstep(.18,.3,abs(r.x*.7+r.y*.65));
    vec3 reflection = mix(tint*.17, vec3(.89,.97,.86), strip*.7);
    reflection = mix(reflection, vec3(1.,.98,.89), windowA*.92);
    reflection = mix(reflection, tint*.1, windowB*.75);
    vec3 color = mix(body, reflection, .62 + fresnel*.3);
    // Suggest the pavilion seen through the crown, using a second reflected ray.
    float sector = floor((atan(localPoint.y,localPoint.x)+3.141593)/.392699);
    float a = (sector+.5)*.392699-3.141593;
    vec3 pavilion = normalize(vec3(cos(a),sin(a),-.72));
    vec3 inside = reflect(refract(-v,n,.58),pavilion);
    float bright = smoothstep(-.25,.65,inside.x*.6+inside.y*.8);
    float cut = smoothstep(.15,.23,abs(inside.x-inside.y*.7));
    vec3 transmitted = mix(tint*.12, mix(tint*.7,vec3(.91,.98,.87),bright),cut);
    color = mix(color,transmitted,tableFace*.52+(1.-tableFace)*.32);
    color += tint*.12*tableFace;
    color += vec3(1.,.98,.88) * pow(max(dot(reflect(-normalize(vec3(-.5,.8,1.4)),n),v),0.),85.) * .9;
    color += vec3(.045,.075,.05) * (1. - tableFace);
    gl_FragColor = vec4(color,1.);
  }`;

export function mountCrystal(scene) {
  const showcase = scene.classList.contains('hero-gem');
  const canvas = scene.querySelector("canvas");
  const button = scene.querySelector("button");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
    preserveDrawingBuffer: false,
  });
  if (!gl) {
    button.disabled = true;
    return;
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const program = gl.createProgram();
  function shader(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error("Crystal shader unavailable");
    gl.attachShader(program, s);
    gl.deleteShader(s);
  }
  try {
    shader(gl.VERTEX_SHADER, vertexSource);
    shader(gl.FRAGMENT_SHADER, showcase ? showcaseFragmentSource : fragmentSource);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Crystal program unavailable");
  } catch {
    gl.deleteProgram(program);
    button.disabled = true;
    return;
  }
  const vertices = showcase ? brilliantGemstone() : gemstone();
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  gl.useProgram(program);
  for (const [name, offset] of [
    ["position", 0],
    ["normal", 12],
  ]) {
    const attribute = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 3, gl.FLOAT, false, 24, offset);
  }
  const uniforms = Object.fromEntries(
    ["angle", "placement", "aspect", "tint"].map((n) => [
      n,
      gl.getUniformLocation(program, n),
    ]),
  );
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0, 0, 0, 0);
  const events = new AbortController();
  const listen = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: events.signal });
  const intro = scene.classList.contains("arrival-jewel");
  let frame = 0,
    visible = false,
    started = false,
    disposed = false;
  let pitch = 0.5,
    yaw = -0.3,
    tween = null,
    drag = null;
  let velocityX = 0,
    velocityY = 0,
    lastFrame = 0,
    suppressClick = false;
  const tones = { emerald: [0.12, 0.48, 0.31], champagne: [0.91, 0.83, 0.67], clear: [0.83, 0.94, 0.91] };
  const scrollHero = showcase ? scene.closest('.light-hero') : null;
  const heroProgress = scrollHero ? trackHeroScroll(scrollHero) : () => 0;
  const stones = showcase
    ? [[0, 0.08, .88, 0]]
    : [[0, 0.08, .78, 0], [-1.04, -0.48, .27, 1], [0.97, 0.54, .19, 2]];
  const secondaryTint = new Float32Array([0.22, 0.46, 0.33]);
  let contextLost = false, lastTint = null, dragSensitivity = 0;

  function draw() {
    if (disposed || contextLost) return;
    // Scroll adds to the user's rotation without changing it. Going back up
    // restores the same view, and the canvas stays inside its existing layout.
    const scroll = !reduced.matches ? heroProgress() : 0;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const tint = tones[scene.dataset.crystal] || tones.champagne;
    for (const [x, y, size, index] of stones) {
      gl.uniform3f(uniforms.placement, x + scroll * .09, y + scroll * .16, size);
      gl.uniform3f(
        uniforms.angle,
        pitch + index * 0.2 + scroll * .55,
        yaw + index * 0.7 + scroll * 2.4,
        0.3 + index * 0.5 - scroll * .28,
      );
      const stoneTint = index === 1 && scene.dataset.crystal !== 'emerald' ? secondaryTint : tint;
      if (lastTint !== stoneTint) {
        gl.uniform3fv(uniforms.tint, stoneTint);
        lastTint = stoneTint;
      }
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 6);
    }
  }
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    const width = button.clientWidth, height = button.clientHeight;
    const pixelWidth = Math.max(1, Math.round(width * dpr));
    const pixelHeight = Math.max(1, Math.round(height * dpr));
    dragSensitivity = (Math.PI * 1.5) / Math.max(100, width);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    gl.viewport(0, 0, pixelWidth, pixelHeight);
    gl.uniform1f(uniforms.aspect, pixelWidth / pixelHeight);
    draw();
  }
  function tick(now) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    const dt = Math.min(2, (now - lastFrame) / 16.67 || 1);
    lastFrame = now;
    if (tween) {
      const t = Math.min(1, (now - tween.start) / tween.duration);
      const eased = 1 - Math.pow(1 - t, 3);
      pitch = tween.x + (tween.toX - tween.x) * eased;
      yaw = tween.y + (tween.toY - tween.y) * eased;
      if (t === 1) tween = null;
    } else if (!drag && !reduced.matches) {
      pitch += velocityX * dt;
      yaw += velocityY * dt;
      velocityX *= Math.pow(0.88, dt);
      velocityY *= Math.pow(0.88, dt);
    }
    draw();
    if (tween || (!drag && Math.hypot(velocityX, velocityY) > 0.001))
      requestDraw();
  }
  function requestDraw() {
    if (!frame && visible && !document.hidden && !disposed && !contextLost)
      frame = requestAnimationFrame(tick);
  }
  if (scrollHero) {
    let lastScroll = -1;
    window.addEventListener('scroll', () => {
      if (reduced.matches || !visible || document.hidden) return;
      const scroll = heroProgress();
      if (scroll !== lastScroll) {
        lastScroll = scroll;
        requestDraw();
      }
    }, { passive: true, signal: events.signal });
  }
  function turn(toX = pitch, toY = yaw + 0.9, duration = 650) {
    stop();
    if (reduced.matches) {
      pitch = toX;
      yaw = toY;
      draw();
      return;
    }
    tween = { x: pitch, y: yaw, toX, toY, duration, start: performance.now() };
    lastFrame = performance.now();
    requestDraw();
  }
  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    tween = null;
    velocityX = velocityY = 0;
  }
  function release(event) {
    if (!drag || event.pointerId !== drag.id) return;
    suppressClick = drag.moved;
    if (
      event.type !== "pointerup" ||
      performance.now() - drag.time > 90 ||
      reduced.matches
    )
      velocityX = velocityY = 0;
    drag = null;
    button.classList.remove("dragging");
    if (button.hasPointerCapture(event.pointerId))
      button.releasePointerCapture(event.pointerId);
    lastFrame = performance.now();
    requestDraw();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) stop();
      else if (!started) {
        started = true;
        if (intro && !reduced.matches) {
          pitch = 1.15;
          yaw = -2.5;
          turn(0.5, 0.4, 1500);
        } else if (!reduced.matches) turn(showcase ? .28 : .5, showcase ? .15 : .1, 1100);
        else draw();
      } else draw();
    },
    { threshold: 0.1 },
  );
  observer.observe(scene);
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(button);
  listen(button, "pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    stop();
    suppressClick = false;
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: event.clientX,
      originY: event.clientY,
      moved: false,
      time: performance.now(),
    };
    button.setPointerCapture(event.pointerId);
    button.classList.add("dragging");
  });
  listen(button, "pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    const now = performance.now();
    const sensitivity = dragSensitivity;
    const dx = (event.clientX - drag.x) * sensitivity;
    const dy = (event.clientY - drag.y) * sensitivity;
    const dt = Math.max(8, now - drag.time) / 16.67;
    drag.moved ||=
      Math.hypot(event.clientX - drag.originX, event.clientY - drag.originY) >
      3;
    yaw += dx;
    pitch += dy;
    velocityX = Math.max(-0.12, Math.min(0.12, dy / dt));
    velocityY = Math.max(-0.12, Math.min(0.12, dx / dt));
    Object.assign(drag, { x: event.clientX, y: event.clientY, time: now });
    requestDraw();
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    listen(button, name, release);
  listen(button, "click", (event) => {
    if (suppressClick && event.detail !== 0) {
      suppressClick = false;
      return;
    }
    turn();
  });
  listen(button, "keydown", (event) => {
    const steps = {
      ArrowUp: [-0.3, 0],
      ArrowDown: [0.3, 0],
      ArrowLeft: [0, -0.3],
      ArrowRight: [0, 0.3],
    };
    if (event.key === "Home") {
      event.preventDefault();
      turn(0.5, -0.3, 350);
    } else if (steps[event.key]) {
      event.preventDefault();
      const [x, y] = steps[event.key];
      turn(pitch + x, yaw + y, 180);
    }
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) stop();
    else if (visible) draw();
  });
  listen(reduced, "change", () => {
    stop();
    if (visible) draw();
  });
  listen(scene, "crystal:tone", draw);
  listen(canvas, "webglcontextlost", (event) => {
    event.preventDefault();
    contextLost = true;
    stop();
    scene.classList.remove("webgl-ready");
    button.disabled = true;
  });
  resize();
  scene.classList.add("webgl-ready");
  return () => {
    stop();
    disposed = true;
    observer.disconnect();
    resizeObserver.disconnect();
    events.abort();
    gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}

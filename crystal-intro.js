import { gemstone } from "./crystal-3d.js";

// One static mesh, one draw call. The GPU animates 32 six-sided gems;
// no particle objects, physics engine, textures, or per-frame buffer uploads.
const vertexSource = `
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec4 shard;
  uniform float time;
  uniform float aspect;
  varying vec3 facet;
  varying vec3 color;
  varying float visibility;
  mat3 rotation(vec3 a) {
    float x=cos(a.x), X=sin(a.x), y=cos(a.y), Y=sin(a.y), z=cos(a.z), Z=sin(a.z);
    return mat3(z,Z,0.,-Z,z,0.,0.,0.,1.) * mat3(y,0.,-Y,0.,1.,0.,Y,0.,y) * mat3(1.,0.,0.,0.,x,X,0.,-X,x);
  }
  void main() {
    float flight=clamp((time-.82)/1.25,0.,1.);
    float scatter=1.-pow(1.-flight,2.);
    float birth=smoothstep(.0,.14,flight);
    bool mainStone=shard.w<.5;
    vec3 center=vec3(0.);
    float size;
    vec3 angle;
    if(mainStone) {
      float enter=1.-pow(1.-clamp(time/.65,0.,1.),3.);
      size=(.55+.38*enter)*(1.-smoothstep(0.,.18,flight));
      angle=vec3(.55,-1.8+enter*1.8+flight*2.,.2);
      visibility=1.-smoothstep(0.,.16,flight);
    } else {
      float spin=flight*.75;
      vec2 direction=mat2(cos(spin),sin(spin),-sin(spin),cos(spin))*shard.xy;
      center=vec3(direction*scatter,shard.z*scatter);
      center.y-=flight*flight*.3;
      size=(.075+mod(shard.w,5.)*.017)*birth*(1.-smoothstep(.8,1.,flight));
      angle=vec3(shard.w*.7+flight*3.,shard.w*.9+flight*4.,shard.w+flight*2.);
      visibility=birth*(1.-smoothstep(.7,1.,flight));
    }
    mat3 r=rotation(angle);
    vec3 p=r*position*size+center;
    facet=r*normal;
    color=mod(shard.w,7.)<1. && !mainStone ? vec3(.32,.57,.44) : vec3(.91,.82,.64);
    float perspective=4./(4.-p.z);
    gl_Position=vec4(p.x*.51/aspect*perspective,p.y*.51*perspective,-p.z*.16,1.);
  }`;

const fragmentSource = `
  precision mediump float;
  varying vec3 facet;
  varying vec3 color;
  varying float visibility;
  void main() {
    if(visibility<.005) discard;
    vec3 n=normalize(facet);
    vec3 light=normalize(vec3(-.7,.9,1.5));
    vec3 reflection=reflect(vec3(0.,0.,-1.),n);
    float band=smoothstep(.24,.44,abs(reflection.x*.75+reflection.y*.65));
    float shine=pow(max(dot(reflect(-light,n),vec3(0.,0.,1.)),0.),32.);
    vec3 c=color*(.4+.5*max(dot(n,light),0.));
    c=mix(c,vec3(1.,.985,.945),band*.8)+shine*.55;
    gl_FragColor=vec4(c,visibility);
  }`;

function burstGeometry() {
  const data = [];
  const add = (mesh, seed) => {
    for (let i = 0; i < mesh.length; i += 6) {
      for (let j = 0; j < 6; j++) data.push(mesh[i + j]);
      data.push(...seed);
    }
  };
  add(gemstone(), [0, 0, 0, 0]);
  const chip = gemstone(6);
  for (let i = 0; i < 32; i++) {
    const angle = i * 2.399963; // Golden-angle distribution avoids obvious spokes.
    const radius = 1.05 + Math.sqrt((i + 1) / 32) * 1.7;
    add(chip, [
      Math.cos(angle) * radius,
      Math.sin(angle) * radius * 0.7,
      Math.sin(i * 1.7) * 0.65,
      i + 1,
    ]);
  }
  return new Float32Array(data);
}

export function mountCrystalIntro(scene) {
  const canvas = scene.querySelector("canvas");
  const button = scene.querySelector("button");
  // This scene is decorative; the separate Enter LUVIO control skips it.
  button.disabled = true;
  button.tabIndex = -1;
  button.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  if (!gl) return;
  const program = gl.createProgram();
  const shaders = [];
  let buffer,
    frame = 0,
    stopped = false;
  const events = new AbortController();
  const dispose = () => {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    events.abort();
    observer?.disconnect();
    if (buffer) gl.deleteBuffer(buffer);
    gl.deleteProgram(program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
  let observer;
  try {
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ]) {
      const shader = gl.createShader(type);
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
        throw new Error("Intro shader unavailable");
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      throw new Error("Intro program unavailable");
  } catch {
    shaders.forEach((shader) => gl.deleteShader(shader));
    dispose();
    return;
  }
  shaders.forEach((shader) => gl.deleteShader(shader));
  const mesh = burstGeometry();
  buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  gl.useProgram(program);
  for (const [name, size, offset] of [
    ["position", 3, 0],
    ["normal", 3, 12],
    ["shard", 4, 24],
  ]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, 40, offset);
  }
  const time = gl.getUniformLocation(program, "time");
  const aspect = gl.getUniformLocation(program, "aspect");
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  const start = performance.now();
  const frameStep = 1000 / 60;
  let lastPaint = start - frameStep;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.round(button.clientWidth * dpr);
    canvas.height = Math.round(button.clientHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform1f(aspect, canvas.width / canvas.height);
  }
  function tick(now) {
    if (stopped || document.hidden || gl.isContextLost()) return;
    const elapsed = (now - start) / 1000;
    // High-refresh displays do not need hundreds of GPU draws per second.
    if (now - lastPaint >= frameStep) {
      lastPaint += Math.floor((now - lastPaint) / frameStep) * frameStep;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniform1f(time, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 10);
    }
    if (elapsed < 2.1) frame = requestAnimationFrame(tick);
  }
  document.addEventListener(
    "visibilitychange",
    () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && !stopped) frame = requestAnimationFrame(tick);
    },
    { signal: events.signal },
  );
  canvas.addEventListener(
    "webglcontextlost",
    () => {
      cancelAnimationFrame(frame);
      scene.classList.remove("webgl-ready");
    },
    { signal: events.signal },
  );
  observer = new ResizeObserver(resize);
  observer.observe(button);
  resize();
  scene.classList.add("webgl-ready");
  frame = requestAnimationFrame(tick);
  return dispose;
}

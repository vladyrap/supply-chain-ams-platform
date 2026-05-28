"use client";

import { useEffect, useRef } from "react";
import { useEventSounds } from "@/hooks/useEventSounds";

// WebGL fragment-shader noise para aurora boreal procedural.
// Sin libs, todo WebGL 1.0 nativo. Z-index negativo para quedar detrás
// del contenido pero encima del background del body.

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// Simplex-like noise simplificado pero suficiente para aurora.
// Combinamos varias capas de sin/cos con scale + tiempo para crear cintas que ondulan.
const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform float u_time;
uniform float u_intensity;
uniform vec2 u_res;

// Pseudo-noise 2D barato
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
    u.y
  );
}
// FBM ligero: 4 octavas
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = v_uv;
  // Cintas verticales onduladas. La aurora vive en franja superior 0.0..0.6 vertical.
  float t = u_time * 0.04;

  // Distorsión horizontal: la cinta serpentea
  float wave1 = fbm(vec2(uv.x * 2.0 + t,        uv.y * 0.6 - t * 0.5)) * 0.35;
  float wave2 = fbm(vec2(uv.x * 3.5 - t * 0.7,  uv.y * 1.3 + t * 0.3)) * 0.25;

  // Banda central de cada cinta (distancia vertical a una curva senoidal)
  float band1Y = 0.42 + sin(uv.x * 4.0 + t * 1.3) * 0.10 + wave1 * 0.3;
  float band2Y = 0.55 + sin(uv.x * 3.2 - t * 0.9 + 1.5) * 0.12 + wave2 * 0.3;
  float band3Y = 0.30 + sin(uv.x * 2.5 + t * 0.6 - 0.7) * 0.08 + wave1 * 0.4;

  float thick = 0.06 + 0.02 * u_intensity;
  float a1 = smoothstep(thick, 0.0, abs(uv.y - band1Y));
  float a2 = smoothstep(thick, 0.0, abs(uv.y - band2Y));
  float a3 = smoothstep(thick * 0.8, 0.0, abs(uv.y - band3Y));

  // Colores: verde esmeralda + violeta + cyan
  vec3 cGreen  = vec3(0.10, 0.85, 0.50);
  vec3 cViolet = vec3(0.55, 0.30, 0.95);
  vec3 cCyan   = vec3(0.20, 0.80, 0.95);

  vec3 col = vec3(0.0);
  col += cGreen  * a1 * 0.75;
  col += cViolet * a2 * 0.60;
  col += cCyan   * a3 * 0.50;

  // Glow vertical descendente
  col *= smoothstep(0.0, 0.9, uv.y);
  // Atenuar hacia los bordes laterales
  col *= smoothstep(0.0, 0.18, uv.x) * smoothstep(0.0, 0.18, 1.0 - uv.x);

  // Boost al recibir evento
  col *= (1.0 + u_intensity * 0.9);

  // Alpha final
  float alpha = clamp(length(col) * 0.7, 0.0, 0.55) * (0.35 + u_intensity * 0.4);
  gl_FragColor = vec4(col, alpha);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const s = gl.createShader(type); if (!s) return null;
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn("[aurora] shader error", gl.getShaderInfoLog(s));
    gl.deleteShader(s); return null;
  }
  return s;
}

export default function AuroraBackground() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const { feed } = useEventSounds({ enabled: true });
  const intensityRef = useRef(0);
  const lastFeedLen = useRef(0);

  // Boost cada vez que aparece un evento nuevo
  useEffect(() => {
    if (feed.length > lastFeedLen.current) {
      intensityRef.current = Math.min(1, intensityRef.current + 0.7);
    }
    lastFeedLen.current = feed.length;
  }, [feed.length]);

  useEffect(() => {
    const c = ref.current; if (!c) return;
    const gl = c.getContext("webgl", { premultipliedAlpha: true, alpha: true });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram(); if (!prog) return;
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("[aurora] link error", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, "u_time");
    const uInt  = gl.getUniformLocation(prog, "u_intensity");
    const uRes  = gl.getUniformLocation(prog, "u_res");

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

    function resize() {
      if (!c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.floor(window.innerWidth * dpr);
      const h = Math.floor(window.innerHeight * dpr);
      if (c.width !== w || c.height !== h) {
        c.width = w; c.height = h;
        gl?.viewport(0, 0, w, h);
      }
    }
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const start = performance.now();
    function draw(now: number) {
      const t = (now - start) / 1000;
      // decay suave
      intensityRef.current = Math.max(0, intensityRef.current * 0.985);
      gl?.uniform1f(uTime, t);
      gl?.uniform1f(uInt, intensityRef.current);
      gl?.uniform2f(uRes, c?.width || 1, c?.height || 1);
      gl?.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(draw);
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 0,
        opacity: 0.65,
        mixBlendMode: "screen",
      }}
    />
  );
}

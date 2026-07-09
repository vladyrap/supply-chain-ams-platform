"use client";

import ClientOnly from "@/components/common/ClientOnly";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { fetchExecutive, fetchAdvanced, fetchUsage, fetchNotifications,
  type DashboardExecutive, type DashboardAdvanced, type UsageSummary, type NotificationItem } from "@/services/dashboard.api";
import { useEventSounds } from "@/hooks/useEventSounds";
import { radar } from "@/lib/sounds";

const POLL_MS = 5000;
const GLOBE_RADIUS = 1.4;

const COUNTRY_COORDS: Array<{ kw: RegExp; lat: number; lng: number; country: string }> = [
  { kw: /chile|santiago|miespejo/i,            lat: -33.45, lng:  -70.66, country: "CL" },
  { kw: /argentina|buenos|baires/i,            lat: -34.61, lng:  -58.38, country: "AR" },
  { kw: /peru|lima/i,                          lat: -12.05, lng:  -77.04, country: "PE" },
  { kw: /colombia|bogota/i,                    lat:   4.71, lng:  -74.07, country: "CO" },
  { kw: /mexico|mexic|cdmx/i,                  lat:  19.43, lng:  -99.13, country: "MX" },
  { kw: /brasil|brazil|sao paulo|rio/i,        lat: -23.55, lng:  -46.63, country: "BR" },
  { kw: /espan|spain|madrid|barcelona/i,       lat:  40.42, lng:   -3.70, country: "ES" },
  { kw: /usa|estados|miami|texas|york/i,       lat:  40.71, lng:  -74.00, country: "US" },
  { kw: /alemania|germany|berlin/i,            lat:  52.52, lng:   13.40, country: "DE" },
  { kw: /uruguay|montevideo/i,                 lat: -34.90, lng:  -56.16, country: "UY" },
  { kw: /ecuador|quito|guayaquil/i,            lat:  -0.18, lng:  -78.47, country: "EC" },
  { kw: /panama/i,                             lat:   8.98, lng:  -79.52, country: "PA" },
];

function hash(s: string): number {
  let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return Math.abs(h);
}

function coordFor(name: string): { lat: number; lng: number; country: string } {
  for (const c of COUNTRY_COORDS) if (c.kw.test(name)) return { lat: c.lat, lng: c.lng, country: c.country };
  const h = hash(name);
  return { lat: ((h % 1200) / 10) - 60, lng: (((h >> 10) % 3600) / 10) - 180, country: "??" };
}

// Lat/Lng en grados → Vector3 sobre esfera
function latLngToVec3(lat: number, lng: number, radius = GLOBE_RADIUS): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
}

// Puntos esquemáticos para sugerir tierra firme (sub-muestreado, suficiente para el efecto visual)
const LAND_DOTS: [number, number][] = [
  // Norte américa
  [60, -150], [60, -120], [55, -100], [50, -90], [45, -75], [40, -100], [35, -110], [30, -90], [25, -100],
  // Sudamérica
  [10, -75], [0, -65], [-10, -75], [-20, -60], [-30, -60], [-40, -65], [-50, -70], [-15, -45], [-25, -50],
  // Europa
  [60, 10], [55, 25], [50, 5], [45, 15], [42, -5], [40, 0],
  // África
  [30, 0], [20, 15], [10, 20], [0, 25], [-10, 30], [-20, 25], [-30, 20], [-30, 25], [5, -10], [15, -15],
  // Asia
  [50, 60], [50, 90], [45, 110], [40, 130], [35, 75], [30, 90], [25, 110], [20, 80], [15, 100], [10, 120], [55, 130], [60, 90],
  // India
  [22, 78], [15, 80],
  // Sudeste asiático
  [5, 110], [0, 120], [-5, 120],
  // Australia
  [-25, 135], [-30, 145], [-20, 130], [-35, 150],
  // Antártida edge
  [-65, 0], [-65, 60], [-65, -60], [-65, 120], [-65, 180], [-65, -120],
];

interface Arc3D {
  id: string;
  curve: THREE.QuadraticBezierCurve3;
  color: number;
  bornAt: number;
  mesh?: THREE.Mesh;
  head?: THREE.Mesh;
}

const EVENT_COLOR: Record<string, number> = {
  incident_created: 0x3b82f6,
  ticket_escalated: 0xf59e0b,
  ticket_resolved:  0x10b981,
  kb_approved:      0xfbbf24,
  meeting_done:     0xa855f7,
};

const HQ = latLngToVec3(0, -30, GLOBE_RADIUS + 0.05);

export default function WarRoomPage() {
  return (
    <ClientOnly fallback={<div style={{ padding: 40, textAlign: "center", color: "#64748b", fontSize: 13 }}>Cargando visualizacion...</div>}>
      <WarRoomPageInner />
    </ClientOnly>
  );
}

function WarRoomPageInner() {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<{ renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; camera?: THREE.PerspectiveCamera; globe?: THREE.Group; clientGroup?: THREE.Group; arcGroup?: THREE.Group; arcs: Arc3D[] }>({ arcs: [] });
  const [exec, setExec] = useState<DashboardExecutive | null>(null);
  const [adv, setAdv] = useState<DashboardAdvanced | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [now, setNow] = useState(new Date());
  const seen = useRef<Set<string>>(new Set());
  const firstRef = useRef(true);
  const { muted, toggleMute, feed } = useEventSounds();

  const clients = useMemo(() => {
    return (exec?.byClient ?? []).map((c) => ({ ...c, ...coordFor(c.name) }));
  }, [exec]);

  // Polling
  useEffect(() => {
    let alive = true;
    async function tick() {
      const [e, a, u, n] = await Promise.all([fetchExecutive(30), fetchAdvanced(), fetchUsage(30), fetchNotifications()]);
      if (!alive) return;
      if (e.ok) setExec(e.d);
      if (a.ok) setAdv(a.d);
      if (u.ok) setUsage(u.u);
      if (n.ok) {
        const news: NotificationItem[] = [];
        for (const it of n.items) if (!seen.current.has(it.id)) { seen.current.add(it.id); if (!firstRef.current) news.push(it); }
        firstRef.current = false;
        news.slice(0, 6).forEach((ev, i) => setTimeout(() => fireArc(ev), i * 250));
      }
    }
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Init three.js
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 1.0, 4.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    // Globo group (rotamos el grupo, no la cámara)
    const globe = new THREE.Group();
    scene.add(globe);

    // Esfera base translúcida
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS, 48, 32),
      new THREE.MeshBasicMaterial({ color: 0x0a1530, transparent: true, opacity: 0.55 }),
    );
    globe.add(sphere);

    // Wireframe meridian/parallel lines
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(GLOBE_RADIUS * 1.001, 24, 16)),
      new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.30 }),
    );
    globe.add(wireframe);

    // Continent dots
    const dotGeom = new THREE.SphereGeometry(0.015, 6, 4);
    const dotMat  = new THREE.MeshBasicMaterial({ color: 0x60a5fa });
    LAND_DOTS.forEach(([lat, lng]) => {
      const v = latLngToVec3(lat, lng, GLOBE_RADIUS * 1.01);
      const dot = new THREE.Mesh(dotGeom, dotMat);
      dot.position.copy(v);
      globe.add(dot);
    });

    // Halo / atmosphere
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 48, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        uniforms: { c: { value: 0.4 }, p: { value: 4.5 }, glowColor: { value: new THREE.Color(0x3b82f6) } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 glowColor;
          uniform float c;
          uniform float p;
          void main() {
            float intensity = pow(c - dot(vNormal, vec3(0.0, 0.0, 1.0)), p);
            gl_FragColor = vec4(glowColor, intensity);
          }
        `,
      }),
    );
    scene.add(halo);

    // HQ marker (fijo en el grupo globe para que rote con la tierra)
    const hqMarker = new THREE.Group();
    const hqDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
    );
    hqDot.position.copy(HQ);
    hqMarker.add(hqDot);
    const hqHalo = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 16, 8),
      new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.30 }),
    );
    hqHalo.position.copy(HQ);
    hqMarker.add(hqHalo);
    globe.add(hqMarker);

    // Client group (markers se llenan después)
    const clientGroup = new THREE.Group();
    globe.add(clientGroup);

    // Arcs group
    const arcGroup = new THREE.Group();
    globe.add(arcGroup);

    sceneRef.current = { renderer, scene, camera, globe, clientGroup, arcGroup, arcs: [] };

    // Stars
    const starsGeom = new THREE.BufferGeometry();
    const starCount = 400;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 40;
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(2 * Math.random() - 1);
      positions[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.cos(theta);
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    }
    starsGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const stars = new THREE.Points(starsGeom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.08, transparent: true, opacity: 0.7 }));
    scene.add(stars);

    // Interacción: drag para rotar
    let dragging = false;
    let lastX = 0, lastY = 0;
    let rotY = 0, rotX = 0;
    let autoRotate = true;

    function onDown(ev: PointerEvent) {
      dragging = true;
      lastX = ev.clientX; lastY = ev.clientY;
      autoRotate = false;
    }
    function onMove(ev: PointerEvent) {
      if (!dragging) return;
      const dx = ev.clientX - lastX;
      const dy = ev.clientY - lastY;
      rotY += dx * 0.005;
      rotX += dy * 0.005;
      rotX = Math.max(-1.2, Math.min(1.2, rotX));
      lastX = ev.clientX; lastY = ev.clientY;
    }
    function onUp() { dragging = false; setTimeout(() => { autoRotate = true; }, 3000); }

    renderer.domElement.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // Animation
    let raf = 0;
    let last = performance.now();
    function animate(now: number) {
      const dt = (now - last) / 1000; last = now;
      if (autoRotate) rotY += dt * 0.12;
      globe.rotation.y = rotY;
      globe.rotation.x = rotX;

      // Animar arcos (head viaja por la curva, mesh fade-out)
      const cleanup: Arc3D[] = [];
      for (const a of sceneRef.current.arcs) {
        const age = (Date.now() - a.bornAt) / 1500;
        if (age >= 1) {
          if (a.mesh) arcGroup.remove(a.mesh);
          if (a.head) arcGroup.remove(a.head);
          continue;
        }
        if (a.head) {
          const p = a.curve.getPoint(age);
          a.head.position.copy(p);
          (a.head.material as THREE.MeshBasicMaterial).opacity = 1 - age;
        }
        if (a.mesh) {
          ((a.mesh.material as THREE.MeshBasicMaterial).opacity) = 0.85 * (1 - age * 0.5);
        }
        cleanup.push(a);
      }
      sceneRef.current.arcs = cleanup;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);

    function onResize() {
      if (!container) return;
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Sync clients into scene
  useEffect(() => {
    const s = sceneRef.current;
    if (!s.clientGroup) return;
    while (s.clientGroup.children.length) s.clientGroup.remove(s.clientGroup.children[0]);
    for (const c of clients) {
      const v = latLngToVec3(c.lat, c.lng, GLOBE_RADIUS * 1.01);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981 }),
      );
      dot.position.copy(v);
      s.clientGroup.add(dot);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.25 }),
      );
      halo.position.copy(v);
      s.clientGroup.add(halo);
    }
  }, [clients]);

  function fireArc(ev: NotificationItem) {
    const s = sceneRef.current;
    if (!s.arcGroup || clients.length === 0) return;
    const c = clients[Math.floor(Math.random() * clients.length)];
    const start = latLngToVec3(c.lat, c.lng, GLOBE_RADIUS * 1.01);
    const end = HQ.clone();
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize().multiplyScalar(GLOBE_RADIUS * 1.8);
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);

    const color = EVENT_COLOR[ev.kind] ?? 0x3b82f6;
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.008, 6, false),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 }),
    );
    s.arcGroup.add(tube);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 1 }),
    );
    s.arcGroup.add(head);

    s.arcs.push({ id: ev.id, curve, color, bornAt: Date.now(), mesh: tube, head });
  }

  function fireTest() {
    radar();
    fireArc({ id: `t-${Date.now()}`, kind: "incident_created", title: "test", href: "#", createdAt: new Date().toISOString() });
  }

  const kpis = [
    { label: "INC·MES",    value: exec?.kpis.incidentsMonth ?? 0,                color: "#3b82f6" },
    { label: "RES·MES",    value: exec?.kpis.ticketsResolvedMonth ?? 0,          color: "#10b981" },
    { label: "% IA",       value: `${Math.round(exec?.kpis.aiResolutionRate ?? 0)}`, color: "#06b6d4" },
    { label: "SLA %",      value: Math.round(exec?.kpis.slaCompliancePct ?? 0),  color: "#f1c21b" },
    { label: "TOKENS·K",   value: usage ? Math.round(usage.totals.totalTokens / 1000) : 0, color: "#a855f7" },
    { label: "COSTO USD",  value: usage ? Number(usage.totals.costUsd.toFixed(2)) : 0, color: "#fa4d56" },
  ];

  return (
    <div style={{
      minHeight: "calc(100vh - 80px)",
      background: "radial-gradient(circle at 50% 40%, rgba(59,130,246,0.10), #050714 70%)",
      padding: "8px 4px",
      color: "#e2e8f0",
      position: "relative",
      overflow: "hidden",
    }}>
      <div className="row between" style={{ marginBottom: 10, padding: "0 6px", position: "relative", zIndex: 3 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 2 }}>
            🌐 AMS GLOBAL OPS <span style={{ color: "var(--text-dim)", fontSize: 12, marginLeft: 8 }}>· War Room 3D</span>
          </h1>
          <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 4 }}>
            drag para rotar · {clients.length} clientes · {sceneRef.current.arcs.length} arcos · {muted ? "🔇" : "🔊"}
          </div>
        </div>
        <div className="row" style={{ gap: 10 }}>
          <button onClick={toggleMute} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>{muted ? "🔇 unmute" : "🔊 mute"}</button>
          <button onClick={fireTest} className="btn ghost" style={{ padding: "4px 10px", fontSize: 11 }}>🧪 test arc</button>
          <div style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
            <div style={{ fontSize: 22, color: "#3b82f6", textShadow: "0 0 10px rgba(59,130,246,0.6)", letterSpacing: 2 }}>{now.toLocaleTimeString()}</div>
            <div style={{ fontSize: 10, color: "#64748b", letterSpacing: 2 }}>{now.toUTCString().slice(0, 25)} UTC</div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 10, position: "relative", zIndex: 2 }}>
        <div ref={canvasRef} className="war-frame" style={{ height: "70vh", minHeight: 500 }}>
          <div className="tracking-corner tl" />
          <div className="tracking-corner tr" />
          <div className="tracking-corner bl" />
          <div className="tracking-corner br" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#60a5fa", letterSpacing: 1.5 }}>▼ TELEMETRY</span>
              <span style={{ fontSize: 9, color: "#10b981" }}>● LIVE</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {kpis.map((k) => (
                <div key={k.label} className="holo" style={{ borderColor: k.color }}>
                  <div style={{ fontSize: 9, color: "#94a3b8", letterSpacing: 1.2 }}>{k.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: k.color, lineHeight: 1.1 }}>
                    {typeof k.value === "number" ? k.value.toLocaleString("es-CL") : k.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: 12, background: "rgba(15,23,42,0.7)", border: "1px solid rgba(168,85,247,0.3)", flex: 1, display: "flex", flexDirection: "column", maxHeight: 280 }}>
            <div className="row between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: "#c084fc", letterSpacing: 1.5 }}>▼ EVENTS·FEED</span>
              <span style={{ fontSize: 9, color: "#10b981" }}>● {feed.length}</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", fontSize: 11, fontFamily: "var(--font-mono, monospace)" }}>
              {feed.length === 0 && <div style={{ color: "#64748b" }}>(esperando eventos)</div>}
              {feed.map((f) => (
                <div key={f.id} style={{ padding: "4px 6px", marginBottom: 3, background: "rgba(255,255,255,0.02)", borderLeft: "2px solid rgba(59,130,246,0.6)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  <span style={{ color: "#64748b" }}>{new Date(f.createdAt).toLocaleTimeString()}</span>{" "}
                  <span style={{ color: "#cbd5e1" }}>{f.title.slice(0, 40)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="ticker-bar">
        <div className="ticker-content">
          {[...clients, ...clients].map((c, i) => (
            <span key={i} style={{ marginRight: 28, fontSize: 12 }}>
              <span style={{ color: "#64748b" }}>{c.country}</span>{" "}
              <span style={{ color: "#86efac", fontWeight: 600 }}>{c.name}</span>{" "}
              <span style={{ color: "#60a5fa" }}>inc {c.incidents}</span>{" "}
              <span style={{ color: "#f1c21b" }}>tkt {c.tickets}</span>
            </span>
          ))}
        </div>
      </div>

      <style jsx global>{`
        .war-frame {
          position: relative;
          background: radial-gradient(ellipse at center, rgba(15,23,42,0.7) 0%, rgba(5,7,20,0.95) 80%);
          border: 1px solid rgba(59,130,246,0.35);
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 0 40px rgba(59,130,246,0.10), inset 0 0 60px rgba(59,130,246,0.05);
        }
        .tracking-corner {
          position: absolute; width: 22px; height: 22px;
          border: 2px solid rgba(59,130,246,0.7); pointer-events: none; z-index: 2;
        }
        .tracking-corner.tl { top: 4px;    left: 4px;    border-right: 0; border-bottom: 0; }
        .tracking-corner.tr { top: 4px;    right: 4px;   border-left:  0; border-bottom: 0; }
        .tracking-corner.bl { bottom: 4px; left: 4px;    border-right: 0; border-top:    0; }
        .tracking-corner.br { bottom: 4px; right: 4px;   border-left:  0; border-top:    0; }
        .holo {
          background: linear-gradient(135deg, rgba(59,130,246,0.05), rgba(15,23,42,0.4));
          border-left: 2px solid;
          padding: 6px 8px;
          border-radius: 3px;
        }
        .ticker-bar {
          margin-top: 10px;
          background: rgba(0,0,0,0.6);
          border: 1px solid rgba(59,130,246,0.25);
          border-radius: 6px;
          overflow: hidden; height: 28px;
          display: flex; align-items: center;
          position: relative; z-index: 2;
        }
        .ticker-content { display: inline-flex; white-space: nowrap; animation: tickerSlide 60s linear infinite; }
        @keyframes tickerSlide { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

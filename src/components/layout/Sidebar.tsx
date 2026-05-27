"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MODULES } from "@/lib/modules";
import { usePlatform } from "@/context/PlatformContext";
import { canAccess } from "@/lib/roles";

export default function Sidebar() {
  const pathname = usePathname();
  const { role } = usePlatform();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo">A</div>
        <div>
          <div className="title">AMS Platform</div>
          <div className="subtitle">Supply Chain · SAP</div>
        </div>
      </div>

      <nav className="nav" aria-label="Módulos">
        <div className="nav-section">Operación</div>
        {MODULES.filter((m) => ["mission-control", "topology", "tv", "demo", "dashboard", "agent", "history"].includes(m.id)).map((m) => {
          const allowed = canAccess(role, m.rolesAllowed);
          const active = pathname?.startsWith(m.href);
          return (
            <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} active={!!active} allowed={allowed} soon={m.status !== "available"} />
          );
        })}

        <div className="nav-section">Visualizaciones</div>
        {MODULES.filter((m) => ["launchpad", "wallboard", "war-room", "brain", "terminal", "hud", "forecast"].includes(m.id)).map((m) => {
          const allowed = canAccess(role, m.rolesAllowed);
          const active = pathname?.startsWith(m.href);
          return (
            <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} active={!!active} allowed={allowed} soon={m.status !== "available"} />
          );
        })}

        <div className="nav-section">AMS avanzado</div>
        {MODULES.filter((m) => ["support-desk", "knowledge", "tickets", "integrations", "sap-readonly", "meetings"].includes(m.id)).map((m) => {
          const allowed = canAccess(role, m.rolesAllowed);
          const active = pathname?.startsWith(m.href);
          return (
            <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} active={!!active} allowed={allowed} soon={m.status !== "available"} />
          );
        })}

        <div className="nav-section">Sistema</div>
        {MODULES.filter((m) => ["executive", "settings", "admin"].includes(m.id)).map((m) => {
          const allowed = canAccess(role, m.rolesAllowed);
          const active = pathname?.startsWith(m.href);
          return (
            <NavLink key={m.id} href={m.href} icon={m.icon} label={m.label} active={!!active} allowed={allowed} soon={false} />
          );
        })}
      </nav>

      <div className="foot">
        v0.1 · Fase 1 · sin login todavía
      </div>
    </aside>
  );
}

function NavLink({
  href, icon, label, active, allowed, soon,
}: { href: string; icon: string; label: string; active: boolean; allowed: boolean; soon: boolean }) {
  const className = `nav-item ${active ? "active" : ""} ${allowed ? "" : "disabled"}`;
  const content = (
    <>
      <span className="ic">{icon}</span>
      <span className="label">{label}</span>
      {!allowed && <span className="badge muted" style={{ fontSize: 10 }}>rol</span>}
      {soon && allowed && <span className="badge info" style={{ fontSize: 10 }}>pronto</span>}
    </>
  );
  if (!allowed) {
    return <div className={className} aria-disabled>{content}</div>;
  }
  return (
    <Link href={href} className={className} aria-current={active ? "page" : undefined}>
      {content}
    </Link>
  );
}

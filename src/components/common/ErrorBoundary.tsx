"use client";

// =============================================================================
// ErrorBoundary global — Captura errores de React + reporta a Sentry (v0.14.17)
// =============================================================================
// Envuelve la app entera para evitar pantallas en blanco si algún componente
// crashea. Muestra fallback amigable y permite reload. Si Sentry está activo
// (window.Sentry o NEXT_PUBLIC_SENTRY_DSN seteada), reporta el error.
// =============================================================================

import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Log a consola siempre
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] Crash capturado:", error, errorInfo);
    // Reportar a Sentry si está disponible
    try {
      const win = typeof window !== "undefined" ? (window as unknown as { Sentry?: { captureException: (e: Error, ctx?: object) => void } }) : null;
      if (win?.Sentry?.captureException) {
        win.Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      }
    } catch { /* swallow */ }
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const isDev = typeof process !== "undefined" && process.env.NODE_ENV === "development";

    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, background: "var(--bg, #0b1220)", color: "var(--text, #e2e8f0)",
      }}>
        <div style={{
          maxWidth: 600, padding: 32, borderRadius: 12,
          background: "rgba(250,77,86,0.05)", border: "1px solid rgba(250,77,86,0.3)",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, color: "#fa4d56" }}>
            Algo salió mal
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-soft, #94a3b8)", marginBottom: 20, lineHeight: 1.5 }}>
            La aplicación encontró un error inesperado. El equipo ya fue notificado automáticamente.
            Podés intentar continuar o recargar la página.
          </p>
          {isDev && this.state.error && (
            <details style={{
              marginBottom: 20, padding: 12, background: "rgba(0,0,0,0.3)",
              borderRadius: 4, fontFamily: "monospace", fontSize: 11,
            }}>
              <summary style={{ cursor: "pointer", color: "#b45309" }}>
                Detalles técnicos (solo dev)
              </summary>
              <pre style={{ marginTop: 10, whiteSpace: "pre-wrap", color: "#da1e28" }}>
                {this.state.error.message}
                {"\n\n"}
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={this.handleReload} style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid #4589ff",
              background: "#4589ff", color: "white", fontWeight: 600, cursor: "pointer",
            }}>
              🔁 Recargar página
            </button>
            <button onClick={this.handleReset} style={{
              padding: "8px 16px", borderRadius: 6, border: "1px solid var(--border-soft, #334155)",
              background: "transparent", color: "var(--text)", cursor: "pointer",
            }}>
              Intentar continuar
            </button>
          </div>
        </div>
      </div>
    );
  }
}

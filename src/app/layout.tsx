import type { Metadata } from "next";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { PlatformProvider } from "@/context/PlatformContext";
import { ToastProvider } from "@/context/ToastContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";

export const metadata: Metadata = {
  title: "AMS Platform — Supply Chain SAP",
  description:
    "Plataforma AMS Supply Chain con Agente IA, voz, conocimiento, RAG, SAP read-only y Mesa de Soporte.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <AuthProvider>
            <PlatformProvider>
              <CommandPaletteProvider>{children}</CommandPaletteProvider>
            </PlatformProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "@/styles/globals.css";
import { AuthProvider } from "@/context/AuthContext";

// Tipografía IBM Plex — la fuente insignia de IBM (estilo IBM Consulting
// Advantage). next/font la auto-hospeda en build: sin dependencia externa
// en runtime, funciona offline en producción.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});
import { TenantProvider } from "@/context/TenantContext";
import { PlatformProvider } from "@/context/PlatformContext";
import { ToastProvider } from "@/context/ToastContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import BrandSplash from "@/components/fx/BrandSplash";
import ApiHealthBanner from "@/components/common/ApiHealthBanner";

export const metadata: Metadata = {
  title: "AMS Platform — Supply Chain SAP",
  description:
    "Plataforma AMS Supply Chain con Agente IA, voz, conocimiento, RAG, SAP read-only y Mesa de Soporte.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${plexSans.variable} ${plexMono.variable}`}>
      <body>
        <BrandSplash />
        <ApiHealthBanner />
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              <PlatformProvider>
                <CommandPaletteProvider>{children}</CommandPaletteProvider>
              </PlatformProvider>
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}

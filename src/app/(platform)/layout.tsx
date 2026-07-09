import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventEffects from "@/components/fx/EventEffects";
import AuroraBackground from "@/components/fx/AuroraBackground";
import GlobalParallax from "@/components/fx/GlobalParallax";
import Jaimito from "@/components/jarvis/Jaimito";
import TourController from "@/components/jarvis/TourController";
import DemoModeBanner from "@/components/demo/DemoModeBanner";
import SentryBoot from "@/components/fx/SentryBoot";
import ClientOnly from "@/components/common/ClientOnly";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <AuroraBackground />
      <GlobalParallax />
      <Sidebar />
      <div className="main">
        <Header />
        <DemoModeBanner />
        {/* ClientOnly a nivel de layout: TODA página autenticada se monta solo en
            cliente. Elimina de raíz cualquier mismatch de hidratación (React
            #418/#423/#425) en cualquier page, presente o futuro, sin auditar
            valor por valor. Es un tool interno tras login → el SSR no aporta
            (sin SEO). */}
        <div className="content">
          <ClientOnly
            fallback={
              <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
                <div className="spinner" />
              </div>
            }
          >
            {children}
          </ClientOnly>
        </div>
      </div>
      <EventEffects />
      <TourController />
      <Jaimito />
      <SentryBoot />
    </div>
  );
}

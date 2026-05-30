import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventEffects from "@/components/fx/EventEffects";
import AuroraBackground from "@/components/fx/AuroraBackground";
import GlobalParallax from "@/components/fx/GlobalParallax";
import Jaimito from "@/components/jarvis/Jaimito";
import TourController from "@/components/jarvis/TourController";
import DemoModeBanner from "@/components/demo/DemoModeBanner";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <AuroraBackground />
      <GlobalParallax />
      <Sidebar />
      <div className="main">
        <Header />
        <DemoModeBanner />
        <div className="content">{children}</div>
      </div>
      <EventEffects />
      <TourController />
      <Jaimito />
    </div>
  );
}

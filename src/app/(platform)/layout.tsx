import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventEffects from "@/components/fx/EventEffects";
import Jarvis from "@/components/jarvis/Jarvis";
import TourController from "@/components/jarvis/TourController";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">{children}</div>
      </div>
      <EventEffects />
      <TourController />
      <Jarvis />
    </div>
  );
}

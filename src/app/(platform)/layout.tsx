import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import EventEffects from "@/components/fx/EventEffects";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Header />
        <div className="content">{children}</div>
      </div>
      <EventEffects />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import type { AppView } from "../../types/ui";
import "../../styles/navigation.css";

type Props = {
  currentView: AppView;
  onChange: (view: AppView) => void;
};

const DESKTOP_ITEMS: { view: AppView; label: string }[] = [
  { view: "calendar", label: "달력" },
  { view: "schedules", label: "일정" },
  { view: "ai", label: "AI 일정" },
  { view: "statistics", label: "통계" },
  { view: "backup", label: "백업/복원" },
  { view: "settings", label: "설정" },
];

const MOBILE_ITEMS: { view: AppView; label: string; icon: string }[] = [
  { view: "calendar", label: "달력", icon: "▦" },
  { view: "schedules", label: "일정", icon: "☰" },
  { view: "ai", label: "AI", icon: "✦" },
];

const MORE_ITEMS: { view: AppView; label: string }[] = [
  { view: "statistics", label: "통계" },
  { view: "backup", label: "백업/복원" },
  { view: "settings", label: "설정" },
];

function AppNavigation({ currentView, onChange }: Props) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isMoreView = MORE_ITEMS.some((item) => item.view === currentView);

  useEffect(() => {
    if (!isMoreOpen) return;
    const closeOutside = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setIsMoreOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMoreOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [isMoreOpen]);

  const selectView = (view: AppView) => {
    onChange(view);
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="desktop-app-navigation" aria-label="주요 화면">
        <div className="app-navigation-inner">
          {DESKTOP_ITEMS.map((item) => (
            <button
              key={item.view}
              type="button"
              className={currentView === item.view ? "active" : ""}
              aria-current={currentView === item.view ? "page" : undefined}
              onClick={() => selectView(item.view)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <nav className="mobile-app-navigation" aria-label="모바일 주요 화면">
        {MOBILE_ITEMS.map((item) => (
          <button
            key={item.view}
            type="button"
            className={currentView === item.view ? "active" : ""}
            aria-current={currentView === item.view ? "page" : undefined}
            onClick={() => selectView(item.view)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}

        <div className="mobile-more-menu" ref={moreRef}>
          <button
            type="button"
            className={isMoreView ? "active" : ""}
            aria-haspopup="menu"
            aria-expanded={isMoreOpen}
            onClick={() => setIsMoreOpen((isOpen) => !isOpen)}
          >
            <span aria-hidden="true">•••</span>
            더보기
          </button>
          {isMoreOpen && (
            <div className="mobile-more-dropdown" role="menu">
              {MORE_ITEMS.map((item) => (
                <button
                  key={item.view}
                  type="button"
                  role="menuitem"
                  className={currentView === item.view ? "active" : ""}
                  onClick={() => selectView(item.view)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}

export default AppNavigation;

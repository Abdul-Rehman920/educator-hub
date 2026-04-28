import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Home, Calendar, MessageSquare, User, Lock, LogOut, GraduationCap, PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

import { TopBar } from "./TopBar";

const navItems = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "Calendar", icon: Calendar, path: "/dashboard/calendar" },
  { label: "Chat", icon: MessageSquare, path: "/dashboard/chat" },
  { label: "Profile", icon: User, path: "/dashboard/profile" },
  { label: "Change Password", icon: Lock, path: "/dashboard/change-password" },
];

function SidebarContent({ currentPath, onNavigate }: { currentPath: string; onNavigate: (path: string) => void }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    console.log("Logout: session cleared");
    navigate("/");
  };

  return (
    <div className="flex flex-col h-full bg-primary text-primary-foreground">
      {/* Logo — clickable, goes to home */}
      <div className="p-5 border-b border-primary-foreground/15">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 w-full hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-primary-foreground/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-black">Educator</span>
            <span className="text-primary-foreground"> Hub</span>
          </span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const active = currentPath === item.path || (item.path === "/dashboard" && currentPath === "/dashboard/");
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground/70 hover:text-primary hover:bg-primary-foreground"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-primary-foreground/15">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleNavigate = (path: string) => {
    navigate(path);
    setSheetOpen(false);
  };

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside className="w-64 border-r border-primary-dark flex-shrink-0 sticky top-0 h-screen overflow-y-auto bg-primary">
          <SidebarContent currentPath={location.pathname} onNavigate={handleNavigate} />
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        {isMobile && (
          <header className="h-14 border-b border-border bg-primary flex items-center px-4 sticky top-0 z-30">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="mr-3 text-primary-foreground hover:bg-primary-foreground/10">
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 bg-primary border-primary-dark">
                <SidebarContent currentPath={location.pathname} onNavigate={handleNavigate} />
              </SheetContent>
            </Sheet>
            {/* Mobile header logo — clickable */}
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 rounded-lg bg-primary-foreground/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-sm">
                <span className="text-black">Educator</span>
                <span className="text-primary-foreground">Hub</span>
              </span>
            </button>
          </header>
        )}

        {!isMobile && (
          <TopBar
            role="Educator"
            name={localStorage.getItem("userName") || "Educator"}
            avatar={localStorage.getItem("userAvatar") || undefined}
          />
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

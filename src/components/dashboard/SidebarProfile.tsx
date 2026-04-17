import { useState, useRef, useEffect } from "react";
import { Bell, BookOpen, MessageSquare, CalendarCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  text: string;
  time: string;
  read: boolean;
  icon: "booking" | "message" | "session";
}

const teacherNotifications: Notification[] = [
  { id: "1", text: "New booking request from Aarav Sharma", time: "2 min ago", read: false, icon: "booking" },
  { id: "2", text: "Message from Priya Nair", time: "15 min ago", read: false, icon: "message" },
  { id: "3", text: "Upcoming session with Rohan in 1 hour", time: "1 hr ago", read: false, icon: "session" },
];

const studentNotifications: Notification[] = [
  { id: "1", text: "Your booking with Dr. Smith is confirmed", time: "5 min ago", read: false, icon: "booking" },
  { id: "2", text: "New message from your tutor", time: "30 min ago", read: false, icon: "message" },
  { id: "3", text: "Session reminder: Math class at 4 PM", time: "1 hr ago", read: false, icon: "session" },
];

const notificationIcons = {
  booking: CalendarCheck,
  message: MessageSquare,
  session: BookOpen,
};

interface SidebarProfileProps {
  role: "Student" | "Educator";
  name: string;
  avatar: string;
}

export function SidebarProfile({ role, name, avatar }: SidebarProfileProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(
    role === "Educator" ? teacherNotifications : studentNotifications
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="px-4 py-5 flex flex-col items-center gap-2 border-b border-primary-foreground/15 relative">
      {/* Bell icon top-right */}
      <div className="absolute top-3 right-3" ref={panelRef}>
        <button
          onClick={() => setShowNotifications((v) => !v)}
          className="relative p-1.5 rounded-lg hover:bg-primary-foreground/10 transition-colors"
        >
          <Bell className="w-5 h-5 text-primary-foreground" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
              {unreadCount}
            </span>
          )}
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-10 w-72 bg-card text-card-foreground rounded-xl shadow-xl border border-border z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="font-semibold text-sm">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map((n) => {
                const Icon = notificationIcons[n.icon];
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                      !n.read && "bg-primary-light/40"
                    )}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">{n.text}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 border-primary-foreground/30">
        <img src={avatar} alt={name} className="w-full h-full object-cover object-center" />
      </div>

      {/* Name & role */}
      <span className="text-sm font-semibold text-primary-foreground text-center leading-tight">{name}</span>
      <Badge className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 text-[10px] px-2 py-0.5">
        {role}
      </Badge>
    </div>
  );
}

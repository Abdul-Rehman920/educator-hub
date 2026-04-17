import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, User, CalendarCheck, MessageSquare, BookOpen, Loader2, CheckCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── API Config ────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ─── Notification type icon mapping ────────────────────────────
const notificationIcons: Record<string, typeof CalendarCheck> = {
  booking: CalendarCheck,
  message: MessageSquare,
  session: BookOpen,
};

function getNotificationIcon(notification: ApiNotification) {
  // Try to detect icon from notification type or data
  const type = notification.type?.toLowerCase() || "";
  const text = (notification.data?.message || notification.data?.text || "").toLowerCase();

  if (type.includes("message") || text.includes("message")) return MessageSquare;
  if (type.includes("booking") || text.includes("booking") || text.includes("confirmed") || text.includes("request")) return CalendarCheck;
  if (type.includes("session") || text.includes("session") || text.includes("class") || text.includes("reminder")) return BookOpen;

  return Bell; // default fallback
}

function getNotificationText(notification: ApiNotification): string {
  // Laravel notifications store data in `data` field as JSON
  if (notification.data?.message) return notification.data.message;
  if (notification.data?.text) return notification.data.text;
  if (notification.data?.title) return notification.data.title;

  // Fallback: try to build from type
  const type = notification.type?.split("\\").pop() || "Notification";
  return type.replace(/([A-Z])/g, " $1").trim();
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs} hr ago`;

  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Types ─────────────────────────────────────────────────────
interface ApiNotification {
  id: string;
  type?: string;
  data?: Record<string, any>;
  read_at?: string | null;
  created_at: string;
  updated_at?: string;
}

interface TopBarProps {
  role: "Student" | "Educator";
  name?: string;
  avatar?: string;
}

export function TopBar({ role, name: propName, avatar: propAvatar }: TopBarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [markingRead, setMarkingRead] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // ─── Profile state (fetched from API) ──────────────────────
  const [profileName, setProfileName] = useState(propName || localStorage.getItem("userName") || "User");
  const [profileAvatar, setProfileAvatar] = useState(propAvatar || localStorage.getItem("userAvatar") || "");

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // ─── Fetch profile from API ────────────────────────────────
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/get/user/update-profile`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();

      const user = data.user_profile || data.data || data.user || data;
      const firstName = user.name || "";
      const lastName = user.last_name || "";
      const fullName = `${firstName} ${lastName}`.trim() || "User";

      // Build avatar URL
      let avatarUrl = user.profile?.profile_img || user.profile_img || "";
      if (avatarUrl && !avatarUrl.startsWith("http") && !avatarUrl.startsWith("data:")) {
        const baseUrl = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace("/api", "");
        avatarUrl = `${baseUrl}/${avatarUrl}`;
      }

      setProfileName(fullName);
      setProfileAvatar(avatarUrl);

      // Also update localStorage so other components can use it
      localStorage.setItem("userName", fullName);
      if (avatarUrl) localStorage.setItem("userAvatar", avatarUrl);
    } catch (err) {
      console.error("TopBar: Failed to fetch profile", err);
    }
  }, []);

  // ─── Fetch notifications from API ─────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        console.error("TopBar: Notifications API error", res.status);
        setLoadingNotifications(false);
        return;
      }
      const data = await res.json();

      // Handle different response structures:
      // Could be: { data: [...] } or { notifications: [...] } or [...] directly
      let notifList: ApiNotification[] = [];
      if (Array.isArray(data)) {
        notifList = data;
      } else if (Array.isArray(data.data)) {
        notifList = data.data;
      } else if (Array.isArray(data.notifications)) {
        notifList = data.notifications;
      }

      setNotifications(notifList);
    } catch (err) {
      console.error("TopBar: Failed to fetch notifications", err);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // ─── Mark all as read ──────────────────────────────────────
  const markAllRead = async () => {
    setMarkingRead(true);
    try {
      const res = await fetch(`${API_BASE}/notifications/mark-as-read`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });

      if (res.ok) {
        // Optimistic update — mark all as read locally
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error("TopBar: Failed to mark notifications as read", err);
    } finally {
      setMarkingRead(false);
    }
  };

  // ─── Mark single notification as read ──────────────────────
  const markOneRead = async (notifId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
      )
    );

    try {
      await fetch(`${API_BASE}/notifications/mark-as-read`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ id: notifId }),
      });
    } catch (err) {
      console.error("TopBar: Failed to mark notification as read", err);
    }
  };

  // ─── Effects ───────────────────────────────────────────────
  useEffect(() => {
    fetchProfile();
    fetchNotifications();

    // Poll notifications every 30 seconds
    const notifInterval = setInterval(fetchNotifications, 30000);
    // Refresh profile every 5 minutes
    const profileInterval = setInterval(fetchProfile, 300000);

    return () => {
      clearInterval(notifInterval);
      clearInterval(profileInterval);
    };
  }, [fetchProfile, fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Listen for profile updates from other components
  useEffect(() => {
    const handleProfileUpdate = () => {
      fetchProfile();
    };
    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [fetchProfile]);

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-end px-4 md:px-6 lg:px-8 sticky top-0 z-20">
      <div className="flex items-center gap-3">
        {/* ─── Notification Bell ─── */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-11 w-80 bg-card text-card-foreground rounded-xl shadow-xl border border-border z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    disabled={markingRead}
                    className="text-xs text-primary hover:underline disabled:opacity-50"
                  >
                    {markingRead ? "Marking..." : "Mark all read"}
                  </button>
                )}
              </div>

              {/* Notification List */}
              <div className="max-h-72 overflow-y-auto">
                {loadingNotifications ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-8">
                    <Bell className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((n) => {
                    const Icon = getNotificationIcon(n);
                    const text = getNotificationText(n);
                    const isUnread = !n.read_at;

                    return (
                      <div
                        key={n.id}
                        onClick={() => isUnread && markOneRead(n.id)}
                        className={cn(
                          "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer",
                          isUnread && "bg-primary/5"
                        )}
                      >
                        <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-snug">{text}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {getTimeAgo(n.created_at)}
                          </p>
                        </div>
                        {isUnread && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ─── Separator ─── */}
        <div className="w-px h-8 bg-border" />

        {/* ─── Profile ─── */}
        <div className="flex items-center gap-2.5">
          {profileAvatar ? (
            <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/30 flex-shrink-0">
              <img
                src={profileAvatar}
                alt={profileName}
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  // If image fails to load, hide it and show fallback
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
          )}
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground leading-tight">
              {profileName}
            </span>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 text-[10px] px-2 py-0.5 border-0">
              {role}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
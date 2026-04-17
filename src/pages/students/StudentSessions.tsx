import { useState, useEffect } from "react";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarCheck, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const tabs = ["Upcoming", "Completed", "Cancelled"] as const;

const typeMap: Record<typeof tabs[number], string> = {
  Upcoming: "upcoming",
  Completed: "complete",
  Cancelled: "cancel",
};

type Session = {
  id: string;
  bookingId: string;
  teacherName: string;
  date: string;
  time: string;
  type: string;
};

export default function StudentSessions() {
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>("Upcoming");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions(activeTab);
  }, [activeTab]);

  const fetchSessions = async (tab: typeof tabs[number]) => {
    setLoading(true);
    try {
      const response = await api.get(`/booking/sessions?type=${typeMap[tab]}`);
      const raw = response.data?.data || response.data || {};
      const allSessions: Session[] = [];

      Object.entries(raw).forEach(([date, items]: any) => {
        items.forEach((b: any) => {
          allSessions.push({
            id: String(b.id),
            bookingId: b.booking_reference || `#${b.id}`,
            teacherName: b.teacher?.name || "Teacher",
            date: b.appointment_date || date,
            time: b.appointment_time || "",
            type: b.demo_class ? "Demo" : b.group_class ? "Group" : "Private",
          });
        });
      });

      setSessions(allSessions);
    } catch (error) {
      console.error("Sessions fetch error:", error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <StudentDashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">My Sessions</h1>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading sessions...</div>
        ) : sessions.length === 0 ? (
          <Card>
            <CardContent className="p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CalendarCheck className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">No {activeTab} Sessions</h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === "Upcoming"
                  ? "You don't have any upcoming sessions. Find a tutor and book your first session!"
                  : activeTab === "Completed"
                  ? "You haven't completed any sessions yet."
                  : "No cancelled sessions."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="bg-card rounded-xl border border-border p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-sm">{session.teacherName}</p>
                    <p className="text-xs text-muted-foreground font-mono">{session.bookingId}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    <span>{formatDate(session.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{session.time}</span>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary w-fit">
                  {session.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
}

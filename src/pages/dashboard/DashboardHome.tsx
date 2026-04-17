import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";
import { CalendarIcon, Clock, User, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";

type BookingStatus = "Today" | "Pending" | "Upcoming" | "Completed" | "Rejected" | "Cancelled";

type Booking = {
  id: string;
  bookingId: string;
  studentName: string;
  date: string;
  timeSlot: string;
  sessionType: "Demo" | "Private" | "Group";
  status: BookingStatus;
};

const typeMap: Record<BookingStatus, string> = {
  Today: "today",
  Pending: "pending",
  Upcoming: "upcoming",
  Completed: "complete",
  Rejected: "reject",
  Cancelled: "cancel",
};

const tabs: BookingStatus[] = ["Today", "Pending", "Upcoming", "Completed", "Rejected", "Cancelled"];

const sessionTypeStyles: Record<string, string> = {
  Demo: "bg-accent/15 text-accent-foreground border-accent/30",
  Private: "bg-primary/15 text-primary border-primary/30",
  Group: "bg-secondary text-secondary-foreground border-secondary",
};

const statusBadgeStyles: Record<BookingStatus, string> = {
  Today: "bg-primary/15 text-primary border-primary/30",
  Pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  Upcoming: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  Completed: "bg-primary/15 text-primary border-primary/30",
  Rejected: "bg-destructive/15 text-destructive border-destructive/30",
  Cancelled: "bg-muted text-muted-foreground border-border",
};

export default function DashboardHome() {
  const [activeTab, setActiveTab] = useState<BookingStatus>("Today");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab]);

  const fetchBookings = async (tab: BookingStatus) => {
    setLoadingBookings(true);
    try {
      const response = await api.get(`/teacher/booking?type=${typeMap[tab]}`);
      const raw = response.data?.data || response.data || {};
      const allBookings: Booking[] = [];

      Object.entries(raw).forEach(([date, sessions]: any) => {
        sessions.forEach((b: any) => {
          allBookings.push({
            id: String(b.id),
            bookingId: b.booking_reference || `#${b.id}`,
            studentName: b.student?.name || "Student",
            date: b.appointment_date || date,
            timeSlot: b.appointment_time || "",
            sessionType: b.demo_class ? "Demo" : b.group_class ? "Group" : "Private",
            status: tab,
          });
        });
      });

      setBookings(allBookings);
    } catch (error) {
      console.error("Bookings error:", error);
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const filtered = bookings;

  const handleAccept = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Upcoming" as BookingStatus } : b))
    );
    toast({ title: "Booking Accepted", description: "The booking has been moved to Upcoming." });
  };

  const handleReject = (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "Rejected" as BookingStatus } : b))
    );
    toast({ title: "Booking Rejected", description: "The booking has been rejected." });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground mb-6">Manage your bookings and classes.</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const count = activeTab === tab ? bookings.length : 0;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                {count > 0 && (
                  <span
                    className={cn(
                      "text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold",
                      activeTab === tab
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-foreground/10 text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {loadingBookings ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <CalendarIcon className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Booking Found</h3>
            <p className="text-muted-foreground text-sm">
              You don't have any {activeTab.toLowerCase()} bookings yet.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((booking) => (
              <div
                key={booking.id}
                className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Header: student + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {booking.studentName.split(" ").map((n) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{booking.studentName}</p>
                      <p className="text-xs text-muted-foreground font-mono">{booking.bookingId}</p>
                    </div>
                  </div>
                  <Badge className={cn("text-[11px] flex-shrink-0 border", statusBadgeStyles[booking.status])}>
                    {booking.status}
                  </Badge>
                </div>

                {/* Details */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>{formatDate(booking.date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{booking.timeSlot}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <Badge variant="outline" className={cn("text-xs border", sessionTypeStyles[booking.sessionType])}>
                      {booking.sessionType}
                    </Badge>
                  </div>
                </div>

                {/* Actions for Pending */}
                {booking.status === "Pending" && (
                  <div className="flex gap-2 pt-1 border-t border-border">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleAccept(booking.id)}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleReject(booking.id)}
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
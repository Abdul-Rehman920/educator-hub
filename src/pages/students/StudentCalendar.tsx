import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, Eye, User, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

// ─── API Config ────────────────────────────────────────────────
const API_BASE = "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ─── Types (matching BookingCollection response) ───────────────
interface BookingTeacher {
  id: number;
  name: string;
  email?: string;
  profile_img?: string | null;
}

interface BookingSession {
  session_id: number;
  booking_reference: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  appointment_type: number;
  demo_class: number;
  reschedule_class: number;
  status: string;
  price: number;
  zoom_link: string | null;
  teacher?: BookingTeacher;
  student?: BookingTeacher;
}

// ─── API Function ──────────────────────────────────────────────
async function apiFetchBookings(month?: number): Promise<BookingSession[]> {
  const params = new URLSearchParams();
  if (month) params.append("month", month.toString());

  const res = await fetch(`${API_BASE}/booking/sessions?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch bookings");
  const data = await res.json();
  return data.data || data || [];
}

async function apiFetchBookingsByDate(date: string): Promise<BookingSession[]> {
  const params = new URLSearchParams({ date });

  const res = await fetch(`${API_BASE}/booking/sessions?${params.toString()}`, {
    method: "GET",
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error("Failed to fetch bookings for date");
  const data = await res.json();
  return data.data || data || [];
}

// ─── Status & Type Colors ──────────────────────────────────────
const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  cancelled: "bg-red-100 text-red-800 border-red-300",
  rejected: "bg-gray-100 text-gray-800 border-gray-300",
};

const getSessionTypeLabel = (booking: BookingSession): string => {
  if (booking.demo_class === 1) return "Demo";
  if (booking.appointment_type === 2) return "Group";
  return "Private";
};

const sessionTypeColors: Record<string, string> = {
  Demo: "bg-violet-100 text-violet-700",
  Private: "bg-primary/10 text-primary",
  Group: "bg-orange-100 text-orange-700",
};

// ─── Component ─────────────────────────────────────────────────
export default function StudentCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [allBookings, setAllBookings] = useState<BookingSession[]>([]);
  const [selectedDateBookings, setSelectedDateBookings] = useState<BookingSession[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingDate, setLoadingDate] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const navigate = useNavigate();

  // ─── Load bookings for the visible month ───
  const loadMonthBookings = useCallback(async (month: number) => {
    setLoadingMonth(true);
    try {
      const bookings = await apiFetchBookings(month);
      setAllBookings(bookings);
    } catch (err) {
      console.error("Error loading bookings:", err);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    const month = currentMonth.getMonth() + 1;
    loadMonthBookings(month);
  }, [currentMonth, loadMonthBookings]);

  // ─── Load bookings for selected date ───
  const loadDateBookings = useCallback(async (date: Date) => {
    setLoadingDate(true);
    try {
      const dateStr = format(date, "yyyy-MM-dd");
      const bookings = await apiFetchBookingsByDate(dateStr);
      setSelectedDateBookings(bookings);
    } catch (err) {
      console.error("Error loading date bookings:", err);
      if (selected) {
        const dateStr = format(selected, "yyyy-MM-dd");
        const filtered = allBookings.filter((b) => b.appointment_date === dateStr);
        setSelectedDateBookings(filtered);
      }
    } finally {
      setLoadingDate(false);
    }
  }, [allBookings, selected]);

  useEffect(() => {
    if (selected) {
      loadDateBookings(selected);
    } else {
      setSelectedDateBookings([]);
    }
  }, [selected, loadDateBookings]);

  // ─── Group bookings by date for calendar dots ───
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, BookingSession[]>();
    allBookings.forEach((b) => {
      const existing = map.get(b.appointment_date) || [];
      existing.push(b);
      map.set(b.appointment_date, existing);
    });
    return map;
  }, [allBookings]);

  // ─── Calendar date modifiers ───
  const dateModifiers = useMemo(() => {
    const pending: Date[] = [];
    const confirmed: Date[] = [];
    bookingsByDate.forEach((bookings, dateStr) => {
      const date = parseISO(dateStr);
      const hasPending = bookings.some((b) => b.status === "pending");
      const hasConfirmed = bookings.some((b) => b.status !== "pending");
      if (hasPending && !hasConfirmed) {
        pending.push(date);
      } else {
        confirmed.push(date);
      }
    });
    return { pending, confirmed };
  }, [bookingsByDate]);

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  const getTutorName = (booking: BookingSession): string => {
    return booking.teacher?.name || "Tutor";
  };

  return (
    <StudentDashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">My Calendar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-4 md:p-6">
            {loadingMonth && (
              <div className="flex items-center justify-center py-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                <span className="text-xs text-muted-foreground">Loading sessions...</span>
              </div>
            )}
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              month={currentMonth}
              onMonthChange={handleMonthChange}
              className="p-3 pointer-events-auto mx-auto"
              modifiers={{
                booked_confirmed: dateModifiers.confirmed,
                booked_pending: dateModifiers.pending,
              }}
              modifiersStyles={{
                booked_confirmed: { position: "relative" },
                booked_pending: { position: "relative" },
              }}
              components={{
                DayContent: ({ date }) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  const bookings = bookingsByDate.get(dateStr);
                  const hasPending = bookings?.some((b) => b.status === "pending");
                  const hasConfirmed = bookings?.some((b) => b.status !== "pending");

                  return (
                    <div className="relative flex flex-col items-center">
                      <span>{date.getDate()}</span>
                      {bookings && bookings.length > 0 && (
                        <div className="flex gap-0.5 absolute -bottom-1">
                          {hasConfirmed && (
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                          {hasPending && (
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                          )}
                        </div>
                      )}
                    </div>
                  );
                },
              }}
            />

            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Confirmed / Completed
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                Pending
              </div>
            </div>
          </div>

          {/* Day bookings panel */}
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 flex flex-col">
            <h2 className="font-semibold text-foreground mb-1">
              {selected ? format(selected, "EEEE, MMM d, yyyy") : "Select a date"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {loadingDate
                ? "Loading..."
                : `${selectedDateBookings.length} session${selectedDateBookings.length !== 1 ? "s" : ""}`}
            </p>

            {loadingDate ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedDateBookings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No sessions on this date.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3">
                  {selectedDateBookings.map((booking) => {
                    const sessionType = getSessionTypeLabel(booking);
                    return (
                      <div
                        key={booking.session_id}
                        className="border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {getTutorName(booking)}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                B-{booking.booking_reference}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 capitalize ${
                              statusColors[booking.status] || ""
                            }`}
                          >
                            {booking.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.start_time} - {booking.end_time}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${
                              sessionTypeColors[sessionType] || ""
                            }`}
                          >
                            {sessionType}
                          </Badge>
                          {booking.price > 0 && (
                            <span className="text-[11px] font-medium text-foreground">
                              ${booking.price}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() =>
                            navigate(`/student/booking/${booking.session_id}`, {
                              state: { bookingData: booking },
                            })
                          }
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </div>
    </StudentDashboardLayout>
  );
}
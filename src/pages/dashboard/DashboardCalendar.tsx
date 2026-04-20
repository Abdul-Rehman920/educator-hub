import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Clock, User, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, getMonth, getYear } from "date-fns";

const API = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

/* ─── Types ─── */
interface Booking {
  id: number;
  booking_reference: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  demo_class: number;
  appointment_type: number;
  price: number;
  zoom_link: string | null;
  student_name: string;
  student_last_name: string;
  student_id: number;
  student_avatar: string;
  student_languages: string[];
  student_subjects: string[];
  student_classes: string[];
}

/* ─── Helpers ─── */
function headers() {
  const token = localStorage.getItem("auth_token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function formatTimeTo12h(time24: string): string {
  try {
    const [h, m] = time24.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
  } catch {
    return time24;
  }
}

function getSessionType(booking: Booking): string {
  if (booking.demo_class === 1) return "Demo";
  if (booking.appointment_type === 2) return "Group";
  return "Private";
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border-blue-300",
  completed: "bg-emerald-100 text-emerald-800 border-emerald-300",
  rejected: "bg-red-100 text-red-800 border-red-300",
  cancelled: "bg-muted text-muted-foreground",
  canceled: "bg-muted text-muted-foreground",
};

const sessionTypeColors: Record<string, string> = {
  Demo: "bg-violet-100 text-violet-700",
  Private: "bg-primary/10 text-primary",
  Group: "bg-orange-100 text-orange-700",
};

function mapApiBooking(raw: any): Booking {
  const student = raw.student || {};
  const profile = student.profile || {};
  return {
    id: raw.session_id || raw.id,
    booking_reference: raw.booking_reference || 0,
    date: raw.appointment_date || raw.date || "",
    start_time: raw.start_time || "",
    end_time: raw.end_time || "",
    status: raw.status || "pending",
    demo_class: raw.demo_class || 0,
    appointment_type: raw.appointment_type || 1,
    price: raw.price || 0,
    zoom_link: raw.zoom_link || null,
    student_name: student.name || "Student",
    student_last_name: student.last_name || "",
    student_id: student.id || 0,
    student_avatar: profile.profile_img || "",
    student_languages: (student.languages || []).map((l: any) => l.name),
    student_subjects: (student.subjects || []).map((s: any) => s.name),
    student_classes: (student.classes || []).map((c: any) => c.name),
  };
}

/* ─── API: Fetch ALL bookings for a month (single call) ─── */
async function apiFetchBookingsForMonth(month: number): Promise<Booking[]> {
  try {
    const res = await fetch(`${API}/booking/sessions?month=${month}`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : json?.data || [];
    return list.map(mapApiBooking);
  } catch {
    return [];
  }
}

/* ─── API: Fetch bookings for a specific date ─── */
async function apiFetchBookingsForDate(date: string): Promise<Booking[]> {
  try {
    const res = await fetch(`${API}/booking/sessions?date=${date}`, {
      headers: headers(),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : json?.data || [];
    return list.map(mapApiBooking);
  } catch {
    return [];
  }
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function DashboardCalendar() {
  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  // All bookings for the current month (from single API call)
  const [monthBookings, setMonthBookings] = useState<Booking[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(false);

  // Selected day bookings
  const [selectedBookings, setSelectedBookings] = useState<Booking[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);

  const dayFetchIdRef = useRef(0);
  const navigate = useNavigate();

  /* ── Load entire month with ONE API call ── */
  const loadMonth = useCallback(async (month: Date) => {
    setLoadingMonth(true);
    const monthNum = getMonth(month) + 1; // JS months are 0-based
    const bookings = await apiFetchBookingsForMonth(monthNum);
    setMonthBookings(bookings);
    setLoadingMonth(false);
  }, []);

  useEffect(() => {
    loadMonth(currentMonth);
  }, [currentMonth, loadMonth]);

  /* ── Group month bookings by date for dots ── */
  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    monthBookings.forEach((b) => {
      const existing = map.get(b.date) || [];
      existing.push(b);
      map.set(b.date, existing);
    });
    return map;
  }, [monthBookings]);

  /* ── Calendar dot modifiers ── */
  const dateModifiers = useMemo(() => {
    const pending: Date[] = [];
    const confirmed: Date[] = [];

    bookingsByDate.forEach((bookings, dateStr) => {
      const date = parseISO(dateStr);
      const hasPending = bookings.some(
        (b) => b.status.toLowerCase() === "pending"
      );
      const hasConfirmed = bookings.some((b) =>
        ["confirmed", "completed", "upcoming"].includes(b.status.toLowerCase())
      );
      if (hasConfirmed) {
        confirmed.push(date);
      } else if (hasPending) {
        pending.push(date);
      }
    });

    return { pending, confirmed };
  }, [bookingsByDate]);

  /* ── Load selected day bookings ── */
  const loadDayBookings = useCallback(
    async (date: Date) => {
      const fetchId = ++dayFetchIdRef.current;
      const dateStr = format(date, "yyyy-MM-dd");

      // First, instantly show from month cache
      const cached = bookingsByDate.get(dateStr) || [];
      setSelectedBookings(cached);

      // Then fetch fresh data for this date
      setLoadingDay(true);
      try {
        const bookings = await apiFetchBookingsForDate(dateStr);
        if (fetchId === dayFetchIdRef.current) {
          setSelectedBookings(bookings);
        }
      } catch {
        // keep cached data
      } finally {
        if (fetchId === dayFetchIdRef.current) {
          setLoadingDay(false);
        }
      }
    },
    [bookingsByDate]
  );

  // Load today's bookings on mount
  useEffect(() => {
    if (selected) {
      const dateStr = format(selected, "yyyy-MM-dd");
      const cached = bookingsByDate.get(dateStr) || [];
      setSelectedBookings(cached);
    }
  }, [bookingsByDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDateSelect = (date: Date | undefined) => {
    setSelected(date);
    if (date) {
      loadDayBookings(date);
    } else {
      setSelectedBookings([]);
    }
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">Calendar</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-4 md:p-6 relative">
            {loadingMonth && (
              <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading...</span>
              </div>
            )}
            <Calendar
              mode="single"
              selected={selected}
              onSelect={handleDateSelect}
              onMonthChange={setCurrentMonth}
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
                  const hasPending = bookings?.some(
                    (b) => b.status.toLowerCase() === "pending"
                  );
                  const hasConfirmed = bookings?.some((b) =>
                    ["confirmed", "completed", "upcoming"].includes(
                      b.status.toLowerCase()
                    )
                  );

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

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Confirmed
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
              {selected
                ? format(selected, "EEEE, MMM d, yyyy")
                : "Select a date"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              {loadingDay
                ? "Loading..."
                : `${selectedBookings.length} booking${selectedBookings.length !== 1 ? "s" : ""}`}
            </p>

            {loadingDay && selectedBookings.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedBookings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">
                  No bookings for this date.
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="space-y-3">
                  {selectedBookings.map((booking) => {
                    const displayStatus =
                      booking.status.charAt(0).toUpperCase() +
                      booking.status.slice(1);
                    const sessionType = getSessionType(booking);
                    const timeDisplay = `${formatTimeTo12h(booking.start_time)} - ${formatTimeTo12h(booking.end_time)}`;
                    const fullName = [
                      booking.student_name,
                      booking.student_last_name,
                    ]
                      .filter(Boolean)
                      .join(" ");

                    return (
                      <div
                        key={`booking-${booking.id}-${booking.booking_reference}`}
                        className="border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {booking.student_avatar ? (
                              <img
                                src={booking.student_avatar}
                                alt={fullName}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  const img = e.target as HTMLImageElement;
                                  img.style.display = "none";
                                  const fallback =
                                    img.nextElementSibling as HTMLElement;
                                  if (fallback)
                                    fallback.classList.remove("hidden");
                                }}
                              />
                            ) : null}
                            <div
                              className={`w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center ${booking.student_avatar ? "hidden" : ""}`}
                            >
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground leading-tight">
                                {fullName}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                B-{booking.booking_reference}
                              </p>
                            </div>
                          </div>
                          <Badge
                            className={`text-[10px] px-1.5 py-0 ${statusColors[booking.status] || ""}`}
                          >
                            {displayStatus}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeDisplay}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-1.5 py-0 ${sessionTypeColors[sessionType] || ""}`}
                          >
                            {sessionType}
                          </Badge>
                          {booking.student_subjects.length > 0 && (
                            <span className="text-xs">
                              {booking.student_subjects[0]}
                            </span>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-xs border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() =>
                            navigate(`/dashboard/booking/${booking.id}`, {
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
    </DashboardLayout>
  );
}

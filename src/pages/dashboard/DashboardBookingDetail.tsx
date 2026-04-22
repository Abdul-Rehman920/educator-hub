import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  User,
  Globe,
  BookOpen,
  GraduationCap,
  CalendarIcon,
  Clock,
  Timer,
  Tag,
  Star,
  Loader2,
  CheckCircle2,
  XCircle,
  DollarSign,
  MessageSquare,
  Send,
  Video,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://educator-hub.com/api";

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

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function calculateDuration(start: string, end: string): string {
  try {
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const totalMins = eh * 60 + em - (sh * 60 + sm);
    if (totalMins <= 0) return "1 hour";
    if (totalMins < 60) return `${totalMins} minutes`;
    const hrs = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    if (mins === 0) return `${hrs} hour${hrs > 1 ? "s" : ""}`;
    return `${hrs}h ${mins}m`;
  } catch {
    return "1 hour";
  }
}

function getSessionType(demoClass: number, appointmentType: number): string {
  if (demoClass === 1) return "Demo";
  if (appointmentType === 2) return "Group";
  return "Private";
}

function isClassTimeActive(appointmentDate: string, startTime: string, endTime: string): boolean {
  try {
    const now = new Date();
    const classStart = new Date(`${appointmentDate}T${startTime}`);
    const classEnd = new Date(`${appointmentDate}T${endTime}`);
    return now >= classStart && now <= classEnd;
  } catch {
    return false;
  }
}

function isClassTimeOver(appointmentDate: string, endTime: string): boolean {
  try {
    const now = new Date();
    const classEnd = new Date(`${appointmentDate}T${endTime}`);
    return now > classEnd;
  } catch {
    return false;
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border border-yellow-300",
  confirmed: "bg-blue-100 text-blue-800 border border-blue-300",
  completed: "bg-emerald-100 text-emerald-800 border border-emerald-300",
  rejected: "bg-red-100 text-red-800 border border-red-300",
  cancelled: "bg-muted text-muted-foreground",
  canceled: "bg-muted text-muted-foreground",
};

const sessionTypeColors: Record<string, string> = {
  Demo: "bg-violet-100 text-violet-700",
  Private: "bg-primary/10 text-primary",
  Group: "bg-orange-100 text-orange-700",
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground break-words">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/* ─── Star Rating Component ─── */
function StarRating({
  rating,
  onRate,
  size = "lg",
  interactive = true,
}: {
  rating: number;
  onRate?: (r: number) => void;
  size?: "sm" | "lg";
  interactive?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const starSize = size === "lg" ? "w-8 h-8" : "w-4 h-4";

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
        >
          <Star
            className={`${starSize} ${
              star <= (hovered || rating)
                ? "text-yellow-400 fill-yellow-400"
                : "text-gray-300"
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Component
   ═══════════════════════════════════════════ */
export default function DashboardBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState<string>("");

  // Payment status
  const [paymentPaid, setPaymentPaid] = useState(false);

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Join session modal
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Time check tick (every 30 seconds)
  const [timeCheckTick, setTimeCheckTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTimeCheckTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── Get current teacher id ── */
  const getTeacherId = (): number | null => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      return u.id || null;
    } catch {
      return null;
    }
  };

  /* ── Fetch booking detail ── */
  useEffect(() => {
    async function loadBooking() {
      setLoading(true);

      // 1) Check if booking data was passed via navigate state (from Calendar)
      const stateData = (location.state as any)?.bookingData;
      if (stateData) {
        const rawBooking = {
          session_id: stateData.id,
          booking_reference: stateData.booking_reference,
          appointment_date: stateData.date,
          start_time: stateData.start_time,
          end_time: stateData.end_time,
          status: stateData.status,
          demo_class: stateData.demo_class,
          appointment_type: stateData.appointment_type,
          price: stateData.price,
          zoom_link: stateData.zoom_link,
          student: {
            id: stateData.student_id,
            name: stateData.student_name,
            last_name: stateData.student_last_name,
            profile: { profile_img: stateData.student_avatar },
            languages: (stateData.student_languages || []).map((n: string, i: number) => ({ id: i, name: n })),
            subjects: (stateData.student_subjects || []).map((n: string, i: number) => ({ id: i, name: n })),
            classes: (stateData.student_classes || []).map((n: string, i: number) => ({ id: i, name: n })),
          },
        };
        setBooking(rawBooking);
        setLocalStatus(rawBooking.status || "pending");

        // Fetch payment status & existing review
        fetchPaymentStatus(rawBooking.booking_reference);
        fetchExistingReview(rawBooking.booking_reference, rawBooking.student?.id, rawBooking.appointment_date);

        setLoading(false);
        return;
      }

      // 2) If no state, try GET booking/detail with required fields
      try {
        const teacherId = getTeacherId();
        if (teacherId) {
          const res = await fetch(
            `${API}/booking/detail?teacher_id=${teacherId}&student_id=0&booking_reference=${id}`,
            { headers: headers() }
          );
          if (res.ok) {
            const json = await res.json();

            // Try to extract booking from response
            let bookingData: any = null;

            if (json?.booking_details && Array.isArray(json.booking_details) && json.booking_details.length > 0) {
              // Full detail response — merge student info from json.teacher or json.student
              const session = json.booking_details.find((b: any) => String(b.session_id) === String(id)) || json.booking_details[0];
              bookingData = {
                ...session,
                student: json.student || {},
              };
            } else {
              const data = Array.isArray(json?.data) ? json.data[0] : json?.data || json;
              if (data?.session_id || data?.booking_reference) {
                bookingData = data;
              }
            }

            if (bookingData) {
              setBooking(bookingData);
              setLocalStatus(bookingData.status || "pending");
              fetchPaymentStatus(bookingData.booking_reference);
              fetchExistingReview(bookingData.booking_reference, bookingData.student?.id);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      // 3) Fallback: search sessions by date range
      try {
        const teacherId = getTeacherId();
        if (teacherId) {
          const today = new Date();
          for (let i = -90; i <= 90; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split("T")[0];

            const res = await fetch(`${API}/booking/sessions?date=${dateStr}`, { headers: headers() });
            if (res.status === 429) { await new Promise((r) => setTimeout(r, 2000)); continue; }
            if (!res.ok) continue;

            const json = await res.json();
            const sessions = Array.isArray(json) ? json : json?.data || [];
            const found = sessions.find((s: any) => String(s.session_id) === String(id));

            if (found) {
              setBooking(found);
              setLocalStatus(found.status || "pending");
              fetchPaymentStatus(found.booking_reference);
              fetchExistingReview(found.booking_reference, found.student?.id);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      setLoading(false);
    }

    /* ── Check if student has paid ── */
    async function fetchPaymentStatus(bookingRef: string | number) {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://educator-hub.com/api";
      console.log("[fetchPaymentStatus] Checking payment for booking:", bookingRef);

      try {
        const res = await fetch(
          `${BASE_URL}/booking/get/plans?booking_reference=${bookingRef}`,
          { headers: headers() }
        );
        console.log("[fetchPaymentStatus] Plans response status:", res.status);

        if (res.ok) {
          const json = await res.json();
          console.log("[fetchPaymentStatus] Plans raw JSON:", json);

          const planList = Array.isArray(json)
            ? json
            : (json?.data?.plans || json?.data || json?.plans || []);
          console.log("[fetchPaymentStatus] Plan list:", planList);

          if (planList.length > 0) {
            const allPaid = planList.every((p: any) =>
              p.paid_at ||
              p.is_paid === "YES" ||
              p.is_paid === "yes" ||
              p.is_paid === true ||
              p.is_paid === 1 ||
              p.status === "paid"
            );
            console.log("[fetchPaymentStatus] All paid?", allPaid);

            if (allPaid) {
              setPaymentPaid(true);
              console.log("[fetchPaymentStatus] Payment status set to PAID");
              return;
            }
          }
        }
      } catch (err) {
        console.error("[fetchPaymentStatus] Plans endpoint error:", err);
      }

      console.log("[fetchPaymentStatus] Payment not confirmed");
    }
    
    /* ── Fetch existing review by tutor ── */
    async function fetchExistingReview(bookingRef: string | number, studentId?: number, appointmentDate?: string) {
      const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://educator-hub.com/api";
      const userId = getTeacherId();
      console.log("[fetchExistingReview] Start - bookingRef:", bookingRef, "studentId:", studentId, "userId:", userId);

      if (!userId || !bookingRef) return;

      let sid = studentId || 0;

      // If no student_id, try to find it from sessions endpoint
      if (!sid) {
        // Try with appointment_date first (most accurate)
        if (appointmentDate) {
          try {
            const sRes = await fetch(`${BASE_URL}/booking/sessions?date=${appointmentDate}`, { headers: headers() });
            if (sRes.ok) {
              const sJson = await sRes.json();
              const all = Array.isArray(sJson) ? sJson : sJson?.data || [];
              const match = all.find((s: any) => String(s.booking_reference) === String(bookingRef));
              if (match?.student?.id) sid = match.student.id;
            }
          } catch {}
        }
        // Fallback: try by month
        if (!sid) {
          try {
            const sRes = await fetch(`${BASE_URL}/booking/sessions?month=${new Date().getMonth() + 1}`, { headers: headers() });
            if (sRes.ok) {
              const sJson = await sRes.json();
              const all = Array.isArray(sJson) ? sJson : sJson?.data || [];
              const match = all.find((s: any) => String(s.booking_reference) === String(bookingRef));
              if (match?.student?.id) sid = match.student.id;
            }
          } catch {}
        }
      }

      console.log("[fetchExistingReview] Final student_id:", sid);
      if (!sid) {
        console.log("[fetchExistingReview] No student_id found, exiting");
        return;
      }

      // Call booking/detail with valid student_id
      try {
        const url = `${BASE_URL}/booking/detail?booking_reference=${bookingRef}&teacher_id=${userId}&student_id=${sid}`;
        console.log("[fetchExistingReview] Fetching:", url);

        const res = await fetch(url, { headers: headers() });
        console.log("[fetchExistingReview] Status:", res.status);

        if (res.ok) {
          const json = await res.json();
          console.log("[fetchExistingReview] Response JSON:", json);

          const allReviews: any[] = [];
          if (Array.isArray(json?.reviews)) allReviews.push(...json.reviews);
          if (Array.isArray(json?.teacher?.reviews)) allReviews.push(...json.teacher.reviews);
          if (Array.isArray(json?.student?.reviews)) allReviews.push(...json.student.reviews);
          if (Array.isArray(json?.booking_reviews)) allReviews.push(...json.booking_reviews);
          if (Array.isArray(json?.data?.reviews)) allReviews.push(...json.data.reviews);

          console.log("[fetchExistingReview] All reviews:", allReviews);

          const myReview = allReviews.find(
            (r: any) =>
              String(r.reviewed_by?.id || r.user_id || r.reviewer_id) === String(userId) &&
              String(r.booking_reference) === String(bookingRef)
          );

          console.log("[fetchExistingReview] My review:", myReview);

          if (myReview) {
            setExistingReview({
              rate: myReview.rate || myReview.rating || 0,
              comment: myReview.comment || myReview.review || "",
            });
            setReviewSubmitted(true);
          }
        }
      } catch (err) {
        console.error("[fetchExistingReview] Error:", err);
      }
    }
    if (id) loadBooking();
  }, [id, location.state]);

  /* ── Confirm / Reject actions ── */
const handleAction = async (action: "confirm" | "reject") => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://educator-hub.com/api";
    
    console.log("[handleAction] Called with action:", action);
    console.log("[handleAction] Booking:", booking);
    console.log("[handleAction] BASE_URL:", BASE_URL);

    if (!booking) {
      toast({ title: "Error", description: "Booking data not loaded.", variant: "destructive" });
      return;
    }

    if (!booking.booking_reference) {
      toast({ title: "Error", description: "Booking reference missing.", variant: "destructive" });
      return;
    }

    setActionLoading(true);

    const statusCode = action === "confirm" ? 2 : 3;
    const bookingRef = booking.booking_reference;
    const url = `${BASE_URL}/booking/change/status?booking_reference=${bookingRef}&status=${statusCode}`;
    console.log("[handleAction] Fetching:", url);

    try {
      const res = await fetch(url, { headers: headers() });
      console.log("[handleAction] Status:", res.status);

      const text = await res.text();
      console.log("[handleAction] Response text:", text);

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      const isSuccess = res.ok && !data?.errors && data?.success !== false;

      if (isSuccess) {
        const newStatus = action === "confirm" ? "confirmed" : "rejected";
        setLocalStatus(newStatus);
        setBooking((prev: any) => prev ? { ...prev, status: newStatus } : prev);
        toast({
          title: action === "confirm" ? "Booking Confirmed" : "Booking Rejected",
          description:
            action === "confirm"
              ? `Session with ${booking.student?.name || "student"} has been confirmed.`
              : `Session with ${booking.student?.name || "student"} has been rejected.`,
          variant: action === "confirm" ? "default" : "destructive",
        });
      } else {
        const errorMsg = data?.errors
          ? Object.values(data.errors).flat().join(", ")
          : data?.message || `Could not ${action} booking (HTTP ${res.status}).`;
        console.error("[handleAction] API error:", errorMsg);
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      }
    } catch (err: any) {
      console.error("[handleAction] Exception:", err);
      toast({
        title: "Error",
        description: `Network error: ${err?.message || "Could not reach server"}.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  /* ── Cancel Class ── */
  const handleCancelClass = async () => {
    if (!booking) return;
    const confirmed = window.confirm("Are you sure you want to cancel this class? The student will be notified.");
    if (!confirmed) return;

    setCancelLoading(true);
    try {
      const sessionId = booking.session_id || booking.id;
      const res = await fetch(`${API}/booking/cancel/classes?ids[]=${sessionId}`, { headers: headers() });
      const data = await res.json();

      if (res.ok) {
        setLocalStatus("cancelled");
        toast({ title: "Class Cancelled", description: "The class has been cancelled. The student has been notified." });
      } else {
        toast({ title: "Error", description: data?.message || "Failed to cancel class.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel class. Please try again.", variant: "destructive" });
    } finally {
      setCancelLoading(false);
    }
  };

  /* ── Submit Review ── */
  const handleSubmitReview = async () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://educator-hub.com/api";
    console.log("[handleSubmitReview] Called");

    if (!booking) {
      console.error("[handleSubmitReview] No booking");
      return;
    }
    if (reviewRating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating before submitting.", variant: "destructive" });
      return;
    }

    setSubmittingReview(true);
    const url = `${BASE_URL}/booking/review/store`;
    console.log("[handleSubmitReview] URL:", url);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          booking_reference: booking.booking_reference,
          rate: reviewRating,
          comment: reviewComment || undefined,
        }),
      });
      console.log("[handleSubmitReview] Status:", res.status);

      const text = await res.text();
      console.log("[handleSubmitReview] Response text:", text);

      let data: any = null;
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }

      // Success: HTTP 2xx AND no errors field
      const isSuccess = res.ok && !data?.errors;

      if (isSuccess) {
        toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
        setReviewSubmitted(true);
        setExistingReview({ rate: reviewRating, comment: reviewComment });
        setLocalStatus("completed");
        console.log("[handleSubmitReview] Success");
      } else {
        const errMsg = data?.errors
          ? Object.values(data.errors).flat().join(", ")
          : data?.message || `Failed to submit review (HTTP ${res.status}).`;
        console.error("[handleSubmitReview] Error:", errMsg);
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      }
    } catch (err: any) {
      console.error("[handleSubmitReview] Exception:", err);
      toast({ title: "Error", description: `Network error: ${err?.message || "Could not submit review"}.`, variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  /* ── Not Found ── */
  if (!booking) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground mb-4">Booking not found.</p>
          <Button variant="outline" onClick={() => navigate("/dashboard/calendar")}>
            <ArrowLeft className="w-4 h-4 mr-2" />Back to Calendar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Derived data ── */
  const student = booking.student || {};
  const profile = student.profile || {};
  const fullName = [student.name, student.last_name].filter(Boolean).join(" ") || "Student";
  const studentAvatar = profile.profile_img || student.profile_img || "";
  const languages = (student.languages || []).map((l: any) => l.name).join(", ") || "—";
  const subjects = (student.subjects || []).map((s: any) => s.name).join(", ") || "—";
  const classes = (student.classes || []).map((c: any) => c.name).join(", ") || "—";

  const sessionType = getSessionType(booking.demo_class || 0, booking.appointment_type || 1);
  const timeSlot = `${formatTimeTo12h(booking.start_time)} - ${formatTimeTo12h(booking.end_time)}`;
  const duration = calculateDuration(booking.start_time, booking.end_time);
  const bookingStatus = localStatus || booking.status || "pending";
  const displayStatus = bookingStatus.charAt(0).toUpperCase() + bookingStatus.slice(1);

  const isDemo = booking.demo_class === 1;
  const isPending = bookingStatus === "pending";
  const isConfirmed = bookingStatus === "confirmed";
  const isCancelled = bookingStatus === "cancelled" || bookingStatus === "canceled";
  const isRejected = bookingStatus === "rejected";
  const isCompleted = bookingStatus === "completed";

  // Time-based checks
  const classTimeActive = isClassTimeActive(booking.appointment_date, booking.start_time, booking.end_time);
  const classTimeOver = isClassTimeOver(booking.appointment_date, booking.end_time);

  // Effective completed: status completed OR (confirmed + paid + class time over)
  const effectiveCompleted = isCompleted || (isConfirmed && (paymentPaid || isDemo) && classTimeOver);
  const effectiveStatus = effectiveCompleted ? "completed" : bookingStatus;
  const effectiveDisplayStatus = effectiveCompleted ? "Completed" : displayStatus;

  // Stars under student name: show review stars if submitted, else 0/grey
  const displayStars = existingReview?.rate || (reviewSubmitted ? reviewRating : 0);

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back + Booking ID */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/calendar")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">B-{booking.booking_reference}</h1>
            <p className="text-xs text-muted-foreground">Booking Details</p>
          </div>
          <Badge className={`ml-auto text-xs px-2.5 py-0.5 ${statusColors[effectiveStatus] || ""}`}>{effectiveDisplayStatus}</Badge>
        </div>

        <div className="space-y-6">
          {/* Student Information */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Student Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {studentAvatar ? (
                  <img src={studentAvatar} alt={fullName} className="w-16 h-16 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{fullName}</h3>

                  {/* ★ Stars under student name */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= displayStars
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-300"
                        } transition-colors`}
                      />
                    ))}
                    {displayStars > 0 && (
                      <span className="text-xs font-medium text-muted-foreground ml-1">
                        {Number(displayStars).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    {languages !== "—" && (
                      <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary" />{languages}</div>
                    )}
                    {subjects !== "—" && (
                      <div className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary" />{subjects}</div>
                    )}
                    {classes !== "—" && (
                      <div className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-primary" />{classes}</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Session Details */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Session Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={CalendarIcon} label="Date" value={formatDate(booking.appointment_date)} />
                <InfoRow icon={Clock} label="Time Slot" value={timeSlot} />
                <InfoRow icon={Timer} label="Duration" value={duration} />
                <div className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Tag className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Session Type</p>
                    <Badge className={`text-xs mt-0.5 ${sessionTypeColors[sessionType] || ""}`}>{sessionType}</Badge>
                  </div>
                </div>
                <InfoRow
                  icon={DollarSign}
                  label="Fee Amount"
                  value={booking.price === 0 ? "Free (Demo)" : `USD ${booking.price}`}
                />
                {/* Payment Status */}
                <div className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment Status</p>
                    <Badge className={`text-xs mt-0.5 ${isDemo ? "bg-violet-100 text-violet-700" : paymentPaid ? "bg-emerald-100 text-emerald-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {isDemo ? "Free Demo" : paymentPaid ? "Paid" : "Unpaid"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status + Actions */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`text-sm px-3 py-1 ${statusColors[effectiveStatus] || ""}`}>{effectiveDisplayStatus}</Badge>

              {/* ── PENDING: Confirm & Reject ── */}
              {isPending && !effectiveCompleted && (
                <>
                  <p className="mt-3 text-sm text-muted-foreground">This booking is awaiting your confirmation.</p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                      onClick={() => handleAction("confirm")}
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      size="lg"
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      Confirm Booking
                    </Button>
                    <Button
                      onClick={() => handleAction("reject")}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                      disabled={actionLoading}
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Reject
                    </Button>
                  </div>
                </>
              )}

              {/* ── CONFIRMED + Student NOT paid yet + NOT demo ── */}
              {isConfirmed && !paymentPaid && !isDemo && !effectiveCompleted && (
                <>
                  <div className="mt-3 flex items-center gap-2 text-sm text-yellow-600">
                    <Clock className="w-4 h-4" />
                    <span className="font-medium">Booking confirmed. Waiting for student to make payment.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button onClick={handleCancelClass} variant="destructive" className="flex-1" size="lg" disabled={cancelLoading}>
                      {cancelLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Cancel Class
                    </Button>
                  </div>
                </>
              )}

              {/* ── CONFIRMED + Paid (or Demo) + class NOT over → Join Session + Cancel ── */}
              {isConfirmed && (paymentPaid || isDemo) && !effectiveCompleted && (
                <>
                  <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-medium">
                      {isDemo ? "Demo session confirmed. Ready to join!" : "Payment received. Session is ready!"}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button onClick={() => setShowJoinModal(true)} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" size="lg">
                      <Video className="w-4 h-4 mr-2" />Join Session
                    </Button>
                    <Button onClick={handleCancelClass} variant="destructive" className="flex-1" size="lg" disabled={cancelLoading}>
                      {cancelLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
                      Cancel Class
                    </Button>
                  </div>
                </>
              )}

              {/* ── COMPLETED ── */}
              {effectiveCompleted && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">This session has been completed.</span>
                </div>
              )}

              {/* ── REJECTED ── */}
              {isRejected && (
                <p className="mt-3 text-sm text-muted-foreground">This booking was rejected.</p>
              )}

              {/* ── CANCELLED ── */}
              {isCancelled && (
                <p className="mt-3 text-sm text-muted-foreground">This class has been cancelled.</p>
              )}
            </CardContent>
          </Card>

          {/* ━━━ REVIEW SECTION — only when completed ━━━ */}
          {effectiveCompleted && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Review Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reviewSubmitted || existingReview ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <StarRating rating={existingReview?.rate || reviewRating} interactive={false} size="lg" />
                      <span className="text-sm font-medium text-foreground">{existingReview?.rate || reviewRating}/5</span>
                    </div>
                    {(existingReview?.comment || reviewComment) && (
                      <div className="bg-muted/50 rounded-xl p-4">
                        <p className="text-sm text-foreground leading-relaxed">"{existingReview?.comment || reviewComment}"</p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="font-medium">Your review has been submitted. Thank you!</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">How was your experience with {fullName}?</p>
                      <StarRating rating={reviewRating} onRate={setReviewRating} size="lg" interactive={true} />
                      {reviewRating > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {reviewRating === 1 && "Poor"}
                          {reviewRating === 2 && "Fair"}
                          {reviewRating === 3 && "Good"}
                          {reviewRating === 4 && "Very Good"}
                          {reviewRating === 5 && "Excellent"}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 block">Write a review (optional)</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Share your experience with this student..."
                        rows={3}
                        className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      />
                    </div>
                    <Button onClick={handleSubmitReview} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={submittingReview || reviewRating === 0}>
                      {submittingReview ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      {submittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* ═══ Join Session Modal ═══ */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-600" />
                  Join Session
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setShowJoinModal(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <Video className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-foreground">
                      Arrange your class with <span className="text-primary font-semibold">{fullName}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Scheduled at <span className="font-medium text-foreground">{timeSlot}</span> on <span className="font-medium text-foreground">{formatDate(booking.appointment_date)}</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-border">
                <Button variant="outline" onClick={() => setShowJoinModal(false)} className="w-full">Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

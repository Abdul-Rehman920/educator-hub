import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  CreditCard,
  X,
  CheckCircle2,
  XCircle,
  DollarSign,
  MessageSquare,
  Send,
  Video,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = "http://127.0.0.1:8000/api";

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

function formatDateShort(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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

function getBookingFeePercent(): number {
  return 8;
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
export default function StudentBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [booking, setBooking] = useState<any>(null);
  const [tutorProfile, setTutorProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [localStatus, setLocalStatus] = useState("");

  const [totalSessions, setTotalSessions] = useState(1);
  const [totalAmount, setTotalAmount] = useState(0);

  const [showPayment, setShowPayment] = useState(false);
  const [paymentType, setPaymentType] = useState<1 | 2 | 3>(3);
  const [paymentPlans, setPaymentPlans] = useState<any[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansCreated, setPlansCreated] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [paying, setPaying] = useState(false);

  const [cancelling, setCancelling] = useState(false);
  const [stripeKey, setStripeKey] = useState("");

  // Review state
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [existingReview, setExistingReview] = useState<any>(null);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // Join session modal state
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Time-based auto-status check
  const [timeCheckTick, setTimeCheckTick] = useState(0);

  const allPlansPaid =
    plansCreated &&
    paymentPlans.length > 0 &&
    paymentPlans.every((p: any) => p.paid_at || p.is_paid === "YES");

  /* ── Periodic time check — every 30 seconds ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeCheckTick((t) => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ── Load Stripe key ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/stripe/keys`, { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          setStripeKey(data?.data?.publishable_key || data?.publishable_key || data?.key || "");
        }
      } catch {}
    })();
  }, []);

  /* ── Load booking data ── */
  useEffect(() => {
    async function loadBooking() {
      setLoading(true);

      const stateData = (location.state as any)?.bookingData;
      if (stateData) {
        setBooking(stateData);
        setLocalStatus(stateData.status || "pending");

        if (stateData.teacher?.id) fetchTutorProfile(stateData.teacher.id);
        fetchBookingSummary(stateData.booking_reference);
        fetchExistingPlans(stateData.booking_reference);
        fetchExistingReview(stateData.booking_reference, stateData.teacher?.id);

        setLoading(false);
        return;
      }

      try {
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
            if (found.teacher?.id) fetchTutorProfile(found.teacher.id);
            fetchBookingSummary(found.booking_reference);
            fetchExistingPlans(found.booking_reference);
            fetchExistingReview(found.booking_reference, found.teacher?.id);
            setLoading(false);
            return;
          }
        }
      } catch {}

      setLoading(false);
    }

    async function fetchTutorProfile(tutorId: number) {
      try {
        const res = await fetch(`${API}/teacher/?id=${tutorId}`, { headers: headers() });
        if (res.ok) {
          const data = await res.json();
          setTutorProfile(data?.data || data);
        }
      } catch {}
    }

    async function fetchBookingSummary(bookingRef: string | number) {
      try {
        const res = await fetch(`${API}/booking/sessions?month=${new Date().getMonth() + 1}`, { headers: headers() });
        if (res.ok) {
          const json = await res.json();
          const all = Array.isArray(json) ? json : json?.data || [];
          const sameBR = all.filter((b: any) => String(b.booking_reference) === String(bookingRef));
          if (sameBR.length > 0) {
            setTotalSessions(sameBR.length);
            setTotalAmount(sameBR.reduce((sum: number, b: any) => sum + (b.price || 0), 0));
          }
        }
      } catch {}
    }

    async function fetchExistingPlans(bookingRef: string | number) {
      try {
        const res = await fetch(`${API}/booking/get/plans?booking_reference=${bookingRef}`, { headers: headers() });
        if (res.ok) {
          const json = await res.json();
          const planList = Array.isArray(json) ? json : (json?.data?.plans || json?.data || json?.plans || []);
          if (planList.length > 0) {
            setPaymentPlans(planList);
            setPlansCreated(true);
          }
        }
      } catch {}
    }

    /* ── FIXED: Fetch existing review from booking/detail GET endpoint ── */
    async function fetchExistingReview(bookingRef: string | number, teacherId?: number) {
      const userId = JSON.parse(localStorage.getItem("user") || "{}").id;
      if (!userId || !teacherId) return;

      try {
        // GET /booking/detail requires: booking_reference, teacher_id, student_id
        const res = await fetch(
          `${API}/booking/detail?booking_reference=${bookingRef}&teacher_id=${teacherId}&student_id=${userId}`,
          { headers: headers() }
        );
        if (!res.ok) return;

        const json = await res.json();

        // API returns reviews in TWO places: json.reviews[] and json.teacher.reviews[]
        // Each review has: { reviewed_by: { id: ... }, rate: 4, comment: "...", booking_reference: 80250 }
        const allReviews: any[] = [];

        // Collect from json.reviews (top-level)
        if (Array.isArray(json?.reviews)) {
          allReviews.push(...json.reviews);
        }
        // Collect from json.teacher.reviews
        if (Array.isArray(json?.teacher?.reviews)) {
          allReviews.push(...json.teacher.reviews);
        }

        // Find MY review: match by reviewed_by.id === userId
        const myReview = allReviews.find(
          (r: any) =>
            String(r.reviewed_by?.id) === String(userId) &&
            String(r.booking_reference) === String(bookingRef)
        );

        if (myReview) {
          setExistingReview({
            rate: myReview.rate || 0,
            comment: myReview.comment || "",
          });
          setReviewSubmitted(true);
        }
      } catch {}
    }

    if (id) loadBooking();
  }, [id, location.state]);

  /* ── Create Payment Plan ── */
  const handleCreatePlan = async () => {
    if (!booking) return;
    setPlansLoading(true);
    try {
      const res = await fetch(`${API}/booking/create/plan`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ booking_reference: booking.booking_reference, plan_type: paymentType }),
      });
      const data = await res.json();
      if (res.ok && !data?.errors) {
        const plans = data?.data || data || [];
        setPaymentPlans(Array.isArray(plans) ? plans : [plans]);
        setPlansCreated(true);
        const plansRes = await fetch(`${API}/booking/get/plans?booking_reference=${booking.booking_reference}`, { headers: headers() });
        if (plansRes.ok) {
          const plansJson = await plansRes.json();
          const planList = Array.isArray(plansJson) ? plansJson : (plansJson?.data?.plans || plansJson?.data || plansJson?.plans || []);
          if (planList.length > 0) setPaymentPlans(planList);
        }
      } else {
        toast({ title: "Error", description: data?.message || data?.error || "Failed to create plan", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to create payment plan.", variant: "destructive" });
    } finally {
      setPlansLoading(false);
    }
  };

  /* ── Pay with Stripe ── */
  const handlePay = async (planId?: number) => {
    if (!booking) return;
    if (!cardNumber || !cardExpiry || !cardCvc) {
      toast({ title: "Error", description: "Please fill in all card details.", variant: "destructive" });
      return;
    }
    setPaying(true);
    try {
      const [expMonth, expYear] = cardExpiry.split("/").map((s) => s.trim());
      const formData = new URLSearchParams();
      formData.append("card[number]", cardNumber.replace(/\s/g, ""));
      formData.append("card[exp_month]", expMonth);
      formData.append("card[exp_year]", expYear.length === 2 ? `20${expYear}` : expYear);
      formData.append("card[cvc]", cardCvc);

      const tokenRes = await fetch("https://api.stripe.com/v1/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Bearer ${stripeKey}` },
        body: formData.toString(),
      });
      const tokenData = await tokenRes.json();
      if (!tokenData?.id) {
        toast({ title: "Card Error", description: tokenData?.error?.message || "Invalid card details.", variant: "destructive" });
        setPaying(false);
        return;
      }

      const targetPlanId = planId || paymentPlans.find((p: any) => !p.paid_at && p.is_paid !== "YES")?.id || paymentPlans[0]?.id;
      const payRes = await fetch(`${API}/booking/make/payment`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({ booking_reference: booking.booking_reference, plan_id: targetPlanId, stripe_token: tokenData.id }),
      });
      const payData = await payRes.json();

      if (payRes.ok && (payData?.success || payData?.data)) {
        toast({ title: "Payment Successful!", description: payData?.data?.message || "Payment completed." });
        setShowPayment(false);
        setCardNumber(""); setCardExpiry(""); setCardCvc("");
        try {
          const plansRes = await fetch(`${API}/booking/get/plans?booking_reference=${booking.booking_reference}`, { headers: headers() });
          if (plansRes.ok) {
            const plansJson = await plansRes.json();
            const planList = Array.isArray(plansJson) ? plansJson : (plansJson?.data?.plans || plansJson?.data || plansJson?.plans || []);
            if (planList.length > 0) setPaymentPlans(planList);
          }
        } catch {}
      } else {
        toast({ title: "Payment Failed", description: payData?.message || payData?.error || "Payment could not be processed.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Payment failed. Please try again.", variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  /* ── Cancel Booking ── */
  const handleCancel = async () => {
    if (!booking) return;
    const confirmed = window.confirm("Are you sure you want to cancel this booking? This action cannot be undone.");
    if (!confirmed) return;
    setCancelling(true);
    try {
      const res = await fetch(`${API}/booking/cancel/classes?ids[]=${booking.session_id}`, { headers: headers() });
      const data = await res.json();
      if (res.ok) {
        setLocalStatus("cancelled");
        toast({ title: "Booking Cancelled", description: "Your booking has been cancelled successfully." });
      } else {
        toast({ title: "Error", description: data?.message || "Failed to cancel booking.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to cancel booking.", variant: "destructive" });
    } finally {
      setCancelling(false);
    }
  };

  /* ── Submit Review ── */
  const handleSubmitReview = async () => {
    if (!booking) return;
    if (reviewRating === 0) {
      toast({ title: "Rating Required", description: "Please select a star rating before submitting.", variant: "destructive" });
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await fetch(`${API}/booking/review/store`, {
        method: "POST", headers: headers(),
        body: JSON.stringify({
          booking_reference: booking.booking_reference,
          rate: reviewRating,
          comment: reviewComment || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && (data?.data || data?.success)) {
        toast({ title: "Review Submitted!", description: "Thank you for your feedback." });
        setReviewSubmitted(true);
        setExistingReview({ rate: reviewRating, comment: reviewComment });
        setLocalStatus("completed");
      } else {
        const errMsg = data?.message || data?.errors?.message || "Failed to submit review.";
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to submit review.", variant: "destructive" });
    } finally {
      setSubmittingReview(false);
    }
  };

  /* ── Card formatting ── */
  const handleCardNumberChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 16);
    setCardNumber(cleaned.replace(/(.{4})/g, "$1 ").trim());
  };
  const handleExpiryChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 4);
    setCardExpiry(cleaned.length >= 3 ? `${cleaned.slice(0, 2)}/${cleaned.slice(2)}` : cleaned);
  };

  /* ── Loading / Not Found ── */
  if (loading) {
    return (<StudentDashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></StudentDashboardLayout>);
  }
  if (!booking) {
    return (<StudentDashboardLayout><div className="flex flex-col items-center justify-center py-20"><p className="text-muted-foreground mb-4">Booking not found.</p><Button variant="outline" onClick={() => navigate("/student/calendar")}><ArrowLeft className="w-4 h-4 mr-2" />Back to Calendar</Button></div></StudentDashboardLayout>);
  }

  /* ── Derived data ── */
  const teacher = booking.teacher || {};
  const profile = tutorProfile?.profile || teacher.profile || {};
  const tutorName = teacher.name || "Tutor";
  const tutorLanguages = (tutorProfile?.languages || teacher.languages || []).map((l: any) => l.name).join(", ") || "—";
  const tutorSubjects = (tutorProfile?.subjects || teacher.subjects || []).map((s: any) => s.name).join(", ") || "—";
  const tutorClasses = (tutorProfile?.classes || teacher.classes || []).map((c: any) => c.name).join(", ") || "—";
  const tutorBio = profile.about_me || "";
  const tutorAvatar = profile.profile_img || teacher.profile_img || "";
  const tutorRating = tutorProfile?.average_review || teacher.average_review || 0;
  const privateFee = profile.rate_per_hour || booking.price || 0;
  const groupFee = profile.group_rate_per_hour || 0;

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

  const classTimeActive = isClassTimeActive(booking.appointment_date, booking.start_time, booking.end_time);
  const classTimeOver = isClassTimeOver(booking.appointment_date, booking.end_time);

  const effectiveCompleted = isCompleted || (isConfirmed && allPlansPaid && classTimeOver);
  const effectiveStatus = effectiveCompleted ? "completed" : bookingStatus;
  const effectiveDisplayStatus = effectiveCompleted ? "Completed" : displayStatus;

  // ★ Stars under tutor name: show review stars if review exists, else tutor's average rating
  const displayStars = existingReview?.rate || (reviewSubmitted ? reviewRating : tutorRating);

  const feePercent = getBookingFeePercent();
  const bookingFee = (totalAmount * feePercent) / 100;
  const grandTotal = totalAmount + bookingFee;

  return (
    <StudentDashboardLayout>
      <div className="max-w-3xl mx-auto">
        {/* Back + Booking ID */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/student/calendar")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">B-{booking.booking_reference}</h1>
            <p className="text-xs text-muted-foreground">Booking Details</p>
          </div>
          <Badge className={`ml-auto text-xs px-2.5 py-0.5 ${statusColors[effectiveStatus] || ""}`}>{effectiveDisplayStatus}</Badge>
        </div>

        <div className="space-y-6">
          {/* Tutor Information */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tutor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                {tutorAvatar ? (
                  <img src={tutorAvatar} alt={tutorName} className="w-16 h-16 rounded-full object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><User className="w-7 h-7 text-primary" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground">{tutorName}</h3>

                  {/* ★ Stars under tutor name */}
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
                    {tutorLanguages !== "—" && (<div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-primary" />{tutorLanguages}</div>)}
                    {tutorSubjects !== "—" && (<div className="flex items-center gap-2"><BookOpen className="w-3.5 h-3.5 text-primary" />{tutorSubjects}</div>)}
                    {tutorClasses !== "—" && (<div className="flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-primary" />{tutorClasses}</div>)}
                  </div>
                  {tutorBio && (<p className="mt-3 text-sm text-muted-foreground leading-relaxed">{tutorBio}</p>)}
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
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Tag className="w-4 h-4 text-primary" /></div>
                  <div><p className="text-xs text-muted-foreground">Session Type</p><Badge className={`text-xs mt-0.5 ${sessionTypeColors[sessionType] || ""}`}>{sessionType}</Badge></div>
                </div>
                <InfoRow icon={DollarSign} label="Private Fee" value={`$${Number(privateFee).toFixed(0)}/hr`} />
                <InfoRow icon={DollarSign} label="Group Fee" value={`$${Number(groupFee).toFixed(0)}/hr`} />
              </div>
            </CardContent>
          </Card>

          {/* Status + Actions */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`text-sm px-3 py-1 ${statusColors[effectiveStatus] || ""}`}>{effectiveDisplayStatus}</Badge>

              {isPending && !effectiveCompleted && (<p className="mt-3 text-sm text-muted-foreground">Your booking is awaiting confirmation from the tutor. Once the tutor confirms, you will be able to make payment.</p>)}

              {isConfirmed && !allPlansPaid && !effectiveCompleted && (<p className="mt-3 text-sm text-muted-foreground">Your booking has been confirmed by the tutor. You can now proceed with payment.</p>)}

              {isConfirmed && allPlansPaid && !effectiveCompleted && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">Payment completed. Your session is confirmed and paid.</span>
                </div>
              )}

              {effectiveCompleted && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="font-medium">This session has been completed. Thank you for learning with us!</span>
                </div>
              )}

              {isRejected && (<p className="mt-3 text-sm text-muted-foreground">This booking was rejected by the tutor.</p>)}
              {isCancelled && (<p className="mt-3 text-sm text-muted-foreground">This booking was cancelled.</p>)}

              {booking.zoom_link && !effectiveCompleted && (
                <div className="mt-4">
                  <a href={booking.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Join Zoom Meeting</a>
                </div>
              )}

              {/* Confirmed, not demo, not fully paid, not completed */}
              {isConfirmed && !isDemo && !allPlansPaid && !effectiveCompleted && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button onClick={() => setShowPayment(true)} className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90" size="lg">
                    <CreditCard className="w-4 h-4 mr-2" />Pay Now
                  </Button>
                  <Button onClick={handleCancel} variant="destructive" className="flex-1" size="lg" disabled={cancelling}>
                    {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}Cancel Class
                  </Button>
                </div>
              )}

              {/* Confirmed + fully paid + class NOT over → Join a Session + Cancel */}
              {isConfirmed && !isDemo && allPlansPaid && !effectiveCompleted && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button onClick={() => setShowJoinModal(true)} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" size="lg">
                    <Video className="w-4 h-4 mr-2" />Join a Session
                  </Button>
                  <Button onClick={handleCancel} variant="destructive" className="flex-1" size="lg" disabled={cancelling}>
                    {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}Cancel Class
                  </Button>
                </div>
              )}

              {/* Demo confirmed + class NOT over → Join a Session + Cancel */}
              {isConfirmed && isDemo && !effectiveCompleted && (
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <Button onClick={() => setShowJoinModal(true)} className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700" size="lg">
                    <Video className="w-4 h-4 mr-2" />Join a Session
                  </Button>
                  <Button onClick={handleCancel} variant="destructive" className="flex-1" size="lg" disabled={cancelling}>
                    {cancelling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}Cancel Class
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ━━━ REVIEW SECTION — only when completed ━━━ */}
          {effectiveCompleted && (
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Review
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
                      <p className="text-sm font-medium text-foreground mb-2">How was your experience with {tutorName}?</p>
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
                        placeholder="Share your experience with this tutor..."
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

        {/* ═══ Join a Session Modal ═══ */}
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl border border-border w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Video className="w-5 h-5 text-emerald-600" />
                  Join a Session
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
                      Arrange your class with <span className="text-primary font-semibold">{tutorName}</span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Scheduled at <span className="font-medium text-foreground">{timeSlot}</span> on <span className="font-medium text-foreground">{formatDate(booking.appointment_date)}</span>
                    </p>
                  </div>
                  {classTimeActive && booking.zoom_link && (
                    <a href={booking.zoom_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-emerald-700 transition-colors w-full">
                      <Video className="w-4 h-4" />
                      Join Now
                    </a>
                  )}
                  {classTimeActive && !booking.zoom_link && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                      Your class is live now! The tutor will share the meeting link shortly.
                    </p>
                  )}
                  {!classTimeActive && (
                    <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
                      Your class hasn't started yet. Please come back at the scheduled time.
                    </p>
                  )}
                </div>
              </div>
              <div className="p-5 border-t border-border">
                <Button variant="outline" onClick={() => setShowJoinModal(false)} className="w-full">Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Payment Modal ═══ */}
        {showPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="text-lg font-bold text-foreground">Payment Plan</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowPayment(false)}><X className="w-5 h-5" /></Button>
              </div>
              <div className="p-5 space-y-5">
                <div className="border border-border rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/50"><th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Description</th><th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Amount</th></tr></thead>
                    <tbody>
                      <tr className="border-t border-border"><td className="px-4 py-2.5 text-foreground">You have {totalSessions} session{totalSessions !== 1 ? "s" : ""}</td><td className="px-4 py-2.5 text-right text-foreground">USD {totalAmount.toFixed(0)}</td></tr>
                      <tr className="border-t border-border"><td className="px-4 py-2.5 text-foreground">Booking Fee Charges</td><td className="px-4 py-2.5 text-right text-foreground">USD {bookingFee.toFixed(2)}</td></tr>
                      <tr className="border-t border-border bg-muted/30"><td className="px-4 py-2.5 font-semibold text-foreground">Total Amount</td><td className="px-4 py-2.5 text-right font-semibold text-foreground">USD {grandTotal.toFixed(0)}</td></tr>
                    </tbody>
                  </table>
                </div>

                {!plansCreated && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Select Payment Type</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[{ val: 1, label: "Weekly" }, { val: 2, label: "Monthly" }, { val: 3, label: "One time" }].map((opt) => (
                          <button key={opt.val} onClick={() => setPaymentType(opt.val as 1 | 2 | 3)} className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${paymentType === opt.val ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>{opt.label}</button>
                        ))}
                      </div>
                    </div>
                    <Button onClick={handleCreatePlan} className="w-full" disabled={plansLoading}>{plansLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Create Payment Plan</Button>
                  </>
                )}

                {plansCreated && paymentPlans.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2">Plans</p>
                    <div className="space-y-2">
                      {paymentPlans.map((plan: any, idx: number) => {
                        const isPlanPaid = plan.paid_at || plan.is_paid === "YES";
                        return (
                        <div key={plan.id || idx} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${isPlanPaid ? "border-emerald-200 bg-emerald-50" : "border-border"}`}>
                          <div className="flex items-center gap-2">
                            {isPlanPaid ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-muted-foreground" />}
                            <span className="text-sm text-foreground">USD {Number(plan.amount || plan.price || 0).toFixed(2)} at {formatDateShort(plan.start_date || plan.due_date || plan.date)}</span>
                          </div>
                          {isPlanPaid && <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Paid</Badge>}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {plansCreated && !allPlansPaid && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-3">Card Details</p>
                      <div className="space-y-3">
                        <div><label className="text-xs text-muted-foreground mb-1 block">Card Number</label><Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => handleCardNumberChange(e.target.value)} maxLength={19} className="font-mono" /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div><label className="text-xs text-muted-foreground mb-1 block">Expiration</label><Input placeholder="MM/YY" value={cardExpiry} onChange={(e) => handleExpiryChange(e.target.value)} maxLength={5} className="font-mono" /></div>
                          <div><label className="text-xs text-muted-foreground mb-1 block">CVC</label><Input placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} type="password" className="font-mono" /></div>
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => handlePay()} className="w-full bg-primary text-primary-foreground hover:bg-primary/90" size="lg" disabled={paying}>
                      {paying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                      {paying ? "Processing..." : "Pay"}
                    </Button>
                  </>
                )}

                {plansCreated && allPlansPaid && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-600 text-center">All payments completed! Your session is fully paid.</p>
                    <Button variant="outline" onClick={() => setShowPayment(false)}>Close</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </StudentDashboardLayout>
  );
}
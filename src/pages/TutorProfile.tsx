import { useState, useEffect, useCallback } from "react";
import { useUnlockedTutors } from "@/contexts/UnlockedTutorsContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import {
  Star,
  MapPin,
  Globe,
  Clock,
  BookOpen,
  GraduationCap,
  Award,
  Briefcase,
  ChevronLeft,
  Video,
  Calendar as CalendarIcon,
  CheckCircle2,
  X,
  Lock,
  CreditCard,
  Loader2,
} from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isBefore, startOfDay } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allTimezones } from "@/data/timezones";
import api from "@/lib/api";

function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function getTimezoneAbbr(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || tz;
  } catch {
    return tz;
  }
}

function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

const shortToFull: Record<number, string> = {
  0: "sunday",
  1: "monday",
  2: "tuesday",
  3: "wednesday",
  4: "thursday",
  5: "friday",
  6: "saturday",
};

type TutorData = {
  id: number;
  name: string;
  last_name: string;
  email: string;
  is_verified: number;
  country: { name: string; timezone?: string } | null;
  languages: { name: string }[];
  subjects: { name: string }[];
  profile: {
    about_me: string;
    rate_per_hour: number;
    group_rate_per_hour: number;
    demo_class: number;
    profile_img: string;
    intro_fee?: number;
  } | null;
  education: {
    id: number;
    title: string;
    type: string;
    institute_name: string;
    location: string;
    start_time: string;
    end_time: string | null;
    still_study: number;
  }[];
  experience: {
    id: number;
    title: string;
    type: string;
    company_name: string;
    location: string;
    start_time: string;
    end_time: string | null;
    still_work: number;
  }[];
  schedule: {
    day_name: string;
    start_time: string | null;
    end_time: string | null;
    is_available: number;
  }[];
  average_review: number;
  reviews: any[];
};

type SlotInfo = {
  time: string;
  label: string;
};

export default function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { unlockTutor, isTutorUnlocked } = useUnlockedTutors();

  const [tutor, setTutor] = useState<TutorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [studentTimezone, setStudentTimezone] = useState(getLocalTimezone());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotInfo | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [sessionType, setSessionType] = useState<"demo" | "private" | "group" | null>(null);
  const [sessionTypeError, setSessionTypeError] = useState(false);
  const DEMO_LIMIT = 3;
  const [demosUsed] = useState(1);
  const demosRemaining = DEMO_LIMIT - demosUsed;
  const demoLimitReached = demosRemaining <= 0;

  const [profileUnlocked, setProfileUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // ━━━ NEW: Stripe & Intro Fee states ━━━
  const [stripeKey, setStripeKey] = useState("");  // pk_test_... from backend
  const [introFeeFromAPI, setIntroFeeFromAPI] = useState<number | null>(null);
  const [introFeeCurrency, setIntroFeeCurrency] = useState("usd");
  const [introFeeLoading, setIntroFeeLoading] = useState(false);

  // Slots from API
  const [daySlots, setDaySlots] = useState<SlotInfo[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Cache: which dates have availability
  const [availabilityCache, setAvailabilityCache] = useState<Record<string, SlotInfo[]>>({});
  const [weekLoading, setWeekLoading] = useState(false);

  // ━━━ Fetch Stripe publishable key from backend ━━━
  useEffect(() => {
    const fetchStripeKey = async () => {
      try {
        const res = await api.get("/stripe/keys");
        const key = res.data?.data?.publishable_key || res.data?.publishable_key || res.data?.key || "";
        if (key) {
          setStripeKey(key);
        }
      } catch (err) {
        console.error("Failed to fetch Stripe key:", err);
      }
    };
    fetchStripeKey();
  }, []);

  // ━━━ Fetch tutor data ━━━
  useEffect(() => {
    const fetchTutor = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/teacher?user_id=${id}`);
        const data = response.data?.data || response.data;
        if (!data || !data.id) {
          setNotFound(true);
        } else {
          setTutor(data);
          // Don't set profileUnlocked from local context yet — wait for API check
        }
      } catch (error) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTutor();
  }, [id]);

  // ━━━ Check intro fee status from backend (real unlock check) ━━━
  useEffect(() => {
    if (!tutor) return;

    const checkIntroFee = async () => {
      setIntroFeeLoading(true);
      try {
        const res = await api.get(`/tutor/check-intro-fee?teacher_id=${tutor.id}`);
        const data = res.data;
        // Response: { unlocked: true/false, intro_fee: 30, currency: "usd" }
        const unlocked = data?.unlocked === true;
        setProfileUnlocked(unlocked);
        if (unlocked) {
          unlockTutor(tutor.id); // sync local context
        }
        if (data?.intro_fee !== undefined) {
          setIntroFeeFromAPI(data.intro_fee);
        }
        if (data?.currency) {
          setIntroFeeCurrency(data.currency);
        }
      } catch (err) {
        console.error("Failed to check intro fee:", err);
        // Fallback to local context
        setProfileUnlocked(isTutorUnlocked(tutor.id));
      } finally {
        setIntroFeeLoading(false);
      }
    };

    checkIntroFee();
  }, [tutor]);

  // Helper: check if a day is available from schedule
  const isDayInSchedule = useCallback((date: Date) => {
    if (!tutor?.schedule) return false;
    const dayName = shortToFull[date.getDay()];
    return tutor.schedule.some(
      (s) => s.day_name === dayName && s.is_available === 1 && s.start_time && s.end_time
    );
  }, [tutor]);

  // Fetch available slots for entire visible week from API
  const fetchWeekAvailability = useCallback(async () => {
    if (!tutor || !id) return;

    setWeekLoading(true);
    const newCache: Record<string, SlotInfo[]> = {};

    const promises: Promise<void>[] = [];

    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      const today = startOfDay(new Date());
      if (isBefore(d, today)) continue;
      if (!isDayInSchedule(d)) continue;

      const dateStr = format(d, "MM/dd/yyyy");
      const dateKey = format(d, "yyyy-MM-dd");

      const appointmentType = sessionType === "group" ? 2 : 1;

      const fetchDay = async () => {
        try {
          if (sessionType === "demo") {
            const formData = new FormData();
            formData.append("teacher_id", String(tutor.id));
            formData.append("user_id", String(tutor.id));
            formData.append("start_date", format(d, "yyyy-MM-dd"));
            formData.append("demo", "1");

            const res = await api.post("/booking/available/slot", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            const slots = parseSlotsFromResponse(res.data);
            newCache[dateKey] = slots;
          } else {
            const formData = new FormData();
            formData.append("teacher_id", String(tutor.id));
            formData.append("user_id", String(tutor.id));
            formData.append("start_date", dateStr);
            formData.append("end_date", dateStr);
            formData.append("appointment_type", String(appointmentType));

            const res = await api.post("/booking/available/slot", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
            const slots = parseSlotsFromResponse(res.data);
            newCache[dateKey] = slots;
          }
        } catch (err) {
          console.error(`Failed to fetch slots for ${dateKey}:`, err);
          newCache[dateKey] = [];
        }
      };

      promises.push(fetchDay());
    }

    await Promise.all(promises);
    setAvailabilityCache(newCache);
    setWeekLoading(false);
  }, [tutor, id, weekStart, sessionType, isDayInSchedule]);

  // Parse response from backend to extract slot times
  function parseSlotsFromResponse(response: any): SlotInfo[] {
    try {
      let data = response;

      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return [];
        }
      }

      const slots: SlotInfo[] = [];

      if (data?.availableSlots && Array.isArray(data.availableSlots)) {
        for (const dayData of data.availableSlots) {
          if (dayData.available_slot && Array.isArray(dayData.available_slot)) {
            for (const time of dayData.available_slot) {
              slots.push({
                time: time,
                label: formatTime12h(time),
              });
            }
          }
        }
      }

      return slots;
    } catch (err) {
      console.error("Failed to parse slots response:", err);
      return [];
    }
  }

  // Fetch week availability when week changes, session type changes, or tutor loads
  useEffect(() => {
    if (tutor && sessionType) {
      fetchWeekAvailability();
    }
  }, [tutor, weekStart, sessionType, fetchWeekAvailability]);

  // When a date is selected, fetch FRESH slots from API
  useEffect(() => {
    if (!selectedDate || !tutor || !sessionType) {
      setDaySlots([]);
      return;
    }

    const fetchSelectedDateSlots = async () => {
      setSlotsLoading(true);
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const dateStr = format(selectedDate, "MM/dd/yyyy");
      const appointmentType = sessionType === "group" ? 2 : 1;

      try {
        const formData = new FormData();
        formData.append("teacher_id", String(tutor.id));
        formData.append("user_id", String(tutor.id));

        if (sessionType === "demo") {
          formData.append("start_date", dateKey);
          formData.append("demo", "1");
        } else {
          formData.append("start_date", dateStr);
          formData.append("end_date", dateStr);
          formData.append("appointment_type", String(appointmentType));
        }

        const res = await api.post("/booking/available/slot", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        const slots = parseSlotsFromResponse(res.data);
        setDaySlots(slots);

        setAvailabilityCache((prev) => ({ ...prev, [dateKey]: slots }));
      } catch (err) {
        console.error(`Failed to fetch slots for ${dateKey}:`, err);
        setDaySlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };

    fetchSelectedDateSlots();
  }, [selectedDate, tutor, sessionType]);

  // Check if a date has available slots
  const hasAvailability = (date: Date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    const cached = availabilityCache[dateKey];
    if (cached !== undefined) {
      return cached.length > 0;
    }
    return isDayInSchedule(date);
  };

  const handleBookSlot = (date: Date, slot: SlotInfo) => {
    if (!sessionType) {
      setSessionTypeError(true);
      return;
    }
    setSessionTypeError(false);
    setSelectedDate(date);
    setSelectedSlot(slot);
    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    if (!tutor || !selectedDate || !selectedSlot || !sessionType) return;

    setBookingLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");

      if (sessionType === "demo") {
        const formData = new FormData();
        formData.append("teacher_id", String(tutor.id));
        formData.append("date", dateStr);
        formData.append("slot[0][date]", dateStr);
        formData.append("slot[0][time][]", selectedSlot.time);

        await api.post("/booking/demo/store", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        const formData = new FormData();
        formData.append("teacher_id", String(tutor.id));
        formData.append("start_date", format(selectedDate, "MM/dd/yyyy"));
        formData.append("end_date", format(selectedDate, "MM/dd/yyyy"));
        formData.append("slot[0][date]", dateStr);
        formData.append("slot[0][time][]", selectedSlot.time);
        formData.append("appointment_type", sessionType === "group" ? "2" : "1");

        await api.post("/booking/create", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      setBookingConfirmed(true);
      toast({
        title: "Booking Confirmed!",
        description: `Your ${sessionType} session has been booked successfully.`,
      });
    } catch (error: any) {
      console.error("Booking error:", error);
      toast({
        title: "Booking Failed",
        description: error.response?.data?.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBookingLoading(false);
    }
  };

  const resetBooking = () => {
    setShowConfirmation(false);
    setBookingConfirmed(false);
    setSelectedDate(null);
    setSelectedSlot(null);
    setBookingLoading(false);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ━━━ REAL STRIPE PAYMENT for Intro Fee ━━━
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handlePayment = async () => {
    // Validate card fields
    const cleanCard = cardNumber.replace(/\s/g, "");
    if (!cardName.trim()) {
      setPaymentError("Please enter the name on card.");
      return;
    }
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      setPaymentError("Please enter a valid card number.");
      return;
    }
    if (!cardExpiry || cardExpiry.length < 5) {
      setPaymentError("Please enter a valid expiry date (MM/YY).");
      return;
    }
    if (!cardCvc || cardCvc.length < 3) {
      setPaymentError("Please enter a valid CVC.");
      return;
    }
    if (!stripeKey) {
      setPaymentError("Payment system is not available. Please try again later.");
      return;
    }

    setPaymentError("");
    setPaymentProcessing(true);

    try {
      // ━━━ Step 1: Create Stripe Token from card details ━━━
      const [expMonth, expYear] = cardExpiry.split("/");
      const fullYear = expYear.length === 2 ? `20${expYear}` : expYear;

      const stripeFormData = new URLSearchParams();
      stripeFormData.append("card[number]", cleanCard);
      stripeFormData.append("card[exp_month]", expMonth);
      stripeFormData.append("card[exp_year]", fullYear);
      stripeFormData.append("card[cvc]", cardCvc);
      stripeFormData.append("card[name]", cardName.trim());

      const stripeRes = await fetch("https://api.stripe.com/v1/tokens", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: stripeFormData.toString(),
      });

      const stripeData = await stripeRes.json();

      if (stripeData.error) {
        setPaymentError(stripeData.error.message || "Card validation failed. Please check your card details.");
        setPaymentProcessing(false);
        return;
      }

      const stripeToken = stripeData.id; // tok_...

      // ━━━ Step 2: Send token to backend to process payment ━━━
      const payRes = await api.post("/tutor/pay-intro-fee", {
        teacher_id: tutor?.id,
        stripe_token: stripeToken,
      });

      const payData = payRes.data;

      if (payData?.success === false || payData?.error) {
        setPaymentError(payData?.message || payData?.error || "Payment failed. Please try again.");
        setPaymentProcessing(false);
        return;
      }

      // ━━━ Step 3: Payment successful! ━━━
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setProfileUnlocked(true);
      if (tutor) unlockTutor(tutor.id);

      toast({
        title: "Profile Unlocked!",
        description: `You now have full access to ${tutorName}'s profile and booking calendar.`,
      });

      // Close modal after 1.5s
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
        setCardName("");
      }, 1500);

    } catch (err: any) {
      console.error("Payment error:", err);
      const errMsg = err.response?.data?.message || err.message || "Payment failed. Please try again.";
      setPaymentError(errMsg);
      setPaymentProcessing(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="section-container text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-4" />
            <p className="text-muted-foreground">Loading tutor profile...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Not found state
  if (notFound || !tutor) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="section-container text-center py-20">
            <h1 className="text-2xl font-bold text-foreground mb-4">Tutor not found</h1>
            <Button asChild>
              <Link to="/tutors">Browse Tutors</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tutorName = `${tutor.name || ""} ${tutor.last_name || ""}`.trim();
  const hourlyRate = tutor.profile?.rate_per_hour || 0;
  const groupRate = tutor.profile?.group_rate_per_hour || 0;
  // Use intro fee from API if available, otherwise fallback to profile data
  const introFee = introFeeFromAPI !== null ? introFeeFromAPI : (tutor.profile?.intro_fee || 10);
  const currencySymbol = introFeeCurrency === "usd" ? "$" : introFeeCurrency.toUpperCase() + " ";
  const avatar = tutor.profile?.profile_img || `https://ui-avatars.com/api/?name=${tutor.name}&background=random`;
  const sessionFee = sessionType === "demo" ? 0 : sessionType === "group" ? groupRate : hourlyRate;
  const sessionTypeLabel = sessionType === "demo" ? "Demo Session" : sessionType === "group" ? "Group Session" : "Private Session";
  const blurClass = profileUnlocked ? "" : "blur-sm select-none pointer-events-none";
  const tutorTimezone = tutor.country?.timezone || "Asia/Karachi";

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Back Nav */}
        <div className="section-container pt-6">
          <Link to="/tutors" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" />
            Back to Tutors
          </Link>
        </div>

        {/* Profile Header */}
        <section className="py-8 lg:py-12">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-3xl border border-border overflow-hidden">
              <div className="bg-primary/5 px-6 py-8 lg:px-10 lg:py-10">
                <div className="flex flex-col sm:flex-row gap-6 lg:gap-8">
                  <div className="relative shrink-0">
                    <img
                      src={avatar}
                      alt={tutorName}
                      className={`w-[90px] h-[90px] lg:w-[120px] lg:h-[120px] rounded-full object-cover object-center ring-4 ring-primary/10 shadow-elevated ${blurClass}`}
                    />
                    {!profileUnlocked && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className={`text-2xl lg:text-3xl text-foreground ${profileUnlocked ? "font-bold" : "font-normal blur-md select-none pointer-events-none"}`}>{tutorName}</h1>
                          {tutor.is_verified === 1 && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-xs font-semibold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-primary font-semibold text-lg mb-3">
                          {tutor.subjects?.map((s) => s.name).join(" & ") || "General"}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-accent fill-accent" />
                            <span className="font-semibold text-foreground">{tutor.average_review || 0}</span>
                            ({tutor.reviews?.length || 0} reviews)
                          </span>
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4" />
                            {tutor.country?.name || "N/A"}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Globe className="w-4 h-4" />
                            {tutor.languages?.map((l) => l.name).join(", ") || "N/A"}
                          </span>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-2 text-sm">
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">Private:</span>
                            <span className="font-bold text-primary">${hourlyRate}/hour</span>
                          </span>
                          <span className="hidden sm:inline text-muted-foreground">•</span>
                          <span className="flex items-center gap-1">
                            <span className="text-muted-foreground">Group:</span>
                            <span className="font-bold text-primary">${groupRate}/hour per student</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {!profileUnlocked && !introFeeLoading && (
                          <Button onClick={() => setShowPaymentModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft" size="lg">
                            <Lock className="w-4 h-4 mr-1.5" />
                            Unlock Profile - {currencySymbol}{introFee}
                          </Button>
                        )}
                        {introFeeLoading && (
                          <Button disabled className="bg-primary/50 text-primary-foreground" size="lg">
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Checking...
                          </Button>
                        )}
                        <Button onClick={() => navigate(`/student/messages?tutor=${tutor.id}`)} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft" size="lg">
                          <MessageSquare className="w-4 h-4 mr-1.5" />
                          Message Tutor
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content Grid */}
        <section className="pb-16 lg:pb-24">
          <div className="section-container">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* About */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-6 lg:p-8">
                  <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-primary" />
                    About
                  </h2>
                  <p className="text-muted-foreground leading-relaxed">{tutor.profile?.about_me || "No description available."}</p>
                </motion.div>

                {/* Education */}
                {tutor.education?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-6 lg:p-8">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-primary" />
                      Education
                    </h2>
                    <ul className="space-y-3">
                      {tutor.education.map((edu) => (
                        <li key={edu.id} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{edu.title} — {edu.type}</p>
                            <p className="text-sm">{edu.institute_name}, {edu.location}</p>
                            <p className="text-xs">{edu.start_time?.slice(0, 4)} — {edu.still_study ? "Present" : edu.end_time?.slice(0, 4)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Experience */}
                {tutor.experience?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-6 lg:p-8">
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                      <Briefcase className="w-5 h-5 text-primary" />
                      Experience
                    </h2>
                    <ul className="space-y-3">
                      {tutor.experience.map((exp) => (
                        <li key={exp.id} className="flex items-start gap-3 text-muted-foreground">
                          <span className="w-2 h-2 rounded-full bg-accent mt-2 shrink-0" />
                          <div>
                            <p className="font-medium text-foreground">{exp.title} — {exp.type}</p>
                            <p className="text-sm">{exp.company_name}, {exp.location}</p>
                            <p className="text-xs">{exp.start_time?.slice(0, 4)} — {exp.still_work ? "Present" : exp.end_time?.slice(0, 4)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </div>

              {/* Right Column – Booking Calendar */}
              <div className="lg:col-span-1">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className={`bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-24 relative ${!profileUnlocked ? "overflow-hidden" : ""}`}>
                  {!profileUnlocked && (
                    <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
                      <Lock className="w-10 h-10 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-muted-foreground text-center px-4">Unlock this profile to book sessions</p>
                      <Button onClick={() => setShowPaymentModal(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
                        <Lock className="w-4 h-4 mr-1.5" />
                        Unlock - {currencySymbol}{introFee}
                      </Button>
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    Book a Session
                  </h2>
                  <p className="text-sm text-muted-foreground mb-1">Select a day and time slot to book</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Tutor's timezone: {getTimezoneAbbr(tutorTimezone)} ({tutorTimezone})
                  </p>

                  {/* Session Type */}
                  <div className="mb-5">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Session Type <span className="text-destructive">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {tutor.profile?.demo_class === 1 && (
                        <button
                          onClick={() => { if (!demoLimitReached) { setSessionType("demo"); setSessionTypeError(false); setSelectedDate(null); } }}
                          disabled={demoLimitReached}
                          className={`p-3 rounded-xl border-2 text-left transition-all sm:col-span-2 ${demoLimitReached ? "border-border opacity-50 cursor-not-allowed" : sessionType === "demo" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-muted-foreground/30"}`}
                        >
                          <p className={`font-semibold text-sm flex items-center gap-1.5 ${sessionType === "demo" ? "text-primary-foreground" : "text-foreground"}`}>🎁 Demo Session</p>
                          <p className={`text-sm font-bold ${sessionType === "demo" ? "text-primary-foreground" : "text-primary"}`}>FREE</p>
                          <p className={`text-xs mt-1 ${sessionType === "demo" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{demosRemaining}/{DEMO_LIMIT} demos remaining</p>
                        </button>
                      )}
                      <button
                        onClick={() => { setSessionType("private"); setSessionTypeError(false); setSelectedDate(null); }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${sessionType === "private" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-muted-foreground/30"}`}
                      >
                        <p className={`font-semibold text-sm ${sessionType === "private" ? "text-primary-foreground" : "text-foreground"}`}>Private Session</p>
                        <p className={`text-sm font-bold ${sessionType === "private" ? "text-primary-foreground" : "text-primary"}`}>${hourlyRate}/hour</p>
                      </button>
                      <button
                        onClick={() => { setSessionType("group"); setSessionTypeError(false); setSelectedDate(null); }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${sessionType === "group" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-muted-foreground/30"}`}
                      >
                        <p className={`font-semibold text-sm ${sessionType === "group" ? "text-primary-foreground" : "text-foreground"}`}>Group Session</p>
                        <p className={`text-sm font-bold ${sessionType === "group" ? "text-primary-foreground" : "text-primary"}`}>${groupRate}/hour</p>
                      </button>
                    </div>
                    {sessionTypeError && <p className="text-destructive text-xs mt-2">Please select a session type before booking</p>}
                  </div>

                  {/* Prompt to select session type first */}
                  {!sessionType && (
                    <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                      <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      Please select a session type above to view available slots
                    </div>
                  )}

                  {/* Calendar only shows after session type is selected */}
                  {sessionType && (
                    <>
                      {/* Week Calendar */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { setWeekStart(subWeeks(weekStart, 1)); setSelectedDate(null); }}>← Prev</Button>
                          <span className="text-sm font-semibold text-foreground">{format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</span>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" onClick={() => { setWeekStart(addWeeks(weekStart, 1)); setSelectedDate(null); }}>Next →</Button>
                        </div>

                        {weekLoading && (
                          <div className="flex items-center justify-center py-2 mb-2">
                            <Loader2 className="w-4 h-4 animate-spin text-primary mr-2" />
                            <span className="text-xs text-muted-foreground">Loading availability...</span>
                          </div>
                        )}

                        <div className="grid grid-cols-7 gap-2">
                          {Array.from({ length: 7 }).map((_, i) => {
                            const d = addDays(weekStart, i);
                            const today = startOfDay(new Date());
                            const isPast = isBefore(d, today);
                            const isSelected = selectedDate && isSameDay(d, selectedDate);
                            const available = hasAvailability(d);
                            const isToday = isSameDay(d, today);
                            return (
                              <button
                                key={i}
                                disabled={isPast || !available || weekLoading}
                                onClick={() => setSelectedDate(d)}
                                className={`flex flex-col items-center justify-center py-3 rounded-lg text-sm transition-all ${isSelected ? "bg-primary text-primary-foreground font-semibold shadow-soft" : isToday && available ? "bg-accent/20 text-foreground font-medium cursor-pointer" : isPast || !available ? "text-muted-foreground/30 cursor-not-allowed" : "hover:bg-muted text-foreground cursor-pointer"}`}
                              >
                                <span className="text-xs font-medium mb-1">{format(d, "EEE")}</span>
                                <span className="text-base">{format(d, "d")}</span>
                                {available && !isPast && <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? "bg-primary-foreground" : "bg-success"}`} />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Time Slots */}
                      {selectedDate ? (
                        daySlots.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-sm font-medium text-foreground">
                              Available on {format(selectedDate, "EEEE, MMM d")}
                            </p>
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                              {daySlots.map((slot, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleBookSlot(selectedDate, slot)}
                                  className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                                >
                                  <div className="text-left">
                                    <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                      {slot.label}
                                    </p>
                                  </div>
                                  <Video className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-center text-sm text-muted-foreground py-4">
                            {slotsLoading ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading slots...
                              </span>
                            ) : (
                              "No slots available for this day."
                            )}
                          </p>
                        )
                      ) : (
                        <div className="text-center py-6 text-muted-foreground text-sm">
                          Select a date to view available time slots
                        </div>
                      )}
                    </>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* Booking Confirmation Modal */}
      <Dialog open={showConfirmation} onOpenChange={(open) => !open && resetBooking()}>
        <DialogContent className="sm:max-w-md">
          {!bookingConfirmed ? (
            <>
              <DialogHeader>
                <DialogTitle>Confirm Your Booking</DialogTitle>
                <DialogDescription>Review the details below and confirm your session.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-4">
                  <img src={avatar} alt={tutorName} className="w-14 h-14 rounded-xl object-cover" />
                  <div>
                    <p className="font-semibold text-foreground">{tutorName}</p>
                    <p className="text-sm text-primary">{tutor.subjects?.map((s) => s.name).join(" & ")}</p>
                  </div>
                </div>
                <div className="bg-muted rounded-xl p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Session Type</span>
                    <span className="font-medium text-foreground">{sessionTypeLabel}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium text-foreground">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  {selectedSlot && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Time</span>
                      <span className="font-medium text-foreground">{selectedSlot.label}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Session Fee</span>
                    <span className="font-bold text-foreground text-lg">{sessionType === "demo" ? "FREE" : `$${sessionFee}`}</span>
                  </div>
                </div>
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={resetBooking} disabled={bookingLoading}>Cancel</Button>
                <Button onClick={confirmBooking} disabled={bookingLoading}>
                  {bookingLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking...
                    </span>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Booking Confirmed!</h3>
              <p className="text-muted-foreground mb-1">Your session with {tutorName} is scheduled for</p>
              {selectedDate && selectedSlot && (
                <p className="font-semibold text-foreground">
                  {format(selectedDate, "EEEE, MMMM d")} at {selectedSlot.label}
                </p>
              )}
              <Button className="mt-6" onClick={resetBooking}>Done</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ━━━ REAL Stripe Payment Modal ━━━ */}
      <Dialog open={showPaymentModal} onOpenChange={(open) => { if (!open && !paymentProcessing) { setShowPaymentModal(false); setPaymentError(""); setPaymentSuccess(false); } }}>
        <DialogContent className="sm:max-w-md">
          {paymentSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Profile Unlocked!</h3>
              <p className="text-muted-foreground">You now have full access to this tutor's profile and booking calendar.</p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Unlock Profile
                </DialogTitle>
                <DialogDescription>
                  Pay a one-time fee of <span className="font-bold text-foreground">{currencySymbol}{introFee}</span> to unlock {tutorName}'s full profile and booking calendar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">Amount to pay</p>
                  <p className="text-3xl font-bold text-primary">{currencySymbol}{introFee}</p>
                </div>

                {/* Stripe Test Mode Indicator */}
                {stripeKey && stripeKey.startsWith("pk_test") && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium text-amber-700">🧪 Stripe Test Mode — No real charges</p>
                    <p className="text-xs text-amber-600 mt-1">Use card: 4242 4242 4242 4242, any future date, any CVC</p>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Name on Card</label>
                    <Input placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} disabled={paymentProcessing} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Card Number</label>
                    <Input placeholder="4242 4242 4242 4242" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} maxLength={19} disabled={paymentProcessing} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">Expiry MM/YY</label>
                      <Input placeholder="12/28" value={cardExpiry} onChange={(e) => { let v = e.target.value.replace(/\D/g, "").slice(0, 4); if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2); setCardExpiry(v); }} maxLength={5} disabled={paymentProcessing} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">CVC</label>
                      <Input placeholder="123" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))} maxLength={4} disabled={paymentProcessing} />
                    </div>
                  </div>
                </div>
                {paymentError && <p className="text-destructive text-sm font-medium">{paymentError}</p>}
              </div>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => { setShowPaymentModal(false); setPaymentError(""); }} disabled={paymentProcessing}>Cancel</Button>
                <Button onClick={handlePayment} disabled={paymentProcessing} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  {paymentProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Processing Payment...
                    </span>
                  ) : `Pay ${currencySymbol}${introFee}`}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

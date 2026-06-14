import { useState, useEffect, useCallback } from "react";
import { useUnlockedTutors } from "@/contexts/UnlockedTutorsContext";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Phone, Mail, AlertCircle, Send, FileText, MessageSquare } from "lucide-react";
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

// Convert UTC time string to GMT 12-hour label
function formatTimeUTCtoGMT(timeUTC: string | null | undefined): string {
  if (!timeUTC) return "—";
  const cleaned = timeUTC.length >= 5 ? timeUTC.substring(0, 5) : timeUTC;
  return `${formatTime12h(cleaned)} GMT`;
}

// ━━━ Convert UTC time string to tutor's local timezone ━━━
function formatTimeUTCtoTutorLocal(
  timeUTC: string | null | undefined,
  tutorTimezone: string | null | undefined
): string {
  if (!timeUTC || !tutorTimezone) return "—";

  try {
    const cleaned = timeUTC.length >= 5 ? timeUTC.substring(0, 5) : timeUTC;
    const [hours, minutes] = cleaned.split(":").map(Number);

    const today = new Date();
    const utcDate = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      hours,
      minutes,
      0
    ));

    const localTime = new Intl.DateTimeFormat("en-US", {
      timeZone: tutorTimezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(utcDate);

    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tutorTimezone,
      timeZoneName: "short",
    }).formatToParts(utcDate);
    const abbr = parts.find((p) => p.type === "timeZoneName")?.value || "";

    return `${localTime} ${abbr}`.trim();
  } catch (err) {
    console.error("Failed to convert to tutor local:", err);
    return "—";
  }
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

const DAY_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

// ━━━ Hard-coded dispute reasons ━━━
const DISPUTE_REASONS = [
  { value: "tutor-not-responding",     label: "Tutor not responding" },
  { value: "fake-or-wrong-info",       label: "Fake / Wrong information in profile" },
  { value: "tutor-refused-to-teach",   label: "Tutor refused to teach" },
  { value: "rude-or-unprofessional",   label: "Rude / Unprofessional behavior" },
  { value: "other",                    label: "Other" },
];

// ━━━ Dispute status helpers ━━━
const getDisputeStatusLabel = (status: number): string => {
  switch (status) {
    case 1: return "Opened";
    case 2: return "Closed";
    case 3: return "Resolved";
    default: return "Unknown";
  }
};

const getDisputeStatusColor = (status: number): string => {
  switch (status) {
    case 1: return "bg-yellow-100 text-yellow-700 border-yellow-300";
    case 2: return "bg-red-100 text-red-700 border-red-300";
    case 3: return "bg-green-100 text-green-700 border-green-300";
    default: return "bg-gray-100 text-gray-700 border-gray-300";
  }
};

const getDisputeStatusIcon = (status: number): string => {
  switch (status) {
    case 1: return "🟡";
    case 2: return "❌";
    case 3: return "✅";
    default: return "⚪";
  }
};

type TutorData = {
  id: number;
  name: string;
  last_name: string;
  email: string;
  phone?: string;
  is_verified: number;
  country: {
    name: string;
    timezone?: string;
    calling_code?: string;
    calling_digits?: string;
  } | null;
  languages: { name: string }[];
  subjects: { name: string }[];
  classes: { id: number; name: string }[];  // new addition of classes ( education standard)
  profile: {
    about_me: string;
    rate_per_hour: number;
    group_rate_per_hour: number;
    demo_class: number;
    profile_img: string;
    intro_fee?: number;
  } | null;
  education: any[];
  experience: any[];
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

type DisputeData = {
  id: number;
  ticket_no: string;
  status: number;
  status_label: string;
  reason: string;
  created_at: string;
  resolved_at?: string | null;
  closed_at?: string | null;
  refund_amount: number;
};

type DiscussionMessage = {
  id: number;
  comment: string;
  file?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    role?: string;
  } | null;
};

type ReviewData = {
  id: number;
  rate: number;
  comment: string | null;
  created_at?: string;
  updated_at?: string;
};

export default function TutorProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { unlockTutor, isTutorUnlocked } = useUnlockedTutors();

  // Logged-in user info
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.id) setCurrentUserId(user.id);
      const role = user?.role?.[0]?.name || null;
      setCurrentUserRole(role);
    } catch {
      setCurrentUserId(null);
      setCurrentUserRole(null);
    }
  }, []);

  const [tutor, setTutor] = useState<TutorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Profile unlock states
  const [profileUnlocked, setProfileUnlocked] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");

  // Contact details popup state
  const [showContactModal, setShowContactModal] = useState(false);

  // Stripe & Intro Fee states
  const [stripeKey, setStripeKey] = useState("");
  const [introFeeFromAPI, setIntroFeeFromAPI] = useState<number | null>(null);
  const [introFeeCurrency, setIntroFeeCurrency] = useState("usd");
  const [introFeeLoading, setIntroFeeLoading] = useState(false);

  // ━━━ DISPUTE STATES ━━━
  const [introFeeId, setIntroFeeId] = useState<number | null>(null);
  const [existingDispute, setExistingDispute] = useState<DisputeData | null>(null);
  const [showDisputeModal, setShowDisputeModal] = useState(false);

  // Dispute form state
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeFormError, setDisputeFormError] = useState("");

  // Existing dispute view state
  const [disputeMessages, setDisputeMessages] = useState<DiscussionMessage[]>([]);
  const [disputeLoadingDetails, setDisputeLoadingDetails] = useState(false);

  // Send message state
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  // ━━━ RATING STATES ━━━
  const [activeTab, setActiveTab] = useState<"dispute" | "rating">("dispute");
  const [existingReview, setExistingReview] = useState<ReviewData | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [ratingValue, setRatingValue] = useState<number>(0);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [ratingComment, setRatingComment] = useState("");
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [ratingFormError, setRatingFormError] = useState("");
  const [editingRating, setEditingRating] = useState(false);

  // ━━━ Fetch Stripe publishable key ━━━
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
        }
      } catch (error) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchTutor();
  }, [id]);

  // Role-based flags
  const isLoggedInTutor = currentUserRole === "teacher";
  const isOwnProfile = tutor !== null && currentUserId !== null && tutor.id === currentUserId;
  const hideTutorActions = isLoggedInTutor;

  // ━━━ Check intro fee status from backend ━━━
  useEffect(() => {
    if (!tutor) return;

    if (isLoggedInTutor) {
      setProfileUnlocked(false);
      return;
    }

    if (isOwnProfile) {
      setProfileUnlocked(true);
      return;
    }

    const checkIntroFee = async () => {
      setIntroFeeLoading(true);
      try {
        const res = await api.get(`/tutor/check-intro-fee?teacher_id=${tutor.id}`);
        const data = res.data;
        const unlocked = data?.unlocked === true;
        setProfileUnlocked(unlocked);

        if (unlocked) {
          unlockTutor(tutor.id);
        }

        if (data?.intro_fee !== undefined) {
          setIntroFeeFromAPI(data.intro_fee);
        }
        if (data?.currency) {
          setIntroFeeCurrency(data.currency);
        }

        if (data?.intro_fee_id) {
          setIntroFeeId(data.intro_fee_id);
        }

        if (data?.has_dispute && data?.dispute) {
          setExistingDispute(data.dispute);
        } else {
          setExistingDispute(null);
        }

      } catch (err) {
        console.error("Failed to check intro fee:", err);
        setProfileUnlocked(isTutorUnlocked(tutor.id));
      } finally {
        setIntroFeeLoading(false);
      }
    };

    checkIntroFee();
  }, [tutor, isLoggedInTutor, isOwnProfile]);

  // ━━━ Fetch existing review for this tutor (if any) ━━━
  useEffect(() => {
    if (!tutor || !profileUnlocked || isOwnProfile || isLoggedInTutor) return;

    const fetchMyReview = async () => {
      setReviewLoading(true);
      try {
        const res = await api.get(`/intro-fee/review/my-review?teacher_id=${tutor.id}`);
        if (res.data?.has_review && res.data?.review) {
          setExistingReview(res.data.review);
          setRatingValue(res.data.review.rate);
          setRatingComment(res.data.review.comment || "");
        } else {
          setExistingReview(null);
        }
      } catch (err) {
        console.error("Failed to fetch existing review:", err);
      } finally {
        setReviewLoading(false);
      }
    };

    fetchMyReview();
  }, [tutor, profileUnlocked, isOwnProfile, isLoggedInTutor]);

  // ━━━ STRIPE PAYMENT for Intro Fee ━━━
  const handlePayment = async () => {
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
        setPaymentError(stripeData.error.message || "Card validation failed.");
        setPaymentProcessing(false);
        return;
      }

      const stripeToken = stripeData.id;

      const payRes = await api.post("/tutor/pay-intro-fee", {
        teacher_id: tutor?.id,
        stripe_token: stripeToken,
      });

      const payData = payRes.data;

      if (payData?.success === false || payData?.error) {
        setPaymentError(payData?.message || payData?.error || "Payment failed.");
        setPaymentProcessing(false);
        return;
      }

      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setProfileUnlocked(true);
      if (tutor) unlockTutor(tutor.id);

      setTimeout(async () => {
        try {
          const res = await api.get(`/tutor/check-intro-fee?teacher_id=${tutor?.id}`);
          if (res.data?.intro_fee_id) {
            setIntroFeeId(res.data.intro_fee_id);
          }
        } catch (e) {
          console.error("Failed to refetch intro fee info:", e);
        }
      }, 500);

      toast({
        title: "Profile Unlocked!",
        description: `You can now view ${tutorName}'s contact details.`,
      });

      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setCardNumber("");
        setCardExpiry("");
        setCardCvc("");
        setCardName("");
        setShowContactModal(true);
      }, 1500);

    } catch (err: any) {
      console.error("Payment error:", err);
      const errMsg = err.response?.data?.message || err.message || "Payment failed.";
      setPaymentError(errMsg);
      setPaymentProcessing(false);
    }
  };

  const handleContactClick = () => {
    if (profileUnlocked) {
      setShowContactModal(true);
    } else {
      setShowPaymentModal(true);
    }
  };

  // ━━━ DISPUTE FUNCTIONS ━━━
  const handleDisputeClick = async () => {
    if (!introFeeId) {
      toast({
        title: "Cannot open dispute",
        description: "Intro fee information not available. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setShowDisputeModal(true);
    setActiveTab("dispute");

    if (existingDispute) {
      await loadDisputeDetails();
    } else {
      setDisputeReason("");
      setDisputeDescription("");
      setDisputeFormError("");
    }
  };

  const loadDisputeDetails = async () => {
    if (!introFeeId) return;

    setDisputeLoadingDetails(true);
    try {
      const res = await api.get(`/intro-fee/dispute/${introFeeId}`);
      const data = res.data?.data;

      if (data?.has_dispute && data?.data) {
        setExistingDispute({
          id: data.data.id,
          ticket_no: data.data.ticket_no,
          status: data.data.status,
          status_label: data.data.status_label,
          reason: data.data.reason,
          created_at: data.data.created_at,
          resolved_at: data.data.resolved_at,
          closed_at: data.data.closed_at,
          refund_amount: data.data.refund_amount || 0,
        });

        if (data.data.discussions && Array.isArray(data.data.discussions)) {
          setDisputeMessages(data.data.discussions);
        }
      }
    } catch (err: any) {
      console.error("Failed to load dispute details:", err);
      toast({
        title: "Failed to load dispute",
        description: err.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisputeLoadingDetails(false);
    }
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ━━━ Submit new dispute — ✨ RATING IS REQUIRED FIRST ━━━
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const handleSubmitDispute = async () => {
    setDisputeFormError("");

    // ✨ NEW: Rating is REQUIRED before submitting dispute
    if (!existingReview) {
      setDisputeFormError("Please rate this tutor first before submitting a dispute. Switch to the Rating tab to add your rating.");
      return;
    }

    // Validation
    if (!disputeReason) {
      setDisputeFormError("Please select a reason for the dispute.");
      return;
    }
    if (!disputeDescription.trim() || disputeDescription.trim().length < 10) {
      setDisputeFormError("Please provide a description (at least 10 characters).");
      return;
    }
    if (!introFeeId) {
      setDisputeFormError("Intro fee information missing.");
      return;
    }

    setDisputeSubmitting(true);
    try {
      const res = await api.post("/intro-fee/dispute/open", {
        intro_fee_id: introFeeId,
        reason: disputeReason,
        description: disputeDescription.trim(),
      });

      const data = res.data?.data;

      if (data?.data) {
        toast({
          title: "Dispute Submitted ✅",
          description: `Your dispute has been submitted. Ticket: ${data.data.ticket_no}`,
        });

        setExistingDispute({
          id: data.data.id,
          ticket_no: data.data.ticket_no,
          status: data.data.status,
          status_label: data.data.status_label,
          reason: data.data.reason,
          created_at: data.data.created_at,
          resolved_at: data.data.resolved_at,
          closed_at: data.data.closed_at,
          refund_amount: data.data.refund_amount || 0,
        });

        if (data.data.discussions && Array.isArray(data.data.discussions)) {
          setDisputeMessages(data.data.discussions);
        }

        setDisputeReason("");
        setDisputeDescription("");
      }
    } catch (err: any) {
      console.error("Submit dispute error:", err);
      const errMsg = err.response?.data?.error
                  || err.response?.data?.message
                  || err.response?.data?.errors?.intro_fee_id?.[0]
                  || err.response?.data?.errors?.reason?.[0]
                  || "Failed to submit dispute. Please try again.";
      setDisputeFormError(typeof errMsg === "string" ? errMsg : "Failed to submit dispute.");
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !existingDispute) return;

    if (existingDispute.status === 2 || existingDispute.status === 3) {
      toast({
        title: "Dispute is closed",
        description: "No more messages can be sent.",
        variant: "destructive",
      });
      return;
    }

    setSendingMessage(true);
    try {
      await api.post("/intro-fee/dispute/message/send", {
        dispute_id: existingDispute.id,
        comment: newMessage.trim(),
      });

      await loadDisputeDetails();
      setNewMessage("");

      toast({
        title: "Message sent",
      });
    } catch (err: any) {
      console.error("Send message error:", err);
      toast({
        title: "Failed to send message",
        description: err.response?.data?.error || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseDisputeModal = () => {
    setShowDisputeModal(false);
    setDisputeReason("");
    setDisputeDescription("");
    setDisputeFormError("");
    setNewMessage("");
    setRatingFormError("");
    setEditingRating(false);
  };

  // ━━━ RATING SUBMIT FUNCTION ━━━
  const handleSubmitRating = async () => {
    setRatingFormError("");

    if (ratingValue < 1 || ratingValue > 5) {
      setRatingFormError("Please select a rating between 1 and 5 stars.");
      return;
    }

    if (!tutor) {
      setRatingFormError("Tutor information missing.");
      return;
    }

    setRatingSubmitting(true);
    try {
      const res = await api.post("/intro-fee/review/store", {
        teacher_id: tutor.id,
        rate: ratingValue,
        comment: ratingComment.trim() || null,
      });

      const data = res.data;

      if (data?.success && data?.data) {
        toast({
          title: existingReview ? "Rating Updated ⭐" : "Rating Submitted ⭐",
          description: existingReview
            ? "Your review has been updated successfully."
            : "Thank you for rating this tutor!",
        });

        setExistingReview({
          id: data.data.id,
          rate: data.data.rate,
          comment: data.data.comment,
          created_at: data.data.created_at,
          updated_at: data.data.updated_at,
        });
        setEditingRating(false);
      }
    } catch (err: any) {
      console.error("Submit rating error:", err);
      const errMsg = err.response?.data?.error
                  || err.response?.data?.message
                  || "Failed to submit rating. Please try again.";
      setRatingFormError(typeof errMsg === "string" ? errMsg : "Failed to submit rating.");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // ━━━ RENDER ━━━

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
  const introFee = introFeeFromAPI !== null ? introFeeFromAPI : (tutor.profile?.intro_fee || 10);
  const currencySymbol = introFeeCurrency === "usd" ? "$" : introFeeCurrency.toUpperCase() + " ";
  const avatar = tutor.profile?.profile_img || `https://ui-avatars.com/api/?name=${tutor.name}&background=random`;

  const tutorEmail = tutor.email || "";
  const tutorPhone = tutor.phone
    ? `+${tutor.country?.calling_code || ""} ${tutor.phone}`
    : "";

  const shouldBlur = !isOwnProfile && !profileUnlocked;
  const blurClass = shouldBlur ? "blur-sm select-none pointer-events-none" : "";

  const sortedSchedule = (tutor.schedule || [])
    .filter((s) => s.is_available === 1 && s.start_time && s.end_time)
    .sort((a, b) => DAY_ORDER.indexOf(a.day_name) - DAY_ORDER.indexOf(b.day_name));

  const canShowDisputeButton = !hideTutorActions && !isOwnProfile && profileUnlocked && introFeeId;
  const hasDispute = !!existingDispute;
  const isDisputeOpen = existingDispute?.status === 1;

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
                    {shouldBlur && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-8 h-8 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h1 className={`text-2xl lg:text-3xl text-foreground ${!shouldBlur ? "font-bold" : "font-normal blur-md select-none pointer-events-none"}`}>{tutorName}</h1>
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
                        {tutor.classes?.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            <GraduationCap className="w-4 h-4 text-primary shrink-0" />
                            {tutor.classes.map((c) => (
                              <span
                                key={c.id}
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium"
                              >
                                {c.name}
                              </span>
                           ))}
                         </div>
                        )}
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

                      {/* ━━━ ACTION BUTTONS (vertical layout) ━━━ */}
                      {!hideTutorActions && (
                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                          {introFeeLoading && !isOwnProfile && (
                            <Button disabled className="bg-primary/50 text-primary-foreground" size="lg">
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              Checking...
                            </Button>
                          )}

                          {/* Contact button */}
                          {!isOwnProfile && !introFeeLoading && (
                            <Button onClick={handleContactClick} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft" size="lg">
                              {profileUnlocked ? (
                                <>
                                  <Phone className="w-4 h-4 mr-1.5" />
                                  Contact
                                </>
                              ) : (
                                <>
                                  <Lock className="w-4 h-4 mr-1.5" />
                                  Contact - {currencySymbol}{introFee}
                                </>
                              )}
                            </Button>
                          )}

                          {/* Dispute Button — only if profile unlocked (paid) */}
                          {canShowDisputeButton && (
                            <Button
                              onClick={handleDisputeClick}
                              variant={hasDispute ? "outline" : "destructive"}
                              size="lg"
                              className={hasDispute ? "border-2" : ""}
                            >
                              <AlertCircle className="w-4 h-4 mr-1.5" />
                              Dispute
                            </Button>
                          )}

                          {/* Message Button — ALWAYS visible (paid or unpaid), shown to students only */}
                          {!hideTutorActions && !isOwnProfile && (
                            <Button
                              onClick={() => navigate(`/student/messages?tutor=${tutor.id}`)}
                              size="lg"
                              className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-soft"
                            >
                              <MessageSquare className="w-4 h-4 mr-1.5" />
                              Message
                            </Button>
                          )}
                        </div>
                      )}
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
            <div className={hideTutorActions ? "grid grid-cols-1 gap-8" : "grid lg:grid-cols-3 gap-8"}>
              <div className={hideTutorActions ? "space-y-8" : "lg:col-span-2 space-y-8"}>
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

              {/* Right Column: Schedule */}
              {!hideTutorActions && (
                <div className="lg:col-span-1">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-6 lg:sticky lg:top-24">
                    <h2 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-5 h-5 text-primary" />
                      Tutor's Schedule
                    </h2>
                    <p className="text-sm text-muted-foreground mb-1">Available days and times</p>
                    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Times shown in <span className="font-semibold text-foreground">GMT</span>
                      {tutor.country?.timezone && (
                        <span className="text-muted-foreground/70"> & tutor's local time</span>
                      )}
                    </p>

                    {sortedSchedule.length > 0 ? (
                      <div className="space-y-2">
                        {sortedSchedule.map((s, idx) => (
                          <div
                            key={idx}
                            className="flex items-start justify-between p-3 rounded-xl border border-border bg-muted/30 gap-3"
                          >
                          <div className="flex items-center gap-2 pt-0.5 shrink-0">
                            <span className="w-2 h-2 rounded-full bg-success" />
                            <span className="font-semibold text-sm text-foreground">{dayLabel(s.day_name)}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-foreground font-medium">
                              {formatTimeUTCtoGMT(s.start_time)} – {formatTimeUTCtoGMT(s.end_time)}
                            </div>
                            {tutor.country?.timezone && (
                              <div className="text-[11px] text-muted-foreground mt-0.5">
                                Tutor: {formatTimeUTCtoTutorLocal(s.start_time, tutor.country.timezone)} – {formatTimeUTCtoTutorLocal(s.end_time, tutor.country.timezone)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                        <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                        Tutor has not set their schedule yet
                      </div>
                    )}

                    <div className="mt-5 p-4 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        💡 Pay the intro fee to unlock the tutor's contact details. You can then arrange your class directly with them based on the schedule above.
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      {/* ━━━ STRIPE PAYMENT MODAL ━━━ */}
      {!hideTutorActions && (
        <Dialog open={showPaymentModal} onOpenChange={(open) => { if (!open && !paymentProcessing) { setShowPaymentModal(false); setPaymentError(""); setPaymentSuccess(false); } }}>
          <DialogContent className="sm:max-w-md">
            {paymentSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">Payment Successful!</h3>
                <p className="text-muted-foreground">Opening tutor's contact details...</p>
              </div>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Unlock Contact Details
                  </DialogTitle>
                  <DialogDescription>
                    Pay a one-time intro fee of <span className="font-bold text-foreground">{currencySymbol}{introFee}</span> to view {tutorName}'s contact details (phone & email). You can then arrange the class directly with the tutor.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-center">
                    <p className="text-sm text-muted-foreground">Amount to pay</p>
                    <p className="text-3xl font-bold text-primary">{currencySymbol}{introFee}</p>
                  </div>

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
      )}

      {/* ━━━ CONTACT DETAILS POPUP ━━━ */}
      {!hideTutorActions && (
        <Dialog open={showContactModal} onOpenChange={setShowContactModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-primary" />
                {tutorName}'s Contact Details
              </DialogTitle>
              <DialogDescription>
                Use these details to arrange your class directly with the tutor. You can discuss timing, fee, and class format with them.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {tutorEmail && (
                <a href={`mailto:${tutorEmail}`} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground text-sm truncate">{tutorEmail}</p>
                  </div>
                </a>
              )}

              {tutorPhone && (
                <a href={`tel:+${tutor.country?.calling_code || ""}${tutor.phone || ""}`} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Phone / WhatsApp</p>
                    <p className="font-medium text-foreground text-sm">{tutorPhone}</p>
                  </div>
                </a>
              )}

              {!tutorEmail && !tutorPhone && (
                <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
                  Contact details not available for this tutor.
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContactModal(false)} className="w-full">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ━━━ DISPUTE + RATING MODAL (WITH TABS) ━━━ */}
      {!hideTutorActions && (
        <Dialog open={showDisputeModal} onOpenChange={(open) => { if (!open) handleCloseDisputeModal(); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* Tab Header */}
            <div className="flex border-b border-border mb-4 -mx-6 px-6 sticky top-0 bg-background z-10">
              <button
                type="button"
                onClick={() => setActiveTab("dispute")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "dispute"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {hasDispute ? "View Dispute" : "Submit Dispute"}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rating")}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === "rating"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="w-4 h-4" />
                {existingReview ? "Your Rating" : "Rate Tutor"}
              </button>
            </div>

            {/* MODE 1: New dispute form */}
            {activeTab === "dispute" && !hasDispute && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    Open Dispute Against {tutorName}
                  </DialogTitle>
                  <DialogDescription>
                    Submit a dispute if you've had a problem with this tutor. Our team will review your complaint.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                  {/* ✨ NEW: Rating required warning — only shows if no rating yet */}
                  {!existingReview && (
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                      <p className="text-xs text-red-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                        <span>
                          <strong>Rating required:</strong> You must rate this tutor before submitting a dispute.{" "}
                          <button
                            type="button"
                            onClick={() => setActiveTab("rating")}
                            className="underline font-semibold hover:text-red-900"
                          >
                            Click here to rate now →
                          </button>
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Info box */}
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800">
                      ⚠️ <strong>Note:</strong> Our admin team will review your dispute and contact the tutor to resolve the issue.
                    </p>
                  </div>

                  {/* Reason dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Reason <span className="text-destructive">*</span>
                    </label>
                    <Select value={disputeReason} onValueChange={setDisputeReason}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason for the dispute" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPUTE_REASONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description textarea */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Description <span className="text-destructive">*</span>
                    </label>
                    <textarea
                      className="w-full min-h-[120px] p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Please describe your issue in detail (minimum 10 characters)..."
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      maxLength={5000}
                      disabled={disputeSubmitting}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {disputeDescription.length} / 5000 characters
                    </p>
                  </div>

                  {disputeFormError && (
                    <p className="text-destructive text-sm font-medium flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {disputeFormError}
                    </p>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={handleCloseDisputeModal} disabled={disputeSubmitting}>
                    Cancel
                  </Button>
                  {/* ✨ NEW: Submit button disabled if no rating */}
                  <Button
                    onClick={handleSubmitDispute}
                    disabled={disputeSubmitting || !existingReview}
                    variant="destructive"
                  >
                    {disputeSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5" />
                        Submit Dispute
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* MODE 2: View existing dispute + chat */}
            {activeTab === "dispute" && hasDispute && existingDispute && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 flex-wrap">
                    <FileText className="w-5 h-5 text-primary" />
                    Dispute Details
                    <span className={`text-xs px-2 py-1 rounded border ${getDisputeStatusColor(existingDispute.status)}`}>
                      {getDisputeStatusIcon(existingDispute.status)} {getDisputeStatusLabel(existingDispute.status)}
                    </span>
                  </DialogTitle>
                  <DialogDescription>
                    Ticket No: <span className="font-mono font-semibold text-foreground">{existingDispute.ticket_no}</span>
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                  {existingDispute.status === 3 && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        ✅ Dispute Resolved — Refund Issued
                      </p>
                      <p className="text-xs text-green-700">
                        A refund of {currencySymbol}{existingDispute.refund_amount} has been processed.
                        It will appear in your account within 5-10 business days.
                      </p>
                    </div>
                  )}

                  {existingDispute.status === 2 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-800 mb-1">
                        ❌ Dispute Closed — No Refund
                      </p>
                      <p className="text-xs text-red-700">
                        After review, no refund was issued for this dispute.
                      </p>
                    </div>
                  )}

                  <div className="bg-muted/30 rounded-lg p-4 space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Reason:</span>
                      <span className="ml-2 font-medium text-foreground">
                        {DISPUTE_REASONS.find(r => r.value === existingDispute.reason)?.label || existingDispute.reason}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <span className="ml-2 text-foreground">
                        {existingDispute.created_at ? format(new Date(existingDispute.created_at), "PPp") : "—"}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Discussion
                    </h4>

                    {disputeLoadingDetails ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                        <p className="text-xs text-muted-foreground mt-2">Loading messages...</p>
                      </div>
                    ) : disputeMessages.length === 0 ? (
                      <p className="text-center py-4 text-xs text-muted-foreground">No messages yet.</p>
                    ) : (
                      <div className="space-y-3 max-h-80 overflow-y-auto p-3 bg-muted/20 rounded-lg border border-border">
                        {disputeMessages.map((msg) => {
                          const isCurrentUser = msg.user?.id === currentUserId;
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[80%] rounded-lg p-3 ${
                                  isCurrentUser
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border"
                                }`}
                              >
                                <div className="text-xs font-semibold mb-1 opacity-80">
                                  {msg.user?.name || "Unknown"}
                                  {msg.user?.role && msg.user.role !== "student" && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded text-[10px]">
                                      {msg.user.role.toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{msg.comment}</p>
                                {msg.file && (
                                  <a
                                    href={msg.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 mt-2 text-xs underline opacity-90"
                                  >
                                    <FileText className="w-3 h-3" />
                                    View attached PDF
                                  </a>
                                )}
                                <div className="text-[10px] mt-1 opacity-60">
                                  {msg.created_at ? format(new Date(msg.created_at), "PPp") : ""}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {isDisputeOpen && (
                    <div className="border-t pt-4">
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Send a message
                      </label>
                      <div className="flex gap-2">
                        <textarea
                          className="flex-1 min-h-[60px] p-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          maxLength={5000}
                          disabled={sendingMessage}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={sendingMessage || !newMessage.trim()}
                          size="sm"
                        >
                          {sendingMessage ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isDisputeOpen && (
                    <div className="text-center py-3 text-xs text-muted-foreground border-t">
                      <em>This dispute is {existingDispute.status === 2 ? "closed" : "resolved"}. No more messages can be sent.</em>
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={handleCloseDisputeModal} className="w-full">
                    Close
                  </Button>
                </DialogFooter>
              </>
            )}

            {/* RATING TAB CONTENT */}
            {activeTab === "rating" && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    {existingReview && !editingRating ? "Your Rating" : "Rate This Tutor"}
                  </DialogTitle>
                  <DialogDescription>
                    {existingReview && !editingRating
                      ? "You have already rated this tutor. You can edit your rating anytime."
                      : `Share your experience with ${tutorName}. Your rating helps other students.`}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                  {reviewLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                      <p className="text-xs text-muted-foreground mt-2">Loading your review...</p>
                    </div>
                  ) : existingReview && !editingRating ? (
                    <div className="space-y-4">
                      <div className="bg-muted/30 rounded-lg p-4">
                        <div className="flex items-center gap-1 mb-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`w-6 h-6 ${
                                star <= existingReview.rate
                                  ? "text-yellow-400 fill-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="ml-2 text-sm font-semibold text-foreground">
                            {existingReview.rate} / 5
                          </span>
                        </div>
                        {existingReview.comment && (
                          <p className="text-sm text-foreground italic">"{existingReview.comment}"</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Submitted: {existingReview.created_at ? format(new Date(existingReview.created_at), "PPp") : "—"}
                          {existingReview.updated_at && existingReview.created_at !== existingReview.updated_at && (
                            <span> · Edited: {format(new Date(existingReview.updated_at), "PPp")}</span>
                          )}
                        </p>
                      </div>

                      <Button
                        onClick={() => setEditingRating(true)}
                        variant="outline"
                        className="w-full"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Edit Rating
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                          Your Rating <span className="text-destructive">*</span>
                        </label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRatingValue(star)}
                              onMouseEnter={() => setRatingHover(star)}
                              onMouseLeave={() => setRatingHover(0)}
                              disabled={ratingSubmitting}
                              className="transition-transform hover:scale-110 disabled:cursor-not-allowed"
                            >
                              <Star
                                className={`w-10 h-10 ${
                                  star <= (ratingHover || ratingValue)
                                    ? "text-yellow-400 fill-yellow-400"
                                    : "text-gray-300"
                                } transition-colors`}
                              />
                            </button>
                          ))}
                        </div>
                        {ratingValue > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {ratingValue === 1 && "Poor"}
                            {ratingValue === 2 && "Fair"}
                            {ratingValue === 3 && "Good"}
                            {ratingValue === 4 && "Very Good"}
                            {ratingValue === 5 && "Excellent"}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-foreground mb-1.5">
                          Comment <span className="text-muted-foreground">(optional)</span>
                        </label>
                        <textarea
                          className="w-full min-h-[100px] p-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="Share your experience with this tutor..."
                          value={ratingComment}
                          onChange={(e) => setRatingComment(e.target.value)}
                          maxLength={5000}
                          disabled={ratingSubmitting}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {ratingComment.length} / 5000 characters
                        </p>
                      </div>

                      {ratingFormError && (
                        <p className="text-destructive text-sm font-medium flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {ratingFormError}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  {existingReview && editingRating ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingRating(false);
                          setRatingValue(existingReview.rate);
                          setRatingComment(existingReview.comment || "");
                          setRatingFormError("");
                        }}
                        disabled={ratingSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSubmitRating}
                        disabled={ratingSubmitting || ratingValue < 1}
                      >
                        {ratingSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1.5" />
                            Update Rating
                          </>
                        )}
                      </Button>
                    </>
                  ) : existingReview && !editingRating ? (
                    <Button variant="outline" onClick={handleCloseDisputeModal} className="w-full">
                      Close
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={handleCloseDisputeModal} disabled={ratingSubmitting}>
                        Cancel
                      </Button>
                      <Button onClick={handleSubmitRating} disabled={ratingSubmitting || ratingValue < 1}>
                        {ratingSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-1.5" />
                            Submit Rating
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </DialogFooter>
              </>
            )}

          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageCropper } from "@/components/ImageCropper";
import { format, getDay, isBefore, startOfDay } from "date-fns";

import {
  ChevronLeft,
  ChevronRight,
  Upload,
  Plus,
  Trash2,
  Loader2,
  Info,
  CheckCircle,
  Facebook,
  Twitter,
  Linkedin,
  X,
  Clock,
  Globe,
  CalendarOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { countries } from "@/lib/countries";
import { educatorStandards, subjectsByStandard, languages } from "@/data/educatorStandards";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";

import { allTimezones } from "@/data/timezones";

// ─── API Base URL ───
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

function getAuthHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
    Accept: "application/json",
  };
}

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

interface WeeklySchedule {
  [day: string]: { start: string; end: string };
}

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function parse12To24(time12: string): string {
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return "09:00";
  let h = parseInt(match[1]);
  const min = match[2];
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function generateTimeOptions(): string[] {
  const options: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of ["00", "30"]) {
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      options.push(`${String(h12).padStart(2, "0")}:${m} ${ampm}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

const STEPS = ["Basic Info", "Rates & Social", "Standards & Subjects", "Professional Info", "Verification"];

export interface WorkExperience {
  id?: number;
  title: string;
  company: string;
  type?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  stillWork?: number;
  duration?: string;
}

export interface EducationEntry {
  id?: number;
  degree: string;
  institution: string;
  type?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
  stillStudy?: number;
  year?: string;
}


export interface TeacherProfileData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  countryId?: number | null;
  callingDigits?: string;
  birthMonth: string;
  birthYear: string;
  profileImage: string | null;
  ratePerHour: string;
  groupRate: string;
  offersDemo: boolean;
  introFee: number;
  facebook: string;
  twitter: string;
  linkedin: string;
  selectedLanguages: any[];
  standardLevel: any;
  standardLevelName?: string;
  selectedSubjects: any[];
  aboutMe: string;
  workExperiences: WorkExperience[];
  educations: EducationEntry[];
  weeklySchedule: WeeklySchedule;
  selectedDays?: string[];
  blockedDates: string[];
  scheduleTimezone: string;
  verifyFullName: string;
  verifySocialLink: string;
  verifyPhoto: string | null;
  certDoc: boolean;
  idDoc: boolean;
}

interface ProfileSetupProps {
  onComplete?: (data: TeacherProfileData) => void;
  initialFirstName?: string;
  initialMiddleName?: string;
  initialLastName?: string;
  initialEmail?: string;
  initialCountry?: string;
  initialCountryId?: number | null;
  initialCallingDigits?: string;
  initialPhone?: string;
  existingProfile?: TeacherProfileData | null;
}

export function ProfileSetup({
  onComplete,
  initialFirstName,
  initialMiddleName,
  initialLastName,
  initialEmail,
  initialCountry,
  initialCountryId,
  initialCallingDigits,
  initialPhone,
  existingProfile,
}: ProfileSetupProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // ─── Fetch available languages, subjects, classes from backend ───
  const [availableLanguages, setAvailableLanguages] = useState<{ id: number; name: string }[]>([]);
  const [availableClasses, setAvailableClasses] = useState<{ id: number; name: string }[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<{ id: number; name: string }[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);

  useEffect(() => {
    // Fetch languages list from backend
    api.get("/teacher/languages").then((res) => {
      const langs = res.data?.languages || res.data?.data?.languages || [];
      setAvailableLanguages(langs);
    }).catch(() => {
      // Fallback to local data
    });

    // Fetch classes/standards list
    api.get("/teacher/classes").then((res) => {
      const classes = res.data?.standards || res.data?.data?.standards || [];
      setAvailableClasses(classes);
    }).catch(() => {});
  }, []);

  // Fetch subjects when standard changes — use /v1/users/subject POST (same as student side)
  const fetchSubjectsForStandard = useCallback(async (standardId?: string) => {
    if (!standardId) return;
    setSubjectsLoading(true);
    setAvailableSubjects([]);
    try {
      // Primary: POST /v1/users/subject with { id: standardId } — returns filtered subjects
      const res = await api.post("/v1/users/subject", { id: String(standardId) });
      const subs = res.data?.subjects || res.data?.data?.subjects || [];
      setAvailableSubjects(subs);
    } catch {
      // Fallback if v1 endpoint doesn't exist
      try {
        const res = await api.get("/teacher/subjects");
        const subs = res.data?.subjects || res.data?.data?.subjects || [];
        setAvailableSubjects(subs);
      } catch {
        // Final fallback
      }
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  // ─── Step 1 state — FIX: firstName, middleName, lastName are now EDITABLE ───
  const [firstName, setFirstName] = useState(existingProfile?.firstName || initialFirstName || "");
  const [middleName, setMiddleName] = useState(existingProfile?.middleName || initialMiddleName || "");
  const [lastName, setLastName] = useState(existingProfile?.lastName || initialLastName || "");
  const [email] = useState(existingProfile?.email || initialEmail || "");
  const [phone] = useState(existingProfile?.phone || initialPhone || "");
  const [country] = useState(existingProfile?.country || initialCountry || "");
  const [countryId] = useState(existingProfile?.countryId || initialCountryId || null);
  const [callingDigits] = useState(existingProfile?.callingDigits || initialCallingDigits || "");
  // FIX: If existingProfile has a relative image path, build full URL so it displays correctly
  const buildImageUrl = (img: string | null | undefined): string | null => {
    if (!img) return null;
    if (img.startsWith("data:") || img.startsWith("http")) return img;
    // Relative path from backend — prepend base URL
    const base = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace("/api", "");
    return `${base}/${img}`;
  };
  const [profileImage, setProfileImage] = useState<string | null>(buildImageUrl(existingProfile?.profileImage) || null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [birthMonth, setBirthMonth] = useState(existingProfile?.birthMonth || "");
  const [birthYear, setBirthYear] = useState(existingProfile?.birthYear || "");
  const imgRef = useRef<HTMLInputElement>(null);

  // ─── Step 2 state ───
  const [ratePerHour, setRatePerHour] = useState(existingProfile?.ratePerHour || "");
  const [groupRate, setGroupRate] = useState(existingProfile?.groupRate || "");
  const [facebook, setFacebook] = useState(existingProfile?.facebook || "");
  const [twitter, setTwitter] = useState(existingProfile?.twitter || "");
  const [linkedin, setLinkedin] = useState(existingProfile?.linkedin || "");
  const [offersDemo, setOffersDemo] = useState(existingProfile?.offersDemo || false);

  const introFee = useMemo(() => {
    const rate = parseFloat(ratePerHour);
    if (!rate || rate <= 0) return 0;
    return Math.max(30, rate);
  }, [ratePerHour]);

  // ─── Step 3 state — store as {id, name} objects ───
  const [selectedLanguages, setSelectedLanguages] = useState<{ id: number; name: string }[]>(
    existingProfile?.selectedLanguages || []
  );
  const [standardLevel, setStandardLevel] = useState<string>(
    existingProfile?.standardLevel ? String(existingProfile.standardLevel) : ""
  );
  const [selectedSubjects, setSelectedSubjects] = useState<{ id: number; name: string }[]>(
    existingProfile?.selectedSubjects || []
  );

  // FIX: Re-fetch subjects whenever standardLevel changes (moved AFTER standardLevel declaration)
  useEffect(() => {
    if (standardLevel) {
      fetchSubjectsForStandard(standardLevel);
    }
  }, [fetchSubjectsForStandard, standardLevel]);

  // ─── Step 4 state ───
  const [aboutMe, setAboutMe] = useState(existingProfile?.aboutMe || "");
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>(
    existingProfile?.workExperiences?.length
      ? existingProfile.workExperiences
      : [{ title: "", company: "", type: "internship", location: "" }]
  );
  const [educations, setEducations] = useState<EducationEntry[]>(
    existingProfile?.educations?.length
      ? existingProfile.educations
      : [{ degree: "", institution: "", type: "Bachelors", location: "" }]
  );
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    existingProfile?.weeklySchedule || {}
  );
  const [scheduleTimezone, setScheduleTimezone] = useState(
    existingProfile?.scheduleTimezone || getLocalTimezone()
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(
    existingProfile?.selectedDays || []
  );
  const [blockedDates, setBlockedDates] = useState<Date[]>([]);

  // Fetch blocked dates from backend on mount
  useEffect(() => {
    api.get("/teacher/get-pto").then((res) => {
      const ptoData = res.data?.pto || res.data?.data?.pto || [];
      if (Array.isArray(ptoData) && ptoData.length > 0) {
        const dates = ptoData
          .map((p: any) => new Date(p.date + "T00:00:00"))
          .filter((d: Date) => !isNaN(d.getTime()));
        setBlockedDates(dates);
      }
    }).catch(() => {});
  }, []);
  const [showPTOModal, setShowPTOModal] = useState(false);
  const [verifyFullName, setVerifyFullName] = useState(existingProfile?.verifyFullName || "");
  const [verifySocialLink, setVerifySocialLink] = useState(existingProfile?.verifySocialLink || "");
  const [verifyPhoto, setVerifyPhoto] = useState<string | null>(existingProfile?.verifyPhoto || null);
  const [certDoc, setCertDoc] = useState<string | null>(null);
  const [idDoc, setIdDoc] = useState<string | null>(null);
  const verifyPhotoRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const idRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (v: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // ─── Language toggle (by id+name object) ───
  const toggleLanguage = (lang: { id: number; name: string }) => {
    setSelectedLanguages((prev) =>
      prev.some((l) => l.id === lang.id)
        ? prev.filter((l) => l.id !== lang.id)
        : [...prev, lang]
    );
  };

  // ─── Subject toggle ───
  const MAX_SUBJECTS = 5;
  
  // FIX: Subjects are fetched from /v1/users/subject API
  // If API returned filtered subjects, use them. If it returned ALL (unfiltered) or zero, handle gracefully.
  const ALL_SUBJECTS_THRESHOLD = 30;
  
  const filteredSubjects = useMemo(() => {
    if (!standardLevel) return [];
    
    // If API returned a reasonable number of subjects, it was filtered — use them directly
    if (availableSubjects.length > 0 && availableSubjects.length <= ALL_SUBJECTS_THRESHOLD) {
      return availableSubjects;
    }
    
    // API returned too many (unfiltered) or zero — this standard has no subjects in backend
    // Return empty — don't show all 86 subjects
    return [];
  }, [standardLevel, availableSubjects]);
  
  const toggleSubject = (sub: { id: number; name: string }) => {
    setSelectedSubjects((prev) => {
      if (prev.some((s) => s.id === sub.id)) return prev.filter((s) => s.id !== sub.id);
      if (prev.length >= MAX_SUBJECTS) {
        toast({ title: "Limit reached", description: "You can select up to 5 subjects only", variant: "destructive" });
        return prev;
      }
      return [...prev, sub];
    });
  };

  const validateStep = () => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!firstName.trim()) errs.firstName = "First name is required";
      if (!lastName.trim()) errs.lastName = "Last name is required";
      if (!birthMonth) errs.birthMonth = "Required";
      if (!birthYear) errs.birthYear = "Required";
      if (!profileImage) errs.profileImage = "Profile image is required";
    }
    if (step === 1) {
      if (!ratePerHour || parseFloat(ratePerHour) <= 0) errs.ratePerHour = "Enter a valid rate";
    }
    if (step === 2) {
      if (selectedLanguages.length === 0) errs.languages = "Select at least one language";
      if (!standardLevel) errs.standardLevel = "Select a standard level";
      // Only require subjects if subjects are available for this standard
      if (filteredSubjects.length > 0 && selectedSubjects.length === 0) errs.subjects = "Select at least one subject";
    }
    if (step === 3) {
      if (!aboutMe.trim()) errs.aboutMe = "Required";
      if (aboutMe.split(/\s+/).filter(Boolean).length > 500) errs.aboutMe = "Max 500 words";
      if (selectedDays.length === 0) errs.selectedDays = "Select at least one available day";
      if (!workExperiences.some((w) => w.title.trim())) errs.workExperience = "Add at least one work experience";
      if (!educations.some((e) => e.degree.trim())) errs.education = "Add at least one educational qualification";
    }
    if (step === 4) {
      if (!verifyFullName.trim()) errs.verifyFullName = "Required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => setStep((s) => Math.max(s - 1, 0));

  // ─── SAVE — All API calls with correct formats ───
  const handleSave = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const headers = getAuthHeaders();

      // ── 1. Profile image upload ──
      let uploadedImagePath = "";
      if (profileImage && profileImage.startsWith("data:")) {
        const blob = await fetch(profileImage).then((r) => r.blob());
        const imgFormData = new FormData();
        imgFormData.append("file", blob, "profile.jpg");
        imgFormData.append("type", "image");
        const imgRes = await fetch(`${API_BASE}/store-image`, {
          method: "POST",
          headers: { Authorization: headers.Authorization },
          body: imgFormData,
        });
        if (imgRes.ok) {
          const imgData = await imgRes.json();
          uploadedImagePath = imgData?.path || imgData?.data?.path || imgData?.data || "";
          console.log("Image upload response:", imgData);
        }
      }

      // ── 2. Update profile ──
      await fetch(`${API_BASE}/user/update-profile`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: firstName,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          country_id: countryId || 1,
          calling_digits: callingDigits || "10",
          phone: phone,
          date_of_birth: `${birthYear}-${birthMonth}-01`,
          about_me: aboutMe,
          rate_per_hour: parseFloat(ratePerHour) || 0,
          group_rate_per_hour: parseFloat(groupRate) || 0,
          demo_class: offersDemo ? 1 : 0,
          intro_fee: introFee,
          facebook: facebook,
          twitter: twitter,
          linkedin: linkedin,
          // FIX: Send uploaded image path so backend saves it to profile
          ...(uploadedImagePath ? { profile_img: uploadedImagePath } : {}),
        }),
      });

      // ── 3. Languages — backend expects { languages: { id: value, id: value } } ──
      if (selectedLanguages.length > 0) {
        const languagesObj: Record<number, string> = {};
        selectedLanguages.forEach((l) => {
          languagesObj[l.id] = l.name;
        });
        await fetch(`${API_BASE}/teacher/store-languages`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ languages: languagesObj }),
        });
      }

      // ── 4. Classes/Standards — backend expects { classes: { id: value } } ──
      if (standardLevel) {
        const classesObj: Record<string, string> = {};
        classesObj[standardLevel] = "1";
        await fetch(`${API_BASE}/teacher/store-classes`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ classes: classesObj }),
        });
      }

      // ── 5. Subjects — backend expects { subjects: { id: value, id: value } } ──
      if (selectedSubjects.length > 0) {
        const subjectsObj: Record<number, string> = {};
        selectedSubjects.forEach((s) => {
          subjectsObj[s.id] = s.name;
        });
        await fetch(`${API_BASE}/teacher/store-subjects`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ subjects: subjectsObj }),
        });
      }

      // ── 6. Schedule — backend expects { data: [{ name, start_time, end_time, available }] } ──
      if (selectedDays.length > 0) {
        const scheduleData = WEEKDAYS.map((day) => {
          const schedule = weeklySchedule[day];
          if (schedule && selectedDays.includes(day)) {
            // FIX: Backend expects 12h AM/PM format (h:i A) — send as-is, don't convert to 24h
            return {
              name: day.toLowerCase(),
              start_time: schedule.start,  // e.g. "09:00 AM"
              end_time: schedule.end,      // e.g. "11:00 AM"
              available: 1,
            };
          }
          return {
            name: day.toLowerCase(),
            start_time: null,
            end_time: null,
            available: 0,
          };
        });
        console.log("Saving schedule:", JSON.stringify({ data: scheduleData }, null, 2));
        const scheduleRes = await fetch(`${API_BASE}/teacher/store-schedule`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ data: scheduleData }),
        });
        const scheduleResult = await scheduleRes.json().catch(() => null);
        console.log("Schedule save response:", scheduleRes.status, scheduleResult);
      } else {
        console.log("No days selected — schedule not saved");
      }

      // ── 7. Education — backend expects start_time in d/m/Y format ──
      for (const edu of educations.filter((e) => e.degree.trim())) {
        const startDate = edu.startTime || `01/01/${edu.year || "2020"}`;
        const formattedStart = formatToBackendDate(startDate, edu.year);
        
        // Build end_time if provided
        let formattedEnd: string | undefined;
        if (edu.endTime && !edu.stillStudy) {
          formattedEnd = formatToBackendDate(edu.endTime);
        }

        await fetch(`${API_BASE}/teacher/store-education-history`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            list_id: edu.id || null,
            title: edu.degree,
            type: edu.type || "Bachelors",
            institute_name: edu.institution,
            location: edu.location || "N/A",
            start_time: formattedStart,
            end_time: formattedEnd || undefined,
            still_study: edu.stillStudy || 0,
          }),
        });
      }

      // ── 8. Work experience — backend expects start_time in d/m/Y format ──
      for (const exp of workExperiences.filter((w) => w.title.trim())) {
        let formattedStart = "01/01/2020";
        if (exp.startTime && exp.startTime.includes("/")) {
          formattedStart = formatToBackendDate(exp.startTime);
        } else if (exp.duration && /^\d{4}$/.test(exp.duration)) {
          formattedStart = `01/01/${exp.duration}`;
        } else if (exp.startTime && /^\d{4}/.test(exp.startTime)) {
          formattedStart = `01/01/${exp.startTime.slice(0, 4)}`;
        }

        // Build end_time if provided
        let formattedEnd: string | undefined;
        if (exp.endTime && !exp.stillWork) {
          if (exp.endTime.includes("/")) {
            formattedEnd = formatToBackendDate(exp.endTime);
          } else if (/^\d{4}/.test(exp.endTime)) {
            formattedEnd = `01/01/${exp.endTime.slice(0, 4)}`;
          }
        }

        await fetch(`${API_BASE}/teacher/store-work-experience`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            list_id: exp.id || null,
            title: exp.title,
            type: exp.type || "internship",
            company_name: exp.company,
            location: exp.location || "N/A",
            start_time: formattedStart,
            end_time: formattedEnd || undefined,
            still_work: exp.stillWork || 0,
          }),
        });
      }

      // ── 9. Verification ──
      await fetch(`${API_BASE}/teacher/store-verification`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: verifyFullName,
          linkedin_url: verifySocialLink || "",
          profile_img: verifyPhoto && !verifyPhoto.startsWith("data:") ? verifyPhoto : undefined,
          identity_file_front: certDoc || undefined,
          identity_file_back: idDoc || undefined,
        }),
      });

      // ── 10. Blocked Dates (PTO) — delete old then save new ──
      // First delete all existing PTO dates
      try {
        const existingPto = await api.get("/teacher/get-pto");
        const ptoList = existingPto.data?.pto || existingPto.data?.data?.pto || [];
        for (const pto of ptoList) {
          if (pto.id) {
            await fetch(`${API_BASE}/teacher/delete-pto?id=${pto.id}`, {
              method: "GET",
              headers,
            });
          }
        }
      } catch {}
      // Then save new blocked dates
      if (blockedDates.length > 0) {
        const dateStrings = blockedDates.map((d) => format(d, "yyyy-MM-dd"));
        await fetch(`${API_BASE}/teacher/store-pto`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ dates: dateStrings }),
        });
      }

      // ── LocalStorage update ──
      const displayName = [firstName, lastName].filter(Boolean).join(" ");
      localStorage.setItem("userName", displayName);
      localStorage.setItem("teacherProfileComplete", "true");
      if (profileImage) localStorage.setItem("userAvatar", profileImage);

      setSaving(false);
      toast({ title: "Profile saved!", description: "Your profile has been set up successfully." });

      const profileData: TeacherProfileData = {
        firstName, middleName, lastName, email, phone, country,
        countryId, callingDigits,
        birthMonth, birthYear, profileImage, ratePerHour, groupRate,
        offersDemo, introFee, facebook, twitter, linkedin,
        selectedLanguages, standardLevel, selectedSubjects, aboutMe,
        workExperiences, educations,
        weeklySchedule, selectedDays,
        blockedDates: blockedDates.map((d) => format(d, "yyyy-MM-dd")),
        scheduleTimezone, verifyFullName, verifySocialLink, verifyPhoto,
        certDoc: !!certDoc, idDoc: !!idDoc,
      };

      if (onComplete) {
        onComplete(profileData);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Profile save error:", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      setSaving(false);
    }
  };

  // Helper: format date to d/m/Y for backend
  function formatToBackendDate(dateStr: string, fallbackYear?: string): string {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      const parts = dateStr.split(/[-T]/);
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    const year = fallbackYear || "2020";
    return `01/01/${year}`;
  }

  const wordCount = aboutMe.split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-1">Complete Your Profile</h1>
      <p className="text-muted-foreground mb-6">Fill in your details to get started as an educator.</p>

      {/* Progress */}
      <div className="flex items-center gap-1 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn("h-2 w-full rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("text-xs font-medium hidden sm:block", i <= step ? "text-primary" : "text-muted-foreground")}>{s}</span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-soft"
        >
          {/* ═══ Step 0: Basic Info ═══ */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

              {/* Profile Image */}
              <div className="flex items-center gap-4">
                <div
                  className="w-[90px] h-[90px] rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                  onClick={() => imgRef.current?.click()}
                >
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" className="w-full h-full object-cover object-center" />
                  ) : (
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Profile Photo <span className="text-destructive">*</span></p>
                  <p className="text-xs text-muted-foreground">Click to upload (will be cropped to square)</p>
                  {errors.profileImage && <p className="text-xs text-destructive">{errors.profileImage}</p>}
                </div>
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = () => {
                        setRawImage(reader.result as string);
                        setShowCropper(true);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </div>

              <ImageCropper
                imageSrc={rawImage || ""}
                open={showCropper}
                onClose={() => setShowCropper(false)}
                onCropComplete={(cropped) => setProfileImage(cropped)}
              />

              {/* FIX: Name fields are now EDITABLE — removed "disabled" and "bg-muted opacity-60", added onChange */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>First Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={firstName}
                    onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: "" })); }}
                    placeholder="First name"
                  />
                  {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Middle Name</Label>
                  <Input
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    placeholder="Middle name (optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Last Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={lastName}
                    onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: "" })); }}
                    placeholder="Last name"
                  />
                  {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input value={email} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={phone} disabled className="bg-muted" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={country} disabled className="bg-muted" />
              </div>

              <div className="space-y-1.5">
                <Label>Date of Birth <span className="text-destructive">*</span></Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Select value={birthMonth} onValueChange={(v) => { setBirthMonth(v); setErrors((p) => ({ ...p, birthMonth: "" })); }}>
                      <SelectTrigger className={cn(errors.birthMonth && "border-destructive")}>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                      <SelectContent>
                        {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                          <SelectItem key={m} value={String(i + 1).padStart(2, "0")}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.birthMonth && <p className="text-xs text-destructive">{errors.birthMonth}</p>}
                  </div>
                  <div className="space-y-1">
                    <Select value={birthYear} onValueChange={(v) => { setBirthYear(v); setErrors((p) => ({ ...p, birthYear: "" })); }}>
                      <SelectTrigger className={cn(errors.birthYear && "border-destructive")}>
                        <SelectValue placeholder="Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 16 - i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.birthYear && <p className="text-xs text-destructive">{errors.birthYear}</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 1: Rates & Social ═══ */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Rates & Social Media</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Rate Per Hour (USD) <span className="text-destructive">*</span></Label>
                  <Select value={ratePerHour} onValueChange={(val) => { setRatePerHour(val); setErrors((p) => ({ ...p, ratePerHour: "" })); }}>
                    <SelectTrigger className={errors.ratePerHour ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select rate" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 40 }, (_, i) => (i + 1) * 5).map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>${rate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.ratePerHour && <p className="text-xs text-destructive">{errors.ratePerHour}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Per Student Rate for Group Class (USD)</Label>
                  <Select value={groupRate} onValueChange={setGroupRate}>
                    <SelectTrigger><SelectValue placeholder="Select rate" /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 40 }, (_, i) => (i + 1) * 5).map((rate) => (
                        <SelectItem key={rate} value={String(rate)}>${rate}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-border">
                <div className="flex items-start gap-3 pt-3">
                  <Checkbox id="offersDemo" checked={offersDemo} onCheckedChange={(checked) => setOffersDemo(checked === true)} className="mt-0.5" />
                  <div className="space-y-0.5">
                    <Label htmlFor="offersDemo" className="cursor-pointer font-medium">Offer Demo Session?</Label>
                    <p className="text-xs text-muted-foreground">Allow students to book one free trial session</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-muted-foreground">Intro Fee: ${introFee > 0 ? introFee : "0"} (Auto-calculated)</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild><Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" /></TooltipTrigger>
                        <TooltipContent side="top" className="max-w-[250px] text-xs">Students pay this one-time fee to unlock your full profile. Minimum $30, or equal to your hourly rate if above $30.</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input type="text" disabled value={introFee > 0 ? `$${introFee}` : "$0"} className="bg-muted text-muted-foreground cursor-not-allowed max-w-[200px]" />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <p className="text-sm font-medium text-foreground">Social Media Links <span className="text-muted-foreground font-normal">(optional)</span></p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://facebook.com/..." />
                  </div>
                  <div className="flex items-center gap-3">
                    <Twitter className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Input value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/..." />
                  </div>
                  <div className="flex items-center gap-3">
                    <Linkedin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <Input value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 2: Standards & Subjects (now from backend) ═══ */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Standards & Subjects</h2>

              {/* Languages — from backend */}
              <div className="space-y-2">
                <Label>Languages <span className="text-destructive">*</span></Label>
                <div className="flex flex-wrap gap-2">
                  {(availableLanguages.length > 0 ? availableLanguages : languages.map((l, i) => ({ id: i + 1, name: l }))).map((lang) => {
                    const isSelected = selectedLanguages.some((sl) => sl.id === lang.id);
                    return (
                      <Badge
                        key={lang.id}
                        variant={isSelected ? "default" : "outline"}
                        className={cn("cursor-pointer transition-colors", isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-muted")}
                        onClick={() => toggleLanguage(lang)}
                      >
                        {lang.name}
                        {isSelected && <X className="w-3 h-3 ml-1" />}
                      </Badge>
                    );
                  })}
                </div>
                {errors.languages && <p className="text-xs text-destructive">{errors.languages}</p>}
              </div>

              {/* Standard Level — from backend */}
              <div className="space-y-1.5">
                <Label>Educator Standard Level <span className="text-destructive">*</span></Label>
                <Select
                  value={standardLevel}
                  onValueChange={(v) => {
                    setStandardLevel(v);
                    setSelectedSubjects([]);
                    setErrors((p) => ({ ...p, standardLevel: "" }));
                  }}
                >
                  <SelectTrigger className={cn(errors.standardLevel && "border-destructive")}>
                    <SelectValue placeholder="Select standard level" />
                  </SelectTrigger>
                  <SelectContent>
                    {(availableClasses.length > 0
                      ? availableClasses
                      : educatorStandards.map((s, i) => ({ id: i + 1, name: s }))
                    ).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.standardLevel && <p className="text-xs text-destructive">{errors.standardLevel}</p>}
              </div>

              {/* Subjects — from backend, filtered by standard */}
              {standardLevel && (
                <div className="space-y-2">
                  <Label>Subjects {filteredSubjects.length > 0 && <span className="text-destructive">*</span>}</Label>
                  {subjectsLoading ? (
                    <div className="flex items-center gap-2 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading subjects...</span>
                    </div>
                  ) : filteredSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No subjects available for this standard.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {filteredSubjects.map((sub) => {
                          const isSelected = selectedSubjects.some((ss) => ss.id === sub.id);
                          const isDisabled = !isSelected && selectedSubjects.length >= MAX_SUBJECTS;
                          return (
                            <Badge
                              key={sub.id}
                              variant={isSelected ? "default" : "outline"}
                              className={cn("transition-colors", isSelected ? "cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90" : isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted")}
                              onClick={() => !isDisabled && toggleSubject(sub)}
                            >
                              {sub.name}
                              {isSelected && <X className="w-3 h-3 ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className={cn("text-xs", selectedSubjects.length >= MAX_SUBJECTS ? "text-destructive" : "text-muted-foreground")}>
                        {selectedSubjects.length}/{MAX_SUBJECTS} subjects selected
                      </p>
                    </>
                  )}
                  {errors.subjects && <p className="text-xs text-destructive">{errors.subjects}</p>}
                </div>
              )}
            </div>
          )}

          {/* ═══ Step 3: Professional Info ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Professional Information</h2>

              {/* About Me */}
              <div className="space-y-1.5">
                <Label>About Me <span className="text-destructive">*</span></Label>
                <Textarea value={aboutMe} onChange={(e) => { setAboutMe(e.target.value); setErrors((p) => ({ ...p, aboutMe: "" })); }} placeholder="Tell students about yourself, your teaching style, and experience..." rows={5} className={errors.aboutMe ? "border-destructive" : ""} />
                <p className={cn("text-xs", wordCount > 500 ? "text-destructive" : "text-muted-foreground")}>{wordCount}/500 words</p>
                {errors.aboutMe && <p className="text-xs text-destructive">{errors.aboutMe}</p>}
              </div>

              {/* Work Experience */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Work Experience <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setWorkExperiences((p) => [...p, { title: "", company: "", type: "internship", location: "" }])}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                {workExperiences.map((we, i) => {
                  const startYear = we.startTime?.includes("/") ? we.startTime.split("/")[2] : (we.startTime?.slice(0, 4) || we.duration || "");
                  const endYear = we.endTime?.includes("/") ? we.endTime.split("/")[2] : (we.endTime?.slice(0, 4) || "");
                  return (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="Job Title" value={we.title} onChange={(e) => { const n = [...workExperiences]; n[i].title = e.target.value; setWorkExperiences(n); }} />
                      <Input placeholder="Company" value={we.company} onChange={(e) => { const n = [...workExperiences]; n[i].company = e.target.value; setWorkExperiences(n); }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={startYear} onValueChange={(v) => { const n = [...workExperiences]; n[i].startTime = `01/01/${v}`; n[i].duration = v; setWorkExperiences(n); }}>
                        <SelectTrigger><SelectValue placeholder="Start Year" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 30 }, (_, j) => new Date().getFullYear() - j).map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endYear} onValueChange={(v) => { const n = [...workExperiences]; n[i].endTime = `01/01/${v}`; setWorkExperiences(n); }} disabled={we.stillWork === 1}>
                        <SelectTrigger className={we.stillWork === 1 ? "opacity-50" : ""}><SelectValue placeholder="End Year" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 30 }, (_, j) => new Date().getFullYear() - j).map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={we.type || "internship"} onValueChange={(v) => { const n = [...workExperiences]; n[i].type = v; setWorkExperiences(n); }}>
                        <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internship">Internship</SelectItem>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`stillWork-${i}`}
                        checked={we.stillWork === 1}
                        onCheckedChange={(checked) => { const n = [...workExperiences]; n[i].stillWork = checked ? 1 : 0; if (checked) n[i].endTime = ""; setWorkExperiences(n); }}
                      />
                      <Label htmlFor={`stillWork-${i}`} className="text-xs cursor-pointer">Currently working here</Label>
                      {workExperiences.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-destructive ml-auto" onClick={() => setWorkExperiences((p) => p.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
                {errors.workExperience && <p className="text-xs text-destructive">{errors.workExperience}</p>}
              </div>

              {/* Education */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Educational Qualifications <span className="text-destructive">*</span></Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setEducations((p) => [...p, { degree: "", institution: "", type: "Bachelors", location: "" }])}>
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
                {educations.map((ed, i) => {
                  const startYear = ed.startTime?.includes("/") ? ed.startTime.split("/")[2] : (ed.startTime?.slice(0, 4) || ed.year || "");
                  const endYear = ed.endTime?.includes("/") ? ed.endTime.split("/")[2] : (ed.endTime?.slice(0, 4) || "");
                  return (
                  <div key={i} className="p-3 bg-muted/50 rounded-lg space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input placeholder="Degree / Program" value={ed.degree} onChange={(e) => { const n = [...educations]; n[i].degree = e.target.value; setEducations(n); }} />
                      <Input placeholder="Institution" value={ed.institution} onChange={(e) => { const n = [...educations]; n[i].institution = e.target.value; setEducations(n); }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Select value={startYear} onValueChange={(v) => { const n = [...educations]; n[i].startTime = `01/01/${v}`; n[i].year = v; setEducations(n); }}>
                        <SelectTrigger><SelectValue placeholder="Start Year" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 40 }, (_, j) => new Date().getFullYear() - j).map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={endYear} onValueChange={(v) => { const n = [...educations]; n[i].endTime = `01/01/${v}`; setEducations(n); }} disabled={ed.stillStudy === 1}>
                        <SelectTrigger className={ed.stillStudy === 1 ? "opacity-50" : ""}><SelectValue placeholder="End Year" /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 40 }, (_, j) => new Date().getFullYear() + 5 - j).map((y) => (
                            <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={ed.type || "Bachelors"} onValueChange={(v) => { const n = [...educations]; n[i].type = v; setEducations(n); }}>
                        <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Primary">Primary</SelectItem>
                          <SelectItem value="Secondary">Secondary</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Bachelors">Bachelors</SelectItem>
                          <SelectItem value="Masters">Masters</SelectItem>
                          <SelectItem value="MPhil">MPhil</SelectItem>
                          <SelectItem value="PhD">PhD</SelectItem>
                          <SelectItem value="Diploma">Diploma</SelectItem>
                          <SelectItem value="Certificate">Certificate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`stillStudy-${i}`}
                        checked={ed.stillStudy === 1}
                        onCheckedChange={(checked) => { const n = [...educations]; n[i].stillStudy = checked ? 1 : 0; if (checked) n[i].endTime = ""; setEducations(n); }}
                      />
                      <Label htmlFor={`stillStudy-${i}`} className="text-xs cursor-pointer">Currently studying here</Label>
                      {educations.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="flex-shrink-0 text-destructive ml-auto" onClick={() => setEducations((p) => p.filter((_, j) => j !== i))}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
                {errors.education && <p className="text-xs text-destructive">{errors.education}</p>}
              </div>


              {/* Schedule */}
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Schedule — Set Your Weekly Availability</Label>
                  <p className="text-xs text-muted-foreground mt-1">Select the days you're available and set your time for each day.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    <Globe className="w-4 h-4 inline mr-1.5" />Your Timezone
                  </label>
                  <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allTimezones.map((tz) => (<SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Select Available Days <span className="text-destructive">*</span></p>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const isActive = selectedDays.includes(day);
                      return (
                        <button key={day} type="button" onClick={() => {
                          if (isActive) {
                            setSelectedDays((prev) => prev.filter((d) => d !== day));
                            setWeeklySchedule((prev) => { const updated = { ...prev }; delete updated[day]; return updated; });
                          } else {
                            setSelectedDays((prev) => [...prev, day]);
                            setWeeklySchedule((prev) => ({ ...prev, [day]: prev[day] || { start: "09:00 AM", end: "11:00 AM" } }));
                          }
                        }} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-all border", isActive ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground")}>
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                  {errors.selectedDays && <p className="text-xs text-destructive mt-1">{errors.selectedDays}</p>}
                </div>

                {selectedDays.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-foreground">Set Time for Selected Days</p>
                    {WEEKDAYS.filter((d) => selectedDays.includes(d)).map((day) => {
                      const schedule = weeklySchedule[day] || { start: "09:00 AM", end: "11:00 AM" };
                      const start24 = parse12To24(schedule.start);
                      const end24 = parse12To24(schedule.end);
                      const startMins = parseInt(start24.split(":")[0]) * 60 + parseInt(start24.split(":")[1]);
                      const endMins = parseInt(end24.split(":")[0]) * 60 + parseInt(end24.split(":")[1]);
                      const isValid = endMins - startMins >= 60;

                      return (
                        <motion.div key={day} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn("rounded-xl border p-4 bg-card space-y-3", isValid ? "border-border" : "border-destructive")}>
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><Clock className="w-4 h-4 text-primary" />{day}</h4>
                            <span className="text-xs text-muted-foreground">{getTimezoneAbbr(scheduleTimezone)}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">Start Time</label>
                              <Select value={schedule.start} onValueChange={(v) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], start: v } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs text-muted-foreground">End Time</label>
                              <Select value={schedule.end} onValueChange={(v) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], end: v } }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {TIME_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {!isValid && <p className="text-xs text-destructive">End time must be at least 1 hour after start time.</p>}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-xl border border-dashed border-border">
                    <Clock className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No days selected yet.</p>
                    <p className="text-xs text-muted-foreground">Click the day buttons above to set your availability.</p>
                  </div>
                )}

                {selectedDays.length > 0 && <p className="text-xs text-muted-foreground">{selectedDays.length} day(s) configured for weekly availability.</p>}
              </div>

              {/* Block Dates */}
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-base font-semibold">Block Dates (PTO)</Label>
                  <p className="text-xs text-muted-foreground mt-1">Block specific dates when unavailable.</p>
                </div>
                <Dialog open={showPTOModal} onOpenChange={setShowPTOModal}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="outline" className="border-primary text-primary hover:bg-primary/10" disabled={selectedDays.length === 0}>
                      <CalendarOff className="w-4 h-4 mr-2" />Block Dates
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Block Dates</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Click on your available days to block them.</p>
                    <Calendar
                      mode="multiple" selected={blockedDates} onSelect={(dates) => setBlockedDates(dates || [])} className="p-3 pointer-events-auto mx-auto"
                      disabled={(date) => {
                        if (isBefore(date, startOfDay(new Date()))) return true;
                        const jsDay = getDay(date);
                        const dayMap: Record<number, string> = { 0: "Sunday", 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday" };
                        return !selectedDays.includes(dayMap[jsDay]);
                      }}
                      modifiers={{ blocked: blockedDates }}
                      modifiersClassNames={{ blocked: "bg-destructive text-destructive-foreground hover:bg-destructive/90" }}
                    />
                    <Button onClick={() => setShowPTOModal(false)} className="w-full">Done</Button>
                  </DialogContent>
                </Dialog>
                {blockedDates.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Blocked Dates ({blockedDates.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {blockedDates.sort((a, b) => a.getTime() - b.getTime()).map((date) => (
                        <Badge key={date.toISOString()} variant="secondary" className="gap-1 pl-3 pr-1.5 py-1.5">
                          {format(date, "MMM d, yyyy")}
                          <button type="button" onClick={() => setBlockedDates((prev) => prev.filter((d) => d.getTime() !== date.getTime()))} className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ Step 4: Verification ═══ */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-foreground">Educator Verification</h2>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-muted border-2 border-dashed border-border flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors" onClick={() => verifyPhotoRef.current?.click()}>
                  {verifyPhoto ? (<img src={verifyPhoto} alt="Verification" className="w-full h-full object-cover" />) : (<Upload className="w-5 h-5 text-muted-foreground" />)}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Photo Upload</p>
                  <p className="text-xs text-muted-foreground">Upload a clear photo of yourself</p>
                </div>
                <input ref={verifyPhotoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, setVerifyPhoto)} />
              </div>

              <div className="space-y-1.5">
                <Label>Full Name <span className="text-destructive">*</span></Label>
                <Input value={verifyFullName} onChange={(e) => { setVerifyFullName(e.target.value); setErrors((p) => ({ ...p, verifyFullName: "" })); }} placeholder="Enter your full legal name" className={errors.verifyFullName ? "border-destructive" : ""} />
                {errors.verifyFullName && <p className="text-xs text-destructive">{errors.verifyFullName}</p>}
              </div>

              <div className="space-y-1.5">
                <Label>Social Link <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input value={verifySocialLink} onChange={(e) => setVerifySocialLink(e.target.value)} placeholder="https://..." />
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Highest Educational/Professional Certification <span className="text-destructive">*</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">e.g. Masters Degree</p>
                  <Button type="button" variant="outline" onClick={() => certRef.current?.click()} className={cn("w-full justify-start", errors.certDoc && "border-destructive")}>
                    <Upload className="w-4 h-4 mr-2" />{certDoc ? "Document uploaded ✓" : "Upload certification"}
                  </Button>
                  <input ref={certRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) { setCertDoc(e.target.files[0].name); setErrors((p) => ({ ...p, certDoc: "" })); } }} />
                  {errors.certDoc && <p className="text-xs text-destructive">{errors.certDoc}</p>}
                </div>
                <div>
                  <Label className="text-sm">Photo ID <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <p className="text-xs text-muted-foreground mb-2">e.g. Driving License or Passport</p>
                  <Button type="button" variant="outline" onClick={() => idRef.current?.click()} className="w-full justify-start">
                    <Upload className="w-4 h-4 mr-2" />{idDoc ? "Document uploaded ✓" : "Upload photo ID"}
                  </Button>
                  <input ref={idRef} type="file" className="hidden" onChange={(e) => { if (e.target.files?.[0]) setIdDoc(e.target.files[0].name); }} />
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={prev}><ChevronLeft className="w-4 h-4 mr-1" /> Previous</Button>
            ) : (<div />)}
            {step < 3 ? (
              <Button type="button" onClick={next}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : step === 3 ? (
              <Button type="button" onClick={next}>Save and Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button type="button" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
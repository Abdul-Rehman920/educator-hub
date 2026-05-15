import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Globe, X, ShieldCheck, Mail, FileText, Camera, Loader2, Clock, DollarSign } from "lucide-react";
import { ImageCropper } from "@/components/ImageCropper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { allTimezones } from "@/data/timezones";

const MAX_SUBJECTS = 5;

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Budget range constants
const BUDGET_MIN = 5;
const BUDGET_MAX = 200;
const BUDGET_STEP = 5;
const BUDGET_OPTIONS: number[] = [];
for (let v = BUDGET_MIN; v <= BUDGET_MAX; v += BUDGET_STEP) {
  BUDGET_OPTIONS.push(v);
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

interface WeeklySchedule {
  [day: string]: { start: string; end: string };
}

interface BackendItem {
  id: number;
  name: string;
  status?: number;
}

interface StudentProfileSetupProps {
  onComplete: (data: StudentProfileData) => void;
  isMinor?: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhotoIdName?: string;
  initialFirstName?: string;
  initialLastName?: string;
  initialEmail?: string;
  initialCountry?: string;
  initialPhone?: string;
  initialCountryData?: {
    id: number;
    name: string;
    currency: string;
    timezone: string;
    calling_digits: string;
    calling_code: string;
  } | null;
  initialLanguages?: string[];
  initialEducationLevel?: string;
  initialEducationLevelId?: number | null;
  initialSubjects?: string[];
  initialBirthMonth?: string;
  initialBirthYear?: string;
  initialProfileImage?: string;
  initialScheduleTimezone?: string;
  initialSelectedDays?: string[];
  initialWeeklySchedule?: WeeklySchedule;
  initialBudgetMin?: number;
  initialBudgetMax?: number;
}

export interface StudentProfileData {
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  phone: string;
  birthMonth: string;
  birthYear: string;
  selectedLanguages: string[];
  educationLevel: string;
  selectedSubjects: string[];
  profilePhoto?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhotoIdName?: string;
  weeklySchedule?: WeeklySchedule;
  selectedDays?: string[];
  scheduleTimezone?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export function StudentProfileSetup({
  onComplete,
  isMinor = false,
  guardianName = "",
  guardianEmail = "",
  guardianPhotoIdName = "",
  initialFirstName = "",
  initialLastName = "",
  initialEmail = "",
  initialCountry = "",
  initialPhone = "",
  initialCountryData = null,
  initialLanguages = [],
  initialEducationLevel = "",
  initialEducationLevelId = null,
  initialSubjects = [],
  initialBirthMonth = "",
  initialBirthYear = "",
  initialProfileImage = "",
  initialScheduleTimezone = "",
  initialSelectedDays = [],
  initialWeeklySchedule = {},
  initialBudgetMin,
  initialBudgetMax,
}: StudentProfileSetupProps) {
  // Adults: 3 steps (Basic, Education, Schedule)
  // Minors: 4 steps (Basic, Guardian, Education, Schedule)
  const totalSteps = isMinor ? 4 : 3;
  const educationStepIndex = isMinor ? 2 : 1;
  const scheduleStepIndex = isMinor ? 3 : 2;

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Profile photo
  const existingImageUrl = initialProfileImage && !initialProfileImage.startsWith("data:")
    ? (initialProfileImage.startsWith("http")
        ? initialProfileImage
        : `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}/${initialProfileImage}`)
    : initialProfileImage || undefined;

  const [profilePhoto, setProfilePhoto] = useState<string | undefined>(existingImageUrl);
  const [newPhotoSelected, setNewPhotoSelected] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backend data
  const [backendLanguages, setBackendLanguages] = useState<BackendItem[]>([]);
  const [backendStandards, setBackendStandards] = useState<BackendItem[]>([]);
  const [backendSubjects, setBackendSubjects] = useState<BackendItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch languages and standards from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true);
      try {
        const token = localStorage.getItem("auth_token");
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [langRes, classRes] = await Promise.all([
          fetch(`${baseUrl}/student/languages`, { headers }),
          fetch(`${baseUrl}/student/classes`, { headers }),
        ]);

        if (langRes.ok) {
          const langData = await langRes.json();
          setBackendLanguages(langData?.languages || langData?.data?.languages || []);
        }

        if (classRes.ok) {
          const classData = await classRes.json();
          setBackendStandards(classData?.standards || classData?.data?.standards || []);
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setLoadingData(false);
      }
    };
    fetchData();
  }, []);

  // Fetch subjects for a standard
  const fetchSubjectsForStandard = async (standardId: number) => {
    try {
      const token = localStorage.getItem("auth_token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const res = await fetch(`${baseUrl}/v1/users/subject`, {
        method: "POST",
        headers,
        body: JSON.stringify({ id: String(standardId) }),
      });

      if (res.ok) {
        const data = await res.json();
        setBackendSubjects(data?.subjects || data?.data?.subjects || []);
      } else {
        const fallbackRes = await fetch(`${baseUrl}/student/subjects`, { headers });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          setBackendSubjects(fallbackData?.subjects || fallbackData?.data?.subjects || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch subjects:", error);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Step 1 state
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [email] = useState(initialEmail);
  const [country] = useState(initialCountry);
  const [phone] = useState(initialPhone);
  const [countryData] = useState(initialCountryData);
  const [birthMonth, setBirthMonth] = useState(initialBirthMonth);
  const [birthYear, setBirthYear] = useState(initialBirthYear);

  // Step 2 state - Education
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<Map<number, string>>(new Map());
  const [selectedStandardId, setSelectedStandardId] = useState<number | null>(initialEducationLevelId);
  const [selectedStandardName, setSelectedStandardName] = useState(initialEducationLevel);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Map<number, string>>(new Map());

  // Step 3 state - Schedule (pre-filled if editing)
  const [scheduleTimezone, setScheduleTimezone] = useState(
    initialScheduleTimezone || getLocalTimezone()
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(initialSelectedDays);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(initialWeeklySchedule);

  // Step 3 state - Budget Range (NEW)
  const [budgetMin, setBudgetMin] = useState<number>(
    initialBudgetMin && initialBudgetMin >= BUDGET_MIN && initialBudgetMin <= BUDGET_MAX
      ? initialBudgetMin
      : BUDGET_MIN
  );
  const [budgetMax, setBudgetMax] = useState<number>(
    initialBudgetMax && initialBudgetMax >= BUDGET_MIN && initialBudgetMax <= BUDGET_MAX
      ? initialBudgetMax
      : 50
  );

  // Pre-fill languages when backend data loads
  useEffect(() => {
    if (backendLanguages.length > 0 && initialLanguages.length > 0) {
      const map = new Map<number, string>();
      initialLanguages.forEach((langName) => {
        const found = backendLanguages.find((l) => l.name === langName);
        if (found) map.set(found.id, found.name);
      });
      if (map.size > 0) setSelectedLanguageIds(map);
    }
  }, [backendLanguages, initialLanguages]);

  // Pre-fill education level when backend data loads
  useEffect(() => {
    if (backendStandards.length > 0) {
      if (initialEducationLevelId) {
        const found = backendStandards.find((s) => s.id === initialEducationLevelId);
        if (found) {
          setSelectedStandardId(found.id);
          setSelectedStandardName(found.name);
          fetchSubjectsForStandard(found.id);
          return;
        }
      }
      if (initialEducationLevel) {
        const found = backendStandards.find((s) => s.name === initialEducationLevel);
        if (found) {
          setSelectedStandardId(found.id);
          setSelectedStandardName(found.name);
          fetchSubjectsForStandard(found.id);
        }
      }
    }
  }, [backendStandards, initialEducationLevel, initialEducationLevelId]);

  // Pre-fill subjects when backend subjects load
  useEffect(() => {
    if (backendSubjects.length > 0 && initialSubjects.length > 0) {
      const map = new Map<number, string>();
      initialSubjects.forEach((subName) => {
        const found = backendSubjects.find((s) => s.name === subName);
        if (found) map.set(found.id, found.name);
      });
      if (map.size > 0) setSelectedSubjectIds(map);
    }
  }, [backendSubjects, initialSubjects]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Budget handlers — keep min <= max always
  const handleBudgetMinChange = (value: number) => {
    if (value > budgetMax) {
      setBudgetMin(value);
      setBudgetMax(value);
    } else {
      setBudgetMin(value);
    }
    setErrors((p) => ({ ...p, budget: "" }));
  };

  const handleBudgetMaxChange = (value: number) => {
    if (value < budgetMin) {
      setBudgetMax(value);
      setBudgetMin(value);
    } else {
      setBudgetMax(value);
    }
    setErrors((p) => ({ ...p, budget: "" }));
  };

  const handleSliderChange = (values: number[]) => {
    if (values.length === 2) {
      setBudgetMin(values[0]);
      setBudgetMax(values[1]);
      setErrors((p) => ({ ...p, budget: "" }));
    }
  };

  const toggleLanguage = (lang: BackendItem) => {
    setSelectedLanguageIds((prev) => {
      const next = new Map(prev);
      if (next.has(lang.id)) {
        next.delete(lang.id);
      } else {
        next.set(lang.id, lang.name);
      }
      return next;
    });
  };

  const toggleSubject = (sub: BackendItem) => {
    setSelectedSubjectIds((prev) => {
      const next = new Map(prev);
      if (next.has(sub.id)) {
        next.delete(sub.id);
        return next;
      }
      if (next.size >= MAX_SUBJECTS) {
        toast({ title: "Limit reached", description: "You can select up to 5 subjects only", variant: "destructive" });
        return prev;
      }
      next.set(sub.id, sub.name);
      return next;
    });
    setErrors((p) => ({ ...p, subjects: "" }));
  };

  const validateStep = () => {
    const errs: Record<string, string> = {};
    if (step === 0) {
      if (!firstName.trim()) errs.firstName = "First name is required";
      if (!lastName.trim()) errs.lastName = "Last name is required";
      if (!birthMonth) errs.birthMonth = "Required";
      if (!birthYear) errs.birthYear = "Required";
    }
    if (step === educationStepIndex) {
      if (selectedLanguageIds.size === 0) errs.languages = "Select at least one language";
      if (!selectedStandardId) errs.educationLevel = "Select an education level";
      if (selectedSubjectIds.size === 0) errs.subjects = "Select at least one subject";
    }
    if (step === scheduleStepIndex) {
      // Budget validation
      if (!budgetMin || !budgetMax) {
        errs.budget = "Please set your budget range";
      } else if (budgetMin > budgetMax) {
        errs.budget = "Maximum must be greater than or equal to minimum";
      } else if (budgetMin < BUDGET_MIN || budgetMax > BUDGET_MAX) {
        errs.budget = `Budget must be between $${BUDGET_MIN} and $${BUDGET_MAX}`;
      }
      // Days validation
      if (selectedDays.length === 0) errs.selectedDays = "Select at least one available day";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const next = () => {
    if (!validateStep()) return;
    setStep((s) => s + 1);
  };

  const back = () => {
    setStep((s) => s - 1);
  };

  const handleSave = async () => {
    if (!validateStep()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("auth_token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      // 1. Update basic profile + timezone + budget
      const updateRes = await fetch(`${baseUrl}/user/update-profile`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: firstName.trim(),
          last_name: lastName.trim(),
          country_id: countryData?.id || 171,
          calling_digits: countryData?.calling_digits || "10",
          phone: phone,
          date_of_birth: `${birthYear}-${birthMonth}-01`,
          timezone: scheduleTimezone,
          budget_min: budgetMin,
          budget_max: budgetMax,
        }),
      });

      if (!updateRes.ok) {
        const errData = await updateRes.json().catch(() => ({}));
        console.error("update-profile failed:", errData);
        toast({ title: "Error", description: "Failed to update profile. Please try again.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // 2. Store languages with IDs as keys
      if (selectedLanguageIds.size > 0) {
        const languagesObj: Record<number, string> = {};
        selectedLanguageIds.forEach((name, id) => { languagesObj[id] = name; });
        await fetch(`${baseUrl}/student/store-languages`, {
          method: "POST", headers,
          body: JSON.stringify({ languages: languagesObj }),
        });
      }

      // 3. Store education level with ID as key
      if (selectedStandardId) {
        const classesObj: Record<number, string> = {};
        classesObj[selectedStandardId] = selectedStandardName;
        await fetch(`${baseUrl}/student/store-classes`, {
          method: "POST", headers,
          body: JSON.stringify({ classes: classesObj }),
        });
      }

      // 4. Store subjects with IDs as keys
      if (selectedSubjectIds.size > 0) {
        const subjectsObj: Record<number, string> = {};
        selectedSubjectIds.forEach((name, id) => { subjectsObj[id] = name; });
        await fetch(`${baseUrl}/student/store-subjects`, {
          method: "POST", headers,
          body: JSON.stringify({ subjects: subjectsObj }),
        });
      }

      // 5. Store schedule with timezone
      if (selectedDays.length > 0) {
        const scheduleData = WEEKDAYS.map((day) => {
          const schedule = weeklySchedule[day];
          if (schedule && selectedDays.includes(day)) {
            return {
              name: day.toLowerCase(),
              start_time: schedule.start,
              end_time: schedule.end,
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

        await fetch(`${baseUrl}/student/store-schedule`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            data: scheduleData,
            timezone: scheduleTimezone,
          }),
        });
      }

      // 6. Profile image upload
      if (newPhotoSelected && profilePhoto && profilePhoto.startsWith("data:")) {
        const blob = await fetch(profilePhoto).then((r) => r.blob());
        const imgFormData = new FormData();
        imgFormData.append("file", blob, "profile.jpg");
        imgFormData.append("type", "image");
        const imgRes = await fetch(`${baseUrl}/store-image`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: imgFormData,
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          const imagePath = imgData?.path || imgData?.data?.path;
          if (imagePath) {
            await fetch(`${baseUrl}/user/update-profile`, {
              method: "POST", headers,
              body: JSON.stringify({
                name: firstName.trim(),
                last_name: lastName.trim(),
                country_id: countryData?.id || 171,
                calling_digits: countryData?.calling_digits || "10",
                phone: phone,
                date_of_birth: `${birthYear}-${birthMonth}-01`,
                timezone: scheduleTimezone,
                budget_min: budgetMin,
                budget_max: budgetMax,
                profile_img: imagePath,
              }),
            });
          }
        }
      }

      const displayName = [firstName, lastName].filter(Boolean).join(" ");
      localStorage.setItem("userName", displayName);
      localStorage.setItem("studentProfileComplete", "true");
      if (profilePhoto) localStorage.setItem("userAvatar", profilePhoto);

      setSaving(false);
      toast({ title: "Profile saved!", description: "Your student profile has been updated successfully." });

      onComplete({
        firstName, lastName, email, country, phone,
        birthMonth, birthYear,
        selectedLanguages: Array.from(selectedLanguageIds.values()),
        educationLevel: selectedStandardName,
        selectedSubjects: Array.from(selectedSubjectIds.values()),
        profilePhoto, isMinor,
        guardianName: isMinor ? guardianName : undefined,
        guardianEmail: isMinor ? guardianEmail : undefined,
        guardianPhotoIdName: isMinor ? guardianPhotoIdName : undefined,
        weeklySchedule,
        selectedDays,
        scheduleTimezone,
        budgetMin,
        budgetMax,
      });
    } catch (error) {
      console.error("Profile save error:", error);
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
      setSaving(false);
    }
  };

  const stepLabels = isMinor
    ? ["Basic Info", "Parent/Guardian", "Education", "Schedule"]
    : ["Basic Info", "Education", "Schedule"];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up your student profile to get started.</p>
      </div>

      <div className="flex items-center gap-2 mb-6">
        {stepLabels.map((s, i) => (
          <div key={s} className="flex-1 flex flex-col items-center gap-1">
            <div className={cn("h-2 w-full rounded-full transition-colors", i <= step ? "bg-primary" : "bg-muted")} />
            <span className={cn("text-xs font-medium", i <= step ? "text-primary" : "text-muted-foreground")}>
              Step {i + 1} of {totalSteps}
            </span>
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
          {/* ── STEP 0: Basic Info ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>

              <div className="flex flex-col items-center gap-2">
                <div
                  className="relative w-[90px] h-[90px] rounded-full bg-muted border-2 border-dashed border-border cursor-pointer overflow-hidden group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover object-center" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Camera className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                <p className="text-xs text-muted-foreground">Upload photo (optional)</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Input value={email} disabled className="bg-muted opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone Number</Label>
                  <Input value={phone} disabled className="bg-muted opacity-60" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={country} disabled className="bg-muted opacity-60" />
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
                        {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 10 - i).map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.birthYear && <p className="text-xs text-destructive">{errors.birthYear}</p>}
                  </div>
                </div>
              </div>

              <Button onClick={next} className="w-full" size="lg">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP 1 (minors only): Parent/Guardian ── */}
          {isMinor && step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Parent / Guardian Verification</h2>
                </div>
                <button onClick={back} className="text-sm text-primary hover:underline">← Back</button>
              </div>
              <p className="text-sm text-muted-foreground">
                The following details were provided during registration and are shown for your reference.
              </p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Parent/Guardian Name</Label>
                  <Input value={guardianName} disabled className="bg-muted opacity-60" />
                </div>
                <div className="space-y-1.5">
                  <Label>Parent/Guardian Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={guardianEmail} disabled className="bg-muted opacity-60 pl-10" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Photo ID</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted opacity-60 text-sm">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground truncate">{guardianPhotoIdName || "Uploaded during registration"}</span>
                  </div>
                </div>
              </div>
              <Button onClick={next} className="w-full" size="lg">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP educationStepIndex: Education Preferences ── */}
          {step === educationStepIndex && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Education Preferences</h2>
                <button onClick={back} className="text-sm text-primary hover:underline">← Back</button>
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading options...</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Languages <span className="text-destructive">*</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {backendLanguages.map((lang) => {
                        const isSelected = selectedLanguageIds.has(lang.id);
                        return (
                          <Badge
                            key={lang.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer transition-colors"
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

                  <div className="space-y-1.5">
                    <Label>Education Level <span className="text-destructive">*</span></Label>
                    <Select
                      value={selectedStandardId ? String(selectedStandardId) : ""}
                      onValueChange={(v) => {
                        const id = Number(v);
                        const found = backendStandards.find((s) => s.id === id);
                        if (found) {
                          setSelectedStandardId(found.id);
                          setSelectedStandardName(found.name);
                          setSelectedSubjectIds(new Map());
                          setBackendSubjects([]);
                          fetchSubjectsForStandard(found.id);
                        }
                        setErrors((p) => ({ ...p, educationLevel: "" }));
                      }}
                    >
                      <SelectTrigger className={cn(errors.educationLevel && "border-destructive")}>
                        <SelectValue placeholder="Select education level" />
                      </SelectTrigger>
                      <SelectContent>
                        {backendStandards.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.educationLevel && <p className="text-xs text-destructive">{errors.educationLevel}</p>}
                  </div>

                  {backendSubjects.length > 0 && (
                    <div className="space-y-2">
                      <Label>Preferred Subjects <span className="text-destructive">*</span></Label>
                      <div className="flex flex-wrap gap-2">
                        {backendSubjects.map((sub) => {
                          const isSelected = selectedSubjectIds.has(sub.id);
                          const isDisabled = !isSelected && selectedSubjectIds.size >= MAX_SUBJECTS;
                          return (
                            <Badge
                              key={sub.id}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isDisabled && "opacity-50 cursor-not-allowed"
                              )}
                              onClick={() => !isDisabled && toggleSubject(sub)}
                            >
                              {sub.name}
                              {isSelected && <X className="w-3 h-3 ml-1" />}
                            </Badge>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {selectedSubjectIds.size}/{MAX_SUBJECTS} subjects selected
                      </p>
                      {errors.subjects && <p className="text-xs text-destructive">{errors.subjects}</p>}
                    </div>
                  )}

                  {selectedStandardId && backendSubjects.length === 0 && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Loading subjects...</span>
                    </div>
                  )}
                </>
              )}

              <Button onClick={next} className="w-full" size="lg" disabled={loadingData}>
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* ── STEP scheduleStepIndex: Budget + Schedule + Timezone ── */}
          {step === scheduleStepIndex && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Your Availability</h2>
                <button onClick={back} className="text-sm text-primary hover:underline">← Back</button>
              </div>

              <p className="text-sm text-muted-foreground">
                Set your budget and availability so we can match you with the right tutors.
              </p>

              {/* ═══════════════ BUDGET RANGE (NEW — at top) ═══════════════ */}
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  <Label className="text-sm font-semibold text-foreground">
                    Hourly Budget Range <span className="text-destructive">*</span>
                  </Label>
                </div>

                {/* Min and Max Dropdowns */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Minimum ($/hour)</Label>
                    <Select
                      value={String(budgetMin)}
                      onValueChange={(v) => handleBudgetMinChange(Number(v))}
                    >
                      <SelectTrigger className={cn(errors.budget && "border-destructive")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BUDGET_OPTIONS.map((val) => (
                          <SelectItem key={`min-${val}`} value={String(val)}>
                            ${val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Maximum ($/hour)</Label>
                    <Select
                      value={String(budgetMax)}
                      onValueChange={(v) => handleBudgetMaxChange(Number(v))}
                    >
                      <SelectTrigger className={cn(errors.budget && "border-destructive")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        {BUDGET_OPTIONS.map((val) => (
                          <SelectItem key={`max-${val}`} value={String(val)}>
                            ${val}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dual-handle Slider */}
                <div className="pt-2 px-1">
                  <Slider
                    min={BUDGET_MIN}
                    max={BUDGET_MAX}
                    step={BUDGET_STEP}
                    value={[budgetMin, budgetMax]}
                    onValueChange={handleSliderChange}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>${BUDGET_MIN}</span>
                    <span className="font-semibold text-foreground">
                      ${budgetMin} — ${budgetMax} / hour
                    </span>
                    <span>${BUDGET_MAX}</span>
                  </div>
                </div>

                {errors.budget && <p className="text-xs text-destructive">{errors.budget}</p>}
              </div>
              {/* ═══════════════ END BUDGET RANGE ═══════════════ */}

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  <Globe className="w-4 h-4 inline mr-1.5" />Your Timezone <span className="text-destructive">*</span>
                </label>
                <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {allTimezones.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Days */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">
                  Select Available Days <span className="text-destructive">*</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const isActive = selectedDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            setSelectedDays((prev) => prev.filter((d) => d !== day));
                            setWeeklySchedule((prev) => {
                              const updated = { ...prev };
                              delete updated[day];
                              return updated;
                            });
                          } else {
                            setSelectedDays((prev) => [...prev, day]);
                            setWeeklySchedule((prev) => ({
                              ...prev,
                              [day]: prev[day] || { start: "09:00 AM", end: "11:00 AM" }
                            }));
                          }
                          setErrors((p) => ({ ...p, selectedDays: "" }));
                        }}
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                          isActive
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
                {errors.selectedDays && <p className="text-xs text-destructive mt-1">{errors.selectedDays}</p>}
              </div>

              {/* Time per day */}
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
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "rounded-xl border p-4 bg-card space-y-3",
                          isValid ? "border-border" : "border-destructive"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" />{day}
                          </h4>
                          <span className="text-xs text-muted-foreground">{getTimezoneAbbr(scheduleTimezone)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">Start Time</label>
                            <Select
                              value={schedule.start}
                              onValueChange={(v) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], start: v } }))}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {TIME_OPTIONS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">End Time</label>
                            <Select
                              value={schedule.end}
                              onValueChange={(v) => setWeeklySchedule((prev) => ({ ...prev, [day]: { ...prev[day], end: v } }))}
                            >
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

              <Button onClick={handleSave} disabled={saving || loadingData} className="w-full" size="lg">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Saving...</> : "Save Profile"}
              </Button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {cropImageSrc && (
        <ImageCropper
          imageSrc={cropImageSrc}
          open={showCropper}
          onClose={() => {
            setShowCropper(false);
          }}
          onCropComplete={(croppedImage) => {
            setProfilePhoto(croppedImage);
            setNewPhotoSelected(true);
          }}
        />
      )}
    </div>
  );
}

export default StudentProfileSetup;
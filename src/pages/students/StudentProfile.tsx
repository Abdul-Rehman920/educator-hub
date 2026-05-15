import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Globe, Calendar, GraduationCap, Languages, ShieldCheck, Loader2, Pencil, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import StudentProfileSetup from "@/components/student-dashboard/StudentProfileSetup";
import type { StudentProfileData } from "@/components/student-dashboard/StudentProfileSetup";
import api from "@/lib/api";

type UserProfile = {
  id: number;
  name: string;
  last_name: string;
  email: string;
  phone: string;
  profile: {
    date_of_birth: string | null;
    about_me: string | null;
    profile_img: string | null;
    parent_name: string | null;
    parent_email: string | null;
    timezone: string | null;
    budget_min: number | null;       // ← NEW
    budget_max: number | null;       // ← NEW
  } | null;
  country: {
    id: number;
    name: string;
    currency: string;
    timezone: string;
    calling_digits: string;
    calling_code: string;
  } | null;
  languages: { id: number; name: string }[];
  subjects: { id: number; name: string }[];
  classes: { id: number; name: string }[];
};

type ScheduleItem = {
  id: number;
  user_id: number;
  day_name: string;
  start_time: string | null;
  end_time: string | null;
  is_available: number;
};

const WEEKDAYS_ORDER = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Convert UTC time string to user's local timezone (12h format)
function utcToLocal(utcTime: string, userTimezone: string): string {
  if (!utcTime) return "";
  try {
    const [h, m] = utcTime.split(":").map(Number);
    const today = new Date();
    const utcDate = new Date(Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
      h, m, 0
    ));
    return utcDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: userTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  } catch {
    return utcTime;
  }
}

export default function StudentProfile() {
  const location = useLocation();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Detect fresh signup
  const navState = location.state as any;
  const [isFromSignup, setIsFromSignup] = useState(!!(navState?.firstName || navState?.email));

  useEffect(() => {
    if (isFromSignup) {
      localStorage.removeItem("studentProfileComplete");
    }
  }, [isFromSignup]);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profile
      const response = await api.get("/get/user/update-profile");
      const raw = response.data?.data || response.data;
      const data = raw?.user_profile || raw;
      setUser(data);

      // Fetch schedule
      try {
        const scheduleRes = await api.get("/student/get-schedule");
        const scheduleData = scheduleRes.data?.schedule || scheduleRes.data?.data?.schedule || [];
        setSchedule(Array.isArray(scheduleData) ? scheduleData : []);
      } catch (e) {
        console.error("Schedule fetch failed:", e);
        setSchedule([]);
      }

      if (isFromSignup) {
        setProfileComplete(false);
      } else {
        const hasLocalFlag = localStorage.getItem("studentProfileComplete") === "true";
        const validClasses = (data?.classes || []).filter((c: any) => c.name !== null);
        const hasApiData = data?.languages?.length > 0 && data?.subjects?.length > 0 && validClasses.length > 0;
        setProfileComplete(hasLocalFlag || hasApiData);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      setProfileComplete(false);
    } finally {
      setLoading(false);
    }
  }, [isFromSignup]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleProfileComplete = (_data: StudentProfileData) => {
    setIsFromSignup(false);
    window.history.replaceState({}, document.title);

    setProfileComplete(true);
    setIsEditing(false);
    fetchProfile();
  };

  if (loading) {
    return (
      <StudentDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </StudentDashboardLayout>
    );
  }

  // Show setup if not complete OR editing
  if (!profileComplete || isEditing) {
    const parentName = (user?.profile as any)?.parent_name || (user as any)?.parent_name || "";
    const parentEmail = (user?.profile as any)?.parent_email || (user as any)?.parent_email || "";

    const dob = user?.profile?.date_of_birth || "";
    const dobMonth = dob ? dob.slice(5, 7) : "";
    const dobYear = dob ? dob.slice(0, 4) : "";

    const validClasses = (user?.classes || []).filter((c) => c.name !== null);
    const validLanguages = (user?.languages || []).filter((l) => l.name !== null);
    const validSubjects = (user?.subjects || []).filter((s) => s.name !== null);

    // Pre-fill schedule data for edit mode
    const savedTimezone = user?.profile?.timezone || "";
    const initialDays: string[] = [];
    const initialWeekly: { [day: string]: { start: string; end: string } } = {};

    schedule.forEach((s) => {
      if (s.is_available && s.start_time && s.end_time) {
        const dayName = s.day_name.charAt(0).toUpperCase() + s.day_name.slice(1).toLowerCase();
        initialDays.push(dayName);
        const tz = savedTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        initialWeekly[dayName] = {
          start: utcToLocal(s.start_time, tz),
          end: utcToLocal(s.end_time, tz),
        };
      }
    });

    return (
      <StudentDashboardLayout>
        <StudentProfileSetup
          onComplete={handleProfileComplete}
          isMinor={!!parentName}
          guardianName={parentName}
          guardianEmail={parentEmail}
          initialFirstName={user?.name || ""}
          initialLastName={user?.last_name || ""}
          initialEmail={user?.email || ""}
          initialCountry={user?.country?.name || ""}
          initialPhone={user?.phone || ""}
          initialCountryData={user?.country || null}
          initialLanguages={validLanguages.map((l) => l.name)}
          initialEducationLevel={validClasses[0]?.name || ""}
          initialEducationLevelId={validClasses[0]?.id || null}
          initialSubjects={validSubjects.map((s) => s.name)}
          initialBirthMonth={dobMonth}
          initialBirthYear={dobYear}
          initialProfileImage={user?.profile?.profile_img || ""}
          initialScheduleTimezone={savedTimezone}
          initialSelectedDays={initialDays}
          initialWeeklySchedule={initialWeekly}
          initialBudgetMin={user?.profile?.budget_min ? Number(user.profile.budget_min) : undefined}
          initialBudgetMax={user?.profile?.budget_max ? Number(user.profile.budget_max) : undefined}
        />
      </StudentDashboardLayout>
    );
  }

  if (!user) {
    return (
      <StudentDashboardLayout>
        <div className="text-center py-20 text-muted-foreground">Could not load profile.</div>
      </StudentDashboardLayout>
    );
  }

  const fullName = `${user.name || ""} ${user.last_name || ""}`.trim();
  const profileImg = user.profile?.profile_img || "";
  const avatar = profileImg && !profileImg.startsWith("http") && !profileImg.startsWith("data:")
    ? `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}/${profileImg}`
    : profileImg || null;
  const initials = `${user.name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase();

  const parentName = (user?.profile as any)?.parent_name || (user as any)?.parent_name || "";
  const parentEmail = (user?.profile as any)?.parent_email || (user as any)?.parent_email || "";

  const validLanguages = (user.languages || []).filter((l) => l.name !== null);
  const validClasses = (user.classes || []).filter((c) => c.name !== null);
  const validSubjects = (user.subjects || []).filter((s) => s.name !== null);

  const formatDOB = (dob: string | null) => {
    if (!dob) return "N/A";
    const d = new Date(dob);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Schedule processing for display
  const userTimezone = user.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const availableDays = schedule.filter((s) => s.is_available && s.start_time && s.end_time);

  // Sort by week order
  const sortedSchedule = [...availableDays].sort((a, b) => {
    return WEEKDAYS_ORDER.indexOf(a.day_name.toLowerCase()) - WEEKDAYS_ORDER.indexOf(b.day_name.toLowerCase());
  });

  return (
    <StudentDashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4 mr-1.5" /> Edit Profile
          </Button>
        </div>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <Avatar className="w-[90px] h-[90px]">
              {avatar && <AvatarImage src={avatar} alt="Profile" className="object-cover object-center" />}
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{fullName}</h2>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground">{user.phone}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Personal Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Country</p>
                  <p className="font-medium text-foreground">{user.country?.name || "N/A"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Date of Birth</p>
                  <p className="font-medium text-foreground">{formatDOB(user.profile?.date_of_birth || null)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {parentName && (
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-foreground">Parent / Guardian</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium text-foreground">{parentName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium text-foreground">{parentEmail}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Education Preferences</h3>
            <div className="space-y-3 text-sm">
              {validLanguages.length > 0 && (
                <div className="flex items-start gap-2">
                  <Languages className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Languages</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {validLanguages.map((l) => (
                        <Badge key={l.id || l.name} variant="secondary" className="text-xs">{l.name}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {validClasses.length > 0 && (
                <div className="flex items-start gap-2">
                  <GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">Education Level</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {validClasses.map((c) => (
                        <Badge key={c.id || c.name} variant="outline" className="text-xs">{c.name}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {validSubjects.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1.5">Preferred Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {validSubjects.map((s) => (
                      <Badge key={s.id || s.name} variant="outline" className="text-xs">{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── NEW: Hourly Budget Range ── */}
        {(user.profile?.budget_min || user.profile?.budget_max) && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Hourly Budget Range
                </h3>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-base text-foreground">
                  ${Number(user.profile.budget_min || 0)}
                  <span className="text-muted-foreground mx-1.5">—</span>
                  ${Number(user.profile.budget_max || 0)}
                </span>
                <span className="text-sm text-muted-foreground">/ hour</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── NEW: Availability Schedule ── */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Availability
              </h3>
              {user.profile?.timezone && (
                <Badge variant="secondary" className="text-xs">
                  <Globe className="w-3 h-3 mr-1" />
                  {user.profile.timezone}
                </Badge>
              )}
            </div>

            {sortedSchedule.length > 0 ? (
              <div className="space-y-2">
                {sortedSchedule.map((s) => {
                  const dayDisplay = s.day_name.charAt(0).toUpperCase() + s.day_name.slice(1).toLowerCase();
                  const startLocal = utcToLocal(s.start_time!, userTimezone);
                  const endLocal = utcToLocal(s.end_time!, userTimezone);
                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                    >
                      <span className="text-sm font-medium text-foreground">{dayDisplay}</span>
                      <span className="text-sm text-muted-foreground">
                        {startLocal} – {endLocal}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-2">
                No availability set. Click <span className="text-primary font-medium">Edit Profile</span> to set your schedule.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  );
}
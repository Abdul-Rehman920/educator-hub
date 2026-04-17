import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { ProfileSetup, TeacherProfileData } from "@/components/dashboard/ProfileSetup";
import { TeacherProfileView } from "@/components/dashboard/TeacherProfileView";
import api from "@/lib/api";

interface SignupNavState {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  country?: string;
  countryId?: number;
  callingDigits?: string;
  email?: string;
  phone?: string;
}

function convertTo12h(time24: string): string {
  if (!time24) return "09:00 AM";
  if (/AM|PM/i.test(time24)) return time24;
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, "0")}:${m.padStart(2, "0")} ${ampm}`;
}

function buildWeeklySchedule(schedule: any[]): {
  weeklySchedule: Record<string, { start: string; end: string }>;
  selectedDays: string[];
} {
  const weeklySchedule: Record<string, { start: string; end: string }> = {};
  const selectedDays: string[] = [];
  if (!schedule || !Array.isArray(schedule)) return { weeklySchedule, selectedDays };

  const dayMap: Record<string, string> = {
    monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
    thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
  };

  schedule.forEach((s: any) => {
    // FIX: Backend may use "is_available", "available", or just have start/end times
    const isAvailable = s.is_available === 1 || s.available === 1 || 
                        (s.start_time && s.end_time && s.is_available !== 0 && s.available !== 0);
    
    if (isAvailable && s.start_time && s.end_time) {
      // FIX: Backend may use "day_name" or "name" for the day field
      const rawDay = s.day_name || s.name || "";
      const dayName = dayMap[rawDay.toLowerCase()] || rawDay;
      if (dayName) {
        selectedDays.push(dayName);
        weeklySchedule[dayName] = {
          start: convertTo12h(s.start_time),
          end: convertTo12h(s.end_time),
        };
      }
    }
  });
  return { weeklySchedule, selectedDays };
}

export default function DashboardProfile() {
  const location = useLocation();
  const navState = (location.state as SignupNavState) || {};
  const [profileData, setProfileData] = useState<TeacherProfileData | null>(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiData, setApiData] = useState<any>(null);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await api.get("/get/user/update-profile");
      const raw = response.data;
      const data = raw?.user_profile || raw?.data?.user_profile || raw?.data || raw;
      setApiData(data);

      const localFlag = localStorage.getItem("teacherProfileComplete") === "true";
      const apiComplete = !!(data?.profile?.about_me || data?.profile?.rate_per_hour);

      if (localFlag || apiComplete) {
        const scheduleData = buildWeeklySchedule(Array.isArray(data.schedule) ? data.schedule : []);

        // FIX: Fetch blocked dates from backend
        let blockedDatesArr: string[] = [];
        try {
          const ptoRes = await api.get("/teacher/get-pto");
          const ptoData = ptoRes.data?.pto || ptoRes.data?.data?.pto || [];
          if (Array.isArray(ptoData)) {
            blockedDatesArr = ptoData.map((p: any) => p.date).filter(Boolean);
          }
        } catch {
          // PTO endpoint error — ignore
        }

        setProfileData({
          firstName: data.name || "",
          middleName: data.middle_name || "",
          lastName: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          country: data.country?.name || "",
          countryId: data.country?.id || null,
          callingDigits: data.country?.calling_digits || "",
          birthMonth: data.profile?.date_of_birth?.slice(5, 7) || "",
          birthYear: data.profile?.date_of_birth?.slice(0, 4) || "",
          profileImage: data.profile?.profile_img || null,
          ratePerHour: data.profile?.rate_per_hour ? String(data.profile.rate_per_hour) : "",
          groupRate: data.profile?.group_rate_per_hour ? String(data.profile.group_rate_per_hour) : "",
          offersDemo: data.profile?.demo_class === 1,
          introFee: data.profile?.intro_fee || 0,
          facebook: data.facebook || "",
          twitter: data.twitter || "",
          linkedin: data.linkedin || "",
          selectedLanguages: data.languages?.map((l: any) => ({ id: l.id || l.language_id, name: l.name })).filter((l: any) => l.name) || [],
          standardLevel: data.classes?.[0]?.id ? String(data.classes[0].id) : "",
          standardLevelName: data.classes?.[0]?.name || "",
          selectedSubjects: data.subjects?.map((s: any) => ({ id: s.id || s.subject_id, name: s.name })).filter((s: any) => s.name) || [],
          aboutMe: data.profile?.about_me || "",
          workExperiences: data.experience?.length > 0
            ? data.experience.map((e: any) => ({
                id: e.id, title: e.title || "", company: e.company_name || "",
                type: e.type || "internship", location: e.location || "",
                startTime: e.start_time || "", endTime: e.end_time || "",
                stillWork: e.still_work || 0, duration: "",
              }))
            : [{ title: "", company: "", duration: "" }],
          educations: data.education?.length > 0
            ? data.education.map((e: any) => ({
                id: e.id, degree: e.title || "", institution: e.institute_name || "",
                type: e.type || "Bachelors", location: e.location || "",
                startTime: e.start_time || "", endTime: e.end_time || "",
                stillStudy: e.still_study || 0, year: e.start_time?.slice(0, 4) || "",
              }))
            : [{ degree: "", institution: "", year: "" }],
          weeklySchedule: scheduleData.weeklySchedule,
          selectedDays: scheduleData.selectedDays,
          blockedDates: blockedDatesArr,
          scheduleTimezone: data.country?.timezone || "Asia/Karachi",
          verifyFullName: data.name || "",
          verifySocialLink: "",
          verifyPhoto: null,
          certDoc: false,
          idDoc: false,
        });
        setProfileComplete(true);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfile(); }, []);

  // FIX: After save, go back to profile view (not step 1)
  const handleProfileComplete = () => {
    localStorage.setItem("teacherProfileComplete", "true");
    setIsEditing(false);
    fetchProfile();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20 text-muted-foreground">Loading profile...</div>
      </DashboardLayout>
    );
  }

  const prefill = {
    firstName: apiData?.name || navState.firstName || "",
    middleName: apiData?.middle_name || navState.middleName || "",
    lastName: apiData?.last_name || navState.lastName || "",
    email: apiData?.email || navState.email || "",
    phone: apiData?.phone || navState.phone || "",
    country: apiData?.country?.name || navState.country || "",
    countryId: apiData?.country?.id || null,
    callingDigits: apiData?.country?.calling_digits || "",
  };

  const showSetup = !profileComplete || isEditing;

  return (
    <DashboardLayout>
      {showSetup ? (
        <ProfileSetup
          onComplete={handleProfileComplete}
          initialFirstName={prefill.firstName}
          initialMiddleName={prefill.middleName}
          initialLastName={prefill.lastName}
          initialEmail={prefill.email}
          initialCountry={prefill.country}
          initialCountryId={prefill.countryId}
          initialCallingDigits={prefill.callingDigits}
          initialPhone={prefill.phone}
          existingProfile={isEditing ? profileData : undefined}
        />
      ) : (
        <TeacherProfileView data={profileData!} onEdit={() => setIsEditing(true)} />
      )}
    </DashboardLayout>
  );
}
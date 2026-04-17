import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Pencil, Globe, Calendar, GraduationCap, Languages, ShieldCheck,
  DollarSign, Clock, Briefcase, BookOpen, Mail, Phone, User, CalendarOff,
} from "lucide-react";
import type { TeacherProfileData } from "./ProfileSetup";

const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function formatTime12(timeStr: string): string {
  if (!timeStr) return "";
  if (/\s*(AM|PM)$/i.test(timeStr)) return timeStr;
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

function getDisplayName(item: any): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && item.name) return item.name;
  return String(item || "");
}

function getDisplayKey(item: any, fallbackIndex: number): string | number {
  if (typeof item === "string") return item;
  if (item && typeof item === "object" && item.id) return item.id;
  return fallbackIndex;
}

// FIX: Build full image URL from relative path
function buildImageUrl(img: string | null | undefined): string | null {
  if (!img) return null;
  if (img.startsWith("data:") || img.startsWith("http")) return img;
  const base = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace("/api", "");
  return `${base}/${img}`;
}

// FIX: Format date — but detect fallback dates like "2020-01-01" or "xxxx-01-01" which are just year placeholders
function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  // If it's a "year-01-01" pattern (our fallback), just return the year
  if (/^\d{4}-01-01/.test(dateStr)) return dateStr.slice(0, 4);
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// Build date range string for education/experience
function buildDateRange(startTime?: string, endTime?: string, stillActive?: number, year?: string): string {
  // If we only have a year field and no meaningful startTime, just show the year
  if (year && (!startTime || /^\d{4}-01-01/.test(startTime))) return year;
  const start = formatDate(startTime);
  if (!start) return year || "";
  if (stillActive === 1) return `${start} – Present`;
  const end = formatDate(endTime);
  if (end && end !== start) return `${start} – ${end}`;
  return start;
}

interface TeacherProfileViewProps {
  data: TeacherProfileData;
  onEdit: () => void;
}

export function TeacherProfileView({ data, onEdit }: TeacherProfileViewProps) {
  const scheduleDays = WEEKDAYS.filter((d) => data.weeklySchedule && data.weeklySchedule[d]);
  const profileImageUrl = buildImageUrl(data.profileImage);

  const birthLabel = data.birthMonth && data.birthYear
    ? `${monthNames[parseInt(data.birthMonth) - 1] || ""} ${data.birthYear}`
    : "Not set";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="w-4 h-4 mr-1.5" /> Edit Profile
        </Button>
      </div>

      {/* Avatar & Name Card */}
      <Card>
        <CardContent className="p-6 flex items-center gap-4">
          <Avatar className="w-20 h-20">
            {profileImageUrl ? (
              <AvatarImage src={profileImageUrl} alt={data.firstName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
              {(data.firstName?.[0] || "")}{(data.lastName?.[0] || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {data.firstName} {data.middleName ? `${data.middleName} ` : ""}{data.lastName}
            </h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <Mail className="w-3.5 h-3.5" />
              {data.email}
            </div>
            {data.phone && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                {data.phone}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Personal Details */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Personal Details</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Country</p>
                <p className="font-medium text-foreground">{data.country || "Not set"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Timezone</p>
                <p className="font-medium text-foreground">{(data.scheduleTimezone || "Not set").replace(/_/g, " ")}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-muted-foreground">Date of Birth</p>
                <p className="font-medium text-foreground">{birthLabel}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Standards, Subjects & Languages */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Standards & Subjects</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Education Standard</p>
              <p className="font-medium text-foreground">
                {data.standardLevelName || getDisplayName(data.standardLevel) || "Not set"}
              </p>
            </div>
            {data.selectedSubjects?.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1.5">Subjects</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.selectedSubjects.map((s, i) => (
                    <Badge key={getDisplayKey(s, i)} variant="secondary" className="text-xs">
                      {getDisplayName(s)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {data.selectedLanguages?.length > 0 && (
              <div className="flex items-start gap-2">
                <Languages className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">Languages</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {data.selectedLanguages.map((l, i) => (
                      <Badge key={getDisplayKey(l, i)} variant="outline" className="text-xs">
                        {getDisplayName(l)}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rates & Availability */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Rates & Availability</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Rate Per Hour (Private)</p>
              <p className="font-medium text-foreground">
                {data.ratePerHour ? `$${data.ratePerHour} USD` : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Rate Per Hour (Group)</p>
              <p className="font-medium text-foreground">
                {data.groupRate ? `$${data.groupRate} USD` : "Not set"}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Demo Session</p>
              <p className="font-medium text-foreground">
                {data.offersDemo ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {/* Weekly Schedule */}
          {scheduleDays.length > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">Weekly Schedule</p>
              <div className="space-y-1.5">
                {scheduleDays.map((day) => {
                  const slot = data.weeklySchedule[day];
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground w-24">{day}</span>
                      <span className="text-muted-foreground">
                        {formatTime12(slot.start)} – {formatTime12(slot.end)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Blocked Dates */}
          {data.blockedDates?.length > 0 && (
            <div className="text-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <CalendarOff className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-muted-foreground">Blocked Dates</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[...new Set(data.blockedDates)].map((d) => (
                  <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* About & Experience */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">About & Experience</h3>
          </div>
          <div className="text-sm space-y-4">
            {data.aboutMe && (
              <div>
                <p className="text-muted-foreground mb-1">About Me</p>
                <p className="text-foreground whitespace-pre-line">{data.aboutMe}</p>
              </div>
            )}
            {data.workExperiences?.some((w) => w.title) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-muted-foreground">Work Experience</p>
                </div>
                <div className="space-y-2">
                  {data.workExperiences.filter((w) => w.title).map((w, i) => {
                    const startYear = w.startTime?.slice(0, 4);
                    const endYear = w.endTime?.slice(0, 4);
                    const isFallbackStart = !startYear || startYear === "2020";
                    let dateStr = "";
                    if (!isFallbackStart) {
                      if (w.stillWork === 1) dateStr = `${startYear} – Present`;
                      else if (endYear && endYear !== "2020" && endYear !== startYear) dateStr = `${startYear} – ${endYear}`;
                      else dateStr = startYear;
                    }
                    return (
                      <div key={w.id || i} className="pl-5 border-l-2 border-primary/20">
                        <p className="font-medium text-foreground">{w.title}</p>
                        {w.company && <p className="text-muted-foreground">{w.company}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {w.type && <span className="capitalize">{w.type}</span>}
                          {dateStr && <span>{dateStr}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {data.educations?.some((e) => e.degree) && (
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-muted-foreground">Education</p>
                </div>
                <div className="space-y-2">
                  {data.educations.filter((e) => e.degree).map((e, i) => {
                    const startYear = e.startTime?.slice(0, 4);
                    const endYear = e.endTime?.slice(0, 4);
                    const isFallbackStart = !startYear || startYear === "2020";
                    let dateStr = "";
                    if (!isFallbackStart) {
                      if (e.stillStudy === 1) dateStr = `${startYear} – Present`;
                      else if (endYear && endYear !== startYear && endYear !== "2020") dateStr = `${startYear} – ${endYear}`;
                      else dateStr = startYear;
                    } else if (e.year) {
                      dateStr = e.year;
                    }
                    return (
                      <div key={e.id || i} className="pl-5 border-l-2 border-primary/20">
                        <p className="font-medium text-foreground">{e.degree}</p>
                        {e.institution && <p className="text-muted-foreground">{e.institution}</p>}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {e.type && <span>{e.type}</span>}
                          {dateStr && <span>{dateStr}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Status */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Verification Status</h3>
          </div>
          <div className="flex items-center gap-2">
            {data.certDoc ? (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <ShieldCheck className="w-3 h-3 mr-1" /> Verification Submitted
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Pending Verification
              </Badge>
            )}
          </div>
          {data.idDoc && (
            <p className="text-xs text-muted-foreground">Photo ID uploaded</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
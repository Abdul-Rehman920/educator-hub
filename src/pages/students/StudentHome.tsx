import { useState, useEffect } from "react";
import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Star,
  MapPin,
  BookOpen,
  Globe,
  Sparkles,
  Search,
  Loader2,
  Heart,
  HeartOff,
  X,
  Users,
} from "lucide-react";
import { useUnlockedTutors } from "@/contexts/UnlockedTutorsContext";
import { toast } from "@/hooks/use-toast";
import api from "@/lib/api";

type Tutor = {
  id: number;
  name: string;
  last_name: string;
  subject: string;
  subjects: string[];
  specialization: string;
  intro: string;
  avatar: string;
  rating: number;
  reviews: number;
  hourlyRate: number;
  groupRate: number;
  country: string;
  languages: string[];
};

const MAX_FAVORITES = 3;

export default function StudentHome() {
  const { unlockedTutorIds } = useUnlockedTutors();
  const navigate = useNavigate();

  const [recommended, setRecommended] = useState<Tutor[]>([]);
  const [otherTutors, setOtherTutors] = useState<Tutor[]>([]);
  const [favorites, setFavorites] = useState<Tutor[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadingFavorites, setLoadingFavorites] = useState(true);
  const [togglingFav, setTogglingFav] = useState<number | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<
    { id: number; name: string }[]
  >([]);

  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const studentName = user?.name || "Student";

  // ─── Helper: map teacher API response to Tutor type ───
  const mapTeacher = (t: any): Tutor => ({
    id: t.id,
    name: `${t.name || ""} ${t.last_name || ""}`.trim(),
    last_name: t.last_name || "",
    subject: t.subjects?.[0]?.name || t.user_subjects?.[0]?.subject?.name || "General",
    subjects:
      t.subjects?.map((s: any) => s.name) ||
      t.user_subjects?.map((s: any) => s.subject?.name).filter(Boolean) ||
      [],
    specialization:
      t.subjects?.map((s: any) => s.name).join(", ") ||
      t.user_subjects?.map((s: any) => s.subject?.name).filter(Boolean).join(", ") ||
      "",
    intro: t.profile?.about_me || "",
    avatar: t.profile?.profile_img
      ? t.profile.profile_img.startsWith("http")
        ? t.profile.profile_img
        : `${import.meta.env.VITE_API_BASE_URL?.replace("/api", "")}/${t.profile.profile_img}`
      : `https://ui-avatars.com/api/?name=${t.name}&background=random`,
    rating: parseFloat(t.average_review) || 0,
    reviews: t.reviews?.length || t.reviews_received?.length || 0,
    hourlyRate: parseFloat(t.profile?.rate_per_hour) || 0,
    groupRate: parseFloat(t.profile?.group_rate_per_hour) || 0,
    country: t.country?.name || "N/A",
    languages:
      t.languages?.map((l: any) => l.name) ||
      t.user_languages?.map((l: any) => l.language?.name).filter(Boolean) ||
      [],
  });

  // ─── Helper: truncate subjects to max 2 ───
  const truncatedSubjects = (tutor: Tutor) => {
    if (tutor.subjects.length === 0) return "General";
    if (tutor.subjects.length <= 2) return tutor.subjects.join(", ");
    return `${tutor.subjects[0]}, ${tutor.subjects[1]}...`;
  };

  // ─── Fetch Favorites ───
  const fetchFavorites = async () => {
    setLoadingFavorites(true);
    try {
      const res = await api.get("/student/favorites");
      const favData = res.data?.favorites || res.data?.data?.favorites || [];
      const mapped = favData.map(mapTeacher);
      setFavorites(mapped);
      setFavoriteIds(new Set(mapped.map((t: Tutor) => t.id)));
    } catch (error) {
      console.error("Favorites fetch error:", error);
    } finally {
      setLoadingFavorites(false);
    }
  };

  // ─── Fetch Recommended + All Other Tutors ───
  const fetchRecommendedTutors = async () => {
    setLoading(true);
    try {
      const subjectsRes = await api.get("/student/my-subjects");
      const subjectsData =
        subjectsRes.data?.subjects || subjectsRes.data?.data?.subjects || [];
      setStudentSubjects(
        subjectsData.map((s: any) => ({ id: s.id, name: s.name || "" }))
      );

      const subjectIds: number[] = subjectsData
        .map((s: any) => s.id)
        .filter(Boolean);

      let recommendedTeachers: any[] = [];
      let recommendedIds = new Set<number>();

      if (subjectIds.length > 0) {
        const recResponse = await api.get(
          `/teacher/listing?subjects=${subjectIds.join(",")}`
        );
        const recData = recResponse.data?.data || recResponse.data || [];
        recommendedTeachers = Array.isArray(recData)
          ? recData
          : recData.data || [];
        recommendedIds = new Set(recommendedTeachers.map((t: any) => t.id));
      }

      const allResponse = await api.get("/teacher/listing");
      const allData = allResponse.data?.data || allResponse.data || [];
      const allTeachers = Array.isArray(allData)
        ? allData
        : allData.data || [];

      const remainingTeachers = allTeachers.filter(
        (t: any) => !recommendedIds.has(t.id)
      );

      setRecommended(recommendedTeachers.map(mapTeacher));
      setOtherTutors(remainingTeachers.map(mapTeacher));
    } catch (error) {
      console.error("Recommended tutors fetch error:", error);
      setRecommended([]);
      setOtherTutors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
    fetchRecommendedTutors();
  }, []);

  // ─── Toggle Favorite ───
  const toggleFavorite = async (tutorId: number) => {
    if (togglingFav) return;
    setTogglingFav(tutorId);

    try {
      if (favoriteIds.has(tutorId)) {
        await api.post("/student/remove-favorite", { tutor_id: tutorId });
        setFavorites((prev) => prev.filter((t) => t.id !== tutorId));
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(tutorId);
          return next;
        });
        toast({ title: "Removed", description: "Tutor removed from favorites." });
      } else {
        if (favoriteIds.size >= MAX_FAVORITES) {
          toast({
            title: "Limit reached",
            description: `You can only save up to ${MAX_FAVORITES} favorite tutors. Remove one first.`,
            variant: "destructive",
          });
          return;
        }
        await api.post("/student/add-favorite", { tutor_id: tutorId });
        const tutor =
          recommended.find((t) => t.id === tutorId) ||
          otherTutors.find((t) => t.id === tutorId);
        if (tutor) {
          setFavorites((prev) => [tutor, ...prev]);
        }
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.add(tutorId);
          return next;
        });
        toast({ title: "Saved!", description: "Tutor added to favorites." });
      }
    } catch (error: any) {
      const msg =
        error?.response?.data?.message ||
        error?.response?.data?.errors?.tutor_id?.[0] ||
        "Something went wrong.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setTogglingFav(null);
    }
  };

  // ─── Tutor Card Component ───
  const TutorCard = ({
    tutor,
    showFavButton = true,
    showRemoveButton = false,
  }: {
    tutor: Tutor;
    showFavButton?: boolean;
    showRemoveButton?: boolean;
  }) => {
    const isLocked = !unlockedTutorIds.has(tutor.id);
    const isFav = favoriteIds.has(tutor.id);
    const isToggling = togglingFav === tutor.id;

    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden hover:shadow-elevated transition-shadow duration-200 relative flex flex-col">
        {/* Favorite / Remove button */}
        {(showFavButton || showRemoveButton) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(tutor.id);
            }}
            disabled={isToggling}
            className={`absolute top-3 right-3 z-10 p-1.5 rounded-full transition-colors ${
              isFav || showRemoveButton
                ? "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40"
                : "bg-muted/80 text-muted-foreground hover:bg-muted hover:text-red-500"
            }`}
            title={isFav ? "Remove from favorites" : "Add to favorites"}
          >
            {isToggling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : showRemoveButton ? (
              <X className="w-4 h-4" />
            ) : isFav ? (
              <Heart className="w-4 h-4 fill-red-500" />
            ) : (
              <Heart className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Header */}
        <div className="p-5 pb-3">
          <div className="flex items-start gap-4">
            <img
              src={tutor.avatar}
              alt={tutor.name}
              className={`w-[90px] h-[90px] rounded-full object-cover object-center ring-2 ring-primary/10 shrink-0 ${
                isLocked ? "blur-[8px]" : ""
              }`}
            />
            <div className="min-w-0 pr-6">
              <h3
                className={`font-semibold text-foreground truncate ${
                  isLocked ? "blur-[5px] select-none" : ""
                }`}
              >
                {tutor.name}
              </h3>
              <p className="text-primary font-medium text-sm">{tutor.subject}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="w-4 h-4 text-accent fill-accent" />
                <span className="text-sm font-medium text-foreground">
                  {tutor.rating}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({tutor.reviews})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Details — flex-1 so all cards stretch to same height */}
        <div className="px-5 pb-4 space-y-3 flex-1">
          {/* Fixed height bio: always reserves 3 lines even if empty */}
          <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.75rem]">
            {tutor.intro || ""}
          </p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <BookOpen className="w-4 h-4 shrink-0" />
              <span className="truncate">{truncatedSubjects(tutor)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span className="truncate">{tutor.country}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Globe className="w-4 h-4 shrink-0" />
              <span className="truncate">{tutor.languages.join(", ")}</span>
            </div>
          </div>
        </div>

        {/* Footer — always at bottom */}
        <div className="px-5 py-4 bg-muted/50 border-t border-border flex items-center justify-between mt-auto">
          <div className="text-sm space-y-0.5">
            <p className="font-bold text-foreground">
              Private: ${tutor.hourlyRate}/hr
            </p>
            <p className="font-bold text-foreground">
              Group: ${tutor.groupRate}/hr
            </p>
          </div>
          <Button size="sm" onClick={() => navigate(`/tutors/${tutor.id}`)}>
            View Profile
          </Button>
        </div>
      </div>
    );
  };

  return (
    <StudentDashboardLayout>
      <div className="space-y-8">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {studentName}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's what's happening with your learning journey.
          </p>
        </div>

        {/* Student's Subjects */}
        {studentSubjects.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              Your subjects:
            </span>
            {studentSubjects.map((sub) => (
              <span
                key={sub.id}
                className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
              >
                {sub.name}
              </span>
            ))}
          </div>
        )}

        {/* ━━━ FAVORITE TUTORS SECTION ━━━ */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 fill-red-500" />
              Favorite Tutors
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({favorites.length}/{MAX_FAVORITES})
              </span>
            </h2>
          </div>

          {loadingFavorites ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
              <span className="text-muted-foreground text-sm">
                Loading favorites...
              </span>
            </div>
          ) : favorites.length === 0 ? (
            <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
              <HeartOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No favorite tutors yet. Click the{" "}
                <Heart className="w-3.5 h-3.5 inline-block text-muted-foreground" />{" "}
                icon on any tutor below to save them here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((tutor) => (
                <TutorCard
                  key={tutor.id}
                  tutor={tutor}
                  showFavButton={false}
                  showRemoveButton={true}
                />
              ))}
            </div>
          )}
        </div>

        {/* ━━━ RECOMMENDED TUTORS SECTION ━━━ */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
            <span className="text-muted-foreground text-sm">
              Finding the best tutors for you...
            </span>
          </div>
        ) : (
          <>
            {recommended.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Recommended Tutors for You
                  </h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommended.map((tutor) => (
                    <TutorCard
                      key={tutor.id}
                      tutor={tutor}
                      showFavButton={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherTutors.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    Other Tutors
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/tutors")}
                    className="flex items-center gap-1"
                  >
                    <Search className="w-4 h-4" />
                    Browse All
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {otherTutors.map((tutor) => (
                    <TutorCard
                      key={tutor.id}
                      tutor={tutor}
                      showFavButton={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {recommended.length === 0 && otherTutors.length === 0 && (
              <div className="text-center py-16 bg-card rounded-2xl border border-border">
                <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-semibold text-foreground mb-1">
                  No tutors found
                </h3>
                <p className="text-muted-foreground text-sm mb-4 max-w-md mx-auto">
                  {studentSubjects.length > 0
                    ? `We couldn't find any tutors right now. Try browsing all tutors.`
                    : "Complete your profile and select subjects to get personalized tutor recommendations."}
                </p>
                <Button
                  onClick={() =>
                    navigate(
                      studentSubjects.length > 0 ? "/tutors" : "/student/profile"
                    )
                  }
                >
                  {studentSubjects.length > 0
                    ? "Browse All Tutors"
                    : "Complete Profile"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </StudentDashboardLayout>
  );
}
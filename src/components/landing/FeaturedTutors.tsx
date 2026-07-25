import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MapPin, BookOpen, Globe, ChevronRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useUnlockedTutors } from "@/contexts/UnlockedTutorsContext";
import api from "@/lib/api";


function maskNameInText(
  text: string | null | undefined,
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  shouldMask: boolean
): string {
  if (!text) return text || "";
  if (!shouldMask) return text;

  let result = text;
  const namesToMask = [
    ...(firstName ? firstName.trim().split(/\s+/) : []),
    ...(lastName ? lastName.trim().split(/\s+/) : []),
  ];

  namesToMask.forEach((namePart) => {
    if (namePart.length < 2) return;
    const escaped = namePart.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "•••");
  });

  return result;
}

type Tutor = {
  id: number;
  name: string;
  firstName: string;
  last_name: string;
  avatar: string;
  subject: string;
  subjects: string[];
  specialization: string;
  country: string;
  languages: string[];
  curriculum: string[];
  verified: boolean;
  rating: number;
  reviews: number;
  hourlyRate: number;
  groupRate: number;
  intro: string;
};

export function FeaturedTutors() {
  const { unlockedTutorIds } = useUnlockedTutors();
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTutors = async () => {
      setLoading(true);
      try {
        const response = await api.get("/teacher/listing");
        const data = response.data?.data || response.data || [];
        const teachers = Array.isArray(data) ? data : data.data || [];

        const mapped: Tutor[] = teachers.slice(0, 4).map((t: any) => ({
          id: t.id,
          name: `${t.name || ""} ${t.last_name || ""}`.trim(),
          firstName: t.name || "",
          last_name: t.last_name || "",
          avatar: t.profile?.profile_img || `https://ui-avatars.com/api/?name=${t.name}&background=random`,
          subject: t.subjects?.[0]?.name || "General",
          subjects: t.subjects?.map((s: any) => s.name) || [],
          specialization: t.subjects?.map((s: any) => s.name).join(", ") || "",
          country: t.country?.name || "N/A",
          languages: t.languages?.map((l: any) => l.name) || [],
          curriculum: t.classes?.map((c: any) => c.name).filter(Boolean) || [],
          verified: t.is_verified === 1,
          rating: parseFloat(t.average_review) || 0,
          reviews: t.reviews?.length || 0,
          hourlyRate: parseFloat(t.profile?.rate_per_hour) || 0,
          groupRate: parseFloat(t.profile?.group_rate_per_hour) || 0,
          intro: t.profile?.about_me || "",
        }));

        setTutors(mapped);
      } catch (error) {
        console.error("Featured tutors fetch error:", error);
        setTutors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTutors();
  }, []);

  // Helper: show max 2 subjects, then "..." if more
  const truncatedSubjects = (tutor: Tutor) => {
    if (tutor.subjects.length === 0) return "General";
    if (tutor.subjects.length <= 2) return tutor.subjects.join(", ");
    return `${tutor.subjects[0]}, ${tutor.subjects[1]}...`;
  };

  return (
    <section className="py-20 lg:py-32 bg-background" id="tutors">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12"
        >
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-primary-light text-primary text-sm font-medium mb-4">
              Top Tutors
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              Meet Our <span className="text-gradient">Expert Tutors</span>
            </h2>
          </div>
          <Button variant="outline" className="shrink-0 group" asChild>
            <Link to="/tutors">
              View All Tutors
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
        </motion.div>

        {/* Loading */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading tutors...</div>
        ) : tutors.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">No tutors found.</div>
        ) : (
          /* Tutors Grid */
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {tutors.map((tutor, index) => {
              const isLocked = !unlockedTutorIds.has(tutor.id);
              return (
                <motion.div
                  key={tutor.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="tutor-card bg-card rounded-2xl border border-border overflow-hidden group"
                >
                  {/* Header with Avatar */}
                  <div className="relative p-6 pb-4">
                    <div className="flex items-start gap-4">
                      <img
                        src={tutor.avatar}
                        alt={tutor.name}
                        className={`w-[90px] h-[90px] rounded-full object-cover object-center ring-2 ring-primary/10 shrink-0 ${isLocked ? "blur-[8px]" : ""}`}
                      />
                      <div>
                        <h3 className={`font-semibold text-foreground truncate ${isLocked ? "blur-[5px] select-none" : ""}`}>
                          {tutor.name}
                        </h3>
                        {tutor.verified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-success/10 text-success text-xs font-medium">
                            ✓ Verified
                          </span>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="w-4 h-4 text-accent fill-accent" />
                          <span className="text-sm font-medium text-foreground">{tutor.rating}</span>
                          <span className="text-sm text-muted-foreground">({tutor.reviews})</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-6 pb-4 space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {maskNameInText(tutor.intro, tutor.firstName, tutor.last_name, isLocked)}
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="w-4 h-4 shrink-0" />
                        <span className="truncate">{truncatedSubjects(tutor)}</span>
                      </div>
                      {tutor.curriculum.length > 0 && (
                        <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                          <GraduationCap className="w-4 h-4 shrink-0" />
                          <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium max-w-[140px] truncate">
                            {tutor.curriculum[0]}{tutor.curriculum.length > 1 ? "..." : ""}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="w-4 h-4 shrink-0" />
                        <span>{tutor.languages.join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 bg-muted/50 border-t border-border flex items-center justify-between">
                    <div className="text-sm space-y-0.5">
                      <p className="font-bold text-foreground">Private: ${tutor.hourlyRate}/hr</p>
                      <p className="font-bold text-foreground">Group: ${tutor.groupRate}/hr</p>
                    </div>
                    <Button size="sm" asChild>
                      <Link to={`/tutors/${tutor.id}`}>View Profile</Link>
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
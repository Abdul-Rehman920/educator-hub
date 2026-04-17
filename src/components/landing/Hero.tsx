import { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Search, Star, Users, Globe, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "@/assets/hero-illustration.jpg";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const stats = [
  { icon: Users, value: "50,000+", label: "Active Tutors" },
  { icon: Globe, value: "120+", label: "Countries" },
  { icon: Star, value: "4.9/5", label: "Average Rating" },
];

// ─── Types ─────────────────────────────────────────────────────
interface ApiTeacher {
  id: number;
  name: string;
  last_name?: string;
  email?: string;
  average_review?: number | string;
  country?: { id: number; name: string } | null;
  profile?: {
    profile_img?: string | null;
    rate_per_hour?: string | number | null;
    about_me?: string | null;
  } | null;
  languages?: { id: number; name: string }[];
  subjects?: { id: number; name: string }[];
  classes?: { id: number; name: string }[];
}

// ─── Helper: build full image URL ──────────────────────────────
function buildAvatarUrl(profileImg: string | null | undefined): string {
  if (!profileImg) return "";
  if (profileImg.startsWith("http") || profileImg.startsWith("data:")) return profileImg;
  const baseUrl = API_BASE.replace("/api", "");
  return `${baseUrl}/${profileImg}`;
}

export function Hero() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<ApiTeacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [allTeachers, setAllTeachers] = useState<ApiTeacher[]>([]);
  const [teachersLoaded, setTeachersLoaded] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  // ─── Fetch all teachers once (for client-side filtering) ────
  const fetchAllTeachers = useCallback(async () => {
    if (teachersLoaded) return;
    try {
      const res = await fetch(`${API_BASE}/teacher/listing`);
      if (!res.ok) return;
      const data = await res.json();

      // Handle different response structures
      let teachers: ApiTeacher[] = [];
      if (Array.isArray(data)) {
        teachers = data;
      } else if (Array.isArray(data.data)) {
        teachers = data.data;
      } else if (Array.isArray(data.teachers)) {
        teachers = data.teachers;
      } else if (data.data && Array.isArray(data.data.data)) {
        // Laravel paginated: { data: { data: [...], current_page, ... } }
        teachers = data.data.data;
      }

      setAllTeachers(teachers);
      setTeachersLoaded(true);
    } catch (err) {
      console.error("Hero: Failed to fetch teachers", err);
    }
  }, [teachersLoaded]);

  // ─── Load teachers when user focuses on search ─────────────
  const handleSearchFocus = () => {
    if (!teachersLoaded) {
      fetchAllTeachers();
    }
    if (searchQuery.trim()) {
      setShowResults(true);
    }
  };

  // ─── Filter teachers based on search query ─────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    // Debounce filtering
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const q = searchQuery.toLowerCase();
      const filtered = allTeachers.filter((t) => {
        const fullName = `${t.name || ""} ${t.last_name || ""}`.toLowerCase();
        const countryName = (t.country?.name || "").toLowerCase();
        const subjectNames = (t.subjects || []).map((s) => s.name.toLowerCase());
        const languageNames = (t.languages || []).map((l) => l.name.toLowerCase());
        const classNames = (t.classes || []).map((c) => c.name.toLowerCase());

        return (
          fullName.includes(q) ||
          countryName.includes(q) ||
          subjectNames.some((s) => s.includes(q)) ||
          languageNames.some((l) => l.includes(q)) ||
          classNames.some((c) => c.includes(q))
        );
      });

      setSearchResults(filtered.slice(0, 8)); // Max 8 results in dropdown
      setShowResults(true);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, allTeachers]);

  // ─── Close dropdown on outside click ────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 overflow-hidden bg-hero-gradient">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
      </div>

      <div className="section-container relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-light text-primary text-sm font-medium mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Trusted by 500,000+ students worldwide
            </motion.div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-foreground leading-tight mb-6">
              Find Your Perfect{" "}
              <span className="text-gradient">Tutor</span>{" "}
              Anywhere in the World
            </h1>

            <p className="text-lg lg:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0 mb-8">
              Connect with expert tutors from 120+ countries. Learn any subject, any curriculum, in your preferred language – all from the comfort of your home.
            </p>

            {/* Search Box */}
            <motion.div
              ref={searchRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="relative bg-card rounded-2xl shadow-elevated p-2 max-w-xl mx-auto lg:mx-0 mb-8"
            >
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-muted rounded-xl">
                  <Search className="w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by name, subject, or language..."
                    className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleSearchFocus}
                  />
                  {/* Show loading spinner when teachers are being fetched */}
                  {!teachersLoaded && searchQuery.trim() && (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                <Button size="lg" className="shrink-0" asChild>
                  <Link to="/tutors">Find Tutors</Link>
                </Button>
              </div>

              {/* Search Results Dropdown */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-elevated z-50 max-h-80 overflow-y-auto">
                  {searchResults.map((teacher) => {
                    const fullName = `${teacher.name || ""} ${teacher.last_name || ""}`.trim();
                    const avatarUrl = buildAvatarUrl(teacher.profile?.profile_img);
                    const countryName = teacher.country?.name || "";
                    const mainSubject = teacher.subjects?.[0]?.name || teacher.classes?.[0]?.name || "";
                    const rating = Number(teacher.average_review || 0);
                    const displaySubject = mainSubject
                      ? countryName
                        ? `${mainSubject} · ${countryName}`
                        : mainSubject
                      : countryName || "";

                    return (
                      <button
                        key={teacher.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left first:rounded-t-2xl last:rounded-b-2xl"
                        onClick={() => {
                          setShowResults(false);
                          setSearchQuery("");
                          navigate(`/tutors/${teacher.id}`);
                        }}
                      >
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={fullName}
                            className="w-10 h-10 rounded-full object-cover shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-semibold text-primary">
                              {(teacher.name?.[0] || "").toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {fullName}
                          </p>
                          {displaySubject && (
                            <p className="text-xs text-muted-foreground truncate">
                              {displaySubject}
                            </p>
                          )}
                        </div>
                        {rating > 0 && (
                          <div className="flex items-center gap-1 shrink-0">
                            <Star className="w-3.5 h-3.5 text-accent fill-accent" />
                            <span className="text-xs font-medium text-foreground">
                              {rating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {showResults && searchQuery.trim().length > 0 && searchResults.length === 0 && teachersLoaded && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-elevated z-50 px-4 py-6 text-center">
                  <p className="text-muted-foreground text-sm">No tutors found for "{searchQuery}"</p>
                </div>
              )}

              {showResults && searchQuery.trim().length > 0 && !teachersLoaded && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-elevated z-50 px-4 py-6 text-center">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Loading tutors...</p>
                </div>
              )}
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center lg:justify-start gap-6 lg:gap-10"
            >
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-floating">
              <img
                src={heroImage}
                alt="Global tutoring community"
                className="w-full h-auto object-cover"
              />
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
            </div>

            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="absolute -left-4 lg:-left-8 top-1/4 glass rounded-xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center">
                  <Star className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Top Rated</p>
                  <p className="text-sm text-muted-foreground">Verified tutors</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
              className="absolute -right-4 lg:-right-8 bottom-1/4 glass rounded-xl p-4 shadow-elevated"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center">
                  <Globe className="w-6 h-6 text-success-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">120+ Countries</p>
                  <p className="text-sm text-muted-foreground">Global reach</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
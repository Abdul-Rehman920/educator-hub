import { useState, useMemo, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Star,
  MapPin,
  BookOpen,
  Globe,
  Clock,
  Video,
  ChevronDown,
  X,
  SlidersHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUnlockedTutors } from "@/contexts/UnlockedTutorsContext";
import api from "@/lib/api";

type FilterOption = { id: number; name: string };

type Tutor = {
  id: number;
  name: string;
  subject: string;
  specialization: string;
  intro: string;
  avatar: string;
  rating: number;
  reviews: number;
  experience: string;
  hourlyRate: number;
  groupRate: number;
  country: string;
  languages: string[];
  availability: string;
  verified: boolean;
  subjects: string[];
  curriculum: string[];
  demo_class: boolean;
};

export default function TutorsPage() {
  const { unlockedTutorIds } = useUnlockedTutors();

  // ─── Logged-in user info (for own-profile unblur) ───
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user?.id) setCurrentUserId(user.id);
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  // Filter options from API
  const [standardsList, setStandardsList] = useState<FilterOption[]>([]);
  const [subjectsList, setSubjectsList] = useState<FilterOption[]>([]);
  const [languagesList, setLanguagesList] = useState<FilterOption[]>([]);
  const [countriesList, setCountriesList] = useState<FilterOption[]>([]);

  // Filter values (store IDs for API, "" means "All")
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStandard, setSelectedStandard] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [tuitionType, setTuitionType] = useState("all"); // all, single, group
  const [demoClassFilter, setDemoClassFilter] = useState("all"); // all, yes, no
  const [maxRate, setMaxRate] = useState([500]);
  const [sortBy, setSortBy] = useState("relevant");
  const [showFilters, setShowFilters] = useState(false);

  // Data
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  // Debounce timer for search
  const [searchTimer, setSearchTimer] = useState<any>(null);

  /* ── Fetch subjects (filtered by standard if provided) ── */
  const fetchSubjectsForStandard = async (standardId: string | null) => {
    try {
      let res;
      if (standardId && standardId !== "all") {
        // Use POST endpoint to get subjects for specific standard
        res = await api.post("/v1/users/subject", { id: standardId });
      } else {
        // Default: get all subjects
        res = await api.get("/get/subjects");
      }
      const data = res.data;
      const items = data?.subjects || data?.data?.subjects || data?.data || [];
      setSubjectsList(Array.isArray(items) ? items.filter((i: any) => i.status === 1) : []);
    } catch (err) {
      console.error("Subjects fetch error:", err);
      setSubjectsList([]);
    }
  };
  
  /* ── Fetch filter options from API ── */
  useEffect(() => {
    // Standards/Classes
    (async () => {
      try {
        const res = await api.get("/get/classes");
        const data = res.data;
        const items = data?.standards || data?.data?.standards || data?.data || [];
        setStandardsList(Array.isArray(items) ? items.filter((i: any) => i.status === 1) : []);
      } catch { }
    })();

    // Subjects (default — all subjects, will be re-fetched when standard changes)
    fetchSubjectsForStandard(null);

    // Languages
    (async () => {
      try {
        const res = await api.get("/get/languages");
        const data = res.data;
        const items = data?.languages || data?.data?.languages || data?.data || [];
        setLanguagesList(Array.isArray(items) ? items.filter((i: any) => i.status === 1) : []);
      } catch { }
    })();

    // Countries
    (async () => {
      try {
        const res = await api.get("/get/countries");
        const data = res.data;
        const items = Array.isArray(data) ? data : data?.data || [];
        setCountriesList(items.filter((i: any) => i.is_available === 1));
      } catch { }
    })();
  }, []);

  /* ── Build query params and fetch tutors ── */
  const fetchTutors = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(page));

      if (searchQuery.trim()) params.append("keyword", searchQuery.trim());
      if (selectedSubject && selectedSubject !== "all") params.append("subjects", selectedSubject);
      if (selectedStandard && selectedStandard !== "all") params.append("classes", selectedStandard);
      if (selectedLanguage && selectedLanguage !== "all") params.append("language[]", selectedLanguage);
      if (selectedCountry && selectedCountry !== "all") params.append("countries[]", selectedCountry);

      // Tuition type
      if (tuitionType === "single") params.append("tuition_type", "single");
      else if (tuitionType === "group") params.append("tuition_type", "group");

      // Demo class
      if (demoClassFilter === "yes") params.append("demo_classes", "1");

      // Max rate
      if (maxRate[0] < 500) params.append("rate_per_hour", String(maxRate[0]));

      const res = await api.get(`/teacher/listing?${params.toString()}`);
      const json = res.data;

      const teachersData = json?.data || [];
      const mapped: Tutor[] = teachersData.map((t: any) => ({
        id: t.id,
        name: `${t.name || ""} ${t.last_name || ""}`.trim(),
        subject: t.subjects?.[0]?.name || "General",
        specialization: t.subjects?.map((s: any) => s.name).join(", ") || "",
        intro: t.profile?.about_me || "",
        avatar: t.profile?.profile_img || `https://ui-avatars.com/api/?name=${t.name}&background=random`,
        rating: parseFloat(t.average_review) || 0,
        reviews: t.reviews?.length || t.reviews_received?.length || 0,
        experience: "N/A",
        hourlyRate: parseFloat(t.profile?.rate_per_hour) || 0,
        groupRate: parseFloat(t.profile?.group_rate_per_hour) || 0,
        country: t.country?.name || "N/A",
        languages: t.languages?.map((l: any) => l.name) || [],
        availability: "Available",
        verified: t.is_verified === 1,
        subjects: t.subjects?.map((s: any) => s.name) || [],
        curriculum: t.classes?.map((c: any) => c.name).filter(Boolean) || [],
        demo_class: t.profile?.demo_class === 1,
      }));

      setTutors(mapped);
      setTotalCount(json?.meta?.total || json?.total || mapped.length);
      setCurrentPage(json?.meta?.current_page || page);
      setLastPage(json?.meta?.last_page || 1);
    } catch (error) {
      console.error("Teachers fetch error:", error);
      setTutors([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSubject, selectedStandard, selectedLanguage, selectedCountry, tuitionType, demoClassFilter, maxRate]);

  // When standard changes, refetch subjects for that standard
  useEffect(() => {
    fetchSubjectsForStandard(selectedStandard);
    // Reset selected subject when standard changes (might not exist in new standard)
    setSelectedSubject("all");
  }, [selectedStandard]);  
  
  // Fetch on filter change (reset to page 1)
  useEffect(() => {
    setCurrentPage(1);
    fetchTutors(1);
  }, [selectedSubject, selectedStandard, selectedLanguage, selectedCountry, tuitionType, demoClassFilter, maxRate, fetchTutors]);

  // Debounced search
  useEffect(() => {
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchTutors(1);
    }, 500);
    setSearchTimer(timer);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  /* ── Client-side sort (backend doesn't have sort param) ── */
  const sortedTutors = useMemo(() => {
    let result = [...tutors];

    // Demo class "no" filter (client side since backend only supports demo_classes=1)
    if (demoClassFilter === "no") {
      result = result.filter((t) => !t.demo_class);
    }

    if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "price-low") {
      result.sort((a, b) => a.hourlyRate - b.hourlyRate);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.hourlyRate - a.hourlyRate);
    } else if (sortBy === "relevant") {
      // Most relevant = rating * reviews weight
      result.sort((a, b) => {
        const scoreA = a.rating * (1 + a.reviews * 0.1);
        const scoreB = b.rating * (1 + b.reviews * 0.1);
        return scoreB - scoreA;
      });
    }

    return result;
  }, [tutors, sortBy, demoClassFilter]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedSubject("all");
    setSelectedStandard("all");
    setSelectedLanguage("all");
    setSelectedCountry("all");
    setTuitionType("all");
    setDemoClassFilter("all");
    setMaxRate([500]);
    setSortBy("relevant");
  };

  const hasActiveFilters =
    selectedSubject !== "all" ||
    selectedStandard !== "all" ||
    selectedLanguage !== "all" ||
    selectedCountry !== "all" ||
    tuitionType !== "all" ||
    demoClassFilter !== "all" ||
    maxRate[0] < 500;

  const truncatedSubjectLabel = (tutor: Tutor) => {
    if (tutor.subjects.length === 0) return "General";
    if (tutor.subjects.length === 1) return tutor.subjects[0];
    return `${tutor.subjects[0]}...`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-20 lg:pt-24">
        {/* Search Header */}
        <section className="bg-primary py-12 lg:py-16">
          <div className="section-container">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-primary-foreground mb-4">Find Your Perfect Tutor</h1>
              <p className="text-primary-foreground/80 text-lg">
                {loading ? "Loading..." : `${totalCount}+ expert tutors ready to help you succeed`}
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="max-w-3xl mx-auto"
            >
              <div className="bg-card rounded-2xl shadow-elevated p-2">
                <div className="flex gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-muted rounded-xl">
                    <Search className="w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, subject, or keyword..."
                      className="flex-1 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                    />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery("")}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </button>
                    )}
                  </div>
                  <Button
                    size="lg"
                    variant="outline"
                    className="lg:hidden"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="py-8 lg:py-12">
          <div className="section-container">
            <div className="flex gap-8">
              {/* Filters Sidebar */}
              <aside
                className={`${showFilters ? "fixed inset-0 z-50 bg-background p-6 overflow-auto lg:relative lg:inset-auto lg:z-auto lg:p-0" : "hidden"} lg:block lg:w-72 shrink-0`}
              >
                <div className="lg:sticky lg:top-24 space-y-6">
                  <div className="flex items-center justify-between lg:hidden mb-4">
                    <h2 className="text-xl font-bold">Filters</h2>
                    <button onClick={() => setShowFilters(false)}>
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-foreground flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        Filters
                      </h3>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="text-sm text-primary hover:underline">
                          Clear all
                        </button>
                      )}
                    </div>

                    {/* Education Standard */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Education Standard</label>
                      <Select value={selectedStandard} onValueChange={setSelectedStandard}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Standards" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Standards</SelectItem>
                          {standardsList.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Subject</label>
                      <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {subjectsList.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Language</label>
                      <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Languages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Languages</SelectItem>
                          {languagesList.map((l) => (
                            <SelectItem key={l.id} value={String(l.id)}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Country */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Country</label>
                      <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Countries" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Countries</SelectItem>
                          {countriesList.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Tuition Type */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">Tuition</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { val: "all", label: "All" },
                          { val: "single", label: "Private" },
                          { val: "group", label: "Group" },
                        ].map((opt) => (
                          <button
                            key={opt.val}
                            onClick={() => setTuitionType(opt.val)}
                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                              tuitionType === opt.val
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-card text-muted-foreground hover:border-primary/40"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Demo Class */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-3">Demo Class Available</label>
                      <RadioGroup value={demoClassFilter} onValueChange={setDemoClassFilter}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="all" id="demo-all" />
                          <label htmlFor="demo-all" className="text-sm text-foreground cursor-pointer">All</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="yes" id="demo-yes" />
                          <label htmlFor="demo-yes" className="text-sm text-foreground cursor-pointer">Yes</label>
                        </div>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="no" id="demo-no" />
                          <label htmlFor="demo-no" className="text-sm text-foreground cursor-pointer">No</label>
                        </div>
                      </RadioGroup>
                    </div>

                    {/* Max Rate */}
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-4">
                        Maximum Rate Per Hour: ${maxRate[0] === 500 ? "500+" : maxRate[0]}/hr
                      </label>
                      <Slider
                        value={maxRate}
                        onValueChange={setMaxRate}
                        min={0}
                        max={500}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>$0</span>
                        <span>$500</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:hidden">
                    <Button className="w-full" onClick={() => setShowFilters(false)}>
                      Apply Filters ({sortedTutors.length} results)
                    </Button>
                  </div>
                </div>
              </aside>

              {/* Tutors Grid */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{totalCount}</span> tutors found
                  </p>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevant">Most Relevant</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Loading State */}
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="text-muted-foreground">Loading tutors...</p>
                  </div>
                ) : sortedTutors.length > 0 ? (
                  <>
                    <div className="space-y-6">
                      {sortedTutors.map((tutor, index) => {
                        // ─── Lock logic ───
                        // Locked = NOT unlocked AND NOT own profile
                        const isOwnProfile = currentUserId !== null && tutor.id === currentUserId;
                        const isLocked = !unlockedTutorIds.has(tutor.id) && !isOwnProfile;
                        return (
                          <motion.div
                            key={tutor.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="tutor-card bg-card rounded-2xl border border-border p-6 hover:border-primary/20"
                          >
                            <div className="flex flex-col lg:flex-row gap-6">
                              <div className="flex items-start gap-4 lg:w-64 shrink-0">
                                <img
                                  src={tutor.avatar}
                                  alt={tutor.name}
                                  className={`w-[90px] h-[90px] rounded-full object-cover object-center ring-2 ring-primary/10 shrink-0 ${isLocked ? "blur-[8px]" : ""}`}
                                />
                                <div className="lg:hidden flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h3 className={`font-semibold text-foreground text-lg ${isLocked ? "blur-[5px] select-none" : ""}`}>{tutor.name}</h3>
                                      <p className="text-primary font-medium">{truncatedSubjectLabel(tutor)}</p>
                                    </div>
                                    <div className="text-right text-sm space-y-0.5">
                                      <p className="font-bold text-foreground">Private: ${tutor.hourlyRate}/hr</p>
                                      <p className="font-bold text-foreground">Group: ${tutor.groupRate}/hr</p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex-1">
                                <div className="hidden lg:flex items-start justify-between mb-3">
                                  <div>
                                    <h3 className="font-semibold text-foreground text-xl flex items-center gap-2">
                                      <span className={isLocked ? "blur-[5px] select-none" : ""}>{tutor.name}</span>
                                      {tutor.verified && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-xs font-medium">
                                          ✓ Verified
                                        </span>
                                      )}
                                    </h3>
                                    <p className="text-primary font-medium">
                                      {truncatedSubjectLabel(tutor)}
                                    </p>
                                  </div>
                                  <div className="text-right text-sm space-y-0.5 shrink-0">
                                    <p className="font-bold text-foreground">Private: ${tutor.hourlyRate}/hr</p>
                                    <p className="font-bold text-foreground">Group: ${tutor.groupRate}/hr</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                  <div className="flex items-center gap-1">
                                    <Star className="w-5 h-5 text-accent fill-accent" />
                                    <span className="font-semibold text-foreground">{tutor.rating}</span>
                                    <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
                                  </div>
                                </div>

                                <p className="text-muted-foreground mb-4 line-clamp-2">{tutor.intro}</p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                                    <MapPin className="w-3 h-3" />
                                    {tutor.country}
                                  </span>
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-muted text-muted-foreground text-sm">
                                    <Globe className="w-3 h-3" />
                                    {tutor.languages.join(", ")}
                                  </span>
                                  {tutor.demo_class && (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                                      <Video className="w-3 h-3" />
                                      Demo Available
                                    </span>
                                  )}
                                </div>

                                <div className="flex gap-3">
                                  <Button asChild>
                                    <Link to={`/tutors/${tutor.id}`}>View Profile</Link>
                                  </Button>
                                  <Button variant="outline" asChild>
                                    <Link to={`/tutors/${tutor.id}`}>
                                      <Video className="w-4 h-4 mr-2" />
                                      Book Trial
                                    </Link>
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {lastPage > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => { setCurrentPage(currentPage - 1); fetchTutors(currentPage - 1); }}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-3">
                          Page {currentPage} of {lastPage}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= lastPage}
                          onClick={() => { setCurrentPage(currentPage + 1); fetchTutors(currentPage + 1); }}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">No tutors found</h3>
                    <p className="text-muted-foreground mb-4">Try adjusting your filters or search terms</p>
                    <Button variant="outline" onClick={clearFilters}>
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Star, Quote, MessageSquare } from "lucide-react";
import api from "@/lib/api";

type Review = {
  id: string;
  studentName: string;
  rating: number;
  reviewText: string;
  date?: string;
};

export default function DashboardHome() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setLoadingReviews(true);
    try {
      const response = await api.get(`/get/user/update-profile`);
      const raw = response.data?.user_profile?.reviews || response.data?.user?.reviews || [];

      const allReviews: Review[] = raw.map((r: any) => ({
        id: String(r.id),
        studentName: `${r.reviewer?.name || ""} ${r.reviewer?.last_name || ""}`.trim() || "Student",
        rating: Number(r.rate) || 0,
        reviewText: r.comment || "",
        date: r.created_at,
      }));

      setReviews(allReviews);
    } catch (error) {
      console.error("Reviews error:", error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const initials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase();

  return (
    <DashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground mb-6">Reviews from your students.</p>

        {loadingReviews ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No Reviews Yet</h3>
            <p className="text-muted-foreground text-sm">
              You don't have any student reviews yet.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="relative bg-primary text-primary-foreground rounded-2xl p-6 lg:p-8 shadow-sm"
              >
                {/* Quote Icon */}
                <Quote className="absolute top-6 right-6 w-10 h-10 text-primary-foreground/20" />

                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < review.rating
                          ? "text-accent fill-accent"
                          : "text-primary-foreground/20"
                      }`}
                    />
                  ))}
                </div>

                {/* Content */}
                <p className="text-primary-foreground/90 leading-relaxed mb-6">
                  "{review.reviewText || "No comment left."}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary-foreground/10 ring-2 ring-primary-foreground/20 flex items-center justify-center font-semibold text-sm">
                    {initials(review.studentName)}
                  </div>
                  <div>
                    <p className="font-semibold text-primary-foreground">
                      {review.studentName}
                    </p>
                    {review.date && (
                      <p className="text-sm text-primary-foreground/70">
                        {formatDate(review.date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
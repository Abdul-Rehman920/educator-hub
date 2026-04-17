import { StudentDashboardLayout } from "@/components/student-dashboard/StudentDashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function StudentTutors() {
  const navigate = useNavigate();

  return (
    <StudentDashboardLayout>
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-6">My Tutors</h1>

        <Card>
          <CardContent className="p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Heart className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">No Favorite Tutors</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't added any tutors to your favorites yet. Browse tutors and click the heart icon to save them.
            </p>
            <Button onClick={() => navigate("/tutors")}>Browse Tutors</Button>
          </CardContent>
        </Card>
      </div>
    </StudentDashboardLayout>
  );
}

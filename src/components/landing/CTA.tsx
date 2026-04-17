import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";

export function CTA() {
  const navigate = useNavigate();

  const handleBecomeTutor = () => {
    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user?.role?.[0]?.name;

    if (!token) {
      navigate("/signup?role=tutor");
    } else if (role === "teacher") {
      navigate("/dashboard");
    } else {
      navigate("/student");
    }
  };

  return (
    <section className="py-20 lg:py-32 bg-background">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative bg-card-gradient rounded-3xl p-8 lg:p-16 border border-border shadow-elevated overflow-hidden"
        >
          {/* Background Decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative text-center max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Ready to Start Your{" "}
              <span className="text-gradient">Learning Journey?</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Whether you're looking to learn something new or share your expertise, Educator Hub is here to help you succeed.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="xl" className="group" asChild>
                <Link to="/tutors">
                  Find a Tutor
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" onClick={handleBecomeTutor}>
                Become a Tutor
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
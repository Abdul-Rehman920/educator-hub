import { motion } from "framer-motion";
import { DollarSign, Clock, Users, BarChart, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const benefits = [
  {
    icon: DollarSign,
    title: "Set Your Own Rates",
    description: "You decide your hourly rate. Earn what you deserve for your expertise.",
  },
  {
    icon: Clock,
    title: "Flexible Schedule",
    description: "Teach when it suits you. Accept students from any timezone.",
  },
  {
    icon: Users,
    title: "Global Reach",
    description: "Connect with students from 120+ countries. Expand your teaching impact.",
  },
  {
    icon: BarChart,
    title: "Grow Your Business",
    description: "Access analytics, marketing tools, and premium features to scale.",
  },
];

const checklist = [
  "Free profile creation",
  "Free membership",
  "Secure payment processing",
  "Built-in video platform",
  "Student management tools",
];

export function ForTutors() {
  const navigate = useNavigate();

  const handleTeacherClick = () => {
    const token = localStorage.getItem("auth_token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const role = user?.role?.[0]?.name;

    if (!token) {
      navigate("/login");
    } else if (role === "teacher") {
      navigate("/dashboard");
    } else {
      navigate("/student");
    }
  };

  return (
    <section className="py-20 lg:py-32 bg-muted/50" id="for-tutors">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-accent-light text-accent-foreground text-sm font-medium mb-4">
              For Educators
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
              Share Your Knowledge,{" "}
              <span className="text-gradient">Build Your Brand</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Join thousands of tutors earning a sustainable income while making a real difference in students' lives worldwide.
            </p>

            {/* Benefits Grid */}
            <div className="grid sm:grid-cols-2 gap-6 mb-8">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={benefit.title}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center shrink-0">
                    <benefit.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      {benefit.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <Button size="lg" onClick={handleTeacherClick}>
              Start Teaching Today
            </Button>
          </motion.div>

          {/* Checklist Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="bg-card rounded-3xl p-8 lg:p-10 shadow-elevated border border-border">
              <h3 className="text-2xl font-bold text-foreground mb-6">
                Why Tutors Love Us
              </h3>
              
              <ul className="space-y-4 mb-8">
                {checklist.map((item, index) => (
                  <motion.li
                    key={item}
                    initial={{ opacity: 0, x: 10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <CheckCircle className="w-5 h-5 text-success shrink-0" />
                    <span className="text-foreground">{item}</span>
                  </motion.li>
                ))}
              </ul>

              <div className="bg-primary-light rounded-xl p-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-4xl font-bold text-primary">$2M+</span>
                  <span className="text-muted-foreground">paid to tutors</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Our tutors have collectively earned over $2 million in the past year alone.
                </p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

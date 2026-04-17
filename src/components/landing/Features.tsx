import { motion } from "framer-motion";
import { 
  Globe, 
  Shield, 
  Clock, 
  MessageSquare, 
  BookOpen, 
  CreditCard,
  Video,
  Award
} from "lucide-react";

const features = [
  {
    icon: Globe,
    title: "Global Tutor Network",
    description: "Access tutors from 120+ countries, covering every curriculum from IB to CBSE, GCSE to AP.",
    color: "primary",
  },
  {
    icon: Shield,
    title: "Verified & Vetted",
    description: "Every tutor goes through a rigorous verification process including background checks and credential verification.",
    color: "success",
  },
  {
    icon: Video,
    title: "HD Video Sessions",
    description: "Crystal-clear video calls with interactive whiteboards, screen sharing, and session recording.",
    color: "tertiary",
  },
  {
    icon: Clock,
    title: "Flexible Scheduling",
    description: "Book lessons that fit your timezone. Available 24/7 with tutors across all time zones.",
    color: "accent",
  },
  {
    icon: MessageSquare,
    title: "Direct Communication",
    description: "Message tutors directly, share files, and stay connected between sessions.",
    color: "primary",
  },
  {
    icon: BookOpen,
    title: "Any Subject, Any Level",
    description: "From elementary math to PhD-level research, find specialized tutors for every learning need.",
    color: "success",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    description: "Protected transactions with money-back guarantee. Pay only for completed sessions.",
    color: "tertiary",
  },
  {
    icon: Award,
    title: "Track Progress",
    description: "Detailed progress reports, learning analytics, and achievement badges to stay motivated.",
    color: "accent",
  },
];

const colorVariants = {
  primary: "bg-primary-light text-primary",
  success: "bg-green-100 text-success",
  tertiary: "bg-tertiary-light text-tertiary",
  accent: "bg-accent-light text-accent-foreground",
};

export function Features() {
  return (
    <section className="py-20 lg:py-32 bg-background" id="features">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary-light text-primary text-sm font-medium mb-4">
            Why Choose Us
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything You Need for{" "}
            <span className="text-gradient">Effective Learning</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our platform is designed to make finding the right tutor easy, learning effective, and progress measurable.
          </p>
        </motion.div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="feature-card bg-card border border-border hover:border-primary/20 group"
            >
              <div className={`w-12 h-12 rounded-xl ${colorVariants[feature.color as keyof typeof colorVariants]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { motion } from "framer-motion";
import { UserPlus, Search, Calendar, Video } from "lucide-react";

const steps = [
  {
    icon: UserPlus,
    step: "01",
    title: "Create Your Profile",
    description: "Sign up as a student or tutor. Add your details, learning goals, or teaching expertise.",
  },
  {
    icon: Search,
    step: "02",
    title: "Find the Perfect Match",
    description: "Search by subject, curriculum, language, and budget. Read reviews and watch intro videos.",
  },
  {
    icon: Calendar,
    step: "03",
    title: "Book a Session",
    description: "Choose a time that works for you. Start with a trial lesson to ensure it's the right fit.",
  },
  {
    icon: Video,
    step: "04",
    title: "Start Learning",
    description: "Connect via HD video, use interactive tools, and track your progress over time.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-20 lg:py-32 bg-muted/50" id="how-it-works">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-accent-light text-accent-foreground text-sm font-medium mb-4">
            Simple Process
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            How It <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Getting started is easy. Find your ideal tutor in just a few simple steps.
          </p>
        </motion.div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="relative"
              >
                <div className="bg-card rounded-2xl p-6 shadow-soft border border-border text-center relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-primary-light flex items-center justify-center mx-auto mb-4 mt-2">
                    <step.icon className="w-8 h-8 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

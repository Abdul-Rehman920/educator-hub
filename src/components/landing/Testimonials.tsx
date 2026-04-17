import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Emily Watson",
    role: "IB Student, Grade 11",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
    content: "Educator Hub helped me raise my Math grade from a 5 to a 7. Dr. Chen is incredibly patient and explains complex concepts in simple terms. Best investment in my education!",
    rating: 5,
  },
  {
    id: 2,
    name: "Michael Thompson",
    role: "Parent of GCSE Student",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    content: "Finding a Physics tutor who understood the UK curriculum was challenging until we found this platform. James has been fantastic, and my son's confidence has soared.",
    rating: 5,
  },
  {
    id: 3,
    name: "Priya Sharma",
    role: "IIT-JEE Aspirant",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    content: "Dr. Patel's teaching methodology is exceptional. His problem-solving techniques and shortcuts have been invaluable for my JEE preparation. Highly recommended!",
    rating: 5,
  },
];

export function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-primary text-primary-foreground overflow-hidden">
      <div className="section-container">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block px-4 py-2 rounded-full bg-primary-foreground/10 text-primary-foreground text-sm font-medium mb-4">
            Success Stories
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            What Our Students Say
          </h2>
          <p className="text-lg text-primary-foreground/80">
            Join thousands of satisfied students who've transformed their learning journey.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 }}
              className="relative bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-6 lg:p-8"
            >
              {/* Quote Icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary-foreground/20" />
              
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-accent fill-accent" />
                ))}
              </div>
              
              {/* Content */}
              <p className="text-primary-foreground/90 leading-relaxed mb-6">
                "{testimonial.content}"
              </p>
              
              {/* Author */}
              <div className="flex items-center gap-4">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-primary-foreground/20"
                />
                <div>
                  <p className="font-semibold text-primary-foreground">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-primary-foreground/70">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

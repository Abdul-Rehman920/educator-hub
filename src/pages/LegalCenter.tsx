import { Link } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { FileText, Shield, DollarSign, Users, Cookie, ChevronRight, Scale } from "lucide-react";

const legalLinks = [
  { name: "Terms and Conditions", href: "/legal/terms-condition", icon: FileText },
  { name: "Privacy Policy", href: "/legal/privacy-policy", icon: Shield },
  { name: "Service Fee and Refund Policy", href: "/legal/service-fee-refund-policy", icon: DollarSign },
  { name: "User Code of Conduct", href: "/legal/user-code-of-conduct", icon: Users },
  { name: "Cookie Policy", href: "/legal/cookie-policy", icon: Cookie },
];

const LegalCenter = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 lg:pt-32 pb-20">
        <div className="section-container max-w-3xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-light mb-6">
              <Scale className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">Legal Center</h1>
            <p className="text-muted-foreground">
              All our policies and legal documents in one place.
            </p>
          </div>

          <div className="space-y-4">
            {legalLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className="flex items-center justify-between bg-card rounded-2xl border border-border shadow-soft p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                    <link.icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-semibold text-foreground">{link.name}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalCenter;
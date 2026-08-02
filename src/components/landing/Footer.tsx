import { Link, useNavigate  } from "react-router-dom";
import { GraduationCap, Facebook, Twitter, Linkedin, Instagram, Youtube } from "lucide-react";

const footerLinks = {
  forStudents: [
    { name: "Find a Tutor", href: "/tutors" },
    { name: "How It Works", href: "/#how-it-works" },
    // { name: "Pricing", href: "#pricing" },
    // { name: "Student Resources", href: "/resources" },
    // { name: "Success Stories", href: "/testimonials" },
  ],
  forTutors: [
    { name: "Become a Tutor", href: "/signup/tutor" },
    { name: "Tutor Dashboard", href: "/dashboard" },
    // { name: "Teaching Resources", href: "/resources/tutors" },
    // { name: "Tutor Community", href: "/community" },
    // { name: "Tutor FAQ", href: "/faq/tutors" },
  ],
  subjects: [
    "Mathematics",
    "Science",
    "Languages",
    "Test Prep",
    "All Subjects",
  ],
  //subjects: [
    //{ name: "Mathematics", href: "/tutors?subject=math" },
    //{ name: "Science", href: "/tutors?subject=science" },
    //{ name: "Languages", href: "/tutors?subject=languages" },
    //{ name: "Test Prep", href: "/tutors?subject=test-prep" },
    //{ name: "All Subjects", href: "/subjects" },
  //],
  //company: [
    //{ name: "About Us", href: "/about" },
    //{ name: "Careers", href: "/careers" },
    //{ name: "Blog", href: "/blog" },
    //{ name: "Press", href: "/press" },
    //{ name: "Contact", href: "/contact" },
  //],
};

const socialLinks = [
  { icon: Facebook, href: "https://www.facebook.com/educatorhub", label: "Facebook" },
  //{ icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Linkedin, href: "https://www.linkedin.com/company/educator-hub/", label: "LinkedIn" },
  { icon: Instagram, href: "https://www.instagram.com/educatorshub9/", label: "Instagram" },
  //{ icon: Youtube, href: "https://youtube.com", label: "YouTube" },
];

export function Footer() {
  const navigate = useNavigate();

  const handleBecomeTutorClick = (e) => {
    e.preventDefault();
    const token = localStorage.getItem("auth_token");
    if (token) {
      navigate("/dashboard");
    } else {
      navigate("/login");
    }
  };

  return (
    <footer className="bg-foreground text-primary-foreground">
      <div className="section-container py-16 lg:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">
                Educator<span className="text-primary"> Hub</span>
              </span>
            </Link>
            <p className="text-primary-foreground/70 mb-6 max-w-sm">
              Connecting students with expert tutors worldwide. Learn anything, anywhere, anytime.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-primary-foreground/10 flex items-center justify-center hover:bg-primary-foreground/20 transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* For Students */}
          <div>
            <h3 className="font-semibold mb-4">For Students</h3>
            <ul className="space-y-3">
              {footerLinks.forStudents.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For Tutors */}
          <div>
            <h3 className="font-semibold mb-4">For Tutors</h3>
            <ul className="space-y-3">
              {footerLinks.forTutors.map((link) => (
                <li key={link.name}>
                  {link.name === "Become a Tutor" ? (
                    <a      
                      href="#"
                      onClick={handleBecomeTutorClick}
                      className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm cursor-pointer"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="text-primary-foreground/70 hover:text-primary-foreground transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Subjects — plain text, not clickable */}
          <div>
            <h3 className="font-semibold mb-4">Subjects</h3>
            <ul className="space-y-3">
              {footerLinks.subjects.map((subject) => (
                <li
                  key={subject}
                  className="text-primary-foreground/70 text-sm"
                >
                  {subject}
                </li>
              ))}
            </ul>
          </div>
        </div> 

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-primary-foreground/10 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-sm">
            © {new Date().getFullYear()} Educator Hub. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="text-primary-foreground/50 text-sm">
              Privacy Policy
            </span>
            <span className="text-primary-foreground/50 text-sm">
              Terms of Service
            </span>
            <span className="text-primary-foreground/50 text-sm">
              Cookie Policy
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

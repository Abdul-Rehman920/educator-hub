import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Shield, FileText, Cookie, Scale, Briefcase, Info, Loader2 } from "lucide-react";
import api from "@/lib/api";

type CmsPage = {
  page_title: string;
  page_content: string;
  image: string | null;
  video_link: string | null;
  created_at: string;
};

const ICONS: Record<string, any> = {
  "privacy-policy": Shield,
  "terms-condition": FileText,
  "cookie-policy": Cookie,
  "legal-notice": Scale,
  careers: Briefcase,
  "about-us": Info,
};

const LegalPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const res = await api.get(`/content/page?type=${slug}`);
        const data = res.data?.data;
        if (!data) setNotFound(true);
        else setPage(data);
      } catch (err) {
        console.error("Legal page fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const Icon = ICONS[slug || ""] || FileText;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 lg:pt-32 pb-20">
        <div className="section-container max-w-4xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-light mb-6">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {loading ? "Loading..." : page?.page_title || "Page not found"}
            </h1>
            {page?.created_at && (
              <p className="text-muted-foreground">Last updated: {page.created_at}</p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : notFound || !page ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">This page hasn't been published yet.</p>
              <Link to="/" className="text-primary font-medium hover:underline">Back to Home</Link>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-soft p-6 lg:p-8">
              {page.image && (
                <img src={page.image} alt={page.page_title} className="w-full max-h-72 object-cover rounded-xl mb-6" />
              )}
              <div
                className="prose prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: page.page_content }}
              />
              {page.video_link && (
                <video src={page.video_link} controls className="mt-6 w-full max-h-96 rounded-xl" />
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPage;
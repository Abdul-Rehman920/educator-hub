import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, User, Loader2 } from "lucide-react";
import api from "@/lib/api";

type Blog = { id: number; title: string; content: string; image: string | null; created_at: string };

const BlogDetail = () => {
  const { id } = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [related, setRelated] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const res = await api.get(`/blogs/${id}`);
        const data = res.data?.data;
        if (!data) { setNotFound(true); return; }
        setBlog(data);

        const listRes = await api.get("/blogs");
        const all: Blog[] = listRes.data?.data?.data || [];
        setRelated(all.filter((b) => b.id !== Number(id)).slice(0, 2));
      } catch (err) {
        console.error("Blog detail fetch error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  if (notFound || !blog) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 section-container text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Article not found</h1>
          <p className="text-muted-foreground mb-6">The article you're looking for doesn't exist.</p>
          <Button asChild><Link to="/blogs">Back to Blog</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 lg:pt-32 pb-20">
        <div className="section-container max-w-3xl">
          <Link to="/blogs" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Back to Blog
          </Link>

          <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">{blog.title}</h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-8">
            <span className="inline-flex items-center gap-1.5"><User className="w-4 h-4" />Educator Hub Admin</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />{new Date(blog.created_at).toLocaleDateString()}
            </span>
          </div>

          {blog.image && (
            <div className="rounded-2xl overflow-hidden shadow-elevated mb-10">
              <img src={blog.image} alt={blog.title} className="w-full aspect-[16/9] object-cover" />
            </div>
          )}

          <article
            className="prose prose-neutral max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary"
            dangerouslySetInnerHTML={{ __html: blog.content }}
          />

          <div className="mt-12 bg-card rounded-2xl border border-border shadow-soft p-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">Ready to start learning?</h3>
            <p className="text-muted-foreground mb-5">Find expert tutors in any subject and book your first session today.</p>
            <Button asChild><Link to="/tutors">Find a Tutor</Link></Button>
          </div>

          {related.length > 0 && (
            <div className="mt-12">
              <h3 className="text-xl font-bold text-foreground mb-6">More Articles</h3>
              <div className="grid sm:grid-cols-2 gap-6">
                {related.map((p) => (
                  <Link key={p.id} to={`/blog/${p.id}`} className="group bg-card rounded-2xl border border-border shadow-soft overflow-hidden tutor-card">
                    {p.image && (
                      <div className="aspect-[16/9] overflow-hidden">
                        <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      </div>
                    )}
                    <div className="p-5">
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">{p.title}</h4>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary mt-3">
                        Read more <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogDetail;
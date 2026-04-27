import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { type BlogPost, getPost, savePost } from "@/lib/blogService";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

const SAVE_DEBOUNCE_MS = 1500;

const BlogEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!id) {
      navigate("/blog");
      return;
    }
    getPost(id).then((p) => {
      if (!p) {
        navigate("/blog");
        return;
      }
      setPost(p);
      setTitle(p.title);
      setBody(p.body_md);
    });
  }, [id, navigate]);

  // Debounced autosave
  useEffect(() => {
    if (!post) return;
    if (title === post.title && body === post.body_md) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await savePost(post.id, { title, body_md: body });
        setSavedAt(new Date());
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [title, body, post]);

  // Cmd-S to save immediately
  useEffect(() => {
    const onKeyDown = async (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (!post) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        setSaving(true);
        try {
          await savePost(post.id, { title, body_md: body });
          setSavedAt(new Date());
        } finally {
          setSaving(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [post, title, body]);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const savedLabel = saving
    ? "saving..."
    : savedAt
      ? `saved ${savedAt.toLocaleTimeString()}`
      : post
        ? "loaded"
        : "loading...";

  return (
    <div className="min-h-screen bg-black text-white font-mono">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-2 mb-4`}>
          <div className="flex items-center gap-3 text-xs">
            <Link to="/blog" className={`${ACCENT.muted} hover:underline`}>
              ◀ BLOG
            </Link>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="untitled"
              className="flex-1 bg-transparent text-white px-2 py-0.5 focus:outline-none"
            />
            <span className={`${ACCENT.muted} text-xs`}>{wordCount}w</span>
            <span className={`${ACCENT.dim} text-xs`}>· {savedLabel}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 h-[calc(100vh-160px)]">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="write..."
            className="bg-black border border-[#222] text-white p-4 text-sm leading-relaxed focus:border-[#00D4FF] focus:outline-none resize-none"
            spellCheck
          />
          <article className="overflow-y-auto border border-[#222] p-4 prose prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {body || "*preview*"}
            </ReactMarkdown>
          </article>
        </div>

        <div className={`mt-3 text-xs ${ACCENT.dim}`}>
          ⌘S to save · auto-save 1.5s after typing stops
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;

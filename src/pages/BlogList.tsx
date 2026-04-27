import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  type BlogPost,
  createPost,
  deletePost,
  listPosts,
} from "@/lib/blogService";

const ACCENT = {
  cyan: "text-[#00D4FF]",
  amber: "text-[#FFB800]",
  red: "text-[#FF3344]",
  muted: "text-[#888888]",
  dim: "text-[#666666]",
  rule: "border-[#333333]",
} as const;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}${day}  ${hh}:${mm}`;
}

const BlogList: React.FC = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPosts().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  }, []);

  const newPost = async () => {
    const post = await createPost();
    navigate(`/blog/${post.id}`);
  };

  return (
    <div className="min-h-screen bg-black text-white font-mono px-6 py-6 text-sm">
      <div className="max-w-4xl mx-auto">
        <div className={`border-t-2 border-b-2 ${ACCENT.rule} py-2 mb-6`}>
          <div className="flex items-center justify-between text-xs">
            <span>
              <span className={ACCENT.cyan}>NOCTISIUM</span> · BLOG
            </span>
            <button
              onClick={newPost}
              className={`${ACCENT.cyan} hover:underline`}
            >
              + NEW
            </button>
          </div>
        </div>

        {loading ? (
          <div className={`text-xs ${ACCENT.dim}`}>loading...</div>
        ) : posts.length === 0 ? (
          <div className={`text-xs ${ACCENT.dim}`}>
            no posts. start writing.
          </div>
        ) : (
          <div className="space-y-1">
            {posts.map((p) => (
              <div
                key={p.id}
                className="flex items-baseline gap-4 text-xs hover:bg-white/[0.02] px-1 py-0.5 group"
              >
                <span className={ACCENT.muted}>
                  {formatDateTime(p.updated_at)}
                </span>
                <span className={`${ACCENT.dim} w-12 text-right`}>
                  {p.word_count}w
                </span>
                <Link
                  to={`/blog/${p.id}`}
                  className="text-white flex-1 hover:text-[#00D4FF]"
                >
                  {p.title || "untitled"}
                </Link>
                <button
                  onClick={async () => {
                    if (confirm("delete?")) {
                      await deletePost(p.id);
                      setPosts(posts.filter((x) => x.id !== p.id));
                    }
                  }}
                  className={`opacity-0 group-hover:opacity-100 ${ACCENT.red} hover:underline`}
                >
                  ✗
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          className={`mt-8 border-t ${ACCENT.rule} pt-2 text-xs ${ACCENT.muted}`}
        >
          <Link to="/" className="hover:underline">
            ◀ TERMINAL
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogList;

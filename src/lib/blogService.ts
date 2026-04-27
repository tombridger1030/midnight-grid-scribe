import { supabase } from "./supabase";

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  body_md: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function listPosts(): Promise<BlogPost[]> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPost(): Promise<BlogPost> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("blog_posts")
    .insert({
      user_id: u.user.id,
      title: "untitled",
      body_md: "",
      word_count: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function savePost(
  id: string,
  patch: { title?: string; body_md?: string },
): Promise<void> {
  const update: Record<string, unknown> = { ...patch };
  if (typeof patch.body_md === "string")
    update.word_count = countWords(patch.body_md);
  const { error } = await supabase
    .from("blog_posts")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

export async function deletePost(id: string): Promise<void> {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw error;
}

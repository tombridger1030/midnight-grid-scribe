import { supabase } from "./supabase";

export interface AccountabilityRecipient {
  id: string;
  user_id: string;
  email: string;
  cadence: "daily" | "weekly";
  enabled: boolean;
  created_at: string;
}

export async function listRecipients(): Promise<AccountabilityRecipient[]> {
  const { data, error } = await supabase
    .from("accountability_recipients")
    .select("*")
    .order("created_at");
  if (error) throw error;
  return data ?? [];
}

export async function addRecipient(input: {
  email: string;
  cadence?: "daily" | "weekly";
}): Promise<AccountabilityRecipient> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { data, error } = await supabase
    .from("accountability_recipients")
    .insert({
      user_id: u.user.id,
      email: input.email,
      cadence: input.cadence ?? "daily",
      enabled: true,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRecipient(
  id: string,
  patch: Partial<
    Pick<AccountabilityRecipient, "email" | "cadence" | "enabled">
  >,
): Promise<void> {
  const { error } = await supabase
    .from("accountability_recipients")
    .update(patch)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteRecipient(id: string): Promise<void> {
  const { error } = await supabase
    .from("accountability_recipients")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function sendNow(
  date?: string,
): Promise<{ sent: boolean; results: unknown[] }> {
  const { data, error } = await supabase.functions.invoke(
    "accountability-digest",
    {
      body: { mode: "manual", date },
    },
  );
  if (error) throw error;
  return data as { sent: boolean; results: unknown[] };
}

/**
 * Default KPI Definitions
 *
 * These are the 5 core KPIs that new users start with.
 * Users can customize targets and add their own KPIs.
 */

export type KPIType =
  | "counter"
  | "hours"
  | "percentage"
  | "training"
  | "reading";
export type AutoSyncSource =
  | "github_prs"
  | "github_commits"
  | "deep_work_timer"
  | "youtube"
  | "instagram"
  | "twitter"
  | null;

export interface DefaultKPI {
  kpi_id: string;
  name: string;
  target: number | null;
  unit: string;
  color: string;
  kpi_type: KPIType;
  auto_sync_source: AutoSyncSource;
  sort_order: number;
  is_active: boolean;
}

export const DEFAULT_KPIS: DefaultKPI[] = [
  {
    kpi_id: "deepWorkHours",
    name: "Deep Work",
    target: 40,
    unit: "hours",
    color: "#5FE3B3",
    kpi_type: "hours",
    auto_sync_source: "deep_work_timer",
    sort_order: 1,
    is_active: true,
  },
  {
    kpi_id: "prRequests",
    name: "PR Requests",
    target: 3,
    unit: "requests",
    color: "#4A90E2",
    kpi_type: "counter",
    auto_sync_source: "github_prs",
    sort_order: 2,
    is_active: true,
  },
];

// Default training types for new users
export interface DefaultTrainingType {
  name: string;
  color: string;
  icon: string;
  counts_toward_target: boolean;
  sort_order: number;
}

export const DEFAULT_TRAINING_TYPES: DefaultTrainingType[] = [
  {
    name: "Strength",
    color: "#FF073A",
    icon: "💪",
    counts_toward_target: true,
    sort_order: 1,
  },
  {
    name: "BJJ",
    color: "#3B82F6",
    icon: "🥋",
    counts_toward_target: true,
    sort_order: 2,
  },
  {
    name: "Cardio",
    color: "#F97316",
    icon: "🏃",
    counts_toward_target: true,
    sort_order: 3,
  },
  {
    name: "Recovery",
    color: "#10B981",
    icon: "🧘",
    counts_toward_target: false,
    sort_order: 4,
  },
  {
    name: "Yoga",
    color: "#8B5CF6",
    icon: "🧘‍♀️",
    counts_toward_target: true,
    sort_order: 5,
  },
];

// Book types
export type BookType = "physical" | "ebook" | "audiobook";
export type BookStatus = "reading" | "completed" | "abandoned" | "paused";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author?: string;
  book_type: BookType;
  total_pages?: number;
  current_page: number;
  percent_complete: number;
  status: BookStatus;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainingType {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  counts_toward_target: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  training_type_id: string;
  date: string;
  duration_minutes?: number;
  notes?: string;
  created_at: string;
  // Joined from training_types
  training_type?: TrainingType;
}

export interface BookProgress {
  id: string;
  user_id: string;
  book_id: string;
  date: string;
  pages_read: number;
  percent_delta: number;
  page_at?: number;
  percent_at?: number;
  created_at: string;
}

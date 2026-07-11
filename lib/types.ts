export type AppRole = "founder" | "core" | "member";
export type ActorType = "human" | "aware" | "system";

export type EntityType =
  | "people"
  | "workstreams"
  | "tasks"
  | "experiments"
  | "decisions"
  | "docs"
  | "finance_items";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  title: string;
}

export interface Person {
  id: string;
  kind: string;
  name: string;
  email: string;
  org: string;
  title: string;
  status: string;
  body: string;
  sensitive: boolean;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Workstream {
  id: string;
  kind: "product" | "research" | "fundraise" | "ops";
  name: string;
  status: string;
  priority: number;
  summary: string;
  body: string;
  url: string;
  repo: string;
  owner: string | null;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  title: string;
  body: string;
  status: "todo" | "doing" | "blocked" | "done" | "cancelled";
  priority: number;
  assignee: string | null;
  workstream_id: string | null;
  due_date: string | null;
  sensitive: boolean;
  created_by_type: ActorType;
  created_at: string;
  updated_at: string;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  config: Record<string, unknown>;
  dataset: string;
  compute: string;
  status: string;
  metrics: Record<string, unknown>;
  result: string;
  verdict: string;
  workstream_id: string | null;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Decision {
  id: string;
  title: string;
  context: string;
  options: string;
  choice: string;
  rationale: string;
  status: string;
  decided_by_type: ActorType;
  decided_by_name: string;
  workstream_id: string | null;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doc {
  id: string;
  kind: string;
  title: string;
  body: string;
  workstream_id: string | null;
  sensitive: boolean;
  created_by_type: ActorType;
  created_by_name: string;
  created_at: string;
  updated_at: string;
}

export interface FinanceItem {
  id: string;
  kind: "balance" | "budget" | "expense" | "commitment" | "invoice" | "revenue";
  name: string;
  amount: number;
  currency: string;
  period: "once" | "monthly" | "annual";
  status: string;
  workstream_id: string | null;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: number;
  actor_type: ActorType;
  actor_name: string;
  verb: string;
  target_type: string;
  target_id: string | null;
  target_label: string;
  detail: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface Alert {
  id: string;
  severity: "info" | "warn" | "critical";
  kind: "alert" | "risk";
  title: string;
  body: string;
  status: "open" | "ack" | "resolved";
  target_type: string;
  target_id: string | null;
  created_at: string;
}

export interface Approval {
  id: string;
  title: string;
  summary: string;
  action: { tool?: string; args?: Record<string, unknown> };
  status: "pending" | "approved" | "rejected" | "executed" | "failed";
  requested_by_type: ActorType;
  result: string;
  created_at: string;
}

export interface Comment {
  id: string;
  target_type: string;
  target_id: string;
  author_type: ActorType;
  author_name: string;
  body: string;
  created_at: string;
}

export interface AiState {
  id: number;
  focus: string;
  open_questions: string;
  last_tick: string | null;
  last_daily: string | null;
  last_weekly: string | null;
  updated_at: string;
}

export const ENTITY_LABELS: Record<EntityType, string> = {
  people: "Person",
  workstreams: "Workstream",
  tasks: "Task",
  experiments: "Experiment",
  decisions: "Decision",
  docs: "Doc",
  finance_items: "Finance",
};

export const AWARE_PERSON_ID = "00000000-0000-0000-0000-00000000a3a3";

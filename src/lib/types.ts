export type Task = {
  id: string;
  type: "stop" | "challenge";
  order_num: number;
  icon: string | null;
  title: string;
  subtitle: string | null;
  clue: string | null;
  task_description: string;
  hint: string | null;
  map_url: string | null;
  base_points: number;
  bonus_description: string | null;
  max_bonus_points: number | null;
  hidden?: boolean;
};

export type Submission = {
  id: string;
  team_id: string;
  task_id: string;
  photo_url: string | null;
  notes: string | null;
  bonus_claimed: boolean;
  awarded_points: number | null;
  submitted_at: string;
};

export type Team = {
  id: string;
  name: string;
  passcode: string;
  created_at: string;
};

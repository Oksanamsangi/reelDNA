export type FrameStatus = "green" | "yellow" | "red";

export type FrameRole =
  | "hook"
  | "setup"
  | "product_showcase"
  | "demonstration"
  | "transition"
  | "payoff"
  | "call_to_action"
  | "ending"
  | "other";

export interface FrameAnalysis {
  timestamp_seconds: number;
  end_timestamp_seconds: number | null;
  role: FrameRole;
  visual_description: string;
  viewer_effect: string;
  status: FrameStatus;
  score: number | null;
  strengths: string[];
  issues: string[];
  keep: string[];
  changes: string[];
  evidence: string[];
  confidence: number;
}

export interface HookAnalysis {
  score: number;
  first_seconds_assessment: string;
  strengths: string[];
  weaknesses: string[];
  recommended_change: string;
  alternative_hooks: string[];
}

export interface ReelAnalysisReport {
  overall_score: number;
  hook: HookAnalysis;
  frame_by_frame: FrameAnalysis[];
  visual_story: string;
  editing_and_pacing: string;
  on_screen_text: string;
  composition: string;
  strengths: string[];
  improvements: string[];
  recommended_shot_order: number[];
  alternative_hook: string;
  limitations: string[];
  analysis_version: string;
}

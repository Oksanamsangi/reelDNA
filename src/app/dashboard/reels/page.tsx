"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { FrameAnalysis, ReelAnalysisReport } from "@/lib/analysis/types";

type ShotItem = {
  frame_index?: number | null;
  position?: number;
  timestamp?: string | null;
  shot_role?: string;
  visual_description?: string | null;
  reason?: string;
  thumbnail_data_url?: string | null;
};
type ShotOrder = {
  result_available: boolean;
  result_first: ShotItem[];
  process_first: ShotItem[];
  excluded_frames: ShotItem[];
};
type ExtendedAnalysisReport = Omit<ReelAnalysisReport, "frame_by_frame" | "recommended_shot_order"> & {
  frame_by_frame: FrameAnalysis[];
  recommended_shot_order?: ShotOrder;
  instagram_copy?: {
    hashtags?: string[];
    seo_keywords?: string[];
    captions?: string[];
  };
};

type Reel = {
  id: string;
  title: string;
  original_filename: string;
  storage_path: string;
  status: string;
  created_at: string;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_LIBRARY_VIDEOS = 10;
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export default function MyReelsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [reels, setReels] = useState<Reel[]>([]);
  const [loadingReels, setLoadingReels] = useState(true);
  const [openingReelId, setOpeningReelId] = useState<string | null>(null);
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const [selectedTimestamps, setSelectedTimestamps] = useState<Record<string, number>>({});
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [analyzingReelId, setAnalyzingReelId] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<Record<string, { analysis: ExtendedAnalysisReport }>>({});
  const [analysisErrors, setAnalysisErrors] = useState<Record<string, string>>({});
  const [analysisExpanded, setAnalysisExpanded] = useState<Record<string, boolean>>({});
  const [deletingReelId, setDeletingReelId] = useState<string | null>(null);
  const [pendingDeleteReel, setPendingDeleteReel] = useState<Reel | null>(null);

  const loadReels = useCallback(async () => {
    setLoadingReels(true);
    setError("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Please sign in to view your videos.");
      }

      const { data, error: queryError } = await supabase
        .from("reels")
        .select("id, title, original_filename, storage_path, status, created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (queryError) throw new Error(queryError.message);
      setReels((data ?? []) as Reel[]);

      const { data: savedAnalyses, error: analysesError } = await supabase
        .from("reel_analyses")
        .select("reel_id, analysis, status")
        .eq("user_id", userData.user.id)
        .eq("status", "completed");

      if (analysesError) throw new Error(analysesError.message);

      const restoredResults: Record<string, { analysis: ExtendedAnalysisReport }> = {};

      for (const row of savedAnalyses ?? []) {
        if (row.analysis && typeof row.analysis === "object") {
          restoredResults[row.reel_id] = {
            analysis: row.analysis as ExtendedAnalysisReport,
          };
        }
      }

      setAnalysisResults(restoredResults);
      setAnalysisExpanded(
        Object.fromEntries(
          Object.keys(restoredResults).map((id) => [id, false])
        )
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load your videos.",
      );
    } finally {
      setLoadingReels(false);
    }
  }, []);

  useEffect(() => {
    void loadReels();
  }, [loadReels]);

  function chooseFile(selected: File | null) {
    setError("");
    setMessage("");

    if (!selected) {
      setFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(selected.type)) {
      setError("Please select an MP4, MOV, or WebM video.");
      setFile(null);
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setError("Your video must be 50 MB or smaller.");
      setFile(null);
      return;
    }

    setFile(selected);
    if (!title.trim()) {
      setTitle(selected.name.replace(/\.[^/.]+$/, ""));
    }
  }

  async function uploadVideo() {
    if (!file) {
      setError("Choose a video first.");
      return;
    }

    if (reels.length >= MAX_LIBRARY_VIDEOS) {
      setError(`Your library can contain up to ${MAX_LIBRARY_VIDEOS} videos. Delete a video before uploading another.`);
      return;
    }

    setUploading(true);
    setError("");
    setMessage("");

    const supabase = createClient();
    let storagePath = "";

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      const user = userData.user;

      if (userError || !user) {
        throw new Error("Please sign in again before uploading.");
      }

      const safeFilename = file.name
        .normalize("NFKD")
        .replace(/[^a-zA-Z0-9._-]/g, "-")
        .slice(-120);

      storagePath = `${user.id}/${crypto.randomUUID()}-${safeFilename}`;

      const { error: storageError } = await supabase.storage
        .from("reel-videos")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError) throw new Error(storageError.message);

      const { error: databaseError } = await supabase.from("reels").insert({
        user_id: user.id,
        title: title.trim() || file.name,
        original_filename: file.name,
        storage_path: storagePath,
        status: "uploaded",
      });

      if (databaseError) {
        await supabase.storage.from("reel-videos").remove([storagePath]);
        storagePath = "";
        throw new Error(databaseError.message);
      }

      setMessage("Video uploaded successfully!");
      setFile(null);
      setTitle("");

      if (inputRef.current) inputRef.current.value = "";

      await loadReels();
    } catch (err) {
      console.error("[Reels] Video upload failed:", err);
      setError("We couldn't upload your video. Please try again. If the problem continues, check your connection and video file.");
    } finally {
      setUploading(false);
    }
  }

  function deleteVideo(reel: Reel) {
    setPendingDeleteReel(reel);
  }

  async function confirmDeleteVideo() {
    if (!pendingDeleteReel || deletingReelId) return;

    const reel = pendingDeleteReel;
    setDeletingReelId(reel.id);
    setError("");
    setMessage("");

    try {
      const supabase = createClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error("Please sign in again before deleting this video.");

      const { error: rowError } = await supabase
        .from("reels")
        .delete()
        .eq("id", reel.id)
        .eq("user_id", userData.user.id);
      if (rowError) throw new Error(rowError.message);

      const { error: storageError } = await supabase.storage
        .from("reel-videos")
        .remove([reel.storage_path]);

      setReels((previous) => previous.filter((item) => item.id !== reel.id));
      setAnalysisResults((previous) => { const next = { ...previous }; delete next[reel.id]; return next; });
      setAnalysisErrors((previous) => { const next = { ...previous }; delete next[reel.id]; return next; });
      setAnalysisExpanded((previous) => { const next = { ...previous }; delete next[reel.id]; return next; });
      setVideoUrls((previous) => { const next = { ...previous }; delete next[reel.id]; return next; });
      setMessage(storageError
        ? "Video was removed from your library, but its stored file could not be deleted. Please contact support."
        : "Video deleted successfully.");
      setPendingDeleteReel(null);
    } catch (err) {
      console.error("[Reels] Video deletion failed:", err);
      setError("We couldn't delete this video. Please try again.");
    } finally {
      setDeletingReelId(null);
    }
  }

  async function watchVideo(reel: Reel) {
    setError("");
    setMessage("");
    setOpeningReelId(reel.id);

    try {
      const supabase = createClient();

      console.log("[Watch video] Reel ID:", reel.id);
      console.log("[Watch video] Storage path:", reel.storage_path);

      const { data, error: urlError } = await supabase.storage
        .from("reel-videos")
        .createSignedUrl(reel.storage_path, 60 * 5);

      if (urlError) {
        console.error("[Watch video] Supabase error:", urlError);
        throw new Error(urlError.message);
      }

      if (!data?.signedUrl) {
        throw new Error("Supabase returned no signed video URL.");
      }

      console.log("[Watch video] Signed URL created successfully.");

      setVideoUrls((previous) => ({
        ...previous,
        [reel.id]: data.signedUrl,
      }));

      setError("");
      setAnalysisExpanded((previous) => ({
        ...previous,
        [reel.id]: true,
      }));
      setMessage("");
    } catch (err) {
      console.error("[Watch video] Failed:", err);
      setError("We couldn't open this video. Please try again.");
    } finally {
      setOpeningReelId(null);
    }
  }

  async function analyzeReel(reel: Reel) {
    setAnalyzingReelId(reel.id);
    setAnalysisErrors((previous) => ({ ...previous, [reel.id]: "" }));
    setError("");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reelId: reel.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Analysis failed. Please try again.");
      }

      setAnalysisResults((previous) => ({
        ...previous,
        [reel.id]: result,
      }));
      setAnalysisExpanded((previous) => ({
        ...previous,
        [reel.id]: true,
      }));
    } catch (err) {
      console.error("[Reels] Analysis failed:", err);
      setAnalysisErrors((previous) => ({
        ...previous,
        [reel.id]: "We couldn't analyze this Reel. Please try again. If the problem continues, try uploading the video again.",
      }));
    } finally {
      setAnalyzingReelId(null);
    }
  }

  function formatDate(date: string) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  }

  return (
    <main className="min-h-screen bg-[#090a12] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-6">
          <Link href="/dashboard" className="flex items-center gap-3 font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a3e635] font-black text-[#090a12]">R</span>
            REEL DNA
          </Link>
          <Link href="/dashboard" className="text-sm text-white/60 hover:text-white">
            ← Dashboard
          </Link>
        </header>

        <section className="py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#a3e635]">
            Your video library
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
            My Reels
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/55">
            Upload and organize your Reels in your private workspace.
          </p>
        </section>

        <section className="rdna-card p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Upload a Reel</h2>
            <span className={`rounded-full border px-3 py-1 text-xs ${reels.length >= MAX_LIBRARY_VIDEOS ? "border-orange-400/30 bg-orange-400/10 text-orange-200" : "border-white/10 bg-white/[0.04] text-white/55"}`}>
              {reels.length}/{MAX_LIBRARY_VIDEOS} videos
            </span>
          </div>
          {reels.length >= MAX_LIBRARY_VIDEOS && (
            <p className="mb-5 rounded-xl border border-orange-400/20 bg-orange-400/10 p-3 text-sm text-orange-100">
              Your library is full. Delete a video from the library below before uploading another.
            </p>
          )}

          <label htmlFor="reel-title" className="mb-2 block text-sm font-medium">
            Video title
          </label>
          <input
            id="reel-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="e.g. Autumn candle Reel"
            className="rdna-input mb-6 text-sm"
          />

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-black/10 px-5 py-8 text-center hover:border-[#a3e635]/60 disabled:opacity-50"
          >
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a3e635]/10 text-2xl text-[#a3e635]">↑</span>
            <span className="font-medium">
              {file ? "Choose a different video" : "Select a video to upload"}
            </span>
            <span className="mt-2 text-sm text-white/45">MP4, MOV or WebM · Maximum 50 MB</span>
            {file && (
              <span className="mt-4 break-all text-sm text-[#a3e635]">
                {file.name} · {(file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
            )}
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
          />

          {error && (
            <p role="alert" className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="mt-5 rounded-xl border border-[#a3e635]/20 bg-[#a3e635]/10 p-3 text-sm text-[#a3e635]">
              {message}
            </p>
          )}

          <button
            type="button"
            onClick={uploadVideo}
            disabled={!file || uploading || reels.length >= MAX_LIBRARY_VIDEOS}
            className="rdna-button-primary mt-6 w-full disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload video"}
          </button>
          <p className="mt-4 text-center text-xs leading-5 text-white/35">
            Videos are stored in a private bucket and separated by account.
          </p>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">Your library</h2>
              <p className="mt-1 text-sm text-white/45">
                Your previously uploaded videos.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadReels()}
              disabled={loadingReels}
              className="rounded-full border border-white/10 bg-[#11141f] px-4 py-2 text-sm text-white/75 transition hover:border-[#a3e635]/50 hover:text-white disabled:opacity-50"
            >
              {loadingReels ? "Loading..." : "Refresh"}
            </button>
          </div>

          {loadingReels ? (
            <p className="rounded-2xl border border-white/10 bg-[#11141f] p-6 text-sm text-white/50">
              Loading your videos...
            </p>
          ) : reels.length === 0 ? (
            <p className="rounded-2xl border border-white/10 bg-[#11141f] p-6 text-sm text-white/50">
              No videos yet. Upload your first Reel above.
            </p>
          ) : (
            <div className="space-y-3">
              {reels.map((reel) => (
                <article
                  key={reel.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#11141f] p-5"
                >
                  <div className="min-w-0">
                    <h3 className="break-words font-medium">{reel.title}</h3>
                    <p className="mt-1 break-all text-xs text-white/40">
                      {reel.original_filename}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      Uploaded {formatDate(reel.created_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={() => void watchVideo(reel)}
                      disabled={openingReelId === reel.id}
                      className="rounded-full bg-[#a3e635] px-4 py-2 text-sm font-semibold text-[#090a12] hover:bg-[#bef264] disabled:cursor-wait disabled:opacity-50"
                    >
                      {openingReelId === reel.id ? "Opening..." : "Watch video"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void analyzeReel(reel)}
                      disabled={analyzingReelId !== null}
                      className="rounded-full border border-[#a3e635]/50 px-4 py-2 text-sm font-semibold text-[#a3e635] hover:bg-[#a3e635]/10 disabled:cursor-wait disabled:opacity-50"
                    >
                      {analyzingReelId === reel.id ? "Analyzing..." : "Analyze Reel"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteVideo(reel)}
                      disabled={deletingReelId !== null}
                      className="rounded-full border border-red-400/30 px-4 py-2 text-sm text-red-300 hover:bg-red-400/10 disabled:cursor-wait disabled:opacity-50"
                    >
                      {deletingReelId === reel.id ? "Deleting..." : "Delete video"}
                    </button>
                  </div>
                  {videoUrls[reel.id] && (
                    <div className="relative mt-5 w-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#15171b] via-[#0b0c0f] to-[#111713] p-3 shadow-[0_0_24px_rgba(163,230,53,0.06)]">
                      <div className="mb-3 flex items-center justify-between gap-3 px-1">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a3e635]">Reel DNA</p>

                        </div>

                      </div>
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_16px_rgba(163,230,53,0.05)]">
                        <video
                          src={videoUrls[reel.id]}
                          controls
                          playsInline
                          preload="metadata"
                          className="block max-h-[560px] w-full bg-black"
                        />
                      </div>
                    </div>
                  )}
                  {analysisErrors[reel.id] && (
                    <p role="alert" className="text-sm text-red-300">
                      {analysisErrors[reel.id]}
                    </p>
                  )}
                  {analysisResults[reel.id] && (
                    <div className="w-full rounded-2xl border border-[#a3e635]/20 bg-[#090a12] p-5">
                      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a3e635]">Analysis report</p>
                          <p className="mt-1 text-sm text-white/45">{analysisExpanded[reel.id] === false ? "Report collapsed" : "Full report is open"}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAnalysisExpanded((previous) => ({ ...previous, [reel.id]: previous[reel.id] === false }))}
                          className="rounded-full border border-white/10 bg-[#11141f] px-4 py-2 text-sm text-white/75 transition hover:border-[#a3e635]/50 hover:text-white"
                          aria-expanded={analysisExpanded[reel.id] !== false}
                        >
                          {analysisExpanded[reel.id] === false ? "Expand analysis ↑" : "Collapse analysis ↓"}
                        </button>
                      </div>
                      {analysisExpanded[reel.id] !== false && <div className="mt-5 space-y-5">
                      {(() => {
                        const report = analysisResults[reel.id].analysis as ExtendedAnalysisReport;
                        const hook = report?.hook;
                        const frameItems = Array.isArray(report?.frame_by_frame)
                          ? report.frame_by_frame
                          : [];

                        const formatTime = (seconds: number) => {
                          const safeSeconds = Math.max(0, Math.floor(seconds || 0));
                          return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
                        };

                        const selectedTime = selectedTimestamps[reel.id] ?? frameItems[0]?.timestamp_seconds ?? 0;
                        const selectedFrame = frameItems.reduce((best: FrameAnalysis, frame: FrameAnalysis) =>
                          Math.abs((frame.timestamp_seconds ?? 0) - selectedTime) <
                          Math.abs((best.timestamp_seconds ?? 0) - selectedTime) ? frame : best
                        , frameItems[0]);
                        const statusStyle: Record<string, string> = {
                          green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
                          yellow: "border-yellow-400/30 bg-yellow-400/10 text-yellow-200",
                          red: "border-red-400/30 bg-red-400/10 text-red-300",
                        };
                        const statusLabel = (frame: FrameAnalysis) =>
                          ["green", "yellow", "red"].includes(frame?.status)
                            ? frame.status
                            : "yellow";
                        const asList = (value: unknown): string[] =>
                          Array.isArray(value)
                            ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
                            : typeof value === "string" && value.trim()
                              ? [value]
                              : [];
                        const segmentColor = (frame: FrameAnalysis) => {
                          const status = statusLabel(frame);
                          if (status === "red") return "bg-red-500";
                          if (status === "yellow") return "bg-yellow-400";
                          return "bg-emerald-400";
                        };
                        const jumpToFrame = (frame: FrameAnalysis) => {
                          const time = Math.max(0, Number(frame?.timestamp_seconds) || 0);
                          setSelectedTimestamps((previous) => ({ ...previous, [reel.id]: time }));
                          const player = videoRefs.current[reel.id];
                          if (player) {
                            player.currentTime = time;
                            void player.play().catch(() => {});
                          }
                        };

                        return (
                          <>
                            <section className="space-y-4 rounded-2xl border border-white/10 bg-[#11141f] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a3e635]">Interactive review</p>
                                  <h5 className="mt-1 text-lg font-semibold">Video timeline</h5>
                                </div>
                                <span className="font-mono text-sm text-white/55">{formatTime(selectedTime)}</span>
                              </div>

                              {videoUrls[reel.id] ? (
                                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#15171b] via-[#0b0c0f] to-[#111713] p-3 shadow-[0_0_24px_rgba(163,230,53,0.06)]">
                                  <div className="mb-3 flex items-center justify-between gap-3 px-1">
                                    <div>
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a3e635]">Reel DNA</p>
                                      <p className="mt-1 text-sm font-medium text-white/85">Interactive video review</p>
                                    </div>
                                    <span className="rounded-full border border-[#a3e635]/25 bg-[#a3e635]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-[#a3e635]">Live timeline</span>
                                  </div>
                                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_0_16px_rgba(163,230,53,0.05)]">
                                    <video
                                      ref={(element) => { videoRefs.current[reel.id] = element; }}
                                      src={videoUrls[reel.id]}
                                      controls
                                      playsInline
                                      preload="metadata"
                                      onTimeUpdate={(event) => {
                                        const time = event.currentTarget.currentTime;
                                        setSelectedTimestamps((previous) => ({ ...previous, [reel.id]: time }));
                                      }}
                                      className="block max-h-[560px] w-full bg-black"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="rounded-xl border border-dashed border-white/10 bg-[#090a12] p-6 text-center">
                                  <p className="text-sm text-white/65">Open the video to review it alongside the analysis.</p>
                                  <button
                                    type="button"
                                    onClick={() => void watchVideo(reel)}
                                    disabled={openingReelId === reel.id}
                                    className="mt-3 rounded-full bg-[#a3e635] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                                  >
                                    {openingReelId === reel.id ? "Loading video..." : "Load video here"}
                                  </button>
                                </div>
                              )}

                              <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <p className="text-sm font-medium">Analyzed moments</p>
                                  <p className="text-xs text-white/40">Select a marker to jump to that time</p>
                                </div>
                                {frameItems.length > 0 ? (
                                  <div className="flex min-h-12 w-full items-stretch gap-1 rounded-lg bg-white/5 p-1">
                                    {frameItems.map((frame: FrameAnalysis, index: number) => {
                                      const active = selectedFrame === frame;
                                      const width = Math.max(1, 100 / frameItems.length);
                                      return (
                                        <button
                                          key={`${frame.timestamp_seconds ?? index}-timeline`}
                                          type="button"
                                          title={`${formatTime(frame.timestamp_seconds)} · ${statusLabel(frame)} status`}
                                          onClick={() => jumpToFrame(frame)}
                                          className={`min-w-0 rounded-md ${segmentColor(frame)} ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#11141f]" : "opacity-65 hover:opacity-100"}`}
                                          style={{ flex: `${width} 1 0%` }}
                                          aria-label={`Go to ${formatTime(frame.timestamp_seconds)}, ${statusLabel(frame)} status`}
                                        />
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-sm text-white/45">No analyzed moments are available.</p>
                                )}
                                <div className="mt-2 flex flex-wrap gap-4 text-xs text-white/45">
                                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Good</span>
                                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-yellow-400" />Needs improvement</span>
                                  <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />Serious issue</span>
                                </div>
                              </div>

                              <div className="rounded-xl border border-white/10 bg-[#11141f] p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <h5 className="font-semibold">AI Actionable Fixes</h5>
                                  {selectedFrame && <span className="font-mono text-xs text-[#a3e635]">{formatTime(selectedFrame.timestamp_seconds)}</span>}
                                </div>
                                {selectedFrame ? (
                                  <>
                                    <p className="mt-2 text-sm leading-6 text-white/70">{selectedFrame.visual_description || "No description available for this moment."}</p>
                                    {selectedFrame.issues?.length > 0 || selectedFrame.changes?.length > 0 ? (
                                      <div className="mt-3 space-y-3">
                                        {selectedFrame.issues?.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">What needs attention</p>
                                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/70">
                                              {selectedFrame.issues.map((item: string, index: number) => <li key={`issue-${index}`}>{item}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                        {selectedFrame.changes?.length > 0 && (
                                          <div>
                                            <p className="text-xs font-semibold uppercase tracking-wider text-[#a3e635]">Recommended action</p>
                                            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/75">
                                              {selectedFrame.changes.map((item: string, index: number) => <li key={`fix-${index}`}>{item}</li>)}
                                            </ul>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <p className="mt-3 text-sm leading-6 text-white/60">No specific change can be justified from the visual evidence available in this sampled frame.</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="mt-2 text-sm text-white/45">Run the analysis to see time-specific recommendations.</p>
                                )}
                              </div>
                            </section>

                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#a3e635]">
                                  Performance audit
                                </p>
                                <h4 className="mt-1 text-xl font-semibold">AI Reel Analysis</h4>
                              </div>
                              <span className="rounded-full bg-[#a3e635]/10 px-3 py-1.5 text-sm font-semibold text-[#a3e635]">
                                Overall: {report?.overall_score ?? "—"}/10
                              </span>
                            </div>

                            {report?.instagram_copy && (
                              <section className="space-y-5 rounded-xl border border-[#a3e635]/20 bg-[#a3e635]/[0.04] p-4">
                                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#a3e635]">Instagram publishing ideas</p>
                                  <h5 className="mt-1 text-lg font-semibold">Hashtags tailored to this Reel</h5>
                                  <p className="mt-1 text-xs leading-5 text-white/45">Niche and mood-led suggestions, not a list of objects in the frame. Add TAVILY_API_KEY to enable public-web inspiration research; reach is never guaranteed.</p>
                                  {Array.isArray(report.instagram_copy.hashtags) && report.instagram_copy.hashtags.length > 0 ? (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {report.instagram_copy.hashtags.map((tag: string, index: number) => (
                                        <button key={`${tag}-${index}`} type="button" onClick={() => void navigator.clipboard?.writeText(tag)} title="Click to copy" className="rounded-full border border-white/10 bg-[#090a12] px-3 py-1.5 text-sm text-white/80 hover:border-[#a3e635]/50">{tag}</button>
                                      ))}
                                    </div>
                                  ) : <p className="mt-2 text-sm text-white/50">No hashtag suggestions were generated. Run the analysis again to retry.</p>}
                                </div>
                                <div>
                                  <h5 className="font-semibold">Instagram SEO keywords</h5>
                                  <p className="mt-1 text-xs leading-5 text-white/45">Search phrases your target audience may use to discover content like this Reel. These are suggestions, not verified search-volume data.</p>
                                  {Array.isArray(report.instagram_copy.seo_keywords) && report.instagram_copy.seo_keywords.length > 0 ? (
                                    <>
                                      <div className="mt-3 flex flex-wrap gap-2">
                                        {report.instagram_copy.seo_keywords.map((keyword: string, index: number) => (
                                          <button key={`${keyword}-${index}`} type="button" onClick={() => void navigator.clipboard?.writeText(keyword)} title="Click to copy keyword" className="rounded-full border border-white/10 bg-[#090a12] px-3 py-1.5 text-sm text-white/80 hover:border-[#a3e635]/50">{keyword}</button>
                                        ))}
                                      </div>
                                      <button type="button" onClick={() => void navigator.clipboard?.writeText(report.instagram_copy?.seo_keywords?.join(", ") ?? "")} className="mt-3 rounded-md border border-white/10 px-3 py-1.5 text-xs text-white/60 hover:text-white">Copy all keywords</button>
                                    </>
                                  ) : <p className="mt-2 text-sm text-white/50">No SEO keyword suggestions were generated. Run the analysis again to retry.</p>}
                                </div>
                                </div>
                                <div>
                                  <h5 className="font-semibold">5 conversion-focused caption options</h5>
                                  {Array.isArray(report.instagram_copy.captions) && report.instagram_copy.captions.length > 0 ? (
                                    <ol className="mt-3 grid grid-cols-1 gap-3">
                                      {report.instagram_copy.captions.map((caption: string, index: number) => (
                                        <li key={`${index}-${caption}`} className="grid grid-cols-[76px_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 rounded-lg border border-white/10 bg-[#090a12] p-4">
                                          <span className="pt-1 text-xs font-semibold tracking-wide text-[#a3e635]">{["COMMENT", "SAVE", "SHARE", "DM", "ACTION"][index] ?? `${index + 1}.`}</span>
                                          <p className="min-w-0 whitespace-normal break-words text-sm leading-6 text-white/75">{caption}</p>
                                          <button type="button" onClick={() => void navigator.clipboard?.writeText(caption)} className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/55 hover:text-white" title="Copy caption">Copy</button>
                                        </li>
                                      ))}
                                    </ol>
                                  ) : <p className="mt-2 text-sm text-white/50">No captions were generated. Run the analysis again to retry.</p>}
                                </div>
                              </section>
                            )}

                            <section className="rounded-xl border border-white/10 bg-[#11141f] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h5 className="font-semibold">Opening hook</h5>
                                <span className="text-sm text-[#a3e635]">
                                  Score: {hook?.score ?? "—"}/10
                                </span>
                              </div>
                              <p className="mt-3 text-sm leading-6 text-white/70">
                                {hook?.first_seconds_assessment ?? "Opening assessment unavailable."}
                              </p>
                              {hook?.strengths?.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-white/45">What works</p>
                                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/65">
                                    {hook.strengths.map((item: string, index: number) => (
                                      <li key={index}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {hook?.weaknesses?.length > 0 && (
                                <div className="mt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wider text-white/45">What weakens the hook</p>
                                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/65">
                                    {hook.weaknesses.map((item: string, index: number) => (
                                      <li key={index}>{item}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {hook?.recommended_change && (
                                <p className="mt-3 text-sm leading-6 text-white/70">
                                  <strong className="text-white">Recommended change:</strong>{" "}
                                  {hook.recommended_change}
                                </p>
                              )}
                            </section>

                            <section className="space-y-3">
                              <div className="flex flex-wrap items-end justify-between gap-2">
                                <div>
                                  <h5 className="text-lg font-semibold">Frame-by-Frame Breakdown</h5>
                                  <p className="mt-1 text-xs text-white/40">
                                    Evidence-based notes for each sampled moment
                                  </p>
                                </div>
                                <span className="text-xs text-white/45">
                                  {frameItems.length} frames reviewed
                                </span>
                              </div>

                              {frameItems.length === 0 ? (
                                <p className="rounded-xl border border-white/10 p-4 text-sm text-white/50">
                                  No frame-by-frame results were returned. Run the analysis again to retry.
                                </p>
                              ) : (
                                <div className="space-y-3">
                                  {frameItems.map((frame: FrameAnalysis, index: number) => (
                                    <article
                                      key={`${frame.timestamp_seconds ?? index}-${index}`}
                                      className="rounded-xl border border-white/10 bg-[#11141f] p-4"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span className="rounded-md bg-[#a3e635]/10 px-2 py-1 font-mono text-sm text-[#a3e635]">
                                            {formatTime(frame.timestamp_seconds)}
                                          </span>
                                          <span className="text-xs uppercase tracking-wider text-white/50">
                                            {(frame.role ?? "other").replaceAll("_", " ")}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {frame.score != null && (
                                            <span className="text-sm font-medium text-white/75">
                                              {frame.score}/10
                                            </span>
                                          )}
                                          <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${statusStyle[statusLabel(frame)]}`}>
                                            {statusLabel(frame)}
                                          </span>
                                        </div>
                                      </div>

                                      <p className="mt-3 text-sm leading-6 text-white/80">
                                        {frame.visual_description}
                                      </p>
                                      {typeof frame.viewer_effect === "string" && frame.viewer_effect.trim() && (
                                        <p className="mt-2 text-sm leading-6 text-white/55">
                                          <strong className="text-white/75">Viewer effect:</strong>{" "}
                                          {frame.viewer_effect}
                                        </p>
                                      )}

                                      {frame.keep?.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold uppercase tracking-wider text-[#a3e635]">Keep</p>
                                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/65">
                                            {asList(frame.keep).map((item, itemIndex) => (
                                              <li key={itemIndex}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {frame.issues?.length > 0 && (
                                        <div className="mt-3">
                                          <p className="text-xs font-semibold uppercase tracking-wider text-orange-300">Issues</p>
                                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/65">
                                            {asList(frame.issues).map((item, itemIndex) => (
                                              <li key={itemIndex}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {frame.changes?.length > 0 && (
                                        <div className="mt-3 rounded-lg border border-[#a3e635]/15 bg-[#a3e635]/[0.04] p-3">
                                          <p className="text-xs font-semibold uppercase tracking-wider text-[#a3e635]">What to change</p>
                                          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-white/75">
                                            {asList(frame.changes).map((item, itemIndex) => (
                                              <li key={itemIndex}>{item}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs text-white/40">
                                        {frame.end_timestamp_seconds != null && (
                                          <span>Approx. end: {formatTime(frame.end_timestamp_seconds)}</span>
                                        )}
                                      </div>
                                    </article>
                                  ))}
                                </div>
                              )}
                            </section>

                            <section className="space-y-3">
                              {report?.recommended_shot_order && (
                                <section className="mt-5 space-y-4">
                                  <div>
                                    <h5 className="font-semibold text-[#a3e635]">Alternative Shot Sequences</h5>
                                    <p className="mt-1 text-xs leading-5 text-white/45">
                                      Two editing concepts based on sampled-frame descriptions. These are creative hypotheses, not predictions of retention or performance.
                                    </p>
                                  </div>

                                  {[
                                    {
                                      key: "result_first",
                                      title: report.recommended_shot_order.result_available ? "A · Result First" : "A · Strongest Available Opening",
                                      subtitle: report.recommended_shot_order.result_available
                                        ? "Preview the visually supported outcome, then show the process."
                                        : "No clear finished result was identified in the sampled frames; this sequence starts with the strongest available shot.",
                                      items: report.recommended_shot_order.result_first,
                                    },
                                    {
                                      key: "process_first",
                                      title: "B · Process First",
                                      subtitle: "Open with an identifiable action, then build toward the result.",
                                      items: report.recommended_shot_order.process_first,
                                    },
                                  ].map((sequence: { key: string; title: string; subtitle: string; items: ShotItem[] }) => (
                                    <div key={sequence.key} className="rounded-xl border border-[#a3e635]/20 bg-[#a3e635]/[0.04] p-4">
                                      <h6 className="font-semibold text-white">{sequence.title}</h6>
                                      <p className="mt-1 text-xs leading-5 text-white/45">{sequence.subtitle}</p>
                                      <ol className="mt-3 space-y-3">
                                        {(sequence.items ?? []).map((item: ShotItem, index: number) => (
                                          <li key={`${sequence.key}-${item.frame_index ?? index}-${index}`} className="flex items-start gap-3">
                                            <span className="flex h-7 min-w-7 items-center justify-center rounded-md bg-[#a3e635]/10 px-2 text-sm font-semibold text-[#a3e635]">
                                              {item.position ?? index + 1}
                                            </span>
                                            {item.thumbnail_data_url && (
                                              <img
                                                src={item.thumbnail_data_url}
                                                alt={item.visual_description ?? `Original frame ${item.frame_index ?? ""}`}
                                                className="h-20 w-28 shrink-0 rounded-lg border border-white/10 bg-[#090a12] object-cover"
                                                loading="lazy"
                                                draggable={false}
                                              />
                                            )}
                                            <div className="min-w-0 flex-1">
                                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                                <span className="font-mono text-xs text-[#a3e635]">{item.timestamp ?? ""}</span>
                                                <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/60">
                                                  {(
                                                    {
                                                      action: "Action",
                                                      product: "Product",
                                                      transition: "Transition",
                                                      result: "Final Result",
                                                      support: "Supporting Shot",
                                                    } as Record<string, string>
                                                  )[String(item.shot_role)] ?? "Unclassified"}
                                                </span>
                                              </div>
                                              <p className="text-sm text-white/80">
                                                {item.visual_description ?? (item.frame_index != null ? `Sampled frame ${item.frame_index}` : "Suggested shot")}
                                              </p>
                                              <p className="mt-1 text-xs leading-5 text-white/50">{item.reason}</p>
                                            </div>
                                          </li>
                                        ))}
                                      </ol>
                                    </div>
                                  ))}

                                  {(report.recommended_shot_order.excluded_frames ?? []).length > 0 && (
                                    <div className="rounded-xl border border-white/10 bg-[#11141f] p-4">
                                      <h6 className="font-semibold text-white/80">Excluded Frames</h6>
                                      <p className="mt-1 text-xs leading-5 text-white/45">
                                        Frames omitted from the suggested sequences because of potential visual issues. Review the original video before removing them permanently.
                                      </p>
                                      <ul className="mt-3 space-y-3">
                                        {report.recommended_shot_order.excluded_frames.map((item: ShotItem, index: number) => (
                                          <li key={`excluded-${item.frame_index ?? index}-${index}`} className="border-t border-white/5 pt-3 first:border-0 first:pt-0">
                                            <p className="text-sm text-white/75">
                                              <span className="mr-2 font-mono text-[#a3e635]">{item.timestamp ?? ""}</span>
                                              {item.visual_description ?? (item.frame_index != null ? `Sampled frame ${item.frame_index}` : "Excluded shot")}
                                            </p>
                                            <p className="mt-1 text-xs leading-5 text-white/45">{item.reason}</p>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </section>
                              )}

                              <h5 className="text-lg font-semibold">Creative Direction</h5>
                              {[
                                ["Visual story", report?.visual_story],
                                ["Editing & pacing", report?.editing_and_pacing],
                                ["On-screen text", report?.on_screen_text],
                                ["Composition", report?.composition],
                              ].map(([label, value]) => (
                                <p key={label as string} className="text-sm leading-6 text-white/65">
                                  <strong className="text-white">{label as string}:</strong>{" "}
                                  {value as string || "Not available."}
                                </p>
                              ))}
                            </section>

                            {report?.strengths?.length > 0 && (
                              <section>
                                <h5 className="font-semibold text-[#a3e635]">What already works</h5>
                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/65">
                                  {report.strengths.map((item: string, index: number) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </section>
                            )}

                            {report?.improvements?.length > 0 && (
                              <section>
                                <h5 className="font-semibold text-white">Priority recommendations</h5>
                                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-white/65">
                                  {report.improvements.map((item: string, index: number) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </section>
                            )}

                            {(hook?.alternative_hooks?.length > 0 || report?.alternative_hook) && (
                              <section className="rounded-xl border border-[#a3e635]/20 bg-[#a3e635]/[0.04] p-4">
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#a3e635]">
                                  Alternative opening
                                </p>
                                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-white/65">
                                  {[...new Set([
                                    ...(hook?.alternative_hooks ?? []),
                                    ...(report?.alternative_hook ? [report.alternative_hook] : []),
                                  ])].map((item: string, index: number) => (
                                    <li key={index}>{item}</li>
                                  ))}
                                </ul>
                              </section>
                            )}


                            <p className="text-xs leading-5 text-white/35">
                              Visual analysis uses sampled still frames. It does not establish actual retention, reach, engagement, audio quality, or exact motion between frames.
                            </p>
                          </>
                        );
                      })()}
                      </div>}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
        {pendingDeleteReel && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget && !deletingReelId) {
                setPendingDeleteReel(null);
              }
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-reel-title"
              className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#11141f] shadow-2xl shadow-black/50"
            >
              <div className="p-6 sm:p-7">
                <button
                  type="button"
                  aria-label="Close delete confirmation"
                  disabled={Boolean(deletingReelId)}
                  onClick={() => setPendingDeleteReel(null)}
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/[0.08] text-xl text-red-300 transition hover:border-red-300/40 hover:bg-red-400/[0.15] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ×
                </button>

                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-lime-400">
                  Video library
                </p>
                <h2 id="delete-reel-title" className="mt-2 text-xl font-semibold tracking-tight text-white">
                  Delete this video?
                </h2>
                <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
                  You are about to permanently delete{" "}
                  <span className="font-medium text-zinc-200">
                    “{pendingDeleteReel.title}”
                  </span>
                  . This action cannot be undone.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-white/10 bg-black/10 p-5 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  disabled={Boolean(deletingReelId)}
                  onClick={() => setPendingDeleteReel(null)}
                  className="rounded-full border border-white/10 px-5 py-2.5 text-sm font-medium text-zinc-300 transition hover:border-white/25 hover:bg-white/[0.04] disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={Boolean(deletingReelId)}
                  onClick={() => void confirmDeleteVideo()}
                  className="rounded-full border border-red-400/30 bg-red-400/10 px-5 py-2.5 text-sm font-semibold text-red-200 transition hover:border-red-300/50 hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingReelId ? "Deleting…" : "Delete video"}
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

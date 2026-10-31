"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      window.location.assign("/dashboard");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not log in."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#090a12] px-5 py-12 text-white">
      <section className="w-full max-w-md">
        <Link href="/" className="text-2xl font-black tracking-tight">
          Reel<span className="text-lime-400">DNA</span>
        </Link>

        <div className="mt-10 rounded-3xl border border-white/10 bg-[#11141f] p-7 sm:p-9">
          <p className="text-sm font-medium text-lime-400">WELCOME BACK</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Log in</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Sign in to continue your Reel DNA journey.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-zinc-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#090a12] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-zinc-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#090a12] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400"
              />
            </div>

            {message && (
              <p role="alert" className="text-sm leading-6 text-red-400">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-lime-400 px-5 py-3.5 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-semibold text-lime-400 hover:text-lime-300">
            Sign up
          </Link>
        </p>
        <Link href="/" className="mt-5 block text-center text-sm text-zinc-500 hover:text-white">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        const message = error.message.toLowerCase();

        if (
          message.includes("already registered") ||
          message.includes("already exists") ||
          message.includes("already been registered")
        ) {
          setMessage("An account with this email already exists. Please log in instead.");
          return;
        }

        throw error;
      }

      if (data.user && data.user.identities?.length === 0) {
        setMessage("An account with this email already exists. Please log in instead.");
        return;
      }

      if (data.session) {
        window.location.assign("/dashboard");
        return;
      }

      setSuccess(true);
      setMessage(
        "Account created! Check your email for a confirmation link before logging in."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not create your account."
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
          <p className="text-sm font-medium text-lime-400">GET STARTED</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">Create your account</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            Build your profile and get ready to understand your content.
          </p>

          <form onSubmit={handleSignup} className="mt-8 space-y-5">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm text-zinc-300">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#090a12] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400"
              />
            </div>

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
                Create password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-white/10 bg-[#090a12] px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-lime-400"
              />
            </div>

            {message && (
              <p
                role="status"
                className={`text-sm leading-6 ${success ? "text-lime-300" : "text-red-400"}`}
              >
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || success}
              className="w-full rounded-full bg-lime-400 px-5 py-3.5 font-bold text-black transition hover:bg-lime-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-lime-400 hover:text-lime-300">
            Log in
          </Link>
        </p>
        <Link href="/" className="mt-5 block text-center text-sm text-zinc-500 hover:text-white">
          ← Back to home
        </Link>
      </section>
    </main>
  );
}

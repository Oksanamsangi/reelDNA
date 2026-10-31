import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "./logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect("/login");
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-white/10 bg-[#090a12] px-5 py-4 text-white sm:px-8">
        <a href="/dashboard" className="text-xl font-black tracking-tight">
          Reel<span className="text-lime-400">DNA</span>
        </a>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}

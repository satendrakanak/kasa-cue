import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AudioLines, LayoutDashboard, ShieldCheck, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#d9f99d_0,transparent_30rem),linear-gradient(135deg,#f8fafc_0%,#eef2ff_42%,#fefce8_100%)] px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="flex flex-col gap-4 rounded-lg border border-slate-200/80 bg-white/85 px-4 py-3 shadow-sm backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
              <AudioLines className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Kasa Admin
              </h1>
              <p className="text-sm text-slate-600">
                Manage users, roles, and future copilot settings.
              </p>
            </div>
          </div>
          <Badge className="gap-1.5 bg-indigo-600 text-white hover:bg-indigo-600">
            <ShieldCheck className="size-3.5" />
            {session.user.role}
          </Badge>
        </header>

        <section className="grid gap-5 md:grid-cols-2">
          <Card className="rounded-lg border-slate-200/90 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersRound className="size-5 text-indigo-600" />
                Role Management
              </CardTitle>
              <CardDescription>
                Foundation ready for user invites, permissions, and admin-only
                controls.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Admins</p>
                <p className="mt-2 text-3xl font-semibold">1</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Users</p>
                <p className="mt-2 text-3xl font-semibold">1</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg border-slate-200/90 bg-white/95 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutDashboard className="size-5 text-emerald-600" />
                Copilot Workspace
              </CardTitle>
              <CardDescription>
                Admins can jump into the user-facing copilot experience when
                needed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
                <Link href="/workspace">Open workspace</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}

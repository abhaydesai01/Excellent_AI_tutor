"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LogOut, Menu, X, User, LayoutDashboard, AlertTriangle,
  Users, BarChart3, Mic, Zap, Shield, Bell, Volume2, ChevronDown,
  BookOpen, DollarSign, TrendingUp,
} from "lucide-react";

export default function Navbar() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  if (!session) return null;

  const isAdmin = ["admin", "educator", "mentor"].includes(session.user.role);

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-6">
            <Link href={isAdmin ? "/admin" : "/student"} className="flex items-center gap-2">
              <img src="/logo.png" alt="Excellent" className="h-9 w-auto object-contain" />
            </Link>

            <div className="hidden lg:flex items-center gap-0.5">
              {isAdmin ? (
                <>
                  <NavLink href="/admin" icon={<LayoutDashboard className="w-4 h-4" />} active={pathname === "/admin"}>Overview</NavLink>
                  <NavLink href="/admin/students" icon={<Users className="w-4 h-4" />} active={pathname.startsWith("/admin/students")}>Students</NavLink>
                  <NavLink href="/admin/analytics" icon={<BarChart3 className="w-4 h-4" />} active={pathname === "/admin/analytics"}>Subjects</NavLink>
                  <NavLink href="/admin/ai-performance" icon={<Zap className="w-4 h-4" />} active={pathname === "/admin/ai-performance"}>AI Perf</NavLink>
                  <NavLink href="/admin/interventions" icon={<Shield className="w-4 h-4" />} active={pathname === "/admin/interventions"}>Interventions</NavLink>

                  <div className="relative">
                    <button
                      onClick={() => setMoreOpen(!moreOpen)}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                    >
                      More <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
                    </button>
                    {moreOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-xl border border-border shadow-lg py-2 z-20">
                          <DropLink href="/admin/ai-costs" icon={<DollarSign className="w-4 h-4" />} onClick={() => setMoreOpen(false)}>AI Costs</DropLink>
                          <DropLink href="/admin/voice" icon={<Volume2 className="w-4 h-4" />} onClick={() => setMoreOpen(false)}>Voice Analytics</DropLink>
                          <DropLink href="/admin/alerts" icon={<Bell className="w-4 h-4" />} onClick={() => setMoreOpen(false)}>Alerts</DropLink>
                          <DropLink href="/admin/risks" icon={<AlertTriangle className="w-4 h-4" />} onClick={() => setMoreOpen(false)}>Risk Detection</DropLink>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <NavLink href="/student" icon={<BookOpen className="w-4 h-4" />} active={pathname === "/student"}>Ask Doubt</NavLink>
                  <NavLink href="/student/voice" icon={<Mic className="w-4 h-4" />} active={pathname === "/student/voice"}>Voice Tutor</NavLink>
                  <NavLink href="/student/history" icon={<BarChart3 className="w-4 h-4" />} active={pathname === "/student/history"}>My History</NavLink>
                  <NavLink href="/student/dashboard" icon={<TrendingUp className="w-4 h-4" />} active={pathname === "/student/dashboard"}>My Report</NavLink>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">{session.user.name}</span>
                <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full capitalize">
                  {session.user.role}
                </span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted hover:text-danger transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-white p-4 space-y-1">
          {isAdmin ? (
            <>
              <MobileLink href="/admin" onClick={() => setMobileOpen(false)}>Overview</MobileLink>
              <MobileLink href="/admin/students" onClick={() => setMobileOpen(false)}>Students</MobileLink>
              <MobileLink href="/admin/analytics" onClick={() => setMobileOpen(false)}>Subject Analytics</MobileLink>
              <MobileLink href="/admin/ai-performance" onClick={() => setMobileOpen(false)}>AI Performance</MobileLink>
              <MobileLink href="/admin/interventions" onClick={() => setMobileOpen(false)}>Interventions</MobileLink>
              <MobileLink href="/admin/ai-costs" onClick={() => setMobileOpen(false)}>AI Costs</MobileLink>
              <MobileLink href="/admin/voice" onClick={() => setMobileOpen(false)}>Voice Analytics</MobileLink>
              <MobileLink href="/admin/alerts" onClick={() => setMobileOpen(false)}>Alerts</MobileLink>
              <MobileLink href="/admin/risks" onClick={() => setMobileOpen(false)}>Risk Detection</MobileLink>
            </>
          ) : (
            <>
              <MobileLink href="/student" onClick={() => setMobileOpen(false)}>Ask Doubt</MobileLink>
              <MobileLink href="/student/voice" onClick={() => setMobileOpen(false)}>Voice Tutor</MobileLink>
              <MobileLink href="/student/history" onClick={() => setMobileOpen(false)}>My History</MobileLink>
              <MobileLink href="/student/dashboard" onClick={() => setMobileOpen(false)}>My Report</MobileLink>
            </>
          )}
          <hr className="my-2 border-border" />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 text-sm text-danger hover:bg-red-50 rounded-lg"
          >
            Sign Out
          </button>
        </div>
      )}
    </nav>
  );
}

function NavLink({ href, icon, children, active }: { href: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-1.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-colors ${
        active ? "text-primary bg-primary/5" : "text-muted hover:text-primary hover:bg-primary/5"
      }`}
    >
      {icon}
      {children}
    </Link>
  );
}

function DropLink({ href, icon, children, onClick }: { href: string; icon: React.ReactNode; children: React.ReactNode; onClick: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-primary/5 transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block px-4 py-2.5 text-sm font-medium text-foreground hover:bg-primary/5 rounded-lg"
    >
      {children}
    </Link>
  );
}

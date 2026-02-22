"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Brain, BarChart3, Shield, ArrowRight, Sparkles, Zap, Target, GraduationCap, Users, Mic } from "lucide-react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) {
      const isAdmin = ["admin", "educator", "mentor"].includes(session.user.role);
      router.push(isAdmin ? "/admin" : "/student");
    }
  }, [session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between h-16 items-center">
          <img src="/logo.png" alt="Excellent" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-accent/[0.03]" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary text-sm font-medium rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            25+ Years of Academic Excellence
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-foreground leading-tight">
            AI-Powered Doubt
            <br />
            <span className="text-primary">
              Resolution Platform
            </span>
          </h1>
          <p className="text-lg text-muted mt-6 max-w-2xl mx-auto">
            Excellent PU Science College, Vijayapur brings you instant step-by-step solutions
            for NEET & JEE questions, powered by multi-model AI intelligence.
          </p>
          <div className="flex items-center justify-center gap-4 mt-8">
            <Link
              href="/register"
              className="flex items-center gap-2 px-6 py-3 gradient-bg hover:opacity-90 text-white rounded-xl font-medium transition-all text-sm shadow-lg shadow-primary/20"
            >
              Start Learning Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 border border-primary/20 hover:border-primary/40 rounded-xl font-medium transition-colors text-sm text-primary"
            >
              Sign In
            </Link>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
            <StatBadge icon={<GraduationCap className="w-5 h-5" />} value="489+" label="Selections" />
            <StatBadge icon={<Users className="w-5 h-5" />} value="151" label="MBBS Seats" />
            <StatBadge icon={<Brain className="w-5 h-5" />} value="3 AI" label="Models" />
            <StatBadge icon={<Zap className="w-5 h-5" />} value="<2s" label="Response Time" />
          </div>
        </div>
      </section>

      {/* Multi-Model AI */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Multi-Model AI Architecture</h2>
            <p className="text-muted mt-2">Intelligent routing selects the optimal AI model for every question</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ModelCard
              tier="Tier 1"
              model="GPT-4o Mini"
              usage="70-80%"
              description="Fast, cost-efficient responses for standard academic questions"
              color="from-primary-light to-primary"
              features={["Class 8-12 questions", "Basic NEET/JEE", "Concept explanations"]}
            />
            <ModelCard
              tier="Tier 2"
              model="GPT-4.1"
              usage="15-25%"
              description="Advanced reasoning for complex multi-step problems"
              color="from-primary to-primary-dark"
              features={["JEE Advanced Math", "Physics numericals", "Multi-step derivations"]}
            />
            <ModelCard
              tier="Tier 3"
              model="Claude Opus"
              usage="2-5%"
              description="Premium deep reasoning for the most challenging problems"
              color="from-primary-dark to-[#4a0d15]"
              features={["Expert-level problems", "Student analytics", "Diagnostic analysis"]}
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Platform Features</h2>
            <p className="text-muted mt-2">Everything you need for AI-powered academic excellence</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="AI Doubt Resolution"
              description="Get instant step-by-step solutions with concept explanations"
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Learning Analytics"
              description="Track subject-wise progress and identify weak areas"
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Risk Detection"
              description="Automatic flagging of struggling students for intervention"
            />
            <FeatureCard
              icon={<Mic className="w-6 h-6" />}
              title="Voice AI Tutor"
              description="Ask doubts using voice and hear AI-powered responses"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <img src="/logo.png" alt="Excellent" className="mx-auto mb-6 h-12 w-auto object-contain" />
          <h2 className="text-3xl font-bold">Ready to Transform Learning?</h2>
          <p className="text-muted mt-2 mb-8">Join the AI-powered education revolution at Excellent PU Science College</p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 gradient-bg hover:opacity-90 text-white rounded-xl font-medium transition-all shadow-lg shadow-primary/20"
          >
            Get Started Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Excellent" className="h-7 w-auto object-contain" />
            <span>AI Tutor Platform</span>
          </div>
          <p>Built by Abhay Desai &mdash; v1.0</p>
        </div>
      </footer>
    </div>
  );
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4 text-center hover:shadow-md transition-shadow">
      <div className="text-primary mb-1 flex justify-center">{icon}</div>
      <div className="text-xl font-bold text-primary">{value}</div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

function ModelCard({ tier, model, usage, description, color, features }: {
  tier: string; model: string; usage: string; description: string; color: string; features: string[];
}) {
  return (
    <div className="bg-white rounded-2xl border border-border p-6 hover:shadow-lg transition-all hover:border-primary/20">
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r ${color} text-white text-xs font-medium rounded-full mb-4`}>
        <Zap className="w-3 h-3" />
        {tier}
      </div>
      <h3 className="text-xl font-bold">{model}</h3>
      <p className="text-sm text-muted mt-1 mb-4">{description}</p>
      <div className="text-sm font-medium text-primary mb-3">{usage} of queries</div>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-6 hover:shadow-md hover:border-primary/20 transition-all">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted mt-1">{description}</p>
    </div>
  );
}

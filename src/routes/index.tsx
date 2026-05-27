import { createFileRoute, Link } from "@tanstack/react-router";
import { Splash } from "@/components/Splash";
import { SiteHeader } from "@/components/SiteHeader";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H.A.D. Asset Management — Paison ko kaam par lagao" },
      { name: "description", content: "Invest with H.A.D. Asset Management. Three transparent plans up to 7% monthly. Live company portfolio, secure payouts, and full visibility on your money." },
      { property: "og:title", content: "H.A.D. Asset Management" },
      { property: "og:description", content: "Paison ko sirf bachao mat, unhein kaam par lagao." },
    ],
  }),
  component: Landing,
});

const plans = [
  { name: "Starter", rate: "5%", slab: "Up to ₹5,00,000", color: "from-slate-700 to-slate-900", perks: ["Monthly return", "2X target tracking", "Free crypto/UPI payouts"] },
  { name: "Growth", rate: "6%", slab: "₹5L – ₹10L", color: "from-blue-900 to-navy", perks: ["Higher monthly return", "Priority verification", "Dedicated support"] },
  { name: "Fortune", rate: "7%", slab: "Above ₹10L", color: "from-amber-700 to-yellow-900", perks: ["Maximum returns", "AI portfolio insights", "Concierge withdrawals"] },
];

function Landing() {
  return (
    <>
      <Splash />
      <div className="min-h-screen bg-navy text-white">
        <SiteHeader />

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 [background:radial-gradient(circle_at_20%_10%,rgba(201,168,76,.18),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(201,168,76,.12),transparent_50%)]" />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 py-20 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-4 inline-block rounded-full border border-gold/40 px-3 py-1 text-xs tracking-[0.3em] text-gold uppercase">Est. 2026</p>
              <h1 className="font-serif text-5xl md:text-6xl leading-[1.05] text-white">
                Paison ko sirf <span className="italic text-gold">bachao</span> mat,
                <br />unhein <span className="text-gold">kaam</span> par lagao.
              </h1>
              <p className="mt-6 max-w-lg text-white/70 text-lg">
                H.A.D. Asset Management runs a transparent multi-asset portfolio across crypto, NFTs and real estate. You see what we hold, in real time.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="rounded-md bg-gold px-6 py-3 text-navy font-medium hover:brightness-110">Open Account</Link>
                <a href="#plans" className="rounded-md border border-gold/40 px-6 py-3 text-white hover:bg-gold/10">View Plans</a>
              </div>
              <div className="mt-10 flex items-center gap-6 text-sm text-white/60">
                <div><span className="text-gold text-xl font-semibold">2X</span> target on every plan</div>
                <div className="h-6 w-px bg-gold/30" />
                <div><span className="text-gold text-xl font-semibold">Live</span> portfolio feed</div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-6 rounded-2xl bg-gradient-to-br from-gold/20 to-transparent blur-2xl" />
              <img src={logo} alt="H.A.D. shield" className="relative w-full rounded-2xl border border-gold/30 shadow-2xl shadow-black/60" />
            </div>
          </div>
        </section>

        <div className="gold-divider mx-auto max-w-6xl" />

        {/* Plans */}
        <section id="plans" className="mx-auto max-w-6xl px-6 py-20">
          <div className="text-center mb-12">
            <p className="text-xs tracking-[0.3em] text-gold uppercase">Investment Plans</p>
            <h2 className="font-serif text-4xl mt-2">Three tiers. Two times the principal.</h2>
            <p className="text-white/60 mt-3">Rate is the monthly target. 2X principal is the program target.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.name} className={`rounded-xl border border-gold/20 bg-gradient-to-br ${p.color} p-8 hover:border-gold/60 transition`}>
                <h3 className="font-serif text-2xl text-gold">{p.name}</h3>
                <p className="mt-4 text-5xl font-serif">{p.rate}<span className="text-base text-white/60"> / month*</span></p>
                <p className="mt-2 text-sm text-white/70">{p.slab}</p>
                <ul className="mt-6 space-y-2 text-sm text-white/80">
                  {p.perks.map((x) => <li key={x} className="flex gap-2"><span className="text-gold">◆</span>{x}</li>)}
                </ul>
                <Link to="/register" className="mt-8 block rounded-md border border-gold/50 px-4 py-2 text-center text-sm text-gold hover:bg-gold hover:text-navy transition">Choose {p.name}</Link>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/40 mt-4 text-center">*Target rate, not guaranteed. Actual returns track the company portfolio.</p>
        </section>

        {/* How */}
        <section id="how" className="bg-navy-light/40 py-20 border-y border-gold/10">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center mb-12">
              <p className="text-xs tracking-[0.3em] text-gold uppercase">How it works</p>
              <h2 className="font-serif text-4xl mt-2">From signup to 2X — clean and visible.</h2>
            </div>
            <div className="grid gap-8 md:grid-cols-4">
              {[
                ["01", "Register", "Get your HAD ID + secure password."],
                ["02", "Pay", "UPI or crypto. Upload screenshot."],
                ["03", "Verify", "Admin verifies, dashboard updates live."],
                ["04", "Earn", "Returns paid monthly until 2X is hit."],
              ].map(([n, t, d]) => (
                <div key={n} className="rounded-lg border border-gold/15 bg-navy p-6">
                  <div className="font-serif text-3xl text-gold">{n}</div>
                  <h4 className="mt-3 text-lg">{t}</h4>
                  <p className="mt-1 text-sm text-white/60">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="trust" className="mx-auto max-w-6xl px-6 py-20 text-center">
          <p className="text-xs tracking-[0.3em] text-gold uppercase">Why H.A.D.</p>
          <h2 className="font-serif text-4xl mt-2">Real portfolio. Real numbers. Real time.</h2>
          <p className="text-white/60 mt-3 max-w-2xl mx-auto">
            Every asset the company holds is visible on your dashboard with live CoinCap pricing. No hidden books. No mystery returns.
          </p>
        </section>

        <footer className="border-t border-gold/15 bg-navy">
          <div className="mx-auto max-w-6xl px-6 py-8 flex flex-wrap items-center justify-between text-sm text-white/50">
            <p>© 2026 H.A.D. Asset Management</p>
            <div className="flex gap-6">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
              <Link to="/admin/login">Admin</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

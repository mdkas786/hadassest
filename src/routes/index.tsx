import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import logo from "@/assets/had-logo.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "H.A.D. Asset Management — Multi-Asset Investment Platform" },
      { name: "description", content: "Transparent multi-asset portfolio across crypto, NFTs and real estate. Target 2X on every plan with monthly ROI." },
      { property: "og:title", content: "H.A.D. Asset Management" },
      { property: "og:description", content: "Paison ko sirf bachao mat, unhein kaam par lagao. 2X target on every plan." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-[var(--gold)]/15 text-center text-xs py-2 text-[var(--gold-light)]">
        ⚡ Live payout of June Month ROI on 10th of this month. Keep tracking.
      </div>
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Logo />
          <nav className="hidden md:flex gap-5 text-sm text-muted-foreground ml-6">
            <a href="#plans" className="hover:text-foreground">SLABS & PLANS</a>
            <a href="#how" className="hover:text-foreground">HOW IT WORKS</a>
            <a href="#referral" className="hover:text-foreground">SPONSOR INCOME</a>
            <a href="#portfolio" className="hover:text-foreground">LIVE PORTFOLIO</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">SIGN IN</Link>
            <Link to="/register" className="bg-[var(--gold)] text-[var(--primary-foreground)] text-sm px-4 py-2 rounded font-semibold">GET STARTED</Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <div className="inline-block text-xs text-[var(--gold)] mb-4">⚡ LIVE MULTI-ASSET CRYPTO & REAL ESTATE BLEND</div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Paison ko sirf <span className="text-[var(--gold)]">bachao</span> mat,
            <br />unhein <span className="text-[var(--gold)]">kaam</span> par lagao.
          </h1>
          <p className="text-muted-foreground mt-5 text-sm leading-relaxed">
            H.A.D. Asset Management runs a completely transparent multi-asset portfolio deployed
            dynamically across cryptocurrency indices, NFT allocations, and premium real estate
            nodes. We track, buy, and report every transaction in real-time, delivering clean
            structured target-yields automatically up to a secure 2X hard payout cap!
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/register" className="bg-[var(--gold)] text-[var(--primary-foreground)] px-5 py-3 rounded font-semibold text-sm">OPEN ACCOUNT →</Link>
            <a href="#plans" className="border border-border px-5 py-3 rounded text-sm">VIEW PLANS</a>
          </div>
          <div className="flex gap-5 mt-6 text-xs text-muted-foreground">
            <span>✓ 2X principal target payout rule</span>
            <span>✓ Realtime holding asset trackers</span>
          </div>
        </div>
        <div className="flex justify-center">
          <img src={logo} alt="H.A.D. Asset Management" className="rounded-lg shadow-2xl max-w-md w-full" width={1280} height={768} />
        </div>
      </section>

      {/* Plans */}
      <section id="plans" className="bg-card/40 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs text-[var(--gold)] tracking-widest">SELECT SLAB TIER</p>
          <h2 className="text-center text-3xl font-bold mt-2">Three tiers. Two times the principal.</h2>
          <p className="text-center text-muted-foreground text-sm mt-3 max-w-2xl mx-auto">
            Our target rate represents the static monthly portfolio payout goal. Your subscription terminates as soon as you touch the strict 2X total payout target threshold.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {[
              { name: "STARTER", rate: "5%", min: "₹50,000", max: "₹10,00,000", color: "border-border" },
              { name: "GROWTH", rate: "6%", min: "₹11,00,000", max: "₹30,00,000", color: "border-[var(--gold)] ring-1 ring-[var(--gold)]", recommended: true },
              { name: "FORTUNE", rate: "7%", min: "₹31,00,000+", max: "", color: "border-border" },
            ].map((p) => (
              <div key={p.name} className={`bg-card border ${p.color} rounded-lg p-6 relative`}>
                {p.recommended && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[var(--gold)] text-[var(--primary-foreground)] text-[10px] px-2 py-1 rounded font-semibold">RECOMMENDED</span>}
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>SLAB</span>
                  <span className="text-[var(--gold)] text-lg font-bold">{p.rate}<span className="text-xs text-muted-foreground">/mo</span></span>
                </div>
                <h3 className="text-xl font-bold mt-3">{p.name}</h3>
                <p className="text-muted-foreground text-sm mt-2">{p.min}{p.max && ` – ${p.max}`}</p>
                <ul className="text-xs text-muted-foreground space-y-2 mt-5">
                  <li>✓ Target monthly ROI yields</li>
                  <li>✓ Dynamic 2X progression bar tracker</li>
                  <li>✓ Realtime fast UPI and USDT payouts</li>
                </ul>
                <Link to="/register" className="block text-center mt-6 bg-secondary hover:bg-[var(--gold)] hover:text-[var(--primary-foreground)] py-2 rounded text-sm font-semibold transition">CHOOSE {p.name}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-16">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-xs text-[var(--gold)] tracking-widest">PROCESS FLOW</p>
          <h2 className="text-center text-3xl font-bold mt-2">From signup to 2X — clean and visible.</h2>
          <div className="grid md:grid-cols-2 gap-5 mt-10">
            {[
              { n: "01", t: "REGISTER", b: "Create an account instantly. Save your secure unique HAD Login ID and credential keys. No passwords required for initial profile login." },
              { n: "02", t: "TRANSFER PAYOUT", b: "Send your desired funds using secure native UPI transfer QR links, or transfer BEP20/TRC20 assets directly, uploading verification receipts." },
              { n: "03", t: "SYSTEM APPROVAL", b: "Admin verifies transaction signatures. Once approved, your plan automatically assigns, and starts accumulating real-time earnings instantly." },
              { n: "04", t: "ROI & REWARDS", b: "Earnings calculations are paid on the 10th of every month. Your account remains active until you hit the maximum 2X limit cap." },
            ].map((s) => (
              <div key={s.n} className="bg-card border border-border rounded-lg p-6">
                <div className="text-3xl font-bold text-[var(--gold)]/40">{s.n}</div>
                <h3 className="font-semibold mt-2">{s.t}</h3>
                <p className="text-sm text-muted-foreground mt-2">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Referral */}
      <section id="referral" className="bg-card/40 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-xs text-[var(--gold)] tracking-widest">AFFILIATION REWARDS</p>
          <h2 className="text-3xl font-bold mt-2">Earn premium commissions while referring.</h2>
          <p className="text-muted-foreground text-sm mt-3">
            Our growth engine is fueled by local networks. We distribute two-way benefits down to sponsors who introduce capital to H.A.D.
          </p>
          <div className="space-y-3 mt-8 max-w-3xl">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-[var(--gold)] font-semibold">SPONSOR REFERRAL (5% DIRECT)</div>
              <p className="text-sm text-muted-foreground mt-1">Earn instantly 5% on every enrolled investment, paid by your direct invitee. E.g. invest ₹1,00,000 → you earn ₹5,000 credited on the 10th.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-xs text-[var(--gold)] font-semibold">PARTNER LEVEL INCOME (10% ON DIRECT ROI)</div>
              <p className="text-sm text-muted-foreground mt-1">Qualify by introducing 2 direct verified investors. Get an extra 10% bonus calculated on their monthly paid ROI. E.g. direct investor gets ₹10,000 ROI → you get ₹1,000 extra value.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © 2026 H.A.D. Asset Management ·{" "}
        <Link to="/login" className="hover:text-foreground">Login</Link> ·{" "}
        <Link to="/register" className="hover:text-foreground">Register</Link> ·{" "}
        <Link to="/admin/login" className="hover:text-foreground">Admin</Link>
      </footer>
    </div>
  );
}

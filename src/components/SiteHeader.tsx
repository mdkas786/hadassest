import { Link } from "@tanstack/react-router";
import logo from "@/assets/had-logo.jpg";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-gold/20 bg-navy/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="H.A.D." className="h-9 w-9 rounded object-cover" />
          <span className="font-serif text-lg text-gold tracking-wide">H.A.D. <span className="text-white/70 text-sm tracking-widest">ASSET MANAGEMENT</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
          <a href="#plans" className="hover:text-gold">Plans</a>
          <a href="#how" className="hover:text-gold">How it works</a>
          <a href="#trust" className="hover:text-gold">Why H.A.D.</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-white/90 hover:text-gold">Login</Link>
          <Link to="/register" className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-navy hover:brightness-110">Get Started</Link>
        </div>
      </div>
    </header>
  );
}

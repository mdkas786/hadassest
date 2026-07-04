import logo from "@/assets/had-logo.jpg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img src={logo} alt="H.A.D. Asset Management" className="h-9 w-auto rounded-sm" width={64} height={36} />
      <div className="hidden sm:flex flex-col leading-none">
        <span className="font-bold text-[var(--gold)] text-sm tracking-wider">H.A.D.</span>
        <span className="text-[10px] text-muted-foreground tracking-wider">ASSET MANAGEMENT</span>
      </div>
    </div>
  );
}
import { Cpu, Sparkles } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-slate-950 shadow-lg shadow-cyan-500/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.35),_transparent_55%),linear-gradient(135deg,rgba(17,24,39,1),rgba(15,23,42,0.92),rgba(88,28,135,0.85))]" />
        <Cpu className="relative z-10 h-5 w-5 text-cyan-300" />
        <Sparkles className="absolute right-1.5 top-1.5 h-3 w-3 text-rose-300" />
      </div>
      <div className="flex flex-col">
        <span className="font-headline text-lg font-semibold leading-none tracking-[0.22em] text-foreground sm:text-xl">
          VEXA AI
        </span>
        <span className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground leading-none sm:text-[11px]">
          Intelligent systems studio
        </span>
      </div>
    </div>
  );
}

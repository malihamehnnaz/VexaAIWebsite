import { Rocket } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Rocket className="h-6 w-6 text-primary" />
      <span className="font-headline text-2xl font-bold text-foreground">
        Vexa AI
      </span>
    </div>
  );
}

import { Bot } from 'lucide-react';

export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <Bot className="h-7 w-7 text-primary" />
      <span className="font-headline text-xl font-bold text-primary">Vexa AI</span>
    </div>
  );
}

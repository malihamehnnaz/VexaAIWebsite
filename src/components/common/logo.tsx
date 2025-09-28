import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center gap-3">
      <Image src="/logo.png" alt="Vexa AI Logo" width={40} height={40} className="h-10 w-auto" />
      <div className="flex flex-col">
        <span className="font-headline text-xl font-bold text-primary leading-none">Vexa AI</span>
        <span className="text-xs text-muted-foreground leading-none mt-1">Generative Intelligence</span>
      </div>
    </div>
  );
}

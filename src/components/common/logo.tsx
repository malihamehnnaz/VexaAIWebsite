export default function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-md flex items-center justify-center">
        <span className="text-white font-bold text-xl">V</span>
      </div>
      <div className="flex flex-col">
        <span className="font-headline text-xl font-bold text-foreground leading-none">
          VexaAI
        </span>
        <span className="text-xs text-muted-foreground leading-none">
          Generative Intelligence
        </span>
      </div>
    </div>
  );
}

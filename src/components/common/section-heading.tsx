import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  className?: string;
};

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('space-y-4', align === 'center' && 'mx-auto max-w-3xl text-center', className)}>
      {eyebrow ? (
        <Badge variant="outline" className="border-white/15 bg-white/5 px-4 py-1 text-[11px] uppercase tracking-[0.28em] text-primary">
          {eyebrow}
        </Badge>
      ) : null}
      <h2 className="font-headline text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {description ? <p className="text-base leading-7 text-muted-foreground sm:text-lg">{description}</p> : null}
    </div>
  );
}
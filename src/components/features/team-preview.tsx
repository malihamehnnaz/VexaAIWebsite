import { teamMembers } from '@/content/site-content';

export default function TeamPreview() {
  return (
    <section className="py-14 md:py-16 bg-background/95">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Leadership</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">Meet our core team</h2>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            The leadership behind Vexa AI brings together business vision, technology execution, and operational discipline.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {teamMembers.slice(0, 3).map((member) => (
            <div
              key={member.name}
              className="rounded-3xl border border-white/10 bg-gradient-to-br from-background to-muted/30 p-6 shadow-lg shadow-primary/5"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-semibold text-primary">
                {member.initials}
              </div>
              <h3 className="mt-5 text-xl font-semibold text-foreground">{member.name}</h3>
              <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
              <p className="mt-4 text-sm leading-6 text-muted-foreground">{member.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
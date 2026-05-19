'use client';

import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedTeamMembers, siteCopy } from '@/lib/localization';

export default function TeamPreview() {
  const { language } = useLanguage();
  const copy = siteCopy[language].about;
  const teamMembers = getLocalizedTeamMembers(language);

  return (
    <section className="py-14 md:py-16 bg-background/95">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">{copy.leadership}</p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">{copy.meetTeam}</h2>
          <p className="mt-3 text-base text-muted-foreground md:text-lg">
            {copy.teamDescription}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {teamMembers.slice(0, 2).map((member) => (
            <div
              key={member.name}
              className="flex flex-col rounded-3xl border border-white/10 bg-gradient-to-br from-background to-muted/30 p-6 shadow-lg shadow-primary/5"
            >
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-primary/5">
                  {member.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.image} alt={`${member.name} photo`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-primary">{member.initials}</div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                  <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-muted-foreground">{member.bio}</p>

              {/* profile link removed to keep layout concise and professional */}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
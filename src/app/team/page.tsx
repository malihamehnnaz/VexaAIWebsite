import TeamMemberCard from '@/components/features/team-member-card';
import { teamMembers } from '@/content/site-content';

export default function TeamPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-center mb-4">Our Team</h1>
      <p className="mx-auto mb-12 max-w-3xl text-center text-muted-foreground">
        Meet the leadership and delivery team behind Vexa AI, focused on enterprise AI, modern software, and cloud transformation.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {teamMembers.map((member, index) => (
          <TeamMemberCard key={index} {...member} />
        ))}
      </div>
    </div>
  );
}

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { teamMembers } from "@/content/site-content";

export default function TeamPreview() {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Meet Our Leadership</h2>
        <div className="flex justify-center gap-8 md:gap-16">
          {teamMembers.slice(0, 3).map((member, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <Avatar className="w-32 h-32 mb-4">
                <AvatarImage alt={member.name} />
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold">{member.name}</h3>
              <p className="text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Button size="lg" asChild>
            <Link href="/team">Meet The Whole Team</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
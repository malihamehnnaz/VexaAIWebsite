
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FaLinkedin } from "react-icons/fa";

interface TeamMemberCardProps {
  name: string;
  role: string;
  bio: string;
  linkedin: string;
  initials: string;
}

export default function TeamMemberCard({ name, role, bio, linkedin, initials }: TeamMemberCardProps) {
  return (
    <Card className="flex flex-col items-center text-center shadow-lg">
      <CardHeader className="pt-8">
        <Avatar className="w-32 h-32">
          <AvatarImage alt={name} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </CardHeader>
      <CardContent className="flex-grow">
        <h3 className="text-xl font-bold">{name}</h3>
        <p className="text-primary font-medium">{role}</p>
        <p className="text-muted-foreground mt-4">{bio}</p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="ghost">
          <a href={linkedin} target="_blank" rel="noopener noreferrer">
            <FaLinkedin className="w-6 h-6" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const values = [
  { title: "Innovation", description: "We constantly seek new and better ways to solve problems and create value." },
  { title: "Integrity", description: "We are honest, transparent, and committed to doing what’s best for our clients." },
  { title: "Collaboration", description: "We work together, with our clients and partners, to achieve shared goals." },
  { title: "Excellence", description: "We are dedicated to delivering the highest quality work and exceeding expectations." },
  { title: "Impact", description: "We are driven by the desire to make a positive and lasting impact on the world." },
  { title: "Learning", description: "We are lifelong learners, always curious and eager to grow our knowledge and skills." },
];

export default function CoreValues() {
  return (
    <section className="py-20 bg-secondary/30 dark:bg-secondary/10">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Our Core Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <Card key={index} className="text-center bg-background border-0 shadow-lg">
              <CardHeader>
                <CardTitle>{value.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{value.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
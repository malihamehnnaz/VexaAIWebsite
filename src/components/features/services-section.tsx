import { BrainCircuit, CodeXml, Cloud, Bot, GitBranch, DatabaseZap, DraftingCompass } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

const services = [
    {
        title: 'Custom Software Development',
        icon: CodeXml,
        description: 'Scalable, robust, and tailored software solutions built with modern frameworks.',
    },
    {
        title: 'Generative AI Solutions',
        icon: Bot,
        description: 'Deploy AI agents, chatbots, and content generators trained on your business data.',
    },
    {
        title: 'Machine Learning & Automation',
        icon: BrainCircuit,
        description: 'Intelligent models that optimize processes and predict outcomes.',
    },
    {
        title: 'Data Engineering & Analytics',
        icon: DatabaseZap,
        description: 'End-to-end data pipelines, dashboards, and insights for smarter decisions.',
    },
    {
        title: 'Web & Mobile App Development',
        icon: DraftingCompass,
        description: 'Beautiful, high-performance digital products with responsive design.',
    },
    {
        title: 'Cloud Deployment & Integration',
        icon: Cloud,
        description: 'Seamless deployment on AWS, Azure, or Google Cloud for maximum uptime and security.',
    },
    {
        title: 'AI Consultation & Strategy',
        icon: GitBranch,
        description: 'Expert guidance to implement AI in your workflow effectively.',
    },
];

export default function ServicesSection() {
  return (
    <section id="services" className="w-full py-16 md:py-24 lg:py-32 bg-background dark:bg-secondary">
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              Our Services
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              We provide a comprehensive suite of services to transform your business with cutting-edge technology.
            </p>
          </div>
        </div>
        <div className="mx-auto mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
                <Card key={service.title} className="shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader className="flex flex-row items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                        <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                    <CardDescription>{service.description}</CardDescription>
                </CardContent>
                </Card>
            ))}
        </div>
      </div>
    </section>
  );
}

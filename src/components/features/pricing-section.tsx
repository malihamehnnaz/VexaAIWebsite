
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full py-12 md:py-16 lg:py-20">
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        <div className="flex flex-col items-center space-y-4 text-center">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                Transparent Pricing
            </h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Flexible plans tailored to your needs. Get a custom quote for your project.
            </p>
        </div>
        <div className="mt-12 flex justify-center">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <CardTitle className="font-headline text-2xl">Custom Quote</CardTitle>
                    <CardDescription>
                        Pricing varies depending on project scope, features, and integration requirements.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Tailored to your specific needs</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Fast, secure delivery</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Cloud deployment included</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-primary" />
                            <span>Agile project management</span>
                        </li>
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button asChild className="w-full" size="lg">
                        <Link href="#contact">Get a Free Consultation</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </section>
  );
}

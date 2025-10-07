
'use client'

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loader2, Wand2, Lightbulb, Package, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { getRecommendation } from '@/app/actions';
import type { RecommendServicePackagesOutput } from '@/ai/flows/recommend-service-packages';

const formSchema = z.object({
  needs: z.string().min(30, { message: 'Please describe your needs in at least 30 characters.' }),
  businessProfile: z.string().min(20, { message: 'Please describe your business in at least 20 characters.' }),
});

export default function RecommendationTool() {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<RecommendServicePackagesOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      needs: '',
      businessProfile: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      const recommendation = await getRecommendation(values);
      setResult(recommendation);
    } catch (e) {
      setError('Failed to get recommendation. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      form.reset();
      setResult(null);
      setError(null);
      setIsLoading(false);
    }
  }

  return (
    <section id="recommendation" className="w-full py-12 md:py-16 lg:py-20">
        <div className="container mx-auto max-w-4xl px-4 md:px-6 text-center">
            <Wand2 className="mx-auto h-12 w-12 text-primary" />
            <h2 className="mt-4 font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
                Not Sure Where to Start?
            </h2>
            <p className="mx-auto mt-4 max-w-[700px] text-muted-foreground md:text-xl">
                Let our AI-powered tool recommend the perfect service package for your business. Just tell us your needs, and we'll do the rest.
            </p>
            <Dialog open={isOpen} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                    <Button size="lg" className="mt-8">
                        Get Your Recommendation
                        <ChevronRight className="ml-2 h-5 w-5" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle className="font-headline text-2xl">AI Service Recommender</DialogTitle>
                        <DialogDescription>
                            Provide some details about your business and needs, and our AI will suggest the best services for you.
                        </DialogDescription>
                    </DialogHeader>
                    
                    {!result && (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="needs"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>What are your needs?</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="e.g., 'We need to automate customer support and analyze sales data to predict trends.'" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="businessProfile"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Describe your business</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="e.g., 'We are a mid-sized e-commerce company selling clothing, with an existing mobile app.'" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                                    {isLoading ? 'Analyzing...' : 'Get Recommendation'}
                                </Button>
                            </form>
                        </Form>
                    )}

                    {error && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}

                    {result && (
                        <div className="space-y-6 pt-4">
                             <Alert>
                                <Lightbulb className="h-4 w-4" />
                                <AlertTitle className="font-headline">Our Recommendation</AlertTitle>
                                <AlertDescription>
                                    Based on your input, here are the services we believe will provide the most value to your business.
                                </AlertDescription>
                            </Alert>

                            <div className="space-y-4">
                                <h4 className="font-semibold flex items-center"><Package className="mr-2 h-5 w-5 text-primary"/>Recommended Packages</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.recommendedPackages.map((pkg) => (
                                        <Badge key={pkg} variant="secondary" className="text-sm py-1 px-3">{pkg}</Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h4 className="font-semibold">Reasoning</h4>
                                <p className="text-sm text-muted-foreground bg-secondary/50 p-4 rounded-md border">{result.reasoning}</p>
                            </div>
                             <Button onClick={() => { setResult(null); form.reset(); }} className="w-full">
                                Start Over
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    </section>
  );
}

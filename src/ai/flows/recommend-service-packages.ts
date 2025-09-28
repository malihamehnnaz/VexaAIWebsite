'use server';

/**
 * @fileOverview AI-powered service package recommendation flow.
 *
 * This file defines a Genkit flow that recommends service packages based on user needs and business profile.
 * - recommendServicePackages - A function that initiates the service package recommendation process.
 * - RecommendServicePackagesInput - The input type for the recommendServicePackages function.
 * - RecommendServicePackagesOutput - The return type for the recommendServicePackages function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendServicePackagesInputSchema = z.object({
  needs: z
    .string()
    .describe('A description of the user specified needs for their business.'),
  businessProfile: z
    .string()
    .describe('A description of the user business profile, industry, and size.'),
});
export type RecommendServicePackagesInput = z.infer<
  typeof RecommendServicePackagesInputSchema
>;

const RecommendServicePackagesOutputSchema = z.object({
  recommendedPackages: z
    .array(z.string())
    .describe('An array of recommended service packages based on the user needs and business profile.'),
  reasoning: z.string().describe('The reasoning behind the recommended packages.'),
});
export type RecommendServicePackagesOutput = z.infer<
  typeof RecommendServicePackagesOutputSchema
>;

export async function recommendServicePackages(
  input: RecommendServicePackagesInput
): Promise<RecommendServicePackagesOutput> {
  return recommendServicePackagesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'recommendServicePackagesPrompt',
  input: {schema: RecommendServicePackagesInputSchema},
  output: {schema: RecommendServicePackagesOutputSchema},
  prompt: `You are an AI assistant specializing in recommending service packages for Vexa AI, a company offering AI, software development, and cloud services.

  Based on the user's specified needs and business profile, recommend the most suitable service packages.
  Explain the reasoning behind your recommendations.

  User Needs: {{{needs}}}
  Business Profile: {{{businessProfile}}}

  Consider the following service packages:
  - AI Consulting: Initial consultation and strategy development for AI adoption.
  - Custom AI Model Development: Building tailored AI models to address specific business challenges.
  - AI Integration: Integrating AI solutions into existing systems and workflows.
  - Software Development: Custom software solutions designed to meet unique business requirements.
  - Cloud Migration: Migrating existing infrastructure to the cloud for improved scalability and efficiency.
  - Cloud Management: Ongoing management and optimization of cloud resources.
  - DevOps Automation: Implementing DevOps practices to automate software delivery pipelines.

  Output the recommendations as a list of service packages, followed by a detailed explanation of why each package is recommended.
  `,
});

const recommendServicePackagesFlow = ai.defineFlow(
  {
    name: 'recommendServicePackagesFlow',
    inputSchema: RecommendServicePackagesInputSchema,
    outputSchema: RecommendServicePackagesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

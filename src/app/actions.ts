
'use server';

import {
  recommendServicePackages,
  type RecommendServicePackagesInput,
  type RecommendServicePackagesOutput,
} from '@/ai/flows/recommend-service-packages';
import {
  answerCustomerQuestions,
  type AnswerCustomerQuestionsInput,
  type AnswerCustomerQuestionsOutput,
} from '@/ai/flows/answer-customer-questions';

export async function getRecommendation(
  input: RecommendServicePackagesInput
): Promise<RecommendServicePackagesOutput> {
  return await recommendServicePackages(input);
}

export async function getChatbotResponse(
  input: AnswerCustomerQuestionsInput
): Promise<AnswerCustomerQuestionsOutput> {
  return await answerCustomerQuestions(input);
}

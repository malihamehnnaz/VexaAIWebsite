'use client';

import AIChatbot from '@/components/features/ai-chatbot';
import { FirebaseClientProvider } from '@/firebase';

export default function AIChatbotShell() {
  return (
    <FirebaseClientProvider>
      <AIChatbot />
    </FirebaseClientProvider>
  );
}
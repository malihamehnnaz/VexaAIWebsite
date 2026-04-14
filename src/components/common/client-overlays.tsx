'use client';

import dynamic from 'next/dynamic';
import { Toaster } from '@/components/ui/toaster';

const AIChatbotShell = dynamic(() => import('@/components/features/ai-chatbot-shell'), {
  ssr: false,
});

export default function ClientOverlays() {
  return (
    <>
      <Toaster />
      <AIChatbotShell />
    </>
  );
}
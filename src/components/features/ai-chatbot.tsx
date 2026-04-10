"use client";

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { Bot, User, Loader2, X, Send, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getChatbotResponse } from '@/app/actions';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, addDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { motion, AnimatePresence } from 'framer-motion';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: any;
};

const examplePrompts = [
  "What is Generative AI?",
  "Tell me about your cloud services.",
  "How do you build custom software?",
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const messagesRef = useMemoFirebase(() => {
    if (!firestore || !user || !isClient) return null;
    return collection(firestore, `users/${user.uid}/chat_messages`);
  }, [firestore, user, isClient]);

  const messagesQuery = useMemoFirebase(() => {
    if (!messagesRef) return null;
    return query(messagesRef, orderBy('timestamp', 'asc'));
  }, [messagesRef]);

  const { data: messages, isLoading: isHistoryLoading } = useCollection<Message>(messagesQuery);
  
  useEffect(() => {
    if (!user && !isUserLoading && auth && isClient) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth, isClient]);

  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isAiLoading]);

  const handleSend = async (message: string) => {
    if (!message.trim() || !messagesRef) return;

    const userMessage: Message = { role: 'user', content: message, timestamp: serverTimestamp() };
    addDoc(messagesRef, userMessage);
    
    setIsAiLoading(true);

    try {
      const response = await getChatbotResponse({ question: message });
      const assistantMessage: Message = { role: 'assistant', content: response.answer, timestamp: serverTimestamp() };
      addDoc(messagesRef, assistantMessage);
    } catch (error) {
      console.error("Error getting chatbot response:", error);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again later.", timestamp: serverTimestamp() };
      addDoc(messagesRef, errorMessage);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSend(input);
    setInput('');
  };

  const initialMessage: Message[] = [{ role: 'assistant', content: "Hello! I'm Vexa's AI assistant. Ask me anything about our services, or try one of the prompts below!" }];
  const chatContent = (messages && messages.length > 0) ? messages : [];

  return (
    <>
      <div className="fixed bottom-8 right-8 z-50">
        <Button onClick={() => setIsOpen(!isOpen)} className="w-16 h-16 rounded-full shadow-lg" size="icon">
          <AnimatePresence>
            {isOpen ? (
              <motion.div key="close" initial={{ rotate: 45, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -45, opacity: 0 }}>
                <X className="w-8 h-8" />
              </motion.div>
            ) : (
              <motion.div key="bot" initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}>
                <Bot className="w-8 h-8" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed bottom-28 right-8 z-50"
          >
            <Card className="w-80 md:w-96 h-[32rem] flex flex-col shadow-2xl glass-card">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Assistant
                </CardTitle>
                <CardDescription>Your guide to Vexa AI</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-hidden">
                <ScrollArea className="h-full pr-4" viewportRef={scrollViewportRef}>
                  <div className="space-y-4">
                    {isHistoryLoading ? (
                      <div className="flex justify-center items-center h-full">
                        <Loader2 className="mx-auto my-4 h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <>
                        {initialMessage.map((msg, i) => <ChatMessage key={`initial-${i}`} message={msg} />)}
                        {chatContent.map((message, index) => (
                          <ChatMessage key={index} message={message} />
                        ))}
                        {messages?.length === 0 && (
                          <div className="flex flex-col gap-2 pt-4">
                            {examplePrompts.map(prompt => (
                              <Button key={prompt} variant="outline" size="sm" className="justify-start" onClick={() => handleSend(prompt)}>
                                {prompt}
                              </Button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {isAiLoading && <LoadingBubble />}
                  </div>
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={isAiLoading}
                    className="bg-background/50"
                  />
                  <Button type="submit" disabled={isAiLoading} size="icon">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

const ChatMessage = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn('flex items-end gap-2', {
      'justify-end': message.role === 'user',
      'justify-start': message.role === 'assistant',
    })}
  >
    {message.role === 'assistant' && (
      <Avatar className="h-8 w-8 bg-secondary">
        <AvatarFallback><Bot className="h-5 w-5 text-secondary-foreground" /></AvatarFallback>
      </Avatar>
    )}
    <div
      className={cn('max-w-xs rounded-lg px-4 py-2 text-sm md:text-base', {
        'bg-primary text-primary-foreground': message.role === 'user',
        'bg-secondary text-secondary-foreground': message.role === 'assistant',
      })}
    >
      {message.content}
    </div>
      {message.role === 'user' && (
      <Avatar className="h-8 w-8 bg-primary">
        <AvatarFallback><User className="h-5 w-5 text-primary-foreground" /></AvatarFallback>
      </Avatar>
    )}
  </motion.div>
);

const LoadingBubble = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-end gap-2 justify-start"
  >
    <Avatar className="h-8 w-8 bg-secondary">
      <AvatarFallback><Bot className="h-5 w-5 text-secondary-foreground" /></AvatarFallback>
    </Avatar>
    <div className="max-w-xs rounded-lg px-4 py-2 bg-secondary">
      <Loader2 className="h-5 w-5 animate-spin text-secondary-foreground" />
    </div>
  </motion.div>
);

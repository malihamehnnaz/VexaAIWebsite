'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getChatbotResponse } from '@/app/actions';
import { cn } from '@/lib/utils';
import Logo from '@/components/common/logo';
import { useUser, useFirestore, useAuth, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, query, orderBy, addDoc } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: any;
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement>(null);

  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const messagesRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/chat_messages`);
  }, [firestore, user]);

  const messagesQuery = useMemoFirebase(() => {
    if (!messagesRef) return null;
    return query(messagesRef, orderBy('timestamp', 'asc'));
  }, [messagesRef]);

  const { data: messages, isLoading: isHistoryLoading } = useCollection<Message>(messagesQuery);
  
  // Automatically sign in anonymously if not logged in
  useEffect(() => {
    if (!user && !isUserLoading && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  const scrollToBottom = () => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTo({
        top: scrollViewportRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };
  
  useEffect(() => {
    // Scroll to bottom when messages change or when the chat opens.
    if (isOpen) {
      // A small delay ensures the DOM has updated before we try to scroll.
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen, isAiLoading]);


  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !messagesRef) return;

    const userMessage: Message = { role: 'user', content: input, timestamp: serverTimestamp() };
    
    // Non-blocking write to Firestore
    addDoc(messagesRef, userMessage);
    
    setInput('');
    setIsAiLoading(true);

    try {
      const response = await getChatbotResponse({ question: input });
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

  const initialMessage: Message[] = [{ role: 'assistant', content: "Hello! I'm Vexa AI's assistant. How can I help you today with our AI, software, or cloud services?" }];
  const chatContent = (messages && messages.length > 0) ? messages : initialMessage;

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
          >
            <MessageCircle className="h-7 w-7" />
            <span className="sr-only">Open Chat</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="flex flex-col p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="flex items-center gap-2">
              <Logo />
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
            <div className="p-4 space-y-6">
              {(isUserLoading || isHistoryLoading) && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              {!(isUserLoading || isHistoryLoading) && chatContent.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    'flex items-start gap-3',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      'max-w-[75%] rounded-lg p-3 text-sm',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p>{message.content}</p>
                  </div>
                  {message.role === 'user' && (
                     <Avatar className="h-8 w-8">
                      <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {isAiLoading && (
                 <div className="flex items-start gap-3 justify-start">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                    </Avatar>
                    <div className="bg-muted rounded-lg p-3">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <SheetFooter className="p-4 border-t bg-background">
            <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
              <Input
                id="message"
                placeholder={user ? "Ask about our services..." : "Please wait..."}
                className="flex-1"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isAiLoading || !user || isUserLoading}
              />
              <Button type="submit" size="icon" disabled={isAiLoading || !user || isUserLoading}>
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </form>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

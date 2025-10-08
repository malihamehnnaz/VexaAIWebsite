'use client'

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { MessageCircle, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getChatbotResponse } from '@/app/actions';
import { cn } from '@/lib/utils';
import Logo from '@/components/common/logo';
import { useUser, useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { initiateAnonymousSignIn } from '@/firebase/non-blocking-login';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();

  const messagesCollectionRef = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'chat_messages') : null,
    [firestore, user]
  );

  const messagesQuery = useMemoFirebase(
    () => messagesCollectionRef ? query(messagesCollectionRef, orderBy('timestamp', 'asc')) : null,
    [messagesCollectionRef]
  );
  
  const { data: firestoreMessages, isLoading: isHistoryLoading } = useCollection<Message>(messagesQuery);
  
  const messages = firestoreMessages || localMessages;

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAiLoading]);

  const saveMessage = async (message: Message) => {
    if (messagesCollectionRef) {
      addDocumentNonBlocking(messagesCollectionRef, {
        ...message,
        timestamp: serverTimestamp(),
        userId: user!.uid,
      });
    }
  };
  
  const handleLogin = () => {
    initiateAnonymousSignIn(auth);
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    
    if(user) {
      saveMessage(userMessage);
    } else {
      setLocalMessages(prev => [...prev, userMessage]);
    }
    
    setInput('');
    setIsAiLoading(true);

    try {
      const response = await getChatbotResponse({ question: input });
      const assistantMessage: Message = { role: 'assistant', content: response.answer };
      if(user) {
        saveMessage(assistantMessage);
      } else {
        setLocalMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error getting chatbot response:", error);
      const errorMessage: Message = { role: 'assistant', content: "Sorry, I'm having trouble connecting. Please try again later." };
      if(user) {
        saveMessage(errorMessage);
      } else {
        setLocalMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsAiLoading(false);
    }
  };
  
  useEffect(() => {
    if (isOpen && !user && localMessages.length === 0) {
      setLocalMessages([{ role: 'assistant', content: "Hello! I'm Vexa AI's assistant. How can I help you today with our AI, software, or cloud services?" }]);
    }
  }, [isOpen, user, localMessages.length]);


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
          <ScrollArea className="flex-1" ref={scrollAreaRef}>
            <div className="p-4 space-y-6">
              {(isUserLoading || isHistoryLoading) && (
                <div className="flex justify-center items-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {!isUserLoading && !user && (
                 <div className="text-center p-4 rounded-lg bg-secondary">
                    <Sparkles className="mx-auto h-8 w-8 text-primary mb-2" />
                    <p className="text-sm font-medium">Want to save your chat history?</p>
                    <Button onClick={handleLogin} size="sm" className="mt-4">Sign in to get started</Button>
                </div>
              )}
              
              {messages.map((message, index) => (
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
                placeholder="Ask about our services..."
                className="flex-1"
                autoComplete="off"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isAiLoading || isUserLoading}
              />
              <Button type="submit" size="icon" disabled={isAiLoading || isUserLoading}>
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

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo, useEffect, useState } from 'react';
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { sendContactEmail } from "@/app/actions";
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { logFirestoreEvent, buildClientLogMeta } from '@/firebase/logging';
import { useLanguage } from '@/components/common/language-provider';
import { siteCopy } from '@/lib/localization';
import { logContactSubmission } from '@/lib/supabase-logger';

export default function ContactForm() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const fstore = useFirestore();
  const { user } = useUser();
  const [pagePath, setPagePath] = useState('');
  const [userAgent, setUserAgent] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setPagePath(window.location.pathname);
    setUserAgent(window.navigator.userAgent);

    if (fstore) {
      logFirestoreEvent(fstore, 'traffic_events', {
        ...buildClientLogMeta(user?.id, window.location.pathname, 'contact_page_view', window.navigator.userAgent),
        eventType: 'page_view',
        source: 'contact_page',
      });
    }
  }, [fstore, user?.id]);

  const copy = siteCopy[language].form;
  const formSchema = useMemo(
    () =>
      z
        .object({
          name: z.string().min(2, { message: copy.validationName }),
          company: z.string().optional(),
          email: z.string().email({ message: copy.validationEmail }),
          message: z.string().min(10, { message: copy.validationMessage }).max(2000),
          availableDate: z.string().optional().nullable(),
          availableTime: z.string().optional().nullable(),
          honeypot: z.string().optional(), // must stay empty
        })
        .superRefine((values, ctx) => {
          if (values.availableDate && !values.availableTime) {
            ctx.addIssue({
              path: ["availableTime"],
              code: z.ZodIssueCode.custom,
              message: copy.validationAvailableTime,
            });
          }
        }),
    [copy.validationAvailableTime, copy.validationEmail, copy.validationMessage, copy.validationName]
  );
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      message: "",
      availableDate: "",
      availableTime: "",
      honeypot: "",
    },
  });
  const availableDate = form.watch("availableDate");
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    const startMinutes = 8 * 60;
    const endMinutes = 17 * 60;
    for (let minutes = startMinutes; minutes <= endMinutes; minutes += 15) {
      const hour = Math.floor(minutes / 60);
      const minute = minutes % 60;
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
    return slots;
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await sendContactEmail({
      name: values.name,
      company: values.company,
      email: values.email,
      message: values.message,
      availableDate: values.availableDate || undefined,
      availableTime: values.availableTime || undefined,
      honeypot: values.honeypot || '',
    });

    // Persist submission to Firestore for admin review
    try {
      if (fstore) {
        const sessionId = user?.id ?? `guest-${Date.now().toString().slice(-8)}`;
        const submissionsRef = collection(fstore, 'contact_submissions');
        await addDoc(submissionsRef, {
          name: values.name,
          company: values.company || null,
          email: values.email,
          message: values.message,
          availableDate: values.availableDate || null,
          availableTime: values.availableTime || null,
          sessionId,
          userId: user?.id ?? null,
          pagePath: pagePath || '/contact',
          route: 'contact_form',
          userAgent: userAgent || null,
          createdAt: serverTimestamp(),
        });

        await logFirestoreEvent(fstore, 'traffic_events', {
          ...buildClientLogMeta(user?.id, pagePath || '/contact', 'contact_form_submission', userAgent || 'unknown'),
          eventType: 'contact_form_submission',
          details: {
            name: values.name,
            email: values.email,
          },
        });
      }
    } catch (err) {
      console.error('Failed to persist contact submission', err);
      if (fstore) {
        await logFirestoreEvent(fstore, 'error_logs', {
          ...buildClientLogMeta(user?.id, pagePath || '/contact', 'contact_submission_error', userAgent || 'unknown'),
          eventType: 'error',
          source: 'contact_form',
          message: (err as Error)?.message ?? 'Unknown submission error',
          details: {
            formValues: {
              name: values.name,
              email: values.email,
            },
          },
        });
      }
    }

    logContactSubmission({
      sessionId: user?.id ?? `guest-${Date.now().toString().slice(-8)}`,
      name: values.name,
      company: values.company || null,
      email: values.email,
      message: values.message,
      availableDate: values.availableDate || null,
      availableTime: values.availableTime || null,
      pagePath: pagePath || '/contact',
      route: 'contact_form',
      userAgent: userAgent || undefined,
    });

    toast({
      title: result.success ? "Message Sent" : "Message not sent",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });

    if (result.success) {
      form.reset();
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Honeypot — hidden from humans, bots fill it, server rejects if non-empty */}
            <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
              <label htmlFor="hp-website">Website</label>
              <input
                id="hp-website"
                type="text"
                autoComplete="off"
                tabIndex={-1}
                {...form.register('honeypot')}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {copy.name}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={copy.namePlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.company}</FormLabel>
                  <FormControl>
                    <Input placeholder={copy.companyPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {copy.email}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder={copy.emailPlaceholder} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {copy.message}
                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={copy.messagePlaceholder}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="availableDate"
              render={({ field }) => {
                const { ref, value, ...rest } = field;
                return (
                  <FormItem>
                    <FormLabel>{copy.available}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        placeholder={copy.availablePlaceholder}
                        ref={ref}
                        {...rest}
                        value={value ?? ''}
                        onChange={(event) => {
                          field.onChange(event);
                          if (!event.target.value) {
                            form.setValue('availableTime', '');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            {availableDate ? (
              <FormField
                control={form.control}
                name="availableTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{copy.availableTime}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={copy.timePlaceholder} />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
            <Button type="submit">{copy.submit}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
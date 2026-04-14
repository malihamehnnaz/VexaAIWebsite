"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMemo } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from '@/components/common/language-provider';
import { siteCopy } from '@/lib/localization';

export default function ContactForm() {
  const { language } = useLanguage();
  const copy = siteCopy[language].form;
  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, {
          message: copy.validationName,
        }),
        company: z.string().optional(),
        email: z.string().email({
          message: copy.validationEmail,
        }),
        message: z.string().min(10, {
          message: copy.validationMessage,
        }),
      }),
    [copy.validationEmail, copy.validationMessage, copy.validationName]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      company: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    // Here you would typically send the form data to your backend
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>{copy.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.name}</FormLabel>
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
                  <FormLabel>{copy.email}</FormLabel>
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
                  <FormLabel>{copy.message}</FormLabel>
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
            <Button type="submit">{copy.submit}</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
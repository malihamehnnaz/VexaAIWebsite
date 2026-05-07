
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useMemo } from 'react';
import * as z from 'zod';
import { Mail, Phone, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sendContactEmail } from '@/app/actions';
import { useLanguage } from '@/components/common/language-provider';
import { getLocalizedCompanyContact } from '@/lib/localization';

export default function ContactSection() {
  const { toast } = useToast();
  const { language } = useLanguage();
  const companyContact = getLocalizedCompanyContact(language);
  const copy =
    language === 'sv'
      ? {
          title: 'Låt oss bygga tillsammans',
          description: 'Har ni ett projekt i åtanke eller vill ni bara veta mer om våra tjänster? Vi vill gärna höra från er.',
          cta: 'Boka en demo',
          sentTitle: 'Meddelandet har skickats!',
          sentDescription: 'Tack för att ni kontaktade oss. Vi återkommer inom kort.',
          name: 'Namn',
          company: 'Företag',
          email: 'E-post',
          projectDescription: 'Projektbeskrivning',
          namePlaceholder: 'Anna Andersson',
          companyPlaceholder: 'Ert företag',
          emailPlaceholder: 'anna@example.com',
          messagePlaceholder: 'Berätta om ert projekt...',
          submit: 'Skicka',
          validationName: 'Namnet måste vara minst 2 tecken.',
          validationEmail: 'Ange en giltig e-postadress.',
          validationMessage: 'Meddelandet måste vara minst 10 tecken.',
        }
      : {
          title: "Let's Build Together",
          description: "Have a project in mind or just want to learn more about our services? We'd love to hear from you.",
          cta: 'Request a Demo',
          sentTitle: 'Message Sent!',
          sentDescription: 'Thank you for contacting us. We will get back to you shortly.',
          name: 'Name',
          company: 'Company',
          email: 'Email',
          projectDescription: 'Project Description',
          namePlaceholder: 'John Doe',
          companyPlaceholder: 'Your Company',
          emailPlaceholder: 'john.doe@example.com',
          messagePlaceholder: 'Tell us about your project...',
          submit: 'Submit',
          validationName: 'Name must be at least 2 characters.',
          validationEmail: 'Please enter a valid email address.',
          validationMessage: 'Message must be at least 10 characters.',
        };
  const formSchema = useMemo(
    () =>
      z.object({
        name: z.string().min(2, { message: copy.validationName }),
        company: z.string().optional(),
        email: z.string().email({ message: copy.validationEmail }),
        projectDescription: z.string().min(10, { message: copy.validationMessage }),
      }),
    [copy.validationEmail, copy.validationMessage, copy.validationName]
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      projectDescription: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const result = await sendContactEmail({
      name: values.name,
      company: values.company,
      email: values.email,
      message: values.projectDescription,
    });

    toast({
      title: result.success ? 'Message Sent' : 'Message not sent',
      description: result.message,
      variant: result.success ? 'default' : 'destructive',
    });

    if (result.success) {
      form.reset();
    }
  }

  return (
    <motion.section 
        id="contact" 
        className="w-full py-12 md:py-16 lg:py-20"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-24">
          <div className="space-y-6">
            <h2 className="font-headline text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-primary">
              {copy.title}
            </h2>
            <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              {copy.description}
            </p>
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-4">
                    <Mail className="h-6 w-6 text-accent"/>
                <a href={`mailto:${companyContact.email}`} className="text-lg hover:text-primary transition-colors">{companyContact.email}</a>
                </div>
                <div className="flex items-center gap-4">
                    <Phone className="h-6 w-6 text-accent"/>
                <a href={companyContact.phoneHref} className="text-lg hover:text-primary transition-colors">{companyContact.phone}</a>
                </div>
                <div className="flex items-center gap-4">
                    <MapPin className="h-6 w-6 text-accent"/>
                <span className="text-lg">{companyContact.address}</span>
                </div>
            </div>
          </div>
          <div className="w-full">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                  name="projectDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{copy.projectDescription}</FormLabel>
                      <FormControl>
                        <Textarea placeholder={copy.messagePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {copy.submit}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

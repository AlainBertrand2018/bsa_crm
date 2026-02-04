"use client";
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bot, Lightbulb, Zap, AlertTriangle } from 'lucide-react';
// AI Flow import removed to prevent bundling for deployment troubleshooting
// import { suggestProductConfiguration, type SuggestProductConfigurationInput, type SuggestProductConfigurationOutput } from '@/ai/flows/suggest-product-configuration';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from '@/components/ui/skeleton';

// Define types here as import is commented out
type SuggestProductConfigurationOutput = { suggestedConfiguration: string; reasoning: string };
// type SuggestProductConfigurationInput = { numberOfAttendees: number; spaceRequirements: string; budget: number; };


const suggestionFormSchema = z.object({
  numberOfAttendees: z.coerce.number().min(1, "Number of attendees is required").max(100000, "Too many attendees"),
  spaceRequirements: z.string().min(1, "Space requirement is required (e.g., small, medium, large)"),
  budget: z.coerce.number().min(1000, "Budget must be at least 1000").max(10000000, "Budget too high for typical products"),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

export default function AiSuggestionPage() {
  const [suggestionResult, setSuggestionResult] = useState<SuggestProductConfigurationOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SuggestionFormValues>({
    resolver: zodResolver(suggestionFormSchema),
    defaultValues: {
      numberOfAttendees: 100,
      spaceRequirements: 'medium',
      budget: 50000,
    },
  });

  async function onSubmit(data: SuggestionFormValues) {
    setIsLoading(true);
    setSuggestionResult(null);

    toast({
      title: "Feature Temporarily Unavailable",
      description: "AI suggestions are currently disabled. Please try again later.",
      variant: "destructive",
      duration: 5000,
    });

    // Simulate a short delay and set a placeholder message
    await new Promise(resolve => setTimeout(resolve, 500));
    setSuggestionResult({
      suggestedConfiguration: "AI Suggestion feature is temporarily disabled for maintenance.",
      reasoning: "We are working to restore this feature. Please check back soon."
    });

    setIsLoading(false);
  }

  return (
    <>
      <PageHeader
        title="AI Product Suggestion Tool"
        description="Get an AI-powered recommendation for the optimal product configuration based on client needs."
      />
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Service Notice</AlertTitle>
        <AlertDescription>
          The AI Suggestion feature is temporarily unavailable. We are working to restore it.
        </AlertDescription>
      </Alert>
      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> Client Requirements</CardTitle>
            <CardDescription>Enter the client's details to get a suggestion.</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="numberOfAttendees"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Attendees</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 500" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spaceRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Space Requirements</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select space size" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="small">Small (e.g., 9-18m²)</SelectItem>
                          <SelectItem value="medium">Medium (e.g., 18-50m²)</SelectItem>
                          <SelectItem value="large">Large (e.g., 50m²+)</SelectItem>
                          <SelectItem value="flexible">Flexible</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (MUR)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 100000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                  {isLoading ? <Zap className="mr-2 h-4 w-4 animate-pulse" /> : <Lightbulb className="mr-2 h-4 w-4" />}
                  {isLoading ? 'Getting Suggestion...' : 'Get Suggestion (Temporarily Disabled)'}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>

        <div className="md:col-span-2">
          {isLoading && (
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> AI Suggestion</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-1/2 mt-4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          )}
          {!isLoading && suggestionResult && (
            <Card className="shadow-xl animate-in fade-in duration-500">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Bot className="h-6 w-6 text-primary" /> AI Suggestion Result</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Alert className="bg-primary/10 border-primary/30">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <AlertTitle className="text-primary font-semibold">Suggested Configuration</AlertTitle>
                  <AlertDescription className="text-primary/80">
                    {suggestionResult.suggestedConfiguration}
                  </AlertDescription>
                </Alert>
                <div>
                  <h4 className="font-semibold text-lg mb-2 text-foreground">Reasoning:</h4>
                  <p className="text-muted-foreground whitespace-pre-wrap">{suggestionResult.reasoning}</p>
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground">This suggestion is AI-generated and should be reviewed by an expert.</p>
              </CardFooter>
            </Card>
          )}
          {!isLoading && !suggestionResult && (
            <Card className="shadow-xl h-full flex flex-col items-center justify-center text-center p-8 bg-card/70">
              <Bot className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-primary mb-2">Ready for a Suggestion?</h3>
              <p className="text-muted-foreground max-w-sm">
                Fill in the client's requirements on the left. <br /> (Note: This AI feature is temporarily unavailable).
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

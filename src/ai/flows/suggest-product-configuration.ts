'use server';

/**
 * @fileOverview Provides AI-powered suggestions for optimal product configurations based on client needs.
 *
 * - suggestProductConfiguration - A function that suggests product configurations.
 * - SuggestProductConfigurationInput - The input type for the suggestProductConfiguration function.
 * - SuggestProductConfigurationOutput - The return type for the suggestProductConfiguration function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestProductConfigurationInputSchema = z.object({
    numberOfAttendees: z
        .number()
        .describe('The estimated number of attendees the client expects.'),
    spaceRequirements: z
        .string()
        .describe('The client’s space requirements (e.g., small, medium, large).'),
    budget: z.number().describe('The client’s budget in MUR.'),
});
export type SuggestProductConfigurationInput = z.infer<
    typeof SuggestProductConfigurationInputSchema
>;

const SuggestProductConfigurationOutputSchema = z.object({
    suggestedConfiguration: z
        .string()
        .describe('The AI-suggested product configuration based on the input parameters.'),
    reasoning: z
        .string()
        .describe('The AI’s reasoning for the suggested configuration.'),
});
export type SuggestProductConfigurationOutput = z.infer<
    typeof SuggestProductConfigurationOutputSchema
>;

export async function suggestProductConfiguration(
    input: SuggestProductConfigurationInput
): Promise<SuggestProductConfigurationOutput> {
    return suggestProductConfigurationFlow(input);
}

const prompt = ai.definePrompt({
    name: 'suggestProductConfigurationPrompt',
    input: { schema: SuggestProductConfigurationInputSchema },
    output: { schema: SuggestProductConfigurationOutputSchema },
    prompt: `You are an expert in exhibition product configurations.
Given the following information about a potential client, suggest an optimal product configuration and explain your reasoning.

Number of Attendees: {{{numberOfAttendees}}}
Space Requirements: {{{spaceRequirements}}}
Budget (MUR): {{{budget}}}

Consider the available product types and their pricing:

Type of Product | Number available | Minimum Area | Unit Price (MUR) | Remarks
---|---|---|---|---
SME Skybridge | 60 | 9m² | 15,000.00 |
Souk Zone | 14 | 9m² | 45,000.00 |
Regional Pavillons | 6 | <200m² - 15 Products Max | 1,200,000.00
Main Expo | 30 | 9m² | 90,000.00
Foodcourt Cooking Stations | 12 | 9m² | 20,000.00 | Revenue sharing 70/30
Gastronomic Pavillons | 3 | <300m² | 1,400,000 |

Provide a configuration suggestion and explain your reasoning, making sure to stay within the client's budget. Focus on maximizing value for the client, given their constraints.
`,
});

const suggestProductConfigurationFlow = ai.defineFlow(
    {
        name: 'suggestProductConfigurationFlow',
        inputSchema: SuggestProductConfigurationInputSchema,
        outputSchema: SuggestProductConfigurationOutputSchema,
    },
    async input => {
        const { output } = await prompt(input);
        return output!;
    }
);

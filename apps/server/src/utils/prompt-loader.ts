/**
 * Prompt Loader Utility
 * Loads prompt sets from JSON file for word-picture choice game
 */

import promptsData from "../data/prompts.json";

export interface Option {
  id: string;
  imageUrl: string;
  isCorrect: boolean;
}

export interface Prompt {
  id: string;
  word: string;
  options: Option[];
}

export interface PromptSet {
  id: string;
  name: string;
  difficulty: "easy" | "medium" | "hard";
  prompts: Prompt[];
}

interface PromptsData {
  promptSets: PromptSet[];
}

/**
 * Load a specific prompt set by ID
 * @param id - The prompt set ID
 * @returns The prompt set
 * @throws Error if prompt set not found
 */
export function loadPromptSet(id: string): PromptSet {
  const data = promptsData as PromptsData;
  const set = data.promptSets.find((s) => s.id === id);
  
  if (!set) {
    throw new Error(`Prompt set "${id}" not found`);
  }
  
  return set;
}

/**
 * Get the default prompt set ID
 * @returns The ID of the first prompt set (default)
 */
export function getDefaultPromptSetId(): string {
  const data = promptsData as PromptsData;
  
  if (data.promptSets.length === 0) {
    throw new Error("No prompt sets available");
  }
  
  const firstSet = data.promptSets[0];
  if (!firstSet) {
    throw new Error("No prompt sets available");
  }
  
  return firstSet.id;
}

/**
 * Get all available prompt sets
 * @returns Array of all prompt sets
 */
export function getAllPromptSets(): PromptSet[] {
  const data = promptsData as PromptsData;
  return data.promptSets;
}

/**
 * Get a specific prompt from a prompt set
 * @param promptSetId - The prompt set ID
 * @param promptIndex - The index of the prompt in the set
 * @returns The prompt at the specified index
 * @throws Error if prompt set or prompt not found
 */
export function getPrompt(promptSetId: string, promptIndex: number): Prompt {
  const promptSet = loadPromptSet(promptSetId);
  
  if (promptIndex < 0 || promptIndex >= promptSet.prompts.length) {
    throw new Error(
      `Prompt index ${promptIndex} out of range for set "${promptSetId}" ` +
      `(total: ${promptSet.prompts.length})`
    );
  }
  
  const prompt = promptSet.prompts[promptIndex];
  if (!prompt) {
    throw new Error(`Prompt at index ${promptIndex} not found`);
  }
  
  return prompt;
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param array - The array to shuffle
 * @returns A new shuffled array
 */
export function shuffleArray<T>(array: readonly T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const jItem = shuffled[j];
    if (temp !== undefined && jItem !== undefined) {
      shuffled[i] = jItem;
      shuffled[j] = temp;
    }
  }
  return shuffled;
}

/**
 * Shuffle the options within a prompt (for variety)
 * @param prompt - The prompt to shuffle
 * @returns A new prompt with shuffled options
 */
export function shufflePromptOptions(prompt: Prompt): Prompt {
  return {
    ...prompt,
    options: shuffleArray(prompt.options),
  };
}

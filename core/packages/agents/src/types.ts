export interface FioraAgent {
  name: string;
  description: string;
  systemPrompt: string;
  allowedTools: string[];
  speakingStyle: string;
  temperature: number;
}

// Exportar os mesmos tipos que existem em app/utils/types.ts

// Define the structure of a chat message
export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

// Define the structure of a chat
export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  messages: Message[];
}

// Define the structure for user settings
export type UserSettings = {
  id: string;
  name: string;
  email: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'medium' | 'large';
  notifications: boolean;
};

// Define the structure for uploaded files
export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: number;
  analysis: string;
};

// Define the structure for file information
export interface FileInfo {
  fileName: string;
  fileType: string;
  fileContent?: string;
  timestamp?: number;
}

export interface AgentContext {
  recentMessages: Message[];
  intent?: string;
}

export type Intent = 'criar_plano' | 'analisar_material' | 'tecnicas_estudo' | 'gerar_quiz' | 'gerar_exame' | 'outro'; 
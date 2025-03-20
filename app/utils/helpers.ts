import { Chat, Message, FileInfo } from './types';
import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Local storage keys
const CHATS_KEY = 'chats';
const CURRENT_CHAT_KEY = 'currentChatId';

/**
 * Gera um ID único
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * Obtém todos os chats do localStorage
 */
export function getAllChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  
  const chatsJSON = localStorage.getItem(CHATS_KEY);
  if (!chatsJSON) return [];
  
  try {
    const chats = JSON.parse(chatsJSON) as any[];
    
    // Garantir que todos os chats têm a estrutura correta
    return chats.map(chat => ({
      id: chat.id || generateId(),
      title: chat.title || 'Conversa sem título',
      createdAt: chat.createdAt || chat.timestamp || Date.now(),
      messages: Array.isArray(chat.messages) ? chat.messages.map((msg: any) => ({
        id: msg.id || generateId(),
        role: msg.role || 'user',
        content: msg.content || '',
        timestamp: msg.timestamp || Date.now()
      })) : []
    }));
  } catch (e) {
    console.error('Erro ao analisar chats do localStorage', e);
    return [];
  }
}

/**
 * Salva os chats no localStorage
 */
export function saveChats(chats: Chat[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CHATS_KEY, JSON.stringify(chats));
}

/**
 * Cria um novo chat
 * @param title - Título opcional do chat (padrão: "Nova conversa")
 */
export function createChat(title: string = 'Nova conversa'): Chat {
  const chat: Chat = {
    id: generateId(),
    title,
    createdAt: Date.now(),
    messages: []
  };

  const chats = getAllChats();
  saveChats([...chats, chat]);
  setCurrentChatId(chat.id);
  
  return chat;
}

/**
 * Obtém um chat específico pelo ID
 * @param id - ID do chat
 */
export function getChatById(id: string): Chat | null {
  const chats = getAllChats();
  return chats.find(chat => chat.id === id) || null;
}

/**
 * Atualiza um chat existente
 * @param updatedChat - Chat atualizado
 */
export function updateChat(updatedChat: Chat): void {
  const chats = getAllChats();
  const index = chats.findIndex(chat => chat.id === updatedChat.id);
  
  if (index !== -1) {
    chats[index] = updatedChat;
    saveChats(chats);
  }
}

/**
 * Adiciona uma mensagem a um chat existente
 * @param chatId - ID do chat
 * @param role - Papel da mensagem ('user', 'assistant' ou 'system')
 * @param content - Conteúdo da mensagem
 */
export function addMessage(chatId: string, role: Message['role'], content: string): Message {
  const message: Message = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now()
  };

  const chats = getAllChats();
  const chatIndex = chats.findIndex(chat => chat.id === chatId);

  if (chatIndex !== -1) {
    chats[chatIndex].messages.push(message);
    saveChats(chats);
  }

  return message;
}

/**
 * Remove um chat pelo ID
 * @param id - ID do chat a ser removido
 */
export function deleteChat(id: string): void {
  const chats = getAllChats();
  const filteredChats = chats.filter(chat => chat.id !== id);
  saveChats(filteredChats);
  
  // Se o chat atual for removido, limpar o ID atual ou definir o primeiro chat
  if (getCurrentChatId() === id) {
    if (filteredChats.length > 0) {
      setCurrentChatId(filteredChats[0].id);
    } else {
      clearCurrentChatId();
    }
  }
  
  // Remover arquivo associado, se houver
  localStorage.removeItem(`file_${id}`);
}

/**
 * Obtém o ID do chat atual
 */
export function getCurrentChatId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_CHAT_KEY);
}

/**
 * Define o ID do chat atual
 * @param id - ID do chat
 */
export function setCurrentChatId(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_CHAT_KEY, id);
}

/**
 * Limpa o ID do chat atual
 */
export function clearCurrentChatId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_CHAT_KEY);
}

/**
 * Salva informações sobre um arquivo enviado para um chat
 * @param chatId - ID do chat associado ao arquivo
 * @param fileInfo - Informações do arquivo
 */
export function addUploadedFile(chatId: string, fileInfo: FileInfo): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(`file_${chatId}`, JSON.stringify({
      ...fileInfo,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Erro ao salvar informações do arquivo:', error);
  }
}

/**
 * Obtém informações de um arquivo associado a um chat
 * @param chatId - ID do chat
 * @returns Informações do arquivo ou null se não existir
 */
export function getUploadedFile(chatId: string): FileInfo | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const fileJson = localStorage.getItem(`file_${chatId}`);
    if (!fileJson) return null;
    
    return JSON.parse(fileJson) as FileInfo;
  } catch (error) {
    console.error('Erro ao obter informações do arquivo:', error);
    return null;
  }
}

/**
 * Concatena classes condicionalmente (similar ao classnames ou clsx)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 
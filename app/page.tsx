'use client';

import { useState, useEffect } from 'react';
import Chat from './components/Chat';
import Sidebar from './components/Sidebar';
import { getCurrentChatId, getAllChats, createChat } from './utils/helpers';
import { Message, FileInfo } from './utils/types';

export default function Home() {
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);

  // Initialize the chat and load messages
  useEffect(() => {
    // Check if we have a current chat ID
    let chatId = getCurrentChatId();
    
    // If no current chat, create a new one
    if (!chatId) {
      const newChat = createChat();
      chatId = newChat.id;
    }
    
    // Get the chat by ID
    const chats = getAllChats();
    const currentChat = chats.find(chat => chat.id === chatId);
    
    // Set the current chat ID and messages
    setCurrentChatId(chatId);
    if (currentChat) {
      setMessages(currentChat.messages);
    }
  }, []);

  // Atualizar fileInfo quando for detectado um upload de imagem
  useEffect(() => {
    // Verificar as últimas mensagens para detectar uploads de imagens
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    
    // Se detectar padrão de upload de arquivo
    if (lastUserMessage && lastUserMessage.content.includes('Enviei um arquivo chamado')) {
      const fileNameMatch = lastUserMessage.content.match(/\"(.*?)\"/);
      
      if (fileNameMatch && fileNameMatch[1]) {
        const fileName = fileNameMatch[1];
        const fileType = fileName.toLowerCase().endsWith('.jpg') || 
                         fileName.toLowerCase().endsWith('.jpeg') || 
                         fileName.toLowerCase().endsWith('.png') || 
                         fileName.toLowerCase().endsWith('.heic') 
                         ? 'image/' + fileName.split('.').pop() 
                         : 'text/' + fileName.split('.').pop();
        
        // Se tiver mensagem do assistente e for uma imagem
        if (lastAssistantMessage && fileType.startsWith('image/')) {
          setFileInfo({
            fileName,
            fileType,
            fileContent: lastAssistantMessage.content
          });
        }
      }
    }
  }, [messages]);

  return (
    <main className="flex min-h-screen bg-white">
      {/* Mobile sidebar toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-20 p-2 bg-blue-600 text-white rounded-md shadow-md"
        onClick={() => setShowSidebar(!showSidebar)}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Sidebar on desktop */}
      <div className="hidden md:block md:w-64 md:min-w-64 md:border-r md:border-gray-200">
        <Sidebar 
          currentChatId={currentChatId} 
          setCurrentChatId={setCurrentChatId}
          setMessages={setMessages}
          setShowSidebar={setShowSidebar}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`md:hidden fixed top-0 left-0 h-full z-20 transform ${
          showSidebar ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 ease-in-out`}
      >
        <Sidebar 
          currentChatId={currentChatId} 
          setCurrentChatId={setCurrentChatId}
          setMessages={setMessages}
          setShowSidebar={setShowSidebar}
        />
      </div>

      {/* Main content */}
      <div className="flex-1">
        <Chat
          currentChatId={currentChatId}
          messages={messages}
          setMessages={setMessages}
          fileInfo={fileInfo}
        />
      </div>
    </main>
  );
}

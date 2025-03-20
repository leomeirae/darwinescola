'use client';

import { useState, useEffect } from 'react';
import { Chat } from '../utils/types';
import { getAllChats, createChat, deleteChat, setCurrentChatId } from '../utils/helpers';

interface SidebarProps {
  currentChatId: string | null;
  setCurrentChatId: (id: string) => void;
  setMessages: (messages: any[]) => void;
  setShowSidebar: (show: boolean) => void;
}

export default function Sidebar({ 
  currentChatId, 
  setCurrentChatId: updateCurrentChat, 
  setMessages, 
  setShowSidebar 
}: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);

  // Load chats from localStorage
  useEffect(() => {
    setChats(getAllChats());
  }, []);

  // Create a new chat
  const handleNewChat = () => {
    const newChat = createChat();
    setChats([newChat, ...chats.filter(chat => chat.id !== newChat.id)]);
    updateCurrentChat(newChat.id);
    setMessages([]);
    setShowSidebar(false);
  };

  // Select a chat
  const handleSelectChat = (chatId: string) => {
    updateCurrentChat(chatId);
    setCurrentChatId(chatId);
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
    }
    setShowSidebar(false);
  };

  // Delete a chat
  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    deleteChat(chatId);
    
    // Update the chats list
    setChats(chats.filter(chat => chat.id !== chatId));
    
    // If the deleted chat was the current one, select another chat
    if (currentChatId === chatId) {
      const remainingChats = chats.filter(chat => chat.id !== chatId);
      if (remainingChats.length > 0) {
        handleSelectChat(remainingChats[0].id);
      } else {
        // If no chats remain, create a new one
        handleNewChat();
      }
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      <div className="p-4">
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-blue-700 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
          Nova Conversa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 text-sm text-gray-500 font-medium py-2">Conversas</div>
        {chats.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-500 italic">
            Sem conversas. Inicie uma nova conversa.
          </div>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <div
                  onClick={() => handleSelectChat(chat.id)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between overflow-hidden group cursor-pointer ${
                    currentChatId === chat.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100 text-gray-700'
                  } rounded mx-1 transition-colors`}
                >
                  <div className="truncate flex-1">
                    <span className="block truncate font-medium">
                      {chat.title}
                    </span>
                    <span className="block text-xs text-gray-500 truncate">
                      {formatDate(chat.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteChat(e, chat.id)}
                    className={`ml-2 text-gray-400 hover:text-gray-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="text-sm text-gray-500 text-center">
          Darwin School © 2025
        </div>
      </div>
    </div>
  );
} 
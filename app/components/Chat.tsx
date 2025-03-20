'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Message } from '../utils/types';
import { addMessage, getChatById, createChat, updateChat } from '../utils/helpers';
import FileUpload from './FileUpload';
import { Intent } from '../utils/router';
import Quiz from './Quiz';
import { QuizData } from '@/app/utils/quizGenerator';
import { FileInfo } from '@/app/utils/types';
import { Button } from './Button';

// Estilos para melhorar formatação das mensagens
const styleTag = `
  .assistant-message {
    color: #111827;
    font-weight: 450;
  }
  
  .assistant-message strong {
    display: inline-block;
    margin-top: 0.5rem;
    margin-bottom: 0.2rem;
    font-weight: 600;
    color: #000;
  }
  
  /* Melhorar formatação de tópicos numerados */
  .assistant-message p {
    margin-bottom: 0.75rem;
  }
  
  .assistant-message ol {
    margin-top: 1rem;
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  
  .assistant-message ol li {
    margin-bottom: 0.75rem;
    padding-left: 0.5rem;
    font-weight: normal;
  }
  
  .assistant-message ol li strong {
    display: inline;
    font-weight: 600;
  }
  
  /* Formatação para tópicos numerados no texto plano */
  .assistant-message div[data-numbered-item="true"] {
    display: block;
    padding-left: 1.5rem;
    margin-bottom: 0.75rem;
    position: relative;
  }
  
  .assistant-message div[data-numbered-item="true"]::before {
    content: attr(data-number) ".";
    position: absolute;
    left: 0;
    font-weight: 600;
  }
  
  .assistant-message div {
    margin-bottom: 0.75rem;
  }
  
  /* Estilos para melhorar a visualização do texto na caixa de digitação */
  textarea::placeholder {
    color: #6B7280 !important;
    opacity: 1 !important;
  }
  
  textarea {
    color: #111827 !important;
    font-weight: 500 !important;
  }
`;

interface ChatProps {
  currentChatId: string | null;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  fileInfo?: FileInfo | null;
}

export default function Chat({ currentChatId, messages, setMessages, fileInfo }: ChatProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentIntent, setCurrentIntent] = useState<Intent | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizType, setQuizType] = useState<'quiz' | 'exam'>('quiz');
  const formRef = useRef<HTMLFormElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentChatId) return;

    // Add user message
    const userMessage = {
      id: generateMessageId(),
      role: 'user' as const,
      content: input
    };
    setMessages([...messages, userMessage]);
    addMessage(currentChatId, userMessage.role, userMessage.content);
    setInput('');
    setIsLoading(true);
    setCurrentIntent(null);

    try {
      // Get the current chat to update its title if it's the first message
      const chat = getChatById(currentChatId);
      if (!chat) {
        throw new Error('Chat não encontrado');
      }
      
      if (chat && chat.messages.length === 0) {
        // Update chat title based on first message
        const title = input.length > 30 ? input.substring(0, 30) + '...' : input;
        updateChat({ ...chat, title });
      }

      // Send message to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(msg => ({ role: msg.role, content: msg.content })),
            { role: 'user', content: input }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro na resposta da API:', errorData);
        throw new Error(`Erro ao obter resposta (${response.status}): ${errorData || 'Sem detalhes'}`);
      }

      // Get thought process and intent from headers
      const intent = response.headers.get('X-Intent') as Intent | null;
      
      // Save current intent
      if (intent) {
        setCurrentIntent(intent);
      }

      // Read the streaming response
      const reader = response.body?.getReader();
      if (!reader) throw new Error('O corpo da resposta não está disponível para leitura');

      // Create a temporary message object
      const assistantMessage = addMessage(currentChatId, 'assistant', '');
      let currentMessages = [...messages, userMessage];
      setMessages(currentMessages);

      let accumulatedContent = '';
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Decode and accumulate the chunk
          const chunk = new TextDecoder().decode(value);
          
          // Adicionar o chunk diretamente, pois agora é texto puro
          accumulatedContent += chunk;
          
          // Update the assistant message in real-time
          const updatedMessages = [
            ...currentMessages,
            { ...assistantMessage, content: accumulatedContent }
          ];
          setMessages(updatedMessages);
        }
        
        // Final update to the message in localStorage
        addMessage(currentChatId, 'assistant', accumulatedContent);
      } catch (streamError) {
        console.error('Erro ao ler stream da resposta:', streamError);
        // Update the message with error information
        const errorMessage = 'Ocorreu um erro ao receber a resposta completa. Por favor, tente novamente.';
        const updatedMessages = [
          ...currentMessages,
          { ...assistantMessage, content: errorMessage }
        ];
        setMessages(updatedMessages);
        addMessage(currentChatId, 'assistant', errorMessage);
      }
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage = error instanceof Error 
        ? `Desculpe, encontrei um erro: ${error.message}` 
        : 'Desculpe, ocorreu um erro inesperado. Por favor, tente novamente.';
      
      const errorAssistantMessage = addMessage(currentChatId, 'assistant', errorMessage);
      setMessages([...messages, userMessage, errorAssistantMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const append = (message: Message) => {
    setMessages(prev => [...prev, message]);
    if (currentChatId) {
      addMessage(currentChatId, message.role, message.content);
    }
  };

  // Função para lidar com upload de arquivo
  const handleFileUploadComplete = (analysis: string) => {
    setShowFileUpload(false);
    
    if (!currentChatId) return;
    
    // Adicionar a análise como uma mensagem do assistente
    const assistantMessage = {
      id: generateMessageId(),
      role: 'assistant' as const,
      content: analysis
    };
    setMessages([...messages, assistantMessage]);
    addMessage(currentChatId, assistantMessage.role, assistantMessage.content);
    
    // Se a análise menciona uma imagem, podemos assumir que é um upload de imagem
    if (analysis.includes('imagem') && analysis.includes('recebeu')) {
      // Podemos mostrar uma mensagem de ajuda adicional para o usuário
      setTimeout(() => {
        const tipMessage = addMessage(
          currentChatId,
          'system',
          'Dica: Você pode pedir ao assistente para analisar elementos da imagem ou criar materiais de estudo com base nela.'
        );
        setMessages(prevMessages => [...prevMessages, tipMessage]);
      }, 1500);
    }
  };

  // Atualizar função formatTime para lidar com timestamp possivelmente undefined
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Verificar se o usuário está tentando gerar um quiz ou exame com base no intent
  useEffect(() => {
    if (fileInfo && fileInfo.fileContent && currentIntent) {
      if (currentIntent === 'gerar_quiz' || currentIntent === 'gerar_exame') {
        setQuizType(currentIntent === 'gerar_quiz' ? 'quiz' : 'exam');
        generateQuiz(currentIntent === 'gerar_quiz' ? 'quiz' : 'exam');
      }
    }
  }, [currentIntent, fileInfo]);

  const generateQuiz = async (type: 'quiz' | 'exam') => {
    if (!fileInfo || !fileInfo.fileContent) {
      console.error('Sem conteúdo disponível para gerar quiz');
      return;
    }

    setQuizLoading(true);
    
    try {
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: fileInfo.fileContent,
          type: type,
          numQuestions: type === 'quiz' ? 5 : 10,
          difficulty: 'médio'
        }),
      });

      if (!response.ok) {
        throw new Error('Falha ao gerar quiz');
      }

      const data = await response.json();
      setQuizData(data);
      setShowQuiz(true);
    } catch (error) {
      console.error('Erro ao gerar quiz:', error);
      append({
        id: generateMessageId(),
        role: 'assistant',
        content: 'Desculpe, não foi possível gerar o quiz neste momento. Por favor, tente novamente mais tarde.'
      });
    } finally {
      setQuizLoading(false);
    }
  };

  const handleQuizGeneration = (type: 'quiz' | 'exam') => {
    setQuizType(type);
    generateQuiz(type);
  };

  const showImageMessage = fileInfo && fileInfo.fileType && fileInfo.fileType.startsWith('image/');

  // Função para gerar ID único
  const generateMessageId = () => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Adicionar estilos CSS para a formatação das mensagens */}
      <style dangerouslySetInnerHTML={{ __html: styleTag }} />
      
      {/* Message history */}
      <div className="flex-1 overflow-y-auto p-4 bg-white">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-2xl">
              <h1 className="text-2xl font-bold mb-2 text-gray-800">Assistente de Plano de Estudos</h1>
              <p className="text-gray-700 mb-4">
                Olá! Sou seu assistente de aprendizagem. Selecione uma das opções abaixo ou digite sua pergunta para começarmos.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div 
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => setInput("Você pode me ajudar a criar um plano de estudos para minha próxima prova?")}
                >
                  <h3 className="font-medium text-gray-800">Criar um Plano de Estudos</h3>
                  <p className="text-sm text-gray-700">Obtenha um plano personalizado baseado em seus objetivos e tempo disponível</p>
                </div>
                <div 
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => setShowFileUpload(true)}
                >
                  <h3 className="font-medium text-gray-800">Enviar Materiais de Estudo</h3>
                  <p className="text-sm text-gray-700">Analise suas anotações, livros ou slides para melhor compreensão</p>
                </div>
                <div 
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => setInput("Quais são as técnicas de estudo mais eficazes para retenção de longo prazo?")}
                >
                  <h3 className="font-medium text-gray-800">Técnicas de Estudo</h3>
                  <p className="text-sm text-gray-700">Aprenda sobre métodos eficazes para melhorar a retenção e compreensão</p>
                </div>
                <div 
                  className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-left cursor-pointer hover:bg-gray-100"
                  onClick={() => setInput("Você pode criar um teste prático para mim com base no meu material de curso?")}
                >
                  <h3 className="font-medium text-gray-800">Gerar Testes Práticos</h3>
                  <p className="text-sm text-gray-700">Obtenha questões práticas personalizadas para testar seu conhecimento</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.role === 'system'
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 shadow-sm'
                      : 'bg-gray-50 text-gray-800 border border-gray-200 shadow-sm'
                  }`}
                >
                  <div 
                    className="whitespace-pre-wrap leading-relaxed space-y-2"
                    style={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.6'
                    }}
                  >
                    {message.role === 'assistant' ? (
                      <div className="assistant-message">
                        {(() => {
                          // Processar texto para melhorar formatação
                          let content = message.content;
                          
                          // Detectar e formatar itens numerados no texto
                          const numberedItemRegex = /^\s*(\d+)[\.\)]\s+(.+)$/gm;
                          content = content.replace(numberedItemRegex, '<div data-numbered-item="true" data-number="$1">$2</div>');
                          
                          // Processar quebras de linha e parágrafos
                          const paragraphs = content.split('\n\n');
                          
                          return (
                            <>
                              {paragraphs.map((paragraph, i) => {
                                // Verificar se o parágrafo já contém elementos formatados
                                if (paragraph.includes('<div data-numbered-item="true"')) {
                                  return <div key={i} dangerouslySetInnerHTML={{ __html: paragraph }} />;
                                }
                                
                                // Para parágrafos normais
                                return (
                                  <div key={i} className="mb-3">
                                    {paragraph.split('\n').map((line, j) => {
                                      // Formatar marcadores de lista e outros elementos especiais
                                      if (line.startsWith('•') || line.startsWith('-')) {
                                        return (
                                          <div 
                                            key={j} 
                                            className="pl-4 mb-1" 
                                            dangerouslySetInnerHTML={{ 
                                              __html: line || '&nbsp;' 
                                            }} 
                                          />
                                        );
                                      }
                                      
                                      // Formatar linhas normais
                                      return (
                                        <div 
                                          key={j} 
                                          className="font-normal"
                                          dangerouslySetInnerHTML={{ 
                                            __html: line || '&nbsp;' 
                                          }} 
                                        />
                                      );
                                    })}
                                  </div>
                                );
                              })}
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      message.content.split('\n').map((line, i) => (
                        <React.Fragment key={i}>
                          {line}
                          {i < message.content.split('\n').length - 1 && <br />}
                        </React.Fragment>
                      ))
                    )}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.role === 'user'
                        ? 'text-blue-100'
                        : message.role === 'system'
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))}

            {showImageMessage && (
              <div className="my-6 p-5 bg-blue-50 rounded-xl border border-blue-200 shadow-sm">
                <p className="text-sm font-medium text-blue-800 mb-3">
                  Uma imagem foi processada. O que você gostaria de fazer com este conteúdo?
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button 
                    onClick={() => append({
                      id: generateMessageId(),
                      role: 'user',
                      content: 'Crie um plano de estudos baseado nesta imagem'
                    })}
                    variant="outline" 
                    size="sm"
                  >
                    Criar plano de estudos
                  </Button>
                  <Button 
                    onClick={() => handleQuizGeneration('quiz')}
                    variant="outline" 
                    size="sm"
                  >
                    Gerar quiz
                  </Button>
                  <Button 
                    onClick={() => handleQuizGeneration('exam')}
                    variant="outline" 
                    size="sm"
                  >
                    Simular exame
                  </Button>
                  <Button 
                    onClick={() => append({
                      id: generateMessageId(),
                      role: 'user',
                      content: 'Faça um resumo do conteúdo desta imagem'
                    })}
                    variant="outline" 
                    size="sm"
                  >
                    Resumir conteúdo
                  </Button>
                </div>
              </div>
            )}
            
            {quizLoading && (
              <div className="flex justify-center items-center my-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-3 text-blue-500">
                  {quizType === 'quiz' ? 'Gerando quiz...' : 'Gerando exame simulado...'}
                </span>
              </div>
            )}
            
            {showQuiz && quizData && (
              <div className="my-4">
                <Quiz 
                  quizData={quizData} 
                  onComplete={() => {
                    setShowQuiz(false);
                    append({
                      id: generateMessageId(),
                      role: 'assistant',
                      content: `Excelente trabalho completando o ${quizType === 'quiz' ? 'quiz' : 'exame simulado'}! Você tem mais alguma dúvida ou gostaria de experimentar outra atividade de estudo?`
                    });
                  }}
                />
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* File upload section */}
      {showFileUpload && (
        <FileUpload 
          currentChatId={currentChatId}
          setShowFileUpload={setShowFileUpload}
          setMessages={setMessages}
        />
      )}

      {/* Input area */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="flex items-end"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Digite sua mensagem..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800"
              rows={input.split('\n').length > 2 ? Math.min(input.split('\n').length, 5) : 2}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowFileUpload(true)}
              className="absolute bottom-3 right-14 text-blue-500 hover:text-blue-700"
              title="Enviar arquivo"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                />
              </svg>
            </button>
          </div>
          <button
            type="submit"
            className="ml-2 p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-t-2 border-blue-200 border-solid rounded-full animate-spin"></div>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
} 
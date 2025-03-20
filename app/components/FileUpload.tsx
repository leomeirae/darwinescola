'use client';

import { useState, useRef } from 'react';
import { Message } from '@/app/utils/types';
import { addMessage } from '@/app/utils/helpers';

// Lista de tipos MIME permitidos
const ALLOWED_IMAGE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/heic'
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf', 
  'text/plain', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown'
];

// Tamanho máximo de arquivo (5MB em bytes)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Número máximo de arquivos permitidos
const MAX_FILES = 5;

interface FileUploadProps {
  currentChatId: string | null;
  setShowFileUpload: (show: boolean) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function FileUpload({ currentChatId, setShowFileUpload, setMessages }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const isFileTypeAllowed = (file: File): boolean => {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    // Verificar tipos MIME
    if (ALLOWED_IMAGE_TYPES.includes(fileType) || ALLOWED_DOCUMENT_TYPES.includes(fileType)) {
      return true;
    }
    
    // Verificar extensões de arquivo
    const extensions = ['.pdf', '.txt', '.docx', '.md', '.jpg', '.jpeg', '.png', '.heic'];
    return extensions.some(ext => fileName.endsWith(ext));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);
    setSuccessMessage(null);
    setUploadProgress(0);
    
    if (selectedFiles.length === 0) {
      return;
    }
    
    try {
      // Verificar se existem arquivos
      if (selectedFiles.length === 0) {
        throw new Error('Nenhum arquivo selecionado.');
      }
      
      // Verificar se não excede o limite máximo de arquivos
      if (selectedFiles.length > MAX_FILES) {
        throw new Error(`Você pode enviar no máximo ${MAX_FILES} arquivos por vez.`);
      }
      
      // Validar cada arquivo
      const validatedFiles: File[] = [];
      
      for (const file of selectedFiles) {
        // Verificar o tipo de arquivo
        if (!isFileTypeAllowed(file)) {
          throw new Error(`Formato de arquivo não suportado: ${file.name}. Use PDF, TXT, DOCX, MD, JPG, PNG ou HEIC.`);
        }
        
        // Verificar o tamanho do arquivo
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`O arquivo ${file.name} é muito grande. O tamanho máximo é ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
        }
        
        // Verificar se o arquivo está vazio
        if (file.size === 0) {
          throw new Error(`O arquivo ${file.name} está vazio.`);
        }
        
        validatedFiles.push(file);
      }
      
      setFiles(validatedFiles);
    } catch (err: any) {
      console.error('Erro na validação dos arquivos:', err);
      setError(err.message || 'Erro ao validar os arquivos.');
      setFiles([]);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setError('Por favor, selecione pelo menos um arquivo para enviar.');
      return;
    }

    setLoading(true);
    setError(null);
    setUploadProgress(10); // Iniciar com 10% para feedback visual
    setCurrentFileIndex(0);

    try {
      // Array para armazenar todas as análises
      const allAnalyses: { fileName: string, analysis: string, fileInfo?: any }[] = [];
      
      // Processar cada arquivo sequencialmente
      for (let i = 0; i < files.length; i++) {
        setCurrentFileIndex(i);
        const file = files[i];
        
        // Calcular o progresso com base no arquivo atual
        const baseProgress = (i / files.length) * 100;
        
        // Simular progresso do upload para feedback ao usuário
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            const fileProgress = 90 / files.length;
            const maxProgress = baseProgress + fileProgress;
            
            if (prev >= maxProgress) {
              clearInterval(progressInterval);
              return maxProgress;
            }
            return prev + 2;
          });
        }, 200);
        
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
          throw new Error(errorData.error || `Erro ${response.status} ao processar ${file.name}: ${response.statusText}`);
        }

        const data = await response.json();

        // Verificar se a análise contém uma mensagem de erro
        if (data.analysis && (
          data.analysis.startsWith('Encontrei um erro') || 
          data.analysis.startsWith('I encountered an error') ||
          data.analysis.startsWith('Error:')
        )) {
          throw new Error(`Erro ao analisar o conteúdo de ${file.name}: ${data.analysis}`);
        }

        // Armazenar a análise para processamento posterior
        allAnalyses.push({
          fileName: file.name,
          analysis: data.analysis,
          fileInfo: data.fileInfo
        });
        
        // Armazenar informações do arquivo se disponíveis
        if (data.fileInfo && currentChatId) {
          localStorage.setItem(`file_${currentChatId}_${i}`, JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            timestamp: Date.now(),
            ...data.fileInfo
          }));
        }
      }
      
      // Processar todas as análises somente depois que todos os arquivos forem processados
      if (currentChatId && allAnalyses.length > 0) {
        // Adicionar a mensagem do usuário indicando que enviou os arquivos
        const fileNames = allAnalyses.map(a => a.fileName).join(", ");
        const userMessage = addMessage(
          currentChatId, 
          'user', 
          `Enviei ${allAnalyses.length} ${allAnalyses.length === 1 ? 'arquivo' : 'arquivos'} para análise: ${fileNames}`
        );
        setMessages(prev => [...prev, userMessage]);
        
        if (allAnalyses.length === 1) {
          // Se for apenas um arquivo, adicionar a análise diretamente
          const assistantMessage = addMessage(currentChatId, 'assistant', allAnalyses[0].analysis);
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // Se for múltiplos arquivos, criar uma mensagem combinada
          let combinedAnalysis = `# Análise de Múltiplos Arquivos\n\nAnalisei os ${allAnalyses.length} arquivos que você enviou. Aqui está uma visão geral:\n\n`;
          
          // Adicionar resumo de cada arquivo
          for (let i = 0; i < allAnalyses.length; i++) {
            const { fileName, analysis } = allAnalyses[i];
            // Extrair apenas o resumo inicial de cada análise (primeiros parágrafos)
            const summary = analysis.split('\n\n')[0];
            combinedAnalysis += `## ${fileName}\n${summary}\n\n`;
          }
          
          // Adicionar sugestões combinadas
          combinedAnalysis += `\n## Como posso ajudar com estes materiais?\n\nComo estes arquivos parecem estar relacionados, posso oferecer as seguintes opções:\n\n`;
          combinedAnalysis += `- Criar um plano de estudos integrado com base em todos os materiais\n`;
          combinedAnalysis += `- Gerar um quiz abrangente que teste o conhecimento de todos os tópicos abordados\n`;
          combinedAnalysis += `- Criar um resumo esquematizado combinando os conceitos principais\n`;
          combinedAnalysis += `- Elaborar um conjunto de flashcards para revisão\n`;
          combinedAnalysis += `- Simular um exame que integre todos os tópicos\n`;
          combinedAnalysis += `- Criar um mapa mental relacionando os conceitos de todos os materiais\n\n`;
          combinedAnalysis += `Por favor, me diga como gostaria de prosseguir com estes materiais.`;
          
          const assistantMessage = addMessage(currentChatId, 'assistant', combinedAnalysis);
          setMessages(prev => [...prev, assistantMessage]);
        }
      }
      
      setUploadProgress(100);
      setSuccessMessage(`${files.length} ${files.length === 1 ? 'arquivo processado' : 'arquivos processados'} com sucesso!`);
      
      // Fechar o modal após um curto atraso
      setTimeout(() => {
        setShowFileUpload(false);
      }, 1500);
      
    } catch (err: any) {
      console.error('Erro ao enviar arquivos:', err);
      setError(err instanceof Error ? err.message : 'Erro ao enviar os arquivos. Por favor, tente novamente.');
      setUploadProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Enviar Arquivos</h2>
          <button
            onClick={() => setShowFileUpload(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center mb-4 transition-all hover:border-blue-400">
          <input
            type="file"
            id="file-upload"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            accept=".pdf,.txt,.docx,.md,.jpg,.jpeg,.png,.heic"
            multiple
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer text-blue-600 hover:text-blue-800 flex flex-col items-center"
          >
            <svg className="w-10 h-10 mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
            <span className="text-base font-medium">Clique para selecionar arquivos</span>
          </label>
          <p className="text-sm text-gray-500 mt-2">
            Formatos suportados: PDF, TXT, DOCX, MD, JPG, PNG, HEIC (máx. 5MB por arquivo)
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Você pode selecionar até {MAX_FILES} arquivos por vez
          </p>
          
          {files.length > 0 && (
            <div className="mt-3 bg-blue-50 rounded-md text-left">
              <div className="p-3 border-b border-blue-100">
                <p className="font-medium text-blue-800">{files.length} {files.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}</p>
              </div>
              <ul className="max-h-52 overflow-y-auto">
                {files.map((file, index) => (
                  <li key={index} className="p-3 flex items-start justify-between hover:bg-blue-100">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB | {file.type || 'Tipo desconhecido'}
                      </p>
                    </div>
                    <button 
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remover arquivo"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 mr-2 flex-shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <p className="font-medium">Erro:</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-1">Sugestão: Verifique o formato e tamanho dos arquivos.</p>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <p>{successMessage}</p>
          </div>
        )}

        {loading && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-blue-700">
                {currentFileIndex + 1} de {files.length} - Processando {files[currentFileIndex]?.name}
              </span>
              <span className="text-sm font-medium text-blue-700">{Math.round(uploadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={() => setShowFileUpload(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleUpload}
            disabled={files.length === 0 || loading}
            className={`px-4 py-2 rounded-md text-white ${
              files.length === 0 || loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Processando...' : 'Enviar Arquivos'}
          </button>
        </div>
      </div>
    </div>
  );
} 
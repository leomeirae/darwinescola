import { NextRequest } from 'next/server';
import { generateThoughtProcess, generateStreamingResponse, Message, AgentContext } from '@/app/utils/llm';
import { detectIntent, getSpecializedPrompt } from '@/app/utils/router';

export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    const { messages } = body as { messages: Message[] };

    // Validate the request
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Requisição inválida. Array de mensagens é necessário.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter(msg => msg.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return new Response(JSON.stringify({ error: 'Nenhuma mensagem do usuário encontrada.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Detect user intent
    const intent = await detectIntent(lastUserMessage.content);
    
    // Get specialized prompt based on intent
    const specializedPrompt = getSpecializedPrompt(intent);
    
    // Generate thought process
    const context: AgentContext = {
      intent,
      recentMessages: messages.slice(-5) // últimas 5 mensagens para contexto
    };
    
    const thoughtProcess = await generateThoughtProcess(lastUserMessage.content, context);
    
    // Adicionar o prompt especializado no início dos mensagens para o model
    const messagesWithSpecializedPrompt = [
      {
        role: 'system' as const,
        content: specializedPrompt
      },
      ...messages
    ];
    
    // Generate the response using streaming
    try {
      // Iniciar o stream de resposta
      const streamResponse = await generateStreamingResponse(
        messagesWithSpecializedPrompt,
        lastUserMessage.content
      );
      
      // Criar headers para a resposta
      const headers = new Headers();
      headers.set('Content-Type', 'text/plain; charset=utf-8');
      headers.set('X-Thought-Process', encodeURIComponent(thoughtProcess));
      headers.set('X-Intent', intent);
      headers.set('Transfer-Encoding', 'chunked');
      
      // Criar um ReadableStream para processar e enviar os chunks
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Função para processar cada chunk do stream
            for await (const chunk of streamResponse.stream) {
              const text = chunk.text();
              
              if (text) {
                // Formatar o texto (pode ser feito por chunk ou acumulado)
                const formattedText = formatResponseText(text);
                
                // Enviar o texto formatado para o cliente
                controller.enqueue(new TextEncoder().encode(formattedText));
              }
            }
            
            // Finalizar o stream
            controller.close();
          } catch (error) {
            console.error('Erro ao processar stream:', error);
            controller.error(error);
          }
        }
      });
      
      // Retornar o stream
      return new Response(stream, {
        status: 200,
        headers
      });
      
    } catch (chatError) {
      console.error('Erro ao gerar resposta do chat:', chatError);
      return new Response(
        'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.',
        {
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
    }
    
  } catch (error) {
    console.error('Erro na API de chat:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Formata o texto de resposta para melhorar a apresentação
 * - Converte formatações markdown em HTML
 * - Melhora espaçamento entre tópicos e seções
 * - Garante consistência na formatação de negrito
 * - Formata listas e tópicos corretamente
 */
function formatResponseText(text: string): string {
  // Remover espaços desnecessários no início das linhas
  let formattedText = text.replace(/^ +/gm, '');
  
  // Normalizar quebras de linha (não mais que duas quebras seguidas)
  formattedText = formattedText.replace(/\n{3,}/g, '\n\n');
  
  // Adicionar espaço entre tópicos numerados para melhor legibilidade
  formattedText = formattedText.replace(/(\d+\..*)\n(\d+\.)/g, '$1\n\n$2');
  
  // Converter tópicos numerados em negrito e incluir quebra de linha adicional
  formattedText = formattedText.replace(/^(\d+\.)\s*(.*)/gm, '<strong class="numbered-topic" style="color:#000000; font-weight:700;">$1 $2</strong>');
  
  // Adicionar espaço entre perguntas e tópicos para melhor legibilidade 
  formattedText = formattedText.replace(/([\.\?])\n([A-Za-z])/g, '$1\n\n$2');
  
  // Substituir ** por tags HTML de negrito
  formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong style="color:#000000; font-weight:600;">$1</strong>');
  
  // Garantir que frases importantes terminem com quebra de linha dupla
  formattedText = formattedText.replace(/([\.\?\!])\n(?!\n)/g, '$1\n\n');
  
  // Padronizar marcadores de lista com espaçamento adequado
  formattedText = formattedText.replace(/^\* /gm, '• ');
  formattedText = formattedText.replace(/^- /gm, '• ');
  
  // Adicionar espaço extra antes de listas para melhor legibilidade
  formattedText = formattedText.replace(/([^•])\n(• )/g, '$1\n\n$2');
  
  // Remover espaços em branco no final das linhas
  formattedText = formattedText.replace(/\s+$/gm, '');
  
  return formattedText;
} 
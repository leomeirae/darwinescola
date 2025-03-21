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
  // Step 0: Trim the whole text to remove leading and trailing whitespace
  let formattedText = text.trim();

  // Step 1: Fix basic spacing and line breaks
  formattedText = formattedText
    // Remove extra spaces at start of lines
    .replace(/^ +/gm, '')
    // Fix multiple spaces
    .replace(/ +/g, ' ')
    // Fix emoji spacing
    .replace(/(\w)([\u{1F300}-\u{1F9FF}])/gu, '$1 $2')
    .replace(/([\u{1F300}-\u{1F9FF}])(\w)/gu, '$1 $2');

  // Step 2: Fix numbered lists
  formattedText = formattedText.replace(
    /^(\d+\.)\s*(.*?)$/gm,
    '<strong>$1</strong> $2'
  );

  // Step 3: Fix bold text
  formattedText = formattedText.replace(
    /\*\*(.*?)\*\*/g,
    '<strong>$1</strong>'
  );

  // Step 4: Fix paragraph spacing
  formattedText = formattedText
    // Ensure proper spacing between paragraphs
    .replace(/\n{3,}/g, '\n\n')
    // Add space after numbered items
    .replace(/(\d+\.\s*.*)\n(?!\n)/g, '$1\n\n')
    // Add space after punctuation marks if followed by text
    .replace(/([\.\?\!])\s*(?=\w)/g, '$1\n\n');

  // Step 5: Fix bullet points
  formattedText = formattedText
    .replace(/^[•\-]\s*/gm, '• ')
    .replace(/([^•])\n(• )/g, '$1\n\n$2');

  // Step 6: Final cleanup
  return formattedText
    // Remove any remaining double spaces
    .replace(/ +/g, ' ')
    // Ensure consistent line endings
    .replace(/\r\n/g, '\n')
    // Remove excessive empty lines
    .replace(/\n{3,}/g, '\n\n')
    // Final trim to ensure no leading/trailing whitespace
    .trim();
} 

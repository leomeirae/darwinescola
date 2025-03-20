import { GoogleGenerativeAI, GenerativeModel, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Intent } from './router';
import { Message } from './types';

// Configuração do cliente Gemini
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const MODEL_NAME = 'gemini-2.0-flash'; // Modelo atualizado para melhor performance

// Inicializar o cliente de IA
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Sistema de mensagem padrão
const DEFAULT_SYSTEM_MESSAGE = `Você é um assistente educacional especializado em criar planos de estudo personalizados, analisar materiais educacionais e ajudar estudantes a aprender de forma eficaz. Seu tom deve ser **inspirador e motivador**, como um tutor particular entusiasmado em ajudar o aluno a ter sucesso.

Suas capacidades incluem:
1.  Criar planos de estudo adaptados às necessidades específicas do aluno, perguntando sobre seus objetivos, estilo de aprendizagem, tempo disponível e dificuldades.
2.  Analisar materiais de estudo e extrair conceitos-chave, apresentando-os de forma clara e concisa.
3.  Recomendar técnicas de estudo baseadas em evidências científicas, explicando por que essas técnicas são eficazes.
4.  Gerar questionários e testes práticos em formato de múltipla escolha (4 opções), com feedback imediato após cada resposta, indicando a correta.
5.  Explicar conceitos complexos de forma clara e didática, usando analogias e exemplos relevantes.
6.  Fornecer feedback construtivo e sugestões de melhoria, focando nos pontos fortes e áreas que precisam de mais atenção.

Ao interagir com os estudantes, você deve:
*   Ser claro, paciente e encorajador.
*   Adaptar suas explicações ao nível de conhecimento do estudante.
*   Proporcionar orientação estruturada, mas flexível.
*   Oferecer ferramentas e recursos educacionais relevantes (sites, vídeos, artigos).
*   Manter um tom **respeitoso e atencioso**, demonstrando genuíno interesse em ajudar o estudante a superar suas dificuldades.
*   Sempre focar em promover a compreensão profunda, não apenas a memorização.
*   Se você não souber a resposta para uma pergunta, diga: 'Eu não tenho certeza sobre isso no momento, mas posso te ajudar a encontrar recursos para aprender mais' e forneça links ou sugestões de fontes confiáveis.

Ao criar planos de estudo, organize-os em um formato de tabela com colunas para 'Tópico', 'Tempo Dedicado', 'Recursos' e 'Tarefas'.

Por exemplo, se um aluno diz: 'Estou com dificuldades em entender o conceito de integral', você pode responder: 'Entendo. Vamos começar com uma analogia simples. Imagine que você está dirigindo um carro...'

Não forneça aconselhamento médico, financeiro ou jurídico. Direcione os alunos a profissionais qualificados para esses assuntos. Evite discussões sobre tópicos controversos ou que possam ser considerados ofensivos.

Em suas respostas, use exemplos quando apropriado e verifique se o estudante está compreendendo o material.`;

// Interface para o contexto do agente
interface AgentContext {
  recentMessages: Message[];
  intent?: string;
  specializedPrompt?: string;
}

/**
 * Gera um processo de pensamento sequencial com base em uma consulta do usuário
 * @param query Consulta ou pergunta do usuário
 * @param context Contexto adicional para o processamento
 * @returns String com o processo de pensamento formatado
 */
async function generateThoughtProcess(
  query: string,
  context: AgentContext
): Promise<string> {
  if (!GEMINI_API_KEY) {
    console.error("Chave de API Gemini não configurada");
    throw new Error("API key não configurada");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Construindo o prompt para o processo de pensamento
    let prompt = `Analise a seguinte consulta do usuário e detalhe seu processo de pensamento em etapas:
    
    "${query}"
    
    Contexto adicional:
    - Intenção detectada: ${context.intent || 'Não especificada'}
    - Histórico recente de mensagens: ${context.recentMessages?.length || 0} mensagens
    
    Forneça seu processo de pensamento em etapas numeradas, cobrindo:
    1. Análise inicial da consulta
    2. Identificação das necessidades do estudante
    3. Avaliação do contexto educacional
    4. Estratégia de resposta
    5. Recursos ou técnicas educacionais relevantes
    6. Possíveis desafios ou considerações adicionais
    7. Abordagem final recomendada
    
    Responda em português e mantenha cada etapa concisa e clara.`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 800,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const response = result.response;
    const text = response.text();
    return text;
    
  } catch (error) {
    console.error("Erro ao gerar processo de pensamento:", error);
    return `Erro ao gerar processo de pensamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
  }
}

/**
 * Gera uma resposta de chat com base nas mensagens fornecidas
 * @param messages Array de mensagens entre usuário e assistente
 * @returns Chat object pronto para receber mensagens
 */
async function generateChatResponse(messages: { role: string; content: string }[]) {
  if (!GEMINI_API_KEY) {
    console.error("Chave de API Gemini não configurada");
    throw new Error("API key não configurada");
  }

  try {
    // Formatar as mensagens para a API Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Adicionar mensagem do sistema como parte da primeira mensagem do usuário
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: 'user',
        parts: [{ text: `${DEFAULT_SYSTEM_MESSAGE}\n\nComo posso ajudar?` }]
      });
    } else {
      // Adicionar o contexto do sistema à primeira mensagem do usuário
      formattedMessages[0].parts[0].text = `${DEFAULT_SYSTEM_MESSAGE}\n\n${formattedMessages[0].parts[0].text}`;
    }

    // Obter o modelo generativo
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Iniciar o chat com as mensagens formatadas
    const chat = model.startChat({
      history: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Retornar o objeto chat em vez de chamar sendMessage com string vazia
    return chat;
    
  } catch (error) {
    console.error("Erro ao gerar resposta de chat:", error);
    throw new Error(`Falha ao gerar resposta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Processa o conteúdo de um arquivo para análise educacional
 * @param fileContent Conteúdo do arquivo em texto ou base64 para imagens
 * @param fileName Nome do arquivo
 * @param fileType Tipo do arquivo ('image' ou 'document')
 * @returns Análise do conteúdo do arquivo
 */
async function processFile(fileContent: string, fileName: string, fileType: 'image' | 'document'): Promise<{ analysis: string, fileInfo?: { fileContent: string } }> {
  if (!GEMINI_API_KEY) {
    console.error("Chave de API Gemini não configurada");
    throw new Error("API key não configurada");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    let prompt = '';
    let contentParts: any[] = [];
    
    // Verificar se é uma imagem
    const isImage = fileType === 'image';
    
    if (isImage) {
      // Processar como imagem - verificar se já está em base64
      let base64Content = fileContent;
      
      // Verificar se o conteúdo já está no formato base64
      if (!base64Content.startsWith('data:') && !base64Content.includes(';base64,')) {
        // Se não estiver em formato completo, adicionar o prefixo correto
        base64Content = `data:image/jpeg;base64,${fileContent}`;
      }
      
      // Preparar o prompt para imagens
      prompt = `
      Analise esta imagem em detalhes e me proporcione:

      1. Descrição detalhada: Descreva o que você vê na imagem em termos educacionais.
      2. Extração de texto: Identifique e transcreva qualquer texto visível na imagem.
      3. Identificação do assunto principal: Qual parece ser o tema ou disciplina principal.
      4. Contexto educacional: Como esta imagem pode ser usada para fins educacionais.
      
      Após esta análise, apresente as seguintes opções ao estudante:
      
      - Criar um plano de estudos baseado neste conteúdo
      - Gerar um quiz para testar conhecimentos sobre este material
      - Criar um resumo esquematizado dos principais conceitos
      - Elaborar cartões de memorização (flashcards) para este conteúdo
      - Simular um exame sobre este tema
      - Explicar conceitos específicos mais detalhadamente
      - Criar um mapa mental relacionando os conceitos presentes
      
      Responda em português, com linguagem clara e didática.
      `;
      
      // Criar o conteúdo da requisição com a imagem
      contentParts = [
        { text: prompt },
        { inlineData: { mimeType: 'image/jpeg', data: base64Content.split(',')[1] || base64Content } }
      ];
    } else {
      // Processar como documento de texto
      prompt = `
      Analise este documento em detalhes e me proporcione:

      1. Resumo do conteúdo: Sintetize os principais pontos e informações.
      2. Conceitos-chave: Identifique e explique os conceitos mais importantes.
      3. Estrutura do material: Como o conteúdo está organizado e como isso afeta o aprendizado.
      4. Contexto educacional: Como este material pode ser utilizado para fins de aprendizado.
      
      Após esta análise, apresente as seguintes opções ao estudante:
      
      - Criar um plano de estudos personalizado baseado neste material
      - Gerar um quiz para testar conhecimentos sobre este conteúdo
      - Criar um resumo esquematizado dos principais conceitos
      - Elaborar cartões de memorização (flashcards) para revisão
      - Simular um exame sobre este tema
      - Explicar conceitos específicos mais detalhadamente
      - Criar um mapa mental relacionando os conceitos presentes
      
      Nome do arquivo: ${fileName}
      
      Responda em português, com linguagem clara e didática.
      `;
      
      // Criar o conteúdo da requisição com o texto
      contentParts = [
        { text: prompt + "\n\nConteúdo do documento:\n" + fileContent }
      ];
    }

    // Gerar a análise do conteúdo
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: contentParts }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    const text = result.response.text();
    
    // Aplicar formatação para melhorar a legibilidade
    const formattedText = formatAnalysisText(text);
    
    // Retornar a análise e as informações do arquivo
    return {
      analysis: formattedText,
      fileInfo: {
        fileContent: fileContent.length > 10000 
          ? fileContent.substring(0, 10000) + '...' // Truncar se for muito grande
          : fileContent
      }
    };
    
  } catch (error) {
    console.error("Erro ao processar arquivo:", error);
    return {
      analysis: `Erro ao processar o arquivo: ${error instanceof Error ? error.message : 'Erro desconhecido'}.\nPor favor, tente com outro arquivo ou entre em contato com o suporte.`
    };
  }
}

/**
 * Gera uma resposta de chat em formato de stream com base nas mensagens fornecidas
 * @param messages Array de mensagens entre usuário e assistente
 * @param userMessage A última mensagem do usuário
 * @returns Stream de resposta
 */
async function generateStreamingResponse(messages: { role: string; content: string }[], userMessage: string) {
  if (!GEMINI_API_KEY) {
    console.error("Chave de API Gemini não configurada");
    throw new Error("API key não configurada");
  }

  try {
    // Formatar as mensagens para a API Gemini
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Adicionar mensagem do sistema como parte da primeira mensagem do usuário
    if (formattedMessages.length === 0) {
      formattedMessages.push({
        role: 'user',
        parts: [{ text: `${DEFAULT_SYSTEM_MESSAGE}\n\nComo posso ajudar?` }]
      });
    } else {
      // Adicionar o contexto do sistema à primeira mensagem do usuário
      formattedMessages[0].parts[0].text = `${DEFAULT_SYSTEM_MESSAGE}\n\n${formattedMessages[0].parts[0].text}`;
    }

    // Obter o modelo generativo
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Iniciar o chat com as mensagens formatadas
    const chat = model.startChat({
      history: formattedMessages,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      },
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
      ],
    });

    // Retornar o stream de resposta
    return await chat.sendMessageStream(userMessage);
    
  } catch (error) {
    console.error("Erro ao gerar resposta de chat em stream:", error);
    throw new Error(`Falha ao gerar resposta em stream: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Formats the analysis text from the Gemini model to improve readability.
 *
 * @param {string} analysisText - The raw analysis text from the Gemini model.
 * @returns {string} The formatted analysis text.
 */
function formatAnalysisText(analysisText: string): string {
  // Replace bold markers with Markdown bold
  let formattedText = analysisText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Replace numbered lists with Markdown numbered lists
  formattedText = formattedText.replace(/^(\d+\.\s)/gm, (match, p1) => {
    return `<strong>${p1.trim()}</strong> `;
  });

  // Replace bullet points with Markdown bullet points
  formattedText = formattedText.replace(/^\*\s/gm, '• ');
  formattedText = formattedText.replace(/^-\s/gm, '• ');

  // Replace sub-bullet points with indented Markdown bullet points
  formattedText = formattedText.replace(/^\s{4}\*\s/gm, '  • ');
  formattedText = formattedText.replace(/^\s{4}-\s/gm, '  • ');

  // Replace chapter titles with Markdown bold
  formattedText = formattedText.replace(/CAPÍTULO\s\d+\s-\s(.+)/g, '<strong>$1</strong>');

  // Replace "Exercício de fixação" with italic
  formattedText = formattedText.replace(/Exercício de fixação/g, '<em>Exercício de fixação</em>');

  // Add line breaks after each numbered section
  formattedText = formattedText.replace(/(<strong>\d+\.\s.+?<\/strong>.+?)(?=\n<strong>\d+\.|$)/g, (match, p1) => {
    return `${p1}\n\n`;
  });

  // Add line breaks after each bold title
  formattedText = formattedText.replace(/(<strong>.+?<\/strong>)/g, (match, p1) => {
    return `${p1}\n`;
  });

  // Add line breaks after each italic title
  formattedText = formattedText.replace(/(<em>.+?<\/em>)/g, (match, p1) => {
    return `${p1}\n`;
  });

  // Remove extra spaces
  formattedText = formattedText.replace(/\s{2,}/g, ' ');

  // Trim leading/trailing whitespace
  formattedText = formattedText.trim();

  return formattedText;
}

// Exportar tipos e funções
export type { Message, AgentContext };
export { generateChatResponse, generateThoughtProcess, generateStreamingResponse, processFile, formatAnalysisText };


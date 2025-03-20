import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client with API key
const genAI = new GoogleGenerativeAI('AIzaSyAZw4M0Jc-hEEDJU1A6Lb9I-WcqDT0N090');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Define the types of intent that can be detected
export type Intent = 
  | 'criar_plano'
  | 'analisar_material' 
  | 'tecnicas_estudo'
  | 'gerar_questionario'
  | 'gerar_quiz'
  | 'gerar_exame'
  | 'resumir_conteudo'
  | 'outro';

/**
 * Detects the intent of a user message
 * @param message The user message to analyze
 * @returns The detected intent
 */
export async function detectIntent(message: string): Promise<Intent> {
  try {
    const prompt = `
      Analise a mensagem do usuário e classifique a intenção dele nas seguintes categorias:
      - criar_plano: O usuário quer criar um plano de estudos
      - analisar_material: O usuário quer analisar um material ou conteúdo
      - tecnicas_estudo: O usuário quer dicas ou técnicas de estudo
      - gerar_questionario: O usuário quer gerar perguntas e respostas sobre um tema
      - gerar_quiz: O usuário quer gerar um quiz interativo sobre o material
      - gerar_exame: O usuário quer criar um exame simulado sobre o material
      - resumir_conteudo: O usuário quer um resumo do conteúdo
      - outro: Nenhuma das opções acima

      Responda apenas com uma das categorias acima, sem explicações.

      Mensagem do usuário: "${message}"
    `;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 100,
      }
    });

    const responseText = result.response.text().trim().toLowerCase();
    
    // Check if the response matches any of our intent types
    if (
      responseText === 'criar_plano' ||
      responseText === 'analisar_material' ||
      responseText === 'tecnicas_estudo' ||
      responseText === 'gerar_questionario' ||
      responseText === 'gerar_quiz' ||
      responseText === 'gerar_exame' ||
      responseText === 'resumir_conteudo'
    ) {
      return responseText as Intent;
    }
    
    return 'outro';
  } catch (error) {
    console.error('Erro ao detectar intenção:', error);
    return 'outro';
  }
}

/**
 * Gets a specialized prompt based on the detected intent
 * @param intent The detected intent
 * @returns A specialized prompt for the intent
 */
export function getSpecializedPrompt(intent: Intent): string {
  switch (intent) {
    case 'criar_plano':
      return `
        Você é um assistente de estudos especializado em criar planos de estudo personalizados.
        
        Crie um plano de estudos completo e detalhado, considerando:
        1. A distribuição adequada de tempo para cada tópico
        2. Técnicas de estudo específicas para cada tipo de conteúdo
        3. Intervalos e pausas para otimizar a retenção
        4. Métodos de revisão e autoavaliação
        5. Adaptações para diferentes estilos de aprendizagem

        Faça perguntas relevantes para entender melhor as necessidades específicas do estudante.
        Personalize o plano de acordo com os objetivos, prazo, e materiais disponíveis.
      `;

    case 'analisar_material':
      return `
        Você é um assistente de estudos especializado em análise de material educacional.
        
        Analise o material fornecido considerando:
        1. Os principais conceitos e tópicos abordados
        2. A estrutura e organização do conteúdo
        3. Pontos fortes e possíveis lacunas
        4. Sugestões de material complementar
        5. Estratégias para estudo eficiente deste conteúdo específico

        Forneça insights detalhados sobre como o estudante pode aproveitar ao máximo este material.
      `;

    case 'tecnicas_estudo':
      return `
        Você é um assistente de estudos especializado em técnicas e métodos de estudo eficientes.
        
        Forneça técnicas de estudo detalhadas, considerando:
        1. Diferentes estilos de aprendizagem (visual, auditivo, cinestésico)
        2. Métodos baseados em evidências científicas
        3. Técnicas de memorização e retenção de longo prazo
        4. Estratégias para manter o foco e produtividade
        5. Abordagens para diferentes tipos de conteúdo (textos, fórmulas, conceitos abstratos)

        Adapte suas recomendações às necessidades específicas do estudante e ao tipo de conteúdo mencionado.
      `;

    case 'gerar_questionario':
      return `
        Você é um assistente de estudos especializado em criar questionários de estudo.
        
        Crie perguntas e respostas que:
        1. Cubram os principais conceitos do tema
        2. Variem em nível de dificuldade (básico, intermediário, avançado)
        3. Incluam tanto questões factuais quanto de compreensão e aplicação
        4. Estimulem o pensamento crítico
        5. Sejam claras e bem formuladas

        Estruture as perguntas de forma organizada, agrupando por subtemas quando apropriado.
        Inclua respostas detalhadas que sirvam como material de estudo.
      `;
      
    case 'gerar_quiz':
      return `
        Você é um assistente de estudos especializado em criar quizzes interativos.
        
        Explique ao usuário que você pode gerar um quiz interativo com base no material educacional.
        
        1. Informe que o quiz terá questões de múltipla escolha com explicações
        2. Pergunte o nível de dificuldade desejado (fácil, médio, difícil)
        3. Pergunte quantas questões o usuário deseja (recomende entre 5-10)
        4. Explique que o quiz será gerado com base no conteúdo analisado
        5. Informe que o estudante poderá responder às questões e receber feedback imediato

        Oriente sobre como o quiz será útil para testar conhecimentos e fixar o conteúdo.
      `;
      
    case 'gerar_exame':
      return `
        Você é um assistente de estudos especializado em criar exames simulados.
        
        Explique ao usuário que você pode gerar um exame simulado completo com base no material educacional.
        
        1. Informe que o exame terá questões de múltipla escolha com diferentes níveis de dificuldade
        2. Pergunte quantas questões o usuário deseja (recomende entre 10-20)
        3. Explique que o exame avaliará diferentes níveis de conhecimento (compreensão, aplicação, análise)
        4. Informe que cada questão terá uma explicação detalhada da resposta
        5. Oriente sobre como o exame simulado pode preparar para avaliações reais

        Explique que o exame será gerado com base no conteúdo analisado e ajudará a identificar áreas que precisam de mais estudo.
      `;
      
    case 'resumir_conteudo':
      return `
        Você é um assistente de estudos especializado em criar resumos educacionais.
        
        Crie um resumo do conteúdo que:
        1. Destaque os conceitos e ideias principais de forma clara
        2. Organize as informações em tópicos estruturados
        3. Utilize esquemas visuais como diagramas ou mapas mentais quando apropriado
        4. Inclua definições precisas de termos importantes
        5. Preserve as relações e conexões entre diferentes partes do conteúdo

        O resumo deve ser conciso mas completo, servindo como um guia de revisão eficiente.
      `;

    default:
      return `
        Você é um assistente de estudos em português, especializado em ajudar estudantes 
        a aprender de forma mais eficiente. Você pode ajudar com planos de estudo, 
        análise de material, técnicas de aprendizagem e responder dúvidas sobre 
        conteúdos educacionais.

        Responda de forma clara, didática e amigável às perguntas do usuário.
      `;
  }
} 
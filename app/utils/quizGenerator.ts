import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Configuração do cliente Gemini
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY || '';
const MODEL_NAME = 'gemini-1.5-flash';

// Inicializar o cliente de IA
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Definir a interface para questões de quiz
export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

// Definir a interface para o objeto de dados do quiz
export interface QuizData {
  title: string;
  description?: string;
  questions: QuizQuestion[];
}

/**
 * Gera um quiz com base no conteúdo fornecido
 * @param content Conteúdo educacional para gerar o quiz
 * @param numQuestions Número de questões desejadas
 * @param difficulty Nível de dificuldade (fácil, médio, difícil)
 * @param asJson Retornar como JSON
 * @returns Quiz gerado
 */
export async function generateQuiz(
  content: string,
  numQuestions: number = 5,
  difficulty: string = 'médio',
  asJson: boolean = true
): Promise<QuizData> {
  if (!GEMINI_API_KEY) {
    console.error("Chave de API Gemini não configurada");
    throw new Error("API key não configurada");
  }

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Limitando o número de questões
    numQuestions = Math.min(Math.max(1, numQuestions), 15);
    
    // Construir o prompt para o quiz
    const prompt = `
    Crie um quiz interativo de múltipla escolha com base no conteúdo fornecido.
    
    Informações:
    - Número de questões: ${numQuestions}
    - Nível de dificuldade: ${difficulty}
    
    Regras para o quiz:
    1. Cada questão deve ter exatamente 4 alternativas
    2. Apenas uma das alternativas deve ser correta
    3. A alternativa correta deve ser claramente identificada pelo número (0, 1, 2 ou 3)
    4. Inclua uma explicação detalhada para cada resposta correta
    5. As questões devem ser relevantes para o conteúdo fornecido
    6. Use linguagem clara e educativa
    7. O quiz deve ter um título relacionado ao conteúdo
    
    Conteúdo de referência:
    """
    ${content.length > 25000 ? content.substring(0, 25000) + "..." : content}
    """
    
    ${asJson ? 'Forneça sua resposta no formato JSON exatamente como especificado abaixo:' : 'Forneça sua resposta no formato estruturado abaixo:'}
    
    ${asJson ? `{
      "title": "Título do Quiz",
      "description": "Breve descrição do quiz (2-3 frases)",
      "questions": [
        {
          "question": "Texto da questão 1?",
          "options": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
          "correctAnswer": 0,
          "explanation": "Explicação de por que a alternativa A é correta"
        },
        ...
      ]
    }` : `
    # Título do Quiz
    
    Breve descrição do quiz
    
    ## Questão 1
    Texto da questão 1?
    
    A. Alternativa A
    B. Alternativa B
    C. Alternativa C
    D. Alternativa D
    
    Resposta correta: A
    
    Explicação: Explicação de por que a alternativa A é correta.
    
    ## Questão 2
    ...
    `}
    `;

    // Gerar o quiz usando o modelo
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000,
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
    const responseText = response.text();
    
    // Se a resposta for JSON, fazer parse e retornar
    if (asJson) {
      try {
        const jsonStartIndex = responseText.indexOf('{');
        const jsonEndIndex = responseText.lastIndexOf('}') + 1;
        const jsonString = responseText.substring(jsonStartIndex, jsonEndIndex);
        
        // Parse do JSON para objeto
        const quizData = JSON.parse(jsonString) as QuizData;
        
        // Validação básica da estrutura do quiz
        if (!quizData.title || !Array.isArray(quizData.questions)) {
          throw new Error("Formato de quiz inválido");
        }
        
        return quizData;
      } catch (jsonError) {
        console.error("Erro ao fazer parse do JSON do quiz:", jsonError);
        throw new Error("Não foi possível criar o quiz no formato correto");
      }
    } else {
      // Processar resposta em formato de texto
      // Este caso é para uso futuro se quisermos suportar outros formatos
      throw new Error("Formato não-JSON não implementado");
    }
  } catch (error) {
    console.error("Erro ao gerar quiz:", error);
    throw new Error(`Falha ao gerar quiz: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Gera um exame simulado com base no conteúdo fornecido
 * @param content Conteúdo educacional para gerar o exame
 * @param numQuestions Número de questões desejadas
 * @param difficulty Nível de dificuldade (fácil, médio, difícil)
 * @returns Exame gerado
 */
export async function generateExam(
  content: string,
  numQuestions: number = 10,
  difficulty: string = 'médio'
): Promise<QuizData> {
  try {
    // Limitando o número de questões para exames
    numQuestions = Math.min(Math.max(5, numQuestions), 20);
    
    // Usar o mesmo gerador de quiz, apenas com parâmetros diferentes
    const examData = await generateQuiz(
      content,
      numQuestions,
      difficulty,
      true
    );
    
    // Sobrescrever o título para indicar que é um exame
    if (examData.title && !examData.title.toLowerCase().includes('exame') && !examData.title.toLowerCase().includes('simulado')) {
      examData.title = `Exame Simulado: ${examData.title}`;
    }
    
    return examData;
  } catch (error) {
    console.error("Erro ao gerar exame:", error);
    throw new Error(`Falha ao gerar exame simulado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
} 
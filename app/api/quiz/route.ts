import { NextRequest, NextResponse } from 'next/server';
import { generateQuiz, generateExam } from '@/app/utils/quizGenerator';

export async function POST(request: NextRequest) {
  try {
    // Verificar se a requisição tem conteúdo JSON
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: "Formato de requisição inválido. Esperado JSON." },
        { status: 400 }
      );
    }

    // Obter os dados do corpo da requisição
    const { content, type, numQuestions, difficulty } = await request.json();

    // Validar os dados recebidos
    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: "Conteúdo não fornecido ou inválido." },
        { status: 400 }
      );
    }

    if (content.length < 50) {
      return NextResponse.json(
        { error: "Conteúdo muito curto para gerar um quiz/exame significativo." },
        { status: 400 }
      );
    }

    // Verificar o tipo de geração (quiz ou exame)
    const isExam = type === 'exam';
    
    // Normalizar número de questões (valores padrão já definidos nas funções)
    const questionsCount = typeof numQuestions === 'number' && numQuestions > 0 
      ? numQuestions 
      : isExam ? 10 : 5;
    
    // Limitar o número de questões
    const sanitizedQuestionsCount = Math.min(
      Math.max(isExam ? 5 : 3, questionsCount),
      isExam ? 20 : 15
    );
    
    // Normalizar dificuldade
    const sanitizedDifficulty = typeof difficulty === 'string' && 
      ['fácil', 'médio', 'difícil'].includes(difficulty.toLowerCase())
      ? difficulty.toLowerCase()
      : 'médio';

    // Registrar informações sobre a solicitação
    console.log(`Gerando ${isExam ? 'exame' : 'quiz'} com ${sanitizedQuestionsCount} questões, dificuldade ${sanitizedDifficulty}`);

    try {
      // Gerar o quiz ou exame
      const result = isExam
        ? await generateExam(content, sanitizedQuestionsCount, sanitizedDifficulty)
        : await generateQuiz(content, sanitizedQuestionsCount, sanitizedDifficulty);

      // Retornar o resultado
      return NextResponse.json(result);
    } catch (generationError: any) {
      console.error(`Erro ao gerar ${isExam ? 'exame' : 'quiz'}:`, generationError);
      return NextResponse.json(
        { error: `Falha ao gerar ${isExam ? 'exame' : 'quiz'}: ${generationError.message || 'Erro desconhecido'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro ao processar requisição:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno do servidor" },
      { status: 500 }
    );
  }
} 
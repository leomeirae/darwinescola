'use client';

import { useState, useEffect } from 'react';
import { Button } from './Button';
import { QuizData, QuizQuestion } from '@/app/utils/quizGenerator';

interface QuizProps {
  quizData: QuizData;
  onComplete: () => void;
}

export default function Quiz({ quizData, onComplete }: QuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);
  const [progress, setProgress] = useState(0);
  const [answers, setAnswers] = useState<number[]>(
    Array(quizData.questions.length).fill(-1)
  );

  useEffect(() => {
    // Calcular o progresso com base na pergunta atual
    setProgress(((currentQuestion + 1) / quizData.questions.length) * 100);
  }, [currentQuestion, quizData.questions.length]);

  const handleAnswerSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedAnswer(index);
  };

  const handleNextQuestion = () => {
    // Atualizar vetor de respostas
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer !== null ? selectedAnswer : -1;
    setAnswers(newAnswers);

    setShowExplanation(false);

    if (currentQuestion < quizData.questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setIsAnswered(false);
    } else {
      // Calcular pontuação final
      let finalScore = 0;
      newAnswers.forEach((answer, index) => {
        if (answer === quizData.questions[index].correctAnswer) {
          finalScore++;
        }
      });
      setScore(finalScore);
      setShowResults(true);
    }
  };

  const handleCheckAnswer = () => {
    if (selectedAnswer === null) return;
    
    setIsAnswered(true);
    
    // Verificar se está correto e atualizar a pontuação
    if (selectedAnswer === quizData.questions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
      setSelectedAnswer(answers[currentQuestion - 1] !== -1 ? answers[currentQuestion - 1] : null);
      setIsAnswered(answers[currentQuestion - 1] !== -1);
      setShowExplanation(false);
    }
  };

  const getScoreColor = () => {
    const percentage = (score / quizData.questions.length) * 100;
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (showResults) {
    return (
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
        <h2 className="text-2xl font-bold mb-5 text-center text-gray-800">{quizData.title} - Resultados</h2>
        <div className="text-center mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100">
          <p className="text-lg mb-2 text-gray-700">Você completou o quiz!</p>
          <p className="text-xl font-bold">
            Sua pontuação:{' '}
            <span className={getScoreColor()}>
              {score} de {quizData.questions.length} ({Math.round((score / quizData.questions.length) * 100)}%)
            </span>
          </p>
        </div>

        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4 text-gray-800">Resumo das Respostas:</h3>
          <div className="space-y-4">
            {quizData.questions.map((question, index) => (
              <div key={index} className="border-b pb-4 mb-4">
                <p className="font-medium mb-2 text-gray-800">
                  {index + 1}. {question.question}
                </p>
                <p className="mb-1">
                  Sua resposta:{' '}
                  <span
                    className={
                      answers[index] === question.correctAnswer
                        ? 'text-green-600 font-semibold'
                        : 'text-red-600 font-semibold'
                    }
                  >
                    {answers[index] !== -1 ? question.options[answers[index]] : 'Não respondida'}
                  </span>
                </p>
                {answers[index] !== question.correctAnswer && (
                  <p className="text-green-600 mb-1 font-medium">
                    Resposta correta: {question.options[question.correctAnswer]}
                  </p>
                )}
                <p className="text-gray-600 text-sm mt-2 p-2 bg-blue-50 rounded-md">{question.explanation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Button onClick={onComplete} size="lg">Concluir</Button>
        </div>
      </div>
    );
  }

  const currentQuestionData = quizData.questions[currentQuestion];

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">{quizData.title}</h2>
        <div className="text-sm text-gray-600 font-medium bg-gray-100 py-1 px-3 rounded-full">
          Questão {currentQuestion + 1} de {quizData.questions.length}
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-8">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium mb-5 text-gray-800">{currentQuestionData.question}</h3>
        <div className="space-y-3">
          {currentQuestionData.options.map((option, index) => (
            <div
              key={index}
              onClick={() => handleAnswerSelect(index)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedAnswer === index
                  ? isAnswered
                    ? selectedAnswer === currentQuestionData.correctAnswer
                      ? 'bg-green-50 border-green-500 shadow-sm'
                      : 'bg-red-50 border-red-500 shadow-sm'
                    : 'bg-blue-50 border-blue-500 shadow-sm'
                  : 'hover:bg-gray-50 border-gray-200'
              } ${
                isAnswered &&
                index === currentQuestionData.correctAnswer &&
                'bg-green-50 border-green-500 shadow-sm'
              }`}
            >
              <div className="flex items-start">
                <div
                  className={`w-7 h-7 flex items-center justify-center rounded-full mr-3 flex-shrink-0 ${
                    selectedAnswer === index
                      ? isAnswered
                        ? selectedAnswer === currentQuestionData.correctAnswer
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  } ${
                    isAnswered &&
                    index === currentQuestionData.correctAnswer &&
                    'bg-green-500 text-white'
                  }`}
                >
                  {String.fromCharCode(65 + index)}
                </div>
                <div className="font-medium text-gray-800">{option}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {isAnswered && showExplanation && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-100 shadow-sm">
          <h4 className="font-medium mb-2 text-blue-800">Explicação:</h4>
          <p className="text-gray-800">{currentQuestionData.explanation}</p>
        </div>
      )}

      <div className="flex justify-between">
        <div>
          <Button
            onClick={handlePreviousQuestion}
            disabled={currentQuestion === 0}
            variant="outline"
          >
            Anterior
          </Button>
        </div>

        <div className="flex space-x-3">
          {isAnswered ? (
            <>
              {!showExplanation && (
                <Button
                  onClick={() => setShowExplanation(true)}
                  variant="outline"
                >
                  Ver Explicação
                </Button>
              )}
              <Button onClick={handleNextQuestion}>
                {currentQuestion < quizData.questions.length - 1 ? 'Próxima' : 'Ver Resultado'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleCheckAnswer}
              disabled={selectedAnswer === null}
            >
              Verificar Resposta
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 
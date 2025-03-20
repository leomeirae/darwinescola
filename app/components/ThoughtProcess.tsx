'use client';

import { useState } from 'react';

interface ThoughtProcessProps {
  thoughtProcess: string;
}

export default function ThoughtProcess({ thoughtProcess }: ThoughtProcessProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thoughtProcess) return null;

  const steps = thoughtProcess
    .split('\n')
    .filter(step => step.trim().length > 0);

  if (steps.length === 0) return null;

  return (
    <div className="my-6 mx-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mb-2 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100 shadow-sm transition-colors"
      >
        <svg
          className={`w-4 h-4 mr-2 transform transition-transform ${
            expanded ? 'rotate-90' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 5l7 7-7 7"
          ></path>
        </svg>
        {expanded ? 'Ocultar processo de raciocínio' : 'Ver processo de raciocínio'}
      </button>
      
      {expanded && (
        <div className="mt-3 pl-4 border-l-2 border-blue-200 bg-blue-50 rounded-r-lg p-4">
          <h3 className="text-sm font-semibold text-blue-800 mb-3">Processo de Raciocínio do Assistente:</h3>
          <ol className="list-decimal pl-5 space-y-2">
            {steps.map((step, index) => (
              <li key={index} className="text-sm text-gray-700 leading-relaxed">
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
} 
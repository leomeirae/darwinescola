import { NextRequest, NextResponse } from 'next/server';
import { processFile } from '@/app/utils/llm';

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

export async function POST(request: NextRequest) {
  // Verificar se a requisição é do tipo multipart/form-data
  if (!request.headers.get('content-type')?.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: 'A requisição deve ser do tipo multipart/form-data' },
      { status: 400 }
    );
  }

  try {
    // Processar o FormData para obter o arquivo enviado
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    // Verificar se um arquivo foi enviado
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo foi enviado' },
        { status: 400 }
      );
    }

    // Verificar o tamanho do arquivo
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `O arquivo é muito grande. O tamanho máximo é ${MAX_FILE_SIZE / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    // Verificar se o arquivo está vazio
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'O arquivo está vazio' },
        { status: 400 }
      );
    }

    // Verificar o tipo do arquivo
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    
    // Verificar se o tipo do arquivo é permitido
    const isImage = ALLOWED_IMAGE_TYPES.includes(fileType) || 
                   fileName.endsWith('.jpg') || 
                   fileName.endsWith('.jpeg') || 
                   fileName.endsWith('.png') || 
                   fileName.endsWith('.heic');
    
    const isDocument = ALLOWED_DOCUMENT_TYPES.includes(fileType) || 
                      fileName.endsWith('.pdf') || 
                      fileName.endsWith('.txt') || 
                      fileName.endsWith('.docx') || 
                      fileName.endsWith('.md');
    
    if (!isImage && !isDocument) {
      return NextResponse.json(
        { error: 'Formato de arquivo não suportado. Use PDF, TXT, DOCX, MD, JPG, PNG ou HEIC.' },
        { status: 400 }
      );
    }

    // Processar o conteúdo do arquivo de acordo com seu tipo
    let fileContent: string;
    
    if (isImage) {
      // Converter imagem para base64
      const buffer = await file.arrayBuffer();
      fileContent = `data:${file.type};base64,${Buffer.from(buffer).toString('base64')}`;
    } else {
      // Ler o conteúdo do documento como texto
      fileContent = await file.text();
      
      // Truncar o conteúdo se for muito grande (mais de 100k caracteres)
      if (fileContent.length > 100000) {
        fileContent = fileContent.substring(0, 100000) + '\n\n[Conteúdo truncado devido ao tamanho...]';
      }
    }

    // Processar o arquivo com o modelo LLM
    const result = await processFile(fileContent, file.name, isImage ? "image" : "document");
    
    // Retornar o resultado como resposta JSON
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('Erro ao processar o upload do arquivo:', error);
    
    return NextResponse.json(
      { error: `Erro interno ao processar o arquivo: ${error.message}` },
      { status: 500 }
    );
  }
} 
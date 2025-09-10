import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, access } from 'fs/promises';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const uploadsDir = join(process.cwd(), 'public', 'uploads', 'crop-images');
    
    console.log('🔍 Verificando diretório:', uploadsDir);
    
    // Verificar se o diretório existe
    try {
      await access(uploadsDir);
      console.log('✅ Diretório existe');
    } catch (error: any) {
      console.log('❌ Diretório não existe:', error);
      return NextResponse.json({
        success: false,
        message: 'Diretório não existe',
        directory: uploadsDir,
        error: error.message
      });
    }

    // Listar arquivos no diretório
    const files = await readdir(uploadsDir);
    console.log('📁 Arquivos encontrados:', files);

    const fileDetails = [];
    for (const file of files) {
      try {
        const filePath = join(uploadsDir, file);
        const stats = await stat(filePath);
        fileDetails.push({
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isFile: stats.isFile(),
          isDirectory: stats.isDirectory()
        });
      } catch (error) {
        fileDetails.push({
          name: file,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verificação de arquivos concluída',
      data: {
        directory: uploadsDir,
        totalFiles: files.length,
        files: fileDetails
      }
    });

  } catch (error: any) {
    console.error('❌ Erro ao verificar arquivos:', error);
    return NextResponse.json({
      success: false,
      message: 'Erro ao verificar arquivos',
      error: error.message
    }, { status: 500 });
  }
}
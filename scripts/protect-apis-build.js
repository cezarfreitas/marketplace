#!/usr/bin/env node

/**
 * Script para adicionar proteção de build em todas as APIs
 * que fazem operações pesadas (consultas de banco, chamadas externas)
 */

const fs = require('fs');
const path = require('path');

const API_DIR = path.join(__dirname, '../src/app/api');

// APIs que devem ser protegidas (fazem operações pesadas)
const PROTECTED_APIS = [
  'anymarket/sync/route.ts',
  'anymarket/sync-batch/route.ts',
  'anymarket/upload/route.ts',
  'analyze-images/route.ts',
  'analyze-images/route-clean.ts',
  'generate-marketplace-description/route.ts',
  'generate-meli-description/route.ts',
  'import/batch/route.ts',
  'import/skus-by-list/route.ts',
  'migrate-rfid/route.ts',
  'products/stats/route.ts',
  'tools/stock-stats/route.ts',
  'brands/import/route.ts',
  'brands/bulk-delete/route.ts',
  'brands/generate-auxiliary/route.ts',
  'categories/route.ts',
  'brands/route.ts',
  'agents/route.ts',
  'analysis-logs/route.ts',
  'analysis-logs-simple/route.ts',
  'anymarket/sync-logs/route.ts',
  'import/stats/route.ts'
];

function addBuildProtection(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Verificar se já tem proteção
    if (content.includes('checkBuildEnvironment')) {
      console.log(`✅ ${filePath} já protegido`);
      return;
    }
    
    // Adicionar import
    if (content.includes("import { NextResponse }") || content.includes("import { NextRequest }")) {
      content = content.replace(
        /(import { NextResponse } from 'next\/server';)/,
        "$1\nimport { checkBuildEnvironment } from '@/lib/build-check';"
      );
    } else if (content.includes("import { NextRequest, NextResponse }")) {
      content = content.replace(
        /(import { NextRequest, NextResponse } from 'next\/server';)/,
        "$1\nimport { checkBuildEnvironment } from '@/lib/build-check';"
      );
    }
    
    // Adicionar verificação no início das funções GET/POST
    const functionPatterns = [
      /(export async function GET\([^)]*\)\s*{[\s\S]*?try\s*{)/,
      /(export async function POST\([^)]*\)\s*{[\s\S]*?try\s*{)/
    ];
    
    functionPatterns.forEach(pattern => {
      content = content.replace(pattern, (match) => {
        return match + '\n    // Evitar execução durante o build do Next.js\n    if (checkBuildEnvironment()) {\n      return NextResponse.json({ error: \'API não disponível durante build\' }, { status: 503 });\n    }\n';
      });
    });
    
    fs.writeFileSync(filePath, content);
    console.log(`✅ Protegido: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ Erro ao proteger ${filePath}:`, error.message);
  }
}

// Executar proteção
console.log('🛡️ Adicionando proteção de build nas APIs...\n');

PROTECTED_APIS.forEach(apiPath => {
  const fullPath = path.join(API_DIR, apiPath);
  if (fs.existsSync(fullPath)) {
    addBuildProtection(fullPath);
  } else {
    console.log(`⚠️ Arquivo não encontrado: ${apiPath}`);
  }
});

console.log('\n✅ Proteção de build aplicada com sucesso!');

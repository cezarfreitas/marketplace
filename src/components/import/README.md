# Componentes de Importação VTEX

Esta pasta contém componentes modulares e reutilizáveis para a funcionalidade de importação da VTEX.

## Estrutura de Arquivos

```
src/components/import/
├── ImportHeader.tsx      # Cabeçalho da página de importação
├── ImportConfig.tsx      # Configurações de importação
├── ImportInput.tsx       # Input de dados (RefIds)
├── ImportProgress.tsx    # Exibição do progresso
├── ImportInfo.tsx        # Informações sobre a importação
├── index.ts             # Exportações dos componentes
└── README.md            # Esta documentação
```

## Componentes

### ImportHeader
- **Propósito**: Exibe o título e subtítulo da página de importação
- **Props**: `title`, `subtitle`
- **Características**: Design moderno com gradiente e ícone

### ImportConfig
- **Propósito**: Configurações de importação (tamanho do lote, opções)
- **Props**: `batchSize`, `config`, `onBatchSizeChange`, `onConfigChange`
- **Características**: Interface intuitiva com checkboxes e seletores

### ImportInput
- **Propósito**: Entrada de RefIds dos produtos
- **Props**: `refIds`, `config`, `progressStatus`, `onRefIdsChange`, `onImport`
- **Características**: Textarea com contador de produtos e validação

### ImportProgress
- **Propósito**: Exibição do progresso da importação
- **Props**: `progress`
- **Características**: Barra de progresso animada e estatísticas em tempo real

### ImportInfo
- **Propósito**: Informações sobre o que é/não é importado
- **Props**: Nenhuma
- **Características**: Cards informativos com ícones e cores temáticas

## Hooks Relacionados

### useImportState
- **Localização**: `src/hooks/useImportState.ts`
- **Propósito**: Gerenciamento do estado da importação
- **Funcionalidades**: Estado centralizado, funções de atualização

### useImportLogic
- **Localização**: `src/hooks/useImportLogic.ts`
- **Propósito**: Lógica de negócio da importação
- **Funcionalidades**: Polling de progresso, formatação de tempo

## Benefícios da Estrutura Modular

1. **Reutilização**: Componentes podem ser reutilizados em outras páginas
2. **Manutenção**: Fácil de atualizar e corrigir bugs específicos
3. **Testabilidade**: Cada componente pode ser testado isoladamente
4. **Escalabilidade**: Fácil adicionar novos componentes ou funcionalidades
5. **Organização**: Código mais limpo e organizado

## Como Usar

```tsx
import { 
  ImportHeader, 
  ImportConfig, 
  ImportInput, 
  ImportProgress, 
  ImportInfo 
} from '@/components/import';

// Use os componentes conforme necessário
<ImportHeader title="Título" subtitle="Subtítulo" />
```

## Padrões de Design

- **Tailwind CSS**: Para estilização consistente
- **Gradientes**: Para elementos visuais modernos
- **Ícones SVG**: Para melhor UX
- **Responsividade**: Layout adaptável para diferentes telas
- **Acessibilidade**: Componentes com boa semântica HTML

## Futuras Melhorias

- [ ] Adicionar testes unitários para cada componente
- [ ] Implementar lazy loading para componentes grandes
- [ ] Adicionar animações mais suaves
- [ ] Criar temas customizáveis
- [ ] Implementar internacionalização (i18n)

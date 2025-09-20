-- Criar tabela para armazenar descrições de produtos
CREATE TABLE IF NOT EXISTS descriptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    title VARCHAR(500) NOT NULL COMMENT 'Título gerado para o produto',
    description TEXT NOT NULL COMMENT 'Descrição principal do produto',
    faq TEXT COMMENT 'Perguntas e respostas frequentes em formato JSON',
    openai_model VARCHAR(100) COMMENT 'Modelo OpenAI utilizado',
    openai_tokens_used INT COMMENT 'Total de tokens utilizados',
    openai_tokens_prompt INT COMMENT 'Tokens usados no prompt',
    openai_tokens_completion INT COMMENT 'Tokens usados na resposta',
    openai_temperature DECIMAL(3,2) COMMENT 'Temperatura do modelo',
    openai_max_tokens INT COMMENT 'Máximo de tokens configurado',
    openai_response_time_ms INT COMMENT 'Tempo de resposta da OpenAI em ms',
    openai_cost DECIMAL(10,6) COMMENT 'Custo da requisição em USD',
    openai_request_id VARCHAR(255) COMMENT 'ID da requisição OpenAI',
    agent_id INT COMMENT 'ID do agente utilizado',
    agent_name VARCHAR(255) COMMENT 'Nome do agente',
    generation_duration_ms INT COMMENT 'Duração total da geração em ms',
    status VARCHAR(50) DEFAULT 'generated' COMMENT 'Status da descrição: generated, validated, error',
    error_message TEXT COMMENT 'Mensagem de erro se houver',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Índices
    INDEX idx_product_id (product_id),
    INDEX idx_status (status),
    INDEX idx_agent_id (agent_id),
    INDEX idx_created_at (created_at),
    INDEX idx_openai_request_id (openai_request_id),
    
    -- Chave estrangeira
    FOREIGN KEY (product_id) REFERENCES products_vtex(id) ON DELETE CASCADE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Descrições de produtos geradas por IA';

-- Inserir agente para geração de descrições se não existir
INSERT IGNORE INTO agents (
    name,
    function_type,
    system_prompt,
    user_prompt_template,
    temperature,
    max_tokens,
    is_active,
    created_at
) VALUES (
    'Descrição de Produto + FAQ',
    'product_description',
    'Você é um especialista em marketing e copywriting para e-commerce, focado na criação de descrições persuasivas e informativas para produtos.

MISSÃO: Criar uma descrição completa e atrativa do produto, seguida de um FAQ relevante.

ESTRUTURA OBRIGATÓRIA:
1. Apresentação do produto (2-3 parágrafos)
   - Apresentar o produto de forma atrativa
   - Destacar benefícios e características principais
   - Usar linguagem persuasiva e profissional
   - Incluir call-to-action sutil

2. FAQ (3-5 perguntas e respostas)
   - Perguntas que clientes realmente fazem
   - Respostas claras e úteis
   - Formato: "P: Pergunta" / "R: Resposta"

REGRAS CRÍTICAS:
- Use apenas o título fornecido como base
- Seja criativo mas mantenha credibilidade
- Linguagem clara e acessível
- Foque nos benefícios para o cliente
- FAQ deve ser prático e útil
- Máximo 800 palavras no total

FORMATO DE SAÍDA:
DESCRIÇÃO:
[Descrição principal do produto]

FAQ:
P: [Pergunta 1]
R: [Resposta 1]

P: [Pergunta 2]
R: [Resposta 2]

P: [Pergunta 3]
R: [Resposta 3]',
    'Crie uma descrição completa e FAQ para este produto:

TÍTULO: {title}

Gere uma descrição persuasiva e um FAQ útil baseado apenas no título fornecido.',
    0.7,
    1000,
    1,
    NOW()
);

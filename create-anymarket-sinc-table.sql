-- =====================================================
-- SCRIPT SQL PARA CRIAR TABELA anymarket_sinc
-- Execute este script no seu banco de dados MySQL
-- =====================================================

-- Criar tabela anymarket_sinc
CREATE TABLE IF NOT EXISTS `anymarket_sinc` (
  `id` int NOT NULL AUTO_INCREMENT,
  `id_produto_vtex` int NOT NULL COMMENT 'ID do produto VTEX',
  `ref_produto_vtex` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Referência do produto VTEX',
  `id_produto_any` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket',
  `status` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT 'Status: pending, synced, error, failed',
  `sync_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'product' COMMENT 'Tipo de sincronização: product, stock, image, price',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'create' COMMENT 'Ação: create, update, delete',
  `success` tinyint(1) DEFAULT '0' COMMENT 'Se a sincronização foi bem-sucedida',
  `attempts` int DEFAULT '0' COMMENT 'Número de tentativas de sincronização',
  `max_attempts` int DEFAULT '3' COMMENT 'Número máximo de tentativas',
  `response_data` json DEFAULT NULL COMMENT 'Dados da resposta da API Anymarket',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Mensagem de erro se houver',
  `sync_duration_ms` int DEFAULT NULL COMMENT 'Duração da sincronização em ms',
  `last_attempt_at` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da última tentativa',
  `synced_at` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da sincronização bem-sucedida',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_id_produto_vtex` (`id_produto_vtex`),
  KEY `idx_ref_produto_vtex` (`ref_produto_vtex`),
  KEY `idx_id_produto_any` (`id_produto_any`),
  KEY `idx_status` (`status`),
  KEY `idx_sync_type` (`sync_type`),
  KEY `idx_action` (`action`),
  KEY `idx_success` (`success`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_synced_at` (`synced_at`),
  KEY `idx_last_attempt_at` (`last_attempt_at`),
  UNIQUE KEY `unique_produto_sync` (`id_produto_vtex`, `sync_type`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de sincronização com Anymarket - versão simplificada';

-- =====================================================
-- ADICIONAR FOREIGN KEY (OPCIONAL)
-- =====================================================
-- Descomente a linha abaixo se quiser adicionar foreign key
-- ALTER TABLE `anymarket_sinc` 
-- ADD CONSTRAINT `fk_anymarket_sinc_product` 
-- FOREIGN KEY (`id_produto_vtex`) REFERENCES `products_vtex` (`id_produto_vtex`) ON DELETE CASCADE;

-- =====================================================
-- VERIFICAR SE A TABELA FOI CRIADA
-- =====================================================
SELECT TABLE_NAME, TABLE_COMMENT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'anymarket_sinc';

-- Mostrar estrutura da tabela
DESCRIBE anymarket_sinc;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Copie todo este script SQL
-- 2. Abra seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)
-- 3. Selecione o banco de dados 'seo_db'
-- 4. Cole e execute o script
-- 5. Verifique se a tabela foi criada com sucesso
-- 
-- CARACTERÍSTICAS DA TABELA:
-- - Controle de tentativas de sincronização
-- - Diferentes tipos de sincronização (product, stock, image, price)
-- - Diferentes ações (create, update, delete)
-- - Controle de status e sucesso
-- - Armazenamento de dados de resposta e erros
-- - Timestamps para controle temporal
-- - Índices otimizados para consultas
-- - Chave única para evitar duplicatas

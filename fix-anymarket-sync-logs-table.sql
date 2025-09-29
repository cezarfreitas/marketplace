-- =====================================================
-- SCRIPT SQL PARA CORRIGIR TABELA anymarket_sync_logs
-- Execute este script no seu banco de dados MySQL
-- =====================================================

-- 1. Verificar se a tabela existe
SELECT 'Verificando se a tabela anymarket_sync_logs existe...' as status;

SELECT TABLE_NAME, TABLE_COMMENT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'anymarket_sync_logs';

-- 2. Mostrar estrutura atual da tabela
SELECT 'Estrutura atual da tabela anymarket_sync_logs:' as status;
DESCRIBE anymarket_sync_logs;

-- 3. Renomear coluna anymarket_id para id_produto_any (se existir)
SELECT 'Renomeando coluna anymarket_id para id_produto_any...' as status;

-- Verificar se a coluna anymarket_id existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'anymarket_sync_logs' 
AND COLUMN_NAME = 'anymarket_id';

-- Renomear a coluna se ela existir
ALTER TABLE `anymarket_sync_logs` 
CHANGE COLUMN `anymarket_id` `id_produto_any` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket';

-- 4. Renomear coluna product_id para id_produto_vtex (se existir)
SELECT 'Renomeando coluna product_id para id_produto_vtex...' as status;

-- Verificar se a coluna product_id existe
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'anymarket_sync_logs' 
AND COLUMN_NAME = 'product_id';

-- Renomear a coluna se ela existir
ALTER TABLE `anymarket_sync_logs` 
CHANGE COLUMN `product_id` `id_produto_vtex` int NOT NULL COMMENT 'ID do produto VTEX';

-- 5. Adicionar colunas se não existirem
SELECT 'Adicionando colunas se não existirem...' as status;

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `id_produto_vtex` int NOT NULL COMMENT 'ID do produto VTEX';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `id_produto_any` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'ID do produto no Anymarket';

-- 6. Adicionar outras colunas que podem estar faltando
SELECT 'Adicionando colunas que podem estar faltando...' as status;

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `title` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Título do produto';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Descrição do produto';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `sync_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'info' COMMENT 'Tipo de sincronização: info (informações), crop (recorte de imagens), product, stock, image, price';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'create' COMMENT 'Ação: create, update, delete';

-- 7. Adicionar índices se não existirem
SELECT 'Adicionando índices...' as status;

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_id_produto_vtex` (`id_produto_vtex`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_id_produto_any` (`id_produto_any`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_sync_type` (`sync_type`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_action` (`action`);


-- 8. Mostrar estrutura final da tabela
SELECT 'Estrutura final da tabela anymarket_sync_logs:' as status;
DESCRIBE anymarket_sync_logs;

-- 9. Mostrar índices da tabela
SELECT 'Índices da tabela anymarket_sync_logs:' as status;
SHOW INDEX FROM anymarket_sync_logs;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================
SELECT 'Verificação final - colunas importantes:' as status;

SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'anymarket_sync_logs'
AND COLUMN_NAME IN ('id', 'id_produto_vtex', 'id_produto_any', 'title', 'description', 'success', 'sync_type', 'action', 'created_at')
ORDER BY ORDINAL_POSITION;

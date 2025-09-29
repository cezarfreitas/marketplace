-- =====================================================
-- SCRIPT SQL PARA ATUALIZAR TABELAS ANYMARKET
-- Execute este script no seu banco de dados MySQL
-- =====================================================

-- 1. Remover coluna data_sincronizacao da tabela anymarket
-- =====================================================
ALTER TABLE `anymarket` 
DROP COLUMN IF EXISTS `data_sincronizacao`;

-- 2. Atualizar tabela anymarket_sync_logs
-- =====================================================
-- Adicionar colunas que podem estar faltando
ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `sync_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'product' COMMENT 'Tipo de sincronização: product, stock, image, price';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'create' COMMENT 'Ação: create, update, delete';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `attempts` int DEFAULT '0' COMMENT 'Número de tentativas de sincronização';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `max_attempts` int DEFAULT '3' COMMENT 'Número máximo de tentativas';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `sync_duration_ms` int DEFAULT NULL COMMENT 'Duração da sincronização em ms';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `last_attempt_at` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da última tentativa';

ALTER TABLE `anymarket_sync_logs` 
ADD COLUMN IF NOT EXISTS `synced_at` timestamp NULL DEFAULT NULL COMMENT 'Data/hora da sincronização bem-sucedida';

-- 3. Adicionar índices que podem estar faltando
-- =====================================================
ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_sync_type` (`sync_type`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_action` (`action`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_attempts` (`attempts`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_last_attempt_at` (`last_attempt_at`);

ALTER TABLE `anymarket_sync_logs` 
ADD INDEX IF NOT EXISTS `idx_synced_at` (`synced_at`);

-- 4. Verificar estrutura das tabelas
-- =====================================================
SELECT 'Estrutura da tabela anymarket:' as info;
DESCRIBE anymarket;

SELECT 'Estrutura da tabela anymarket_sync_logs:' as info;
DESCRIBE anymarket_sync_logs;

-- 5. Mostrar informações das tabelas
-- =====================================================
SELECT 'Informações da tabela anymarket:' as info;
SHOW CREATE TABLE anymarket;

SELECT 'Informações da tabela anymarket_sync_logs:' as info;
SHOW CREATE TABLE anymarket_sync_logs;

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================
-- 1. Copie todo este script SQL
-- 2. Abra seu cliente MySQL (phpMyAdmin, MySQL Workbench, etc.)
-- 3. Selecione o banco de dados 'seo_db'
-- 4. Cole e execute o script
-- 5. Verifique se as alterações foram aplicadas com sucesso
-- 
-- ALTERAÇÕES REALIZADAS:
-- - Removida coluna 'data_sincronizacao' da tabela 'anymarket'
-- - Adicionadas colunas na tabela 'anymarket_sync_logs':
--   * sync_type (tipo de sincronização)
--   * action (ação realizada)
--   * attempts (número de tentativas)
--   * max_attempts (máximo de tentativas)
--   * sync_duration_ms (duração da sincronização)
--   * last_attempt_at (última tentativa)
--   * synced_at (sincronização bem-sucedida)
-- - Adicionados índices para melhor performance

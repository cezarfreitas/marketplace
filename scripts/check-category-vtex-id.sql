-- Verificar o vtex_id da categoria 16 (camisetas)
SELECT id, vtex_id, name, is_active 
FROM categories_vtex 
WHERE id = 16 OR name LIKE '%camiseta%' OR name LIKE '%t-shirt%'
ORDER BY id;

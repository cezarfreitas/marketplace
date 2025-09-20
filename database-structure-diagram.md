# Estrutura do Banco de Dados - Sistema VTEX

## Diagrama de Relacionamentos

```mermaid
erDiagram
    %% Tabelas principais do sistema VTEX
    products_vtex {
        int id_produto_vtex PK
        string name
        int department_id
        int id_category_vtex FK
        int id_brand_vtex FK
        string link_id
        string ref_produto
        boolean is_visible
        text description
        text description_short
        date release_date
        text keywords
        string title
        boolean is_active
        string tax_code
        text meta_tag_description
        int supplier_id
        boolean show_without_stock
        int list_store_id
        string adwords_remarketing_code
        string lomadee_campaign_code
        timestamp created_at
        timestamp updated_at
    }

    brands_vtex {
        int id_brand_vtex PK
        string name
        boolean is_active
        string title
        text meta_tag_description
        string image_url
        text contexto
        timestamp created_at
        timestamp updated_at
    }

    categories_vtex {
        int id_category_vtex PK
        string name
        int father_category_id FK
        string title
        text description
        text keywords
        boolean is_active
        boolean show_in_store_front
        boolean has_children
        text contexto
        timestamp created_at
        timestamp updated_at
    }

    skus_vtex {
        int id_sku_vtex PK
        int id_produto_vtex FK
        boolean is_active
        string name
        string ref_sku
        timestamp date_updated
        timestamp created_at
        timestamp updated_at
    }

    images_vtex {
        int id_photo_vtex PK
        int id_sku_vtex FK
        string name
        boolean is_main
        string text
        string label
        string url
        string file_location
        int position
        timestamp created_at
        timestamp updated_at
    }

    stock_vtex {
        int id_stock_vtex PK
        int id_sku_vtex FK
        string warehouse_id
        string warehouse_name
        int total_quantity
        timestamp created_at
        timestamp updated_at
    }

    product_attributes_vtex {
        int id_attribute_vtex PK
        int id_product_vtex FK
        string attribute_id
        string attribute_name
        string attribute_value
        timestamp created_at
        timestamp updated_at
    }

    %% Tabelas de IA e geração de conteúdo
    descriptions {
        int id_product_vtex FK
        text description
        string openai_model
        int openai_tokens_used
        int openai_tokens_prompt
        int openai_tokens_completion
        float openai_temperature
        int openai_max_tokens
        int openai_response_time_ms
        decimal openai_cost
        string openai_request_id
        int generation_duration_ms
        string status
        text error_message
        timestamp created_at
        timestamp updated_at
    }

    titles {
        int id_product_vtex FK
        string title
        string original_title
        string openai_model
        int openai_tokens_used
        int openai_tokens_prompt
        int openai_tokens_completion
        decimal openai_cost
        string openai_request_id
        int openai_response_time_ms
        int openai_max_tokens
        float openai_temperature
        int generation_attempts
        boolean is_unique
        boolean validation_passed
        string status
        timestamp created_at
        timestamp updated_at
    }

    analise_imagens {
        int id_produto_vtex FK
        text contextualizacao
        string openai_model
        int openai_tokens_used
        int openai_max_tokens
        float openai_temperature
        int openai_response_time_ms
        int analysis_duration_ms
        string agent_id
        string agent_name
        int total_images
        int valid_images
        int invalid_images
        string product_type
        string analysis_quality
        int openai_tokens_prompt
        int openai_tokens_completion
        decimal openai_cost
        string openai_request_id
        string status
        text error_message
        timestamp created_at
        timestamp updated_at
        timestamp generated_at
    }

    %% Tabelas de características e respostas
    caracteristicas {
        int id PK
        string caracteristica
        text pergunta_ia
        boolean is_active
        text valores_possiveis
        text categorias
        timestamp created_at
        timestamp updated_at
    }

    respostas_caracteristicas {
        int id PK
        int produto_id FK
        string caracteristica
        text resposta
        int tokens_usados
        timestamp created_at
        timestamp updated_at
    }

    %% Tabelas de integração
    anymarket {
        int id PK
        string id_produto_any
        timestamp data_sincronizacao
        timestamp created_at
        timestamp updated_at
        string ref_produto_vtex FK
    }

    anymarket_sync_logs {
        int id PK
        int product_id FK
        string anymarket_id
        string title
        text description
        boolean success
        json response_data
        text error_message
        timestamp created_at
        timestamp updated_at
    }

    %% Tabela de usuários
    usuarios {
        int id PK
        string nome
        string email
        string senha
        string role
        boolean is_active
        timestamp last_login
        int login_attempts
        timestamp locked_until
        string avatar_url
        string telefone
        string departamento
        timestamp created_at
        timestamp updated_at
    }

    %% Relacionamentos principais
    products_vtex ||--o{ skus_vtex : "tem"
    products_vtex }o--|| brands_vtex : "pertence a"
    products_vtex }o--|| categories_vtex : "categorizado em"
    categories_vtex ||--o{ categories_vtex : "subcategoria de"
    
    skus_vtex ||--o{ images_vtex : "possui"
    skus_vtex ||--o{ stock_vtex : "tem estoque"
    
    products_vtex ||--o{ product_attributes_vtex : "tem atributos"
    products_vtex ||--o{ descriptions : "tem descrição"
    products_vtex ||--o{ titles : "tem título"
    products_vtex ||--o{ analise_imagens : "analisado"
    
    products_vtex ||--o{ respostas_caracteristicas : "tem respostas"
    anymarket }o--|| products_vtex : "sincronizado com"
    anymarket_sync_logs }o--|| products_vtex : "log de sincronização"
```

## Resumo das Tabelas e Relacionamentos

### Tabelas Principais do Sistema VTEX

1. **products_vtex** - Tabela central que armazena todos os produtos
2. **brands_vtex** - Marcas dos produtos
3. **categories_vtex** - Categorias hierárquicas dos produtos
4. **skus_vtex** - SKUs (variações) dos produtos
5. **images_vtex** - Imagens dos SKUs
6. **stock_vtex** - Estoque por SKU e warehouse
7. **product_attributes_vtex** - Atributos específicos dos produtos

### Tabelas de IA e Geração de Conteúdo

8. **descriptions** - Descrições geradas por IA
9. **titles** - Títulos gerados por IA
10. **analise_imagens** - Análises de imagens por IA

### Tabelas de Características

11. **caracteristicas** - Características definidas para produtos
12. **respostas_caracteristicas** - Respostas geradas para características

### Tabelas de Integração e Sistema

13. **anymarket** - Sincronização com plataforma Anymarket
14. **anymarket_sync_logs** - Logs de sincronização com Anymarket
15. **usuarios** - Usuários do sistema

## Relacionamentos Principais

- **products_vtex** é a tabela central que se relaciona com:
  - brands_vtex (marca do produto)
  - categories_vtex (categoria do produto)
  - skus_vtex (variações do produto)
  - product_attributes_vtex (atributos específicos)
  - descriptions (descrições geradas)
  - titles (títulos gerados)
  - analise_imagens (análises de imagens)
  - respostas_caracteristicas (respostas de características)

- **skus_vtex** se relaciona com:
  - images_vtex (imagens do SKU)
  - stock_vtex (estoque do SKU)

- **categories_vtex** tem relacionamento hierárquico consigo mesma (father_category_id)

- **anymarket** se relaciona com products_vtex através do ref_produto_vtex
- **anymarket_sync_logs** se relaciona com products_vtex através do product_id

## Observações Importantes

1. **Chaves Primárias**: A maioria das tabelas usa IDs específicos do VTEX como chave primária
2. **Timestamps**: Todas as tabelas têm campos created_at e updated_at para auditoria
3. **Soft Delete**: Uso de campos is_active para desativação lógica
4. **IA Integration**: Múltiplas tabelas armazenam métricas de uso da OpenAI
5. **Hierarquia**: categories_vtex suporta estrutura hierárquica de categorias
6. **Integração**: Sistema preparado para sincronização com Anymarket

# VTEX Product Importer

Sistema completo para importação de produtos, categorias e marcas da plataforma VTEX diretamente para um banco de dados MySQL.

## 🚀 Características

- **Integração VTEX**: Conecta-se diretamente com a API da VTEX
- **Importação Automática**: Importa produtos, categorias, marcas e SKUs
- **Interface Moderna**: Dashboard web responsivo com Tailwind CSS
- **Banco MySQL**: Armazena dados de forma estruturada
- **Docker**: Containerização para deploy fácil
- **Autenticação JWT**: Sistema de login seguro
- **Relatórios**: Acompanhamento de importações e estatísticas

## 🛠️ Tecnologias

### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **Lucide React** - Ícones

### Backend
- **Node.js** - Runtime JavaScript
- **MySQL2** - Driver MySQL
- **JWT** - Autenticação
- **Axios** - Cliente HTTP

### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Nginx** - Proxy reverso (opcional)

## 📋 Pré-requisitos

- Docker e Docker Compose
- Conta VTEX com acesso à API
- Banco MySQL (já configurado)

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# VTEX API Configuration
VTEX_ACCOUNT_NAME=your-vtex-account
VTEX_ENVIRONMENT=vtexcommercestable
VTEX_APP_KEY=your-app-key
VTEX_APP_TOKEN=your-app-token

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

### 2. Configuração do Banco de Dados

O banco de dados já está configurado com as seguintes credenciais:
- **Host**: server.idenegociosdigitais.com.br
- **Port**: 3349
- **Database**: meli
- **User**: meli
- **Password**: 7dd3e59ddb3c3a5da0e3

### 3. Configuração das Tabelas

Execute o script de configuração do banco:

```bash
node scripts/setup-database.js
```

## 🚀 Deploy

### Deploy com Docker Compose

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd vtex-product-importer
```

2. **Configure as variáveis de ambiente**:
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

3. **Execute o setup do banco**:
```bash
node scripts/setup-database.js
```

4. **Inicie a aplicação**:
```bash
# Apenas a aplicação
docker-compose up -d app

# Com Nginx (produção)
docker-compose --profile production up -d
```

### Deploy Manual

1. **Instale as dependências**:
```bash
npm install
```

2. **Configure o banco**:
```bash
node scripts/setup-database.js
```

3. **Build da aplicação**:
```bash
npm run build
```

4. **Inicie a aplicação**:
```bash
npm start
```

## 📊 Uso

### 1. Acesso ao Sistema

- **URL**: http://localhost:3000
- **Usuário padrão**: admin
- **Senha padrão**: admin123

### 2. Importação de Dados

1. Acesse a página de **Importação** (`/import`)
2. Clique em **Importar** para cada tipo de dado:
   - **Marcas**: Importa todas as marcas da VTEX
   - **Categorias**: Importa hierarquia de categorias
   - **Produtos**: Importa produtos e especificações
   - **SKUs**: Importa variações de produtos

### 3. Dashboard

Acesse o **Dashboard** (`/dashboard`) para:
- Visualizar estatísticas do banco
- Acompanhar importações recentes
- Ver relatórios de sucesso/falha

## 🗄️ Estrutura do Banco

### Tabelas Principais

- **`brands`** - Marcas dos produtos
- **`categories`** - Categorias hierárquicas
- **`products`** - Produtos principais
- **`skus`** - Variações de produtos
- **`product_specifications`** - Especificações técnicas
- **`product_images`** - Imagens dos produtos
- **`product_videos`** - Vídeos dos produtos

### Tabelas de Controle

- **`import_logs`** - Logs de importação
- **`import_items`** - Itens processados
- **`users`** - Usuários do sistema

## 🔧 API Endpoints

### Importação
- `POST /api/import/brands` - Importar marcas
- `POST /api/import/categories` - Importar categorias
- `POST /api/import/products` - Importar produtos
- `POST /api/import/skus` - Importar SKUs

### Estatísticas
- `GET /api/import/stats` - Estatísticas gerais
- `GET /api/import/brands` - Estatísticas de marcas
- `GET /api/import/categories` - Estatísticas de categorias
- `GET /api/import/products` - Estatísticas de produtos
- `GET /api/import/skus` - Estatísticas de SKUs

## 🔐 Autenticação

O sistema usa JWT para autenticação. Para acessar as APIs protegidas:

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# Usar token nas requisições
curl -X GET http://localhost:3000/api/import/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📈 Monitoramento

### Logs de Importação

O sistema registra todas as importações com:
- Status (pending, processing, completed, failed)
- Número de itens processados
- Tempo de execução
- Mensagens de erro

### Estatísticas

Acesse `/api/import/stats` para obter:
- Total de registros por tabela
- Taxa de sucesso das importações
- Histórico de importações
- Últimas importações por tipo

## 🛡️ Segurança

- **JWT**: Tokens seguros para autenticação
- **Rate Limiting**: Proteção contra abuso (com Nginx)
- **Headers de Segurança**: XSS, CSRF, etc.
- **Validação**: Validação de dados de entrada
- **Logs**: Auditoria de ações

## 🔄 Manutenção

### Backup do Banco

```bash
# Backup completo
mysqldump -h server.idenegociosdigitais.com.br -P 3349 -u meli -p meli > backup.sql

# Restore
mysql -h server.idenegociosdigitais.com.br -P 3349 -u meli -p meli < backup.sql
```

### Limpeza de Logs

```sql
-- Limpar logs antigos (manter últimos 30 dias)
DELETE FROM import_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
DELETE FROM import_items WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com VTEX**:
   - Verifique as credenciais da API
   - Confirme se a conta tem permissões necessárias

2. **Erro de conexão com MySQL**:
   - Verifique se o banco está acessível
   - Confirme as credenciais de conexão

3. **Importação lenta**:
   - Ajuste o `batchSize` nas requisições
   - Verifique a velocidade da conexão

### Logs

```bash
# Logs da aplicação
docker-compose logs -f app

# Logs do Nginx
docker-compose logs -f nginx
```

## 📝 Licença

Este projeto é proprietário. Todos os direitos reservados.

## 🤝 Suporte

Para suporte técnico, entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para importação eficiente de dados VTEX**

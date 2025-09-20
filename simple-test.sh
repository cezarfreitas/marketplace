#!/bin/bash

# Script simples para testar remoção de características
# Substitua SEU_TOKEN_AQUI pelo token real

TOKEN="SEU_TOKEN_AQUI"
PRODUCT_ID=348547731

echo "Testando remoção de características..."
echo "Product ID: $PRODUCT_ID"
echo ""

# Fazer PATCH diretamente
curl -X PATCH \
  "https://api.anymarket.com.br/v2/products/patch/$PRODUCT_ID" \
  -H "gumgaToken: $TOKEN" \
  -H "Content-Type: application/json-patch+json" \
  -d '[
    {
      "op": "replace",
      "path": "/characteristics",
      "value": []
    }
  ]' \
  -w "\nStatus: %{http_code}\n"

echo ""
echo "Verificando resultado..."

# Verificar se funcionou
curl -X GET \
  "https://api.anymarket.com.br/v2/products/$PRODUCT_ID" \
  -H "gumgaToken: $TOKEN" \
  -H "Content-Type: application/json" \
  | jq '.characteristics'

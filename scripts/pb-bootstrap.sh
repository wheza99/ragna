#!/bin/bash
# ── Bootstrap PocketBase collections for Ragna ────────────────
# Usage: ./scripts/pb-bootstrap.sh [PB_URL] [ADMIN_EMAIL] [ADMIN_PASSWORD]

set -euo pipefail

PB_URL="${1:-http://localhost:8090}"
ADMIN_EMAIL="${2:-admin@wheza.id}"
ADMIN_PASSWORD="${3:-Admin123!}"

echo "🔧 Bootstrapping Ragna collections at $PB_URL"

# ── Auth as superuser ──────────────────────────────────────
TOKEN=$(curl -s -X POST "$PB_URL/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d "{\"identity\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "✅ Authenticated as superuser"

AUTH="Authorization: Bearer $TOKEN"

# ── Helper: create or update collection ─────────────────────
create_collection() {
  local name="$1"
  local body="$2"
  echo "  📦 Creating collection: $name"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PB_URL/api/collections" \
    -H "$AUTH" \
    -H "Content-Type: application/json" \
    -d "$body")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "  ✅ Created $name"
  else
    UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$PB_URL/api/collections/$name" \
      -H "$AUTH" \
      -H "Content-Type: application/json" \
      -d "$body")
    
    UPDATE_CODE=$(echo "$UPDATE_RESPONSE" | tail -1)
    if [ "$UPDATE_CODE" = "200" ]; then
      echo "  ✅ Updated $name"
    else
      echo "  ⚠️  $name: $(echo "$UPDATE_RESPONSE" | sed '$d')"
    fi
  fi
}

# ── agents ──────────────────────────────────────────────────
create_collection "agents" '{
  "name": "agents",
  "type": "base",
  "fields": [
    {"name": "name", "type": "text", "required": true},
    {"name": "description", "type": "text", "required": false},
    {"name": "system_prompt", "type": "text", "required": false},
    {"name": "model", "type": "text", "required": true},
    {"name": "whatsapp_phone", "type": "text", "required": false},
    {"name": "washarp_api_key", "type": "text", "required": false},
    {"name": "washarp_api_url", "type": "url", "required": false},
    {"name": "groq_api_key", "type": "text", "required": false},
    {"name": "status", "type": "select", "required": true, "values": ["active","inactive","draft"], "maxSelect": 1},
    {"name": "user_id", "type": "text", "required": true},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE INDEX idx_agents_user_id ON agents (user_id)",
    "CREATE INDEX idx_agents_status ON agents (status)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "updateRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "deleteRule": "@request.auth.id != \"\" && user_id = @request.auth.id"
}'

# ── tools ───────────────────────────────────────────────────
create_collection "tools" '{
  "name": "tools",
  "type": "base",
  "fields": [
    {"name": "agent_id", "type": "text", "required": true},
    {"name": "name", "type": "text", "required": true},
    {"name": "description", "type": "text", "required": false},
    {"name": "method", "type": "select", "required": true, "values": ["GET","POST","PUT","PATCH","DELETE"], "maxSelect": 1},
    {"name": "url", "type": "text", "required": true},
    {"name": "headers", "type": "json", "required": false},
    {"name": "body", "type": "json", "required": false},
    {"name": "status", "type": "select", "required": true, "values": ["active","inactive"], "maxSelect": 1},
    {"name": "user_id", "type": "text", "required": true},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE INDEX idx_tools_agent_id ON tools (agent_id)",
    "CREATE INDEX idx_tools_user_id ON tools (user_id)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "updateRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "deleteRule": "@request.auth.id != \"\" && user_id = @request.auth.id"
}'

# ── messages ────────────────────────────────────────────────
create_collection "messages" '{
  "name": "messages",
  "type": "base",
  "fields": [
    {"name": "agent_id", "type": "text", "required": true},
    {"name": "phone", "type": "text", "required": true},
    {"name": "direction", "type": "select", "required": true, "values": ["inbound","outbound"], "maxSelect": 1},
    {"name": "content", "type": "text", "required": true},
    {"name": "metadata", "type": "json", "required": false},
    {"name": "status", "type": "select", "required": false, "values": ["pending","sent","delivered","read","failed"], "maxSelect": 1},
    {"name": "user_id", "type": "text", "required": true},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE INDEX idx_messages_agent_id ON messages (agent_id)",
    "CREATE INDEX idx_messages_phone ON messages (phone)",
    "CREATE INDEX idx_messages_user_id ON messages (user_id)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "",
  "updateRule": "",
  "deleteRule": "@request.auth.id != \"\" && user_id = @request.auth.id"
}'

# ── api_keys ────────────────────────────────────────────────
create_collection "api_keys" '{
  "name": "api_keys",
  "type": "base",
  "fields": [
    {"name": "user_id", "type": "text", "required": true},
    {"name": "name", "type": "text", "required": true},
    {"name": "key_hash", "type": "text", "required": true},
    {"name": "key_prefix", "type": "text", "required": true},
    {"name": "key_suffix", "type": "text", "required": true},
    {"name": "last_used_at", "type": "date", "required": false},
    {"name": "expires_at", "type": "date", "required": false},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys (key_hash)",
    "CREATE INDEX idx_api_keys_user_id ON api_keys (user_id)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "updateRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "deleteRule": "@request.auth.id != \"\" && user_id = @request.auth.id"
}'

# ── payments ────────────────────────────────────────────────
create_collection "payments" '{
  "name": "payments",
  "type": "base",
  "fields": [
    {"name": "user_id", "type": "text", "required": true},
    {"name": "amount", "type": "number", "required": true},
    {"name": "status", "type": "text", "required": true},
    {"name": "url", "type": "url", "required": false},
    {"name": "metadata", "type": "json", "required": false},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE INDEX idx_payments_user_id ON payments (user_id)",
    "CREATE INDEX idx_payments_status ON payments (status)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "updateRule": "",
  "deleteRule": ""
}'

# ── credits ─────────────────────────────────────────────────
create_collection "credits" '{
  "name": "credits",
  "type": "base",
  "fields": [
    {"name": "user_id", "type": "text", "required": true},
    {"name": "total", "type": "number", "required": true},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE UNIQUE INDEX idx_credits_user_id ON credits (user_id)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "",
  "updateRule": "",
  "deleteRule": ""
}'

# ── transactions ────────────────────────────────────────────
create_collection "transactions" '{
  "name": "transactions",
  "type": "base",
  "fields": [
    {"name": "user_id", "type": "text", "required": true},
    {"name": "description", "type": "text", "required": true},
    {"name": "amount", "type": "number", "required": true},
    {"name": "type", "type": "text", "required": true},
    {"name": "metadata", "type": "json", "required": false},
    {"name": "created", "type": "autodate", "onCreate": true, "onUpdate": false},
    {"name": "updated", "type": "autodate", "onCreate": true, "onUpdate": true}
  ],
  "indexes": [
    "CREATE INDEX idx_transactions_user_id ON transactions (user_id)"
  ],
  "listRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "viewRule": "@request.auth.id != \"\" && user_id = @request.auth.id",
  "createRule": "",
  "updateRule": "",
  "deleteRule": ""
}'

echo ""
echo "🎉 Bootstrap complete!"

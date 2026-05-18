#!/bin/sh
cat > /usr/share/nginx/html/env-config.js << EOF
window.__env__ = {
  API_URL: "${API_URL:-http://localhost:3001}",
  POSTGREST_URL: "${POSTGREST_URL:-http://localhost:3000}"
};
EOF
exec nginx -g "daemon off;"

#!/bin/bash
set -e

echo "🧪 YoutubAlMuslim Test Suite"
echo "=============================="

# Start local server
echo "📡 Starting local server..."
npx http-server -p 8888 -c-1 > /tmp/http-server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Cleanup on exit
trap "kill $SERVER_PID 2>/dev/null" EXIT

echo "🔍 Testing app with Playwright..."

# Install playwright if needed
if ! npm list @playwright/test > /dev/null 2>&1; then
  echo "📦 Installing Playwright..."
  npm install -D @playwright/test --no-save 2>&1 | grep -v "EBADENGINE\|connect" || true
fi

# Run tests
npx playwright test tests/app.spec.js \
  --config playwright.config.js \
  --base-url http://localhost:8888

echo "✅ Tests completed!"

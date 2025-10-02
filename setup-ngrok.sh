#!/bin/bash

echo "🚀 Setting up ngrok for local testing..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed."
    echo ""
    echo "Install it with:"
    echo "  brew install ngrok"
    echo ""
    echo "Or download from: https://ngrok.com/download"
    exit 1
fi

echo "✅ ngrok is installed"
echo ""
echo "Starting ngrok tunnel to localhost:3000..."
echo ""
echo "⚠️  After ngrok starts:"
echo "   1. Copy the ngrok URL (e.g., abc123.ngrok.io)"
echo "   2. Open another terminal"
echo "   3. Run: echo 'VERCEL_URL=abc123.ngrok.io' >> .env"
echo "   4. Restart your dev server"
echo ""
echo "Press Ctrl+C to stop ngrok"
echo ""

# Start ngrok
ngrok http 3000


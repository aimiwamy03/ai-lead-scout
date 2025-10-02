#!/bin/bash

echo "🧪 Testing AI Email Generation"
echo ""
echo "This will send a test AI-generated email to TEST_EMAIL"
echo ""

# Check if server is running
if ! curl -s http://localhost:3000/api/healthz > /dev/null 2>&1; then
  echo "❌ Server not running. Start it with: npm run dev"
  exit 1
fi

echo "✅ Server is running"
echo ""

# You'll need to replace RECORD_ID with an actual record ID from your Airtable
# Get it from: https://airtable.com/your-base-id/Leads (click on a record, copy the ID from URL)

read -p "Enter the Airtable Record ID (starts with 'rec'): " RECORD_ID

if [ -z "$RECORD_ID" ]; then
  echo "❌ No record ID provided"
  exit 1
fi

echo ""
echo "📧 Sending AI-drafted email for record: $RECORD_ID"
echo "⏳ This takes ~10 seconds (AI generation + email sending)..."
echo ""

curl -X POST http://localhost:3000/api/approve \
  -H "Content-Type: application/json" \
  -d "{\"airtableRecordId\": \"$RECORD_ID\"}" \
  2>/dev/null | jq

echo ""
echo "✅ Done! Check your TEST_EMAIL inbox"
echo "📊 Also check the Airtable record - status should be updated"


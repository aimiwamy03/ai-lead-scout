#!/bin/bash
echo "Testing Slack notification for a Tier-1 company..."
echo ""
echo "This will:"
echo "1. Process a single Tier-1 company (Stripe)"
echo "2. Send a Slack notification to #demo-intel"
echo "3. Show you what the notification looks like"
echo ""

curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"limit": 1, "categories": "Payments"}' \
  2>&1 | tail -20

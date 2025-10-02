# Local Testing with ngrok

## Setup ngrok for Local Development

ngrok creates a temporary public URL that tunnels to your localhost.

### 1. Install ngrok
```bash
# Using Homebrew (Mac)
brew install ngrok

# Or download from https://ngrok.com/download
```

### 2. Start Your Dev Server
```bash
cd /Users/rienespecial/Dealops
npm run dev
```

### 3. Start ngrok in Another Terminal
```bash
ngrok http 3000
```

You'll see output like:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### 4. Update Your .env
Add this line to your `.env` file:
```bash
VERCEL_URL=abc123.ngrok.io
```

**Important:** Don't include `https://` in VERCEL_URL, just the domain!

### 5. Restart Your Server
Kill and restart your dev server so it picks up the new VERCEL_URL:
```bash
# Stop the server (Ctrl+C or pkill)
pkill -f "next dev"

# Restart
npm run dev
```

### 6. Test It!
```bash
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{"limit": 1, "categories": "Payments"}'
```

Now the Slack "Approve & Send" button will use:
`https://abc123.ngrok.io/api/approve?rid=recXXX`

And it will work from anywhere!

## Notes
- ngrok URLs are temporary (expire after 2 hours on free plan)
- Each time you restart ngrok, you get a new URL
- For production, deploy to Vercel instead


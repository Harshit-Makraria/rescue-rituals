# Gather — web (Next.js)

Frontend for the Events API. See the [root README](../../README.md) for architecture and deploy steps.

```bash
echo "API_URL=http://localhost:3001" > .env.local
npm install && npm run dev
npm run gen:api   # regenerate typed client from ../api/openapi.json
```

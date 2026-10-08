# LIFE — Telegram Mini App MVP

Цифровое зеркало реальной жизни. Mobile-first React/TypeScript/Vite prototype.

## Deploy to Vercel
1. Create a GitHub repository and upload this folder.
2. Import repository into Vercel.
3. Framework: Vite (Vercel detects it automatically).
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

No environment variables are required for this prototype.

## Telegram
After Vercel gives you an HTTPS URL, create a Mini App in @BotFather and set that URL as its Web App URL / menu button URL. The frontend never contains a bot token.

## Local data
Goals and habits use localStorage in this prototype. The storage layer is isolated so it can later be replaced by a backend/cloud API.

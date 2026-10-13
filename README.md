# NYL Photo Healing: healers' screen

The healers (Nisar and Sahala) log in and see each healing time's patients: photo, booking number, name, age, district and illness. The photos come from the WhatsApp bot (`NYL - Photo Healing (WhatsApp)` in n8n).

- Phone: 10 patients per page (swipe left or right). Tablet and laptop: 20. Big screen or TV: 40.
- Tap a photo to see it full screen, with Previous and Next.
- The screen refreshes every minute, so new bookings appear on their own.
- Photos stay in the private `nyl-photos` bucket. The app shows them through links that expire after 1 hour, only after login.

## Settings (environment variables)

| Name | What to put |
|---|---|
| `SUPABASE_URL` | Supabase project URL, e.g. `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | The **service_role** key (Supabase → Project Settings → API Keys). Server only, never shared. |
| `PHOTO_BUCKET` | `nyl-photos` |
| `SESSION_SECRET` | A long random text, 32+ characters. Changing it logs everyone out. |
| `HEALER_USERS` | The logins, e.g. `[{"username":"nisar","name":"Nisar","password":"..."},{"username":"sahala","name":"Sahala","password":"..."}]` |

To change a healer's name or password, or add a healer, edit `HEALER_USERS` and redeploy. No code change needed.

## Deploy on Vercel

1. Put this folder in a **private** GitHub repository.
2. On vercel.com: **Add New → Project**, import the repository. Framework: Next.js (detected automatically).
3. Before deploying, open **Environment Variables** and add the five settings above.
4. Click **Deploy**. Open the address Vercel gives you and log in.

## Moving to the company server later

- Supabase moves: change `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then redeploy.
- App moves off Vercel: on any server with Node.js 18.18 or newer:
  ```
  npm install
  npm run build
  npm start            # runs on port 3000; put it behind HTTPS (e.g. Nginx)
  ```
  Put the five settings in a `.env.local` file next to `package.json`.

## Notes

- Payment is not checked yet. Every booking with a photo appears. When the payment gateway is ready, the bot will mark bookings and this screen can show only paid ones.
- The TV screen with a session QR code is the next step and is not part of this version.

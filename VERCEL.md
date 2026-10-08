# Teacher-Student Platform — Vercel Deployment Guide

Ushbu qo'llanma orqali platformani Vercelga oson va to'g'ri joylashtirishingiz mumkin.

---

## 1. Talablar (Prerequisites)

1. **GitHub Repository:** `islombek4642/teacher-student-platform`
2. **Vercel hisobi:** [vercel.com](https://vercel.com)
3. **Bulutli PostgreSQL ma'lumotlar bazasi (Cloud Database):**
   Vercel serverless platforma bo'lganligi uchun tashqi PostgreSQL bazasi kerak bo'ladi. Bepul variantlar:
   - **[Neon.tech](https://neon.tech)** *(Tavsiya etiladi — Vercel bilan juda tez va qulay ishlaydi)*
   - **[Supabase](https://supabase.com)**
   - **[Railway](https://railway.app)**

---

## 2. 1-qadam: Ma'lumotlar bazasini sozlash (Neon yoki Supabase)

1. [Neon.tech](https://neon.tech) saytiga kiring va yangi loyiha (Project) yarating.
2. Berilgan ulanish havolasini (Connection String) nusxalab oling:
   ```text
   postgresql://username:password@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```
3. Lokal kompyuteringizdan turib ushbu bazaga jadvallarni yuboring:
   ```powershell
   cd backend
   # Powershell'da DATABASE_URL ni vaqtincha yangi havolaga o'rnating:
   $env:DATABASE_URL="postgresql://username:password@ep-xyz.eu-central-1.aws.neon.tech/neondb?sslmode=require"
   
   # Prisma migratsiyasini ishga tushiring:
   npx prisma migrate deploy
   
   # Dastlabki super-admin akkauntini bazada yarating:
   npm run prisma:seed
   ```

---

## 3. 2-qadam: Vercel'da loyiha yaratish

1. [vercel.com/new](https://vercel.com/new) sahifasiga kiring.
2. GitHub'dan `islombek4642/teacher-student-platform` omborini tanlang va **Import** tugmasini bosing.
3. Loyihada allaqachon sozlangan `vercel.json` tufayli Vercel Frontend va Backend servislarini avtomatik taniydi.

---

## 4. 3-qadam: Environment Variables (Muhit o'zgaruvchilari)

Vercel loyiha sozlamalarida quyidagi o'zgaruvchilarni kiriting:

| O'zgaruvchi nomi | Tavsif | Misol qiymat |
| :--- | :--- | :--- |
| `DATABASE_URL` | Bulutli PostgreSQL ulanish havolasi | `postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Autentifikatsiya uchun maxfiy kalit | `k7v8x9a1m2p4q5r6s7t8u9v0w1x2y3z4` |
| `JWT_EXPIRES_IN` | Token amal qilish muddati | `8h` |
| `CREDENTIALS_ENCRYPTION_KEY` | Parollarni shifrlash uchun 32+ belgili kalit | `x8y9z0a1b2c3d4e5f6g7h8i9j0k1l2m3` |
| `SUPER_ADMIN_USERNAME` | Tizim bosh ma'muri logini | `superadmin` |
| `SUPER_ADMIN_PASSWORD` | Tizim bosh ma'muri paroli | `KuchliParol123!` |

> [!CAUTION]
> `CREDENTIALS_ENCRYPTION_KEY` qiymatini bir marta o'rnatgandan so'ng aslo o'zgartirmang. Agar u o'zgarsa, bazada saqlangan o'qituvchi va o'quvchilar parollarini shifrdan chiqarib bo'lmaydi.

---

## 5. 4-qadam: Deploy va Natija

1. **Deploy** tugmasini bosing.
2. Vercel frontend va backendni yig'adi hamda bitta domen ostida tayyor havola (masalan, `teacher-student-platform.vercel.app`) beradi.
3. Tizimga `superadmin` va o'zingiz kiritgan parol bilan kiring.

---

## 6. Foydali ma'lumotlar

* **Fayllar filtri (`.vercelignore`):** Loyihadagi og'ir test datasetlari (`dataset/`), lokal skriptlar va loglar Vercelga ortiqcha yuklanmasligi uchun `.vercelignore` orqali cheklangan.
* **API yo'naltirishlari (`vercel.json`):** `/auth/*`, `/groups/*`, `/teachers/*`, `/students/*`, `/ielts/*`, `/api/*` so'rovlari avtomatik backend xizmatiga yo'naltiriladi.

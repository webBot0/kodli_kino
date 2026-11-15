# 🎬 Kino City Bot — Telegram Premium Dizayn

Ushbu bot **Kino City** loyihasi uchun to'liq yangilangan bo'lib, **Telegram Premium stikerlari va Custom Emoji dizayni** bilan boyitilgan.

---

## ✨ Loyihadagi Yangi Dizayn Xususiyatlari

1. **Telegram Premium Custom Emoji Stikerlari (`icon_custom_emoji_id`)**:
   - Telegram Bot API 9.4+ yangilanishi asosida inline va reply tugmalarga animatsiyali Premium stikerlar biriktirilgan.
   - Barcha stiker ID lari `design.js` faylida markazlashtirilgan.

2. **Rangli Tugma Uslublari (`style`)**:
   - **`success`** (yashil) — Obunani tasdiqlash, "Ha" tugmalari uchun;
   - **`danger`** (qizil) — Kanallarni o'chirish, "Yo'q" tugmalari uchun;
   - **`primary`** (ko'k / aksent) — Kanallarga o'tish, film tomosha qilish havolalari uchun.

3. **Premium Vizual Belgilar & Emojilar**:
   - 👑 Admin menyusi: `👑 Statistika 📊`, `🚀 Xabar yuborish 📢`, `⚡ Kanal qo'shish ➕`, `⚙️ Kanallarni boshqarish 🗑`, `💎 Majburiy Link 🔗`
   - ⚡ Obunani tekshirish: `⚡ Obunani tekshirish 💎`
   - 🎬 Kino tugmasi: `🎬 Kinoni tomosha qilish 🍿`

4. **Avtomatik Fallback (Xatolikdan himoya)**:
   - Agar bot egasida Telegram Premium yoki Fragment username bo'lmasa, Telegram API `BUTTON_CUSTOM_EMOJI_INVALID` xatosini qaytaradi.
   - `setupCustomEmojiFallback` funksiyasi buni avtomatik tutib oladi, stiker ID larini tozalab xabarni xatosiz yetkazadi. Bot hech qachon to'xtab qolmaydi.

---

## 🎨 Stiker ID larini o'zgartirish (`design.js`)

O'zingiz xohlagan Telegram Premium stiker to'plamidagi ID larni `design.js` faylida yoki `.env` orqali osongina sozlashingiz mumkin:

```env
EMOJI_STATS=5368324170671202286
EMOJI_BROADCAST=5368324170671202286
EMOJI_ADD_CH=5368324170671202286
EMOJI_MANAGE_CH=5310169226856644648
EMOJI_LINK=5368324170671202286
EMOJI_CHECK=5285430309720966085
EMOJI_DELETE=5310169226856644648
EMOJI_CHANNEL=5368324170671202286
EMOJI_MOVIE=5368324170671202286
```

### Stiker ID sini qanday olish mumkin?
1. Telegramda istalgan stiker/emoji ID sini beruvchi botga (masalan: `@EmojiIdBot`) Premium emojini yuboring.
2. Bot sizga 18-19 xonali son (masalan: `5368324170671202286`) qaytaradi.
3. Ushbu sonni `design.js` yoki `.env` dagi mos o'zgaruvchiga qo'ying.

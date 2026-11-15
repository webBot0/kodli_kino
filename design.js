const { Markup } = require('telegraf');

/**
 * 👑 KINO CITY | TELEGRAM PREMIUM DIZAYN VA STIKERLAR TIZIMI
 * 
 * Telegram Bot API 9.4+ versiyasida tugmalarga Telegram Premium stiker-emojilarni (custom emoji)
 * 'icon_custom_emoji_id' parametri orqali biriktirish imkoniyati mavjud.
 * Shuningdek, tugmalar rangini 'style' ('primary' | 'success' | 'danger') orqali boshqarish mumkin.
 */

// 1. Telegram Premium Custom Emoji Sticker ID'lari
// Agar o'zingizning maxsus stiker to'plamingiz bo'lsa, ushbu ID larni o'zingizniki bilan almashtirishingiz mumkin.
const CUSTOM_EMOJIS = {
    STATS: process.env.EMOJI_STATS || "5368324170671202286",        // 📊 Statistika stikeri
    BROADCAST: process.env.EMOJI_BROADCAST || "5368324170671202286",  // 📢 Xabar stikeri
    ADD_CH: process.env.EMOJI_ADD_CH || "5368324170671202286",      // ➕ Qo'shish stikeri
    MANAGE_CH: process.env.EMOJI_MANAGE_CH || "5310169226856644648",  // 🗑 Boshqarish / o'chirish stikeri
    LINK: process.env.EMOJI_LINK || "5368324170671202286",          // 🔗 Havola stikeri
    CHECK: process.env.EMOJI_CHECK || "5285430309720966085",        // ✅ Tasdiqlash stikeri
    DELETE: process.env.EMOJI_DELETE || "5310169226856644648",      // ❌ O'chirish stikeri
    YES: process.env.EMOJI_YES || "5285430309720966085",            // ✅ Ha stikeri
    NO: process.env.EMOJI_NO || "5310169226856644648",              // ❌ Yo'q stikeri
    CHANNEL: process.env.EMOJI_CHANNEL || "5368324170671202286",    // 📢 Kanal stikeri
    MOVIE: process.env.EMOJI_MOVIE || "5368324170671202286",        // 🎬 Kino stikeri
    POST: process.env.EMOJI_POST || "5368324170671202286",          // 📝 Post stikeri
    FORWARD: process.env.EMOJI_FORWARD || "5368324170671202286"     // 🔄 Forward stikeri
};

// 2. Barcha tugmalar matnlari (Telegram Premium uslubida)
const BUTTONS = {
    // Admin Reply Keyboard
    STATS: '👑 Statistika 📊',
    BROADCAST: '🚀 Xabar yuborish 📢',
    ADD_CH: "⚡ Kanal qo'shish ➕",
    MANAGE_CH: "⚙️ Kanallarni boshqarish 🗑",
    ADD_CH2: "⚡ Majbur-2 qo'shish ➕",
    MANAGE_CH2: "⚙️ Majbur-2 boshqarish 🗑",
    MANDATORY_LINK: "💎 Majburiy Link 🔗",

    // Inline tugmalar
    CHECK_SUB: "⚡ Obunani tekshirish 💎",
    DELETE_CH: "🗑 Kanalni o'chirish ❌",
    MSG_SIMPLE: "📝 Oddiy xabar (Post) ✨",
    MSG_FORWARD: "🔄 Forward (Uzatish) 🚀",
    BTN_YES: "✅ Ha, tugma qo'shish",
    BTN_NO: "❌ Yo'q, tugmasiz",
    WATCH_MOVIE: "🎬 Kinoni tomosha qilish 🍿"
};

let customEmojiSupported = process.env.ENABLE_CUSTOM_EMOJI !== 'false';

// Helper: Inline tugma yasash (Telegram Premium stiker va style bilan)
function createInlineButton(text, callback_data, options = {}) {
    const btn = { text, callback_data };
    if (customEmojiSupported && options.icon_custom_emoji_id) {
        btn.icon_custom_emoji_id = String(options.icon_custom_emoji_id);
    }
    if (options.style) {
        btn.style = options.style;
    }
    return btn;
}

// Helper: URL tugma yasash
function createUrlButton(text, url, options = {}) {
    const btn = { text, url };
    if (customEmojiSupported && options.icon_custom_emoji_id) {
        btn.icon_custom_emoji_id = String(options.icon_custom_emoji_id);
    }
    if (options.style) {
        btn.style = options.style;
    }
    return btn;
}

// Helper: Reply Keyboard tugmasi
function createKeyboardButton(text, options = {}) {
    const btn = { text };
    if (customEmojiSupported && options.icon_custom_emoji_id) {
        btn.icon_custom_emoji_id = String(options.icon_custom_emoji_id);
    }
    return btn;
}

// 1. Admin Asosiy Menyusi (Reply Keyboard)
function getAdminKeyboard() {
    return Markup.keyboard([
        [
            createKeyboardButton(BUTTONS.STATS, { icon_custom_emoji_id: CUSTOM_EMOJIS.STATS }),
            createKeyboardButton(BUTTONS.BROADCAST, { icon_custom_emoji_id: CUSTOM_EMOJIS.BROADCAST })
        ],
        [
            createKeyboardButton(BUTTONS.ADD_CH, { icon_custom_emoji_id: CUSTOM_EMOJIS.ADD_CH }),
            createKeyboardButton(BUTTONS.MANAGE_CH, { icon_custom_emoji_id: CUSTOM_EMOJIS.MANAGE_CH })
        ],
        [
            createKeyboardButton(BUTTONS.ADD_CH2, { icon_custom_emoji_id: CUSTOM_EMOJIS.ADD_CH }),
            createKeyboardButton(BUTTONS.MANAGE_CH2, { icon_custom_emoji_id: CUSTOM_EMOJIS.MANAGE_CH })
        ],
        [
            createKeyboardButton(BUTTONS.MANDATORY_LINK, { icon_custom_emoji_id: CUSTOM_EMOJIS.LINK })
        ]
    ]).resize();
}

// 2. Kanallarga obuna bo'lish klaviaturasi (Inline Keyboard)
function getSubscriptionKeyboard(channels, callbackData = 'check_sub', phase = 1) {
    const prefix = phase === 2 ? '🍿' : '🎬';
    const rows = channels.map((ch, idx) => {
        const title = ch.name.startsWith(prefix) ? ch.name : `${prefix} ${idx + 1}-Kanal: ${ch.name} ↗️`;
        return [
            createUrlButton(title, ch.link, {
                icon_custom_emoji_id: CUSTOM_EMOJIS.CHANNEL,
                style: 'primary'
            })
        ];
    });

    rows.push([
        createInlineButton(BUTTONS.CHECK_SUB, callbackData, {
            icon_custom_emoji_id: CUSTOM_EMOJIS.CHECK,
            style: 'success'
        })
    ]);

    return Markup.inlineKeyboard(rows);
}

// 3. Kanalni o'chirish klaviaturasi
function getDeleteChannelKeyboard(channelId, isPhase2 = false) {
    const callbackData = isPhase2 ? `del2_${channelId}` : `del_${channelId}`;
    return Markup.inlineKeyboard([
        [
            createInlineButton(BUTTONS.DELETE_CH, callbackData, {
                icon_custom_emoji_id: CUSTOM_EMOJIS.DELETE,
                style: 'danger'
            })
        ]
    ]);
}

// 4. Reklama turi klaviaturasi
function getBroadcastTypeKeyboard() {
    return Markup.inlineKeyboard([
        [
            createInlineButton(BUTTONS.MSG_SIMPLE, 'msg_simple', {
                icon_custom_emoji_id: CUSTOM_EMOJIS.POST,
                style: 'primary'
            })
        ],
        [
            createInlineButton(BUTTONS.MSG_FORWARD, 'msg_forward', {
                icon_custom_emoji_id: CUSTOM_EMOJIS.FORWARD,
                style: 'primary'
            })
        ]
    ]);
}

// 5. Reklamaga tugma qo'shish so'rovi
function getBroadcastConfirmKeyboard() {
    return Markup.inlineKeyboard([
        [
            createInlineButton(BUTTONS.BTN_YES, 'btn_yes', {
                icon_custom_emoji_id: CUSTOM_EMOJIS.YES,
                style: 'success'
            }),
            createInlineButton(BUTTONS.BTN_NO, 'btn_no', {
                icon_custom_emoji_id: CUSTOM_EMOJIS.NO,
                style: 'danger'
            })
        ]
    ]);
}

// 6. Kino havolasi inline tugmasi
function getMovieLinkKeyboard(link) {
    if (!link) return null;
    return Markup.inlineKeyboard([
        [
            createUrlButton(BUTTONS.WATCH_MOVIE, link, {
                icon_custom_emoji_id: CUSTOM_EMOJIS.MOVIE,
                style: 'primary'
            })
        ]
    ]);
}

// 7. Xatoliklarni avtomatik bartaraf etuvchi fallback tizimi
// Agar bot egasi Telegram Premium / Fragment'ga ega bo'lmasa, Telegram 400 Bad Request qaytaradi.
// Ushbu funksiya API chaqiruvini ushlab, icon_custom_emoji_id ni avtomatik olib tashlaydi va xatosiz qayta yuboradi.
function setupCustomEmojiFallback(bot) {
    const origCallApi = bot.telegram.callApi.bind(bot.telegram);

    function stripCustomEmoji(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const copy = JSON.parse(JSON.stringify(obj));

        if (copy.reply_markup) {
            if (Array.isArray(copy.reply_markup.inline_keyboard)) {
                copy.reply_markup.inline_keyboard = copy.reply_markup.inline_keyboard.map(row =>
                    row.map(btn => {
                        const { icon_custom_emoji_id, ...rest } = btn;
                        return rest;
                    })
                );
            }
            if (Array.isArray(copy.reply_markup.keyboard)) {
                copy.reply_markup.keyboard = copy.reply_markup.keyboard.map(row =>
                    row.map(btn => {
                        if (typeof btn === 'object') {
                            const { icon_custom_emoji_id, ...rest } = btn;
                            return rest;
                        }
                        return btn;
                    })
                );
            }
        }
        return copy;
    }

    bot.telegram.callApi = async function (method, payload, options) {
        try {
            return await origCallApi(method, payload, options);
        } catch (err) {
            const errMsg = err.message || '';
            if (
                errMsg.includes('BUTTON_CUSTOM_EMOJI') ||
                errMsg.includes('custom_emoji') ||
                errMsg.includes('icon_custom_emoji_id')
            ) {
                console.warn("ℹ️ Telegram Premium stikerlari: bot akkauntida huquq yetarli emas, stiker ID'larisiz qayta yuborilmoqda...");
                customEmojiSupported = false;
                const strippedPayload = stripCustomEmoji(payload);
                return await origCallApi(method, strippedPayload, options);
            }
            throw err;
        }
    };
}

module.exports = {
    CUSTOM_EMOJIS,
    BUTTONS,
    createInlineButton,
    createUrlButton,
    createKeyboardButton,
    getAdminKeyboard,
    getSubscriptionKeyboard,
    getDeleteChannelKeyboard,
    getBroadcastTypeKeyboard,
    getBroadcastConfirmKeyboard,
    getMovieLinkKeyboard,
    setupCustomEmojiFallback
};

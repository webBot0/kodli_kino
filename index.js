const { Telegraf, Markup } = require('telegraf');
const mongoose = require('mongoose');
const http = require('http');
require('dotenv').config();
const design = require('./design');

// 1. Render/Railway Mini-Server
const port = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("Bot is running...");
}).listen(port, "0.0.0.0", () => {
    console.log(`📡 Mini-server ${port}-portda ishlamoqda`);
});

// 2. MongoDB Initialization
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error("❌ XATO: MongoDB o'zgaruvchisi (MONGO_URI) topilmadi!");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => console.log("✅ MongoDB muvaffaqiyatli ulandi"))
    .catch((error) => {
        console.error("❌ MongoDB ulanishda xato:", error.message);
        process.exit(1);
    });

// 3. MongoDB Schemas & Models
const userSchema = new mongoose.Schema({
    userId: { type: Number, required: true, unique: true },
    name: { type: String, default: '' },
    status: { type: String, default: 'active' },
    createdAt: { type: Date, default: Date.now },
    lastActive: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const channelSchema = new mongoose.Schema({
    channelId: { type: String, required: true },
    link: { type: String, required: true },
    name: { type: String, required: true }
});
const Channel = mongoose.model('Channel', channelSchema);

const channel2Schema = new mongoose.Schema({
    channelId: { type: String, required: true },
    link: { type: String, required: true },
    name: { type: String, required: true }
});
const Channel2 = mongoose.model('Channel2', channel2Schema);

const requestSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    channelId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});
requestSchema.index({ userId: 1, channelId: 1 }, { unique: true });
const Request = mongoose.model('Request', requestSchema);

const configSchema = new mongoose.Schema({
    key: { type: String, required: true, unique: true },
    mandatoryLink: { type: String, default: '' }
});
const Config = mongoose.model('Config', configSchema);

const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = parseInt(process.env.ADMIN_ID);

// Telegram Premium Custom Emoji va Tugmalar xatoliklariga qarshi himoya
design.setupCustomEmojiFallback(bot);

let adminState = {};

// 4. Yordamchi funksiyalar
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Foydalanuvchi obunasini va zayafkasini tekshirish
async function getUnsubscribedChannels(ctx, collectionName = 'channels') {
    const userId = ctx.from.id;
    const Model = collectionName === 'channels2' ? Channel2 : Channel;
    const channels = await Model.find();
    const unsubscribed = [];

    for (const ch of channels) {
        try {
            const member = await ctx.telegram.getChatMember(ch.channelId, userId);
            const isMember = ['member', 'administrator', 'creator'].includes(member.status);

            if (!isMember) {
                const requestDoc = await Request.findOne({ userId: userId, channelId: ch.channelId.toString() });
                if (!requestDoc) {
                    unsubscribed.push(ch);
                }
            }
        } catch (e) {
            const requestDoc = await Request.findOne({ userId: userId, channelId: ch.channelId.toString() });
            if (!requestDoc) {
                unsubscribed.push(ch);
            }
        }
    }
    return unsubscribed;
}

// 5. Start Buyrug'i
async function sendStart(ctx) {
    try {
        const userId = ctx.from.id;
        const userName = ctx.from.first_name || '';

        // Foydalanuvchini saqlash yoki yangilash
        await User.findOneAndUpdate(
            { userId: userId },
            {
                $set: { name: userName, status: 'active', lastActive: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true, new: true }
        );

        if (userId === ADMIN_ID) {
            return ctx.reply(
                `👑 <b>KINO CITY | ADMIN BOSHQARUV PANELI</b> 🛠\n\n` +
                `⚡ <i>Xush kelibsiz, Bosh Admin! Quyidagi menyu orqali botni to'liq boshqarishingiz mumkin:</i>`,
                {
                    parse_mode: 'HTML',
                    ...design.getAdminKeyboard()
                }
            );
        }

        const unsubbed = await getUnsubscribedChannels(ctx);

        if (unsubbed.length === 0) {
            return ctx.reply(
                `🎬 <b>KINO CITY | RASMIY BOT</b> 🍿\n\n` +
                `👋 Assalomu alaykum, <b>${userName}</b>!\n\n` +
                `✨ <i>Bizning bot orqali eng so'nggi va sara kinolarni yuqori sifatda topishingiz mumkin.</i>\n\n` +
                `🔢 <b>Marhamat, kino kodini yuboring:</b>`,
                { parse_mode: 'HTML' }
            );
        } else {
            return ctx.reply(
                `✨ <b>KINO CITY | OBUNA TALAB QILINADI</b> ✨\n\n` +
                `🔴 <i>Botdan foydalanish va filmlarni tomosha qilish uchun quyidagi kanallarga obuna bo'ling yoki so'rov yuboring:</i>\n\n` +
                `👇 <i>Obuna bo'lgach, pastdagi <b>«⚡ Obunani tekshirish 💎»</b> tugmasini bosing:</i>`,
                {
                    parse_mode: 'HTML',
                    ...design.getSubscriptionKeyboard(unsubbed, 'check_sub', 1)
                }
            );
        }
    } catch (e) { console.error("Start Error:", e); }
}

bot.start(sendStart);

// Zayafkalarni tutib qolish
bot.on('chat_join_request', async (ctx) => {
    try {
        const userId = ctx.from.id;
        const channelId = ctx.chat.id.toString();
        await Request.findOneAndUpdate(
            { userId: userId, channelId: channelId },
            { userId: userId, channelId: channelId, timestamp: new Date() },
            { upsert: true, new: true }
        );
    } catch (e) { console.error("Join Request Error:", e); }
});

// 6. Obunani tekshirish (Callback)
bot.action('check_sub', async (ctx) => {
    try {
        await ctx.answerCbQuery("Tekshirilmoqda... ⏳");

        const unsubbed = await getUnsubscribedChannels(ctx, 'channels');
        if (unsubbed.length === 0) {
            try {
                await ctx.editMessageText(
                    `💎 <b>TABRIKLAYMIZ!</b> 💎\n\n` +
                    `✅ <i>Barcha asosiy kanallarga obuna muvaffaqiyatli tasdiqlandi!</i>\n\n` +
                    `🎬 <b>Endi sevimli kinongiz kodini yuborishingiz mumkin:</b>`,
                    { parse_mode: 'HTML' }
                );
            } catch (err) {}
        } else {
            try {
                await ctx.editMessageReplyMarkup(design.getSubscriptionKeyboard(unsubbed, 'check_sub', 1).reply_markup);
            } catch (err) {}
            try {
                await ctx.telegram.sendMessage(
                    ctx.from.id,
                    `⚠️ <b>DIQQAT: SHART TO'LIQ BAJARILMADI!</b> ⚠️\n\n` +
                    `❌ <i>Siz hali barcha homiy kanallarga a'zo bo'lmadingiz. Iltimos, barcha kanallarga obuna bo'ling yoki so'rov yuboring!</i>`,
                    { parse_mode: 'HTML' }
                );
            } catch (err) {}
        }
    } catch (e) { console.error("Action error:", e); }
});

bot.action('check_sub_2', async (ctx) => {
    try {
        await ctx.answerCbQuery("Tekshirilmoqda... ⏳");

        const unsubbed1 = await getUnsubscribedChannels(ctx, 'channels');
        if (unsubbed1.length > 0) {
            try {
                await ctx.editMessageReplyMarkup(design.getSubscriptionKeyboard(unsubbed1, 'check_sub', 1).reply_markup);
            } catch (err) {}
            try {
                await ctx.telegram.sendMessage(
                    ctx.from.id,
                    `⚠️ <b>DIQQAT!</b>\n\n❌ <i>Oldin asosiy kanallarga a'zo bo'ling!</i>`,
                    { parse_mode: 'HTML' }
                );
            } catch (err) {}
            return;
        }

        const unsubbed2 = await getUnsubscribedChannels(ctx, 'channels2');
        if (unsubbed2.length === 0) {
            const settings = await Config.findOne({ key: 'settings' });
            const link = settings ? settings.mandatoryLink : null;
            try {
                if (link) {
                    await ctx.editMessageText(
                        `🍿 <b>KOD TASDIQLANDI!</b> 🎬\n\n` +
                        `✅ <i>Barcha qo'shimcha kanallarga ham a'zo bo'ldingiz!</i>\n\n` +
                        `🍿 <b>Siz qidirgan film havolasi:</b>\n` +
                        `👉 <a href="${link}">${link}</a>\n\n` +
                        `<i>Yoqimli tomosha tilaymiz! 🍿✨</i>`,
                        {
                            parse_mode: 'HTML',
                            ...design.getMovieLinkKeyboard(link)
                        }
                    );
                } else {
                    await ctx.editMessageText("❌ <b>Xatolik:</b> Admin tomonidan link o'rnatilmagan.", { parse_mode: 'HTML' });
                }
            } catch (err) {}
        } else {
            try {
                await ctx.editMessageReplyMarkup(design.getSubscriptionKeyboard(unsubbed2, 'check_sub_2', 2).reply_markup);
            } catch (err) {}
            try {
                await ctx.telegram.sendMessage(
                    ctx.from.id,
                    `⚠️ <b>DIQQAT!</b>\n\n❌ <i>Shartni to'liq bajaring! Barcha Majbur-2 kanallariga obuna bo'ling.</i>`,
                    { parse_mode: 'HTML' }
                );
            } catch (err) {}
        }
    } catch (e) { console.error("Sub 2 Action Error:", e); }
});

// 7. Admin Funksiyalari
bot.hears([design.BUTTONS.STATS, '📊 Statistika', /statistika/i], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const totalUsers = await User.countDocuments();
    const active24h = await User.countDocuments({ lastActive: { $gte: last24h } });
    const blockedCount = await User.countDocuments({ status: 'blocked' });
    const channelsCount = await Channel.countDocuments();
    const channels2Count = await Channel2.countDocuments();

    ctx.reply(
        `📊 <b>KINO CITY | BOT STATISTIKASI</b> 👑\n\n` +
        `👥 <b>Jami foydalanuvchilar:</b> <code>${totalUsers.toLocaleString()}</code> ta\n` +
        `⚡ <b>Faol (so'nggi 24s):</b> <code>${active24h.toLocaleString()}</code> ta\n` +
        `🚫 <b>Botni bloklaganlar:</b> <code>${blockedCount.toLocaleString()}</code> ta\n` +
        `📢 <b>Asosiy kanallar:</b> <code>${channelsCount}</code> ta\n` +
        `🍿 <b>Majbur-2 kanallar:</b> <code>${channels2Count}</code> ta\n\n` +
        `🕒 <i>Yangilangan: ${new Date().toLocaleTimeString('uz-UZ')}</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.hears([design.BUTTONS.ADD_CH, "➕ Kanal qo'shish", /kanal\s*qo['`ʼ]?shish/i], (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState[ctx.from.id] = { step: 'add_ch_id' };
    ctx.reply(
        `➕ <b>ASOSIY KANAL QO'SHISH</b> 📢\n\n` +
        `✍️ <i>Kanal ID raqamini yuboring (masalan: <code>-1001234567890</code>):</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.hears([design.BUTTONS.MANAGE_CH, "🗑 Kanallarni boshqarish", /kanallarni\s*boshqarish/i], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const channels = await Channel.find();
    if (channels.length === 0) return ctx.reply("Hech qanday kanal ulanmagan.");

    for (const ch of channels) {
        ctx.reply(
            `📢 <b>Kanal nomi:</b> ${ch.name}\n` +
            `🆔 <b>ID:</b> <code>${ch.channelId}</code>\n` +
            `🔗 <b>Havola:</b> ${ch.link}`,
            {
                parse_mode: 'HTML',
                ...design.getDeleteChannelKeyboard(ch._id, false)
            }
        );
    }
});

bot.action(/^del_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await Channel.findByIdAndDelete(ctx.match[1]);
    await ctx.answerCbQuery("🗑 Kanal o'chirildi!");
    ctx.editMessageText("🗑 <b>Kanal muvaffaqiyatli o'chirildi!</b>", { parse_mode: 'HTML' });
});

bot.hears([design.BUTTONS.MANDATORY_LINK, "🔗 Majburiy Link", /majburiy\s*link/i], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const settings = await Config.findOne({ key: 'settings' });
    const currentLink = settings && settings.mandatoryLink ? settings.mandatoryLink : "O'rnatilmagan";

    adminState[ctx.from.id] = { step: 'set_mandatory_link' };
    ctx.reply(
        `💎 <b>MAJBURIY KINO LINKI</b> 🔗\n\n` +
        `📌 <b>Hozirgi link:</b> <code>${currentLink}</code>\n\n` +
        `✍️ <i>Yangi linkni yuboring (https://t.me/...):</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.hears([design.BUTTONS.ADD_CH2, "➕ Majbur-2 qo'shish", /majbur-?2\s*qo['`ʼ]?shish/i], (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    adminState[ctx.from.id] = { step: 'add_ch2_id' };
    ctx.reply(
        `➕ <b>MAJBUR-2 KANALI QO'SHISH</b> 🍿\n\n` +
        `✍️ <i>Majbur-2 kanali ID raqamini yuboring (masalan: <code>-1001234567890</code>):</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.hears([design.BUTTONS.MANAGE_CH2, "🗑 Majbur-2 boshqarish", /majbur-?2\s*boshqarish/i], async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    const channels2 = await Channel2.find();
    if (channels2.length === 0) return ctx.reply("Hech qanday Majbur-2 kanali ulanmagan.");

    for (const ch of channels2) {
        ctx.reply(
            `🍿 <b>Majbur-2:</b> ${ch.name}\n` +
            `🆔 <b>ID:</b> <code>${ch.channelId}</code>\n` +
            `🔗 <b>Havola:</b> ${ch.link}`,
            {
                parse_mode: 'HTML',
                ...design.getDeleteChannelKeyboard(ch._id, true)
            }
        );
    }
});

bot.action(/^del2_(.+)$/, async (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    await Channel2.findByIdAndDelete(ctx.match[1]);
    await ctx.answerCbQuery("🗑 Majbur-2 o'chirildi!");
    ctx.editMessageText("🗑 <b>Majbur-2 kanali muvaffaqiyatli o'chirildi!</b>", { parse_mode: 'HTML' });
});

bot.hears([design.BUTTONS.BROADCAST, "📢 Xabar yuborish", /xabar\s*yuborish/i], (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(
        `📢 <b>XABAR TARQATISH BO'LIMI</b> 🚀\n\n` +
        `<i>Quyidagi xabar yuborish turlaridan birini tanlang:</i>`,
        {
            parse_mode: 'HTML',
            ...design.getBroadcastTypeKeyboard()
        }
    );
});

bot.action('msg_simple', ctx => {
    adminState[ctx.from.id] = { step: 'ad_content' };
    ctx.reply(
        `📝 <b>REKLAMA MATNI</b> ✨\n\n` +
        `<i>Reklama xabarini yuboring (matn, rasm, video...):</i>`,
        { parse_mode: 'HTML' }
    );
});

bot.action('msg_forward', ctx => {
    adminState[ctx.from.id] = { step: 'ad_forward' };
    ctx.reply(
        `🔄 <b>FORWARD XABAR</b> 🚀\n\n` +
        `<i>Uzatish (forward) uchun xabarni menga yuboring:</i>`,
        { parse_mode: 'HTML' }
    );
});

// 8. Xabarlarni qayta ishlash
bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const message = ctx.message;
    const text = message.text;

    // Admin holatlari
    if (userId === ADMIN_ID && adminState[userId]) {
        let state = adminState[userId];

        if (state.step === 'add_ch_id') {
            adminState[userId] = { step: 'add_ch_link', id: text };
            return ctx.reply("🔗 Kanal uchun havola yuboring (https://t.me/...):");
        }
        if (state.step === 'add_ch_link') {
            adminState[userId] = { step: 'add_ch_name', id: state.id, link: text };
            return ctx.reply("✍️ Tugma uchun nom yuboring (masalan: Kino Kanal):");
        }
        if (state.step === 'add_ch_name') {
            await Channel.create({ channelId: state.id, link: state.link, name: text });
            delete adminState[userId];
            return ctx.reply("✅ <b>Kanal muvaffaqiyatli qo'shildi!</b>", { parse_mode: 'HTML' });
        }

        if (state.step === 'set_mandatory_link') {
            await Config.findOneAndUpdate(
                { key: 'settings' },
                { mandatoryLink: text },
                { upsert: true, new: true }
            );
            delete adminState[userId];
            return ctx.reply("✅ <b>Majburiy link muvaffaqiyatli yangilandi!</b>", { parse_mode: 'HTML' });
        }

        // Majburiy 2 qo'shish
        if (state.step === 'add_ch2_id') {
            adminState[userId] = { step: 'add_ch2_link', id: text };
            return ctx.reply("🔗 Majbur-2 uchun havola yuboring (https://t.me/...):");
        }
        if (state.step === 'add_ch2_link') {
            adminState[userId] = { step: 'add_ch2_name', id: state.id, link: text };
            return ctx.reply("✍️ Tugma uchun nom yuboring:");
        }
        if (state.step === 'add_ch2_name') {
            await Channel2.create({ channelId: state.id, link: state.link, name: text });
            delete adminState[userId];
            return ctx.reply("✅ <b>Majbur-2 kanali muvaffaqiyatli qo'shildi!</b>", { parse_mode: 'HTML' });
        }

        if (state.step === 'ad_content') {
            adminState[userId] = { step: 'ad_btn_ask', msg: message };
            return ctx.reply(
                `🔘 <b>TUGMA SOZLAMASI</b> ⚡\n\n` +
                `<i>Xabarga pastki URL tugma qo'shilsinmi?</i>`,
                {
                    parse_mode: 'HTML',
                    ...design.getBroadcastConfirmKeyboard()
                }
            );
        }

        if (state.step === 'ad_btn_data') {
            const parts = text.split('|');
            if (parts.length < 2) return ctx.reply("❌ Format xato! Masalan: Kino kanal | https://t.me/kino");
            const btnName = parts[0].trim();
            const btnLink = parts[1].trim();
            const kb = Markup.inlineKeyboard([[
                design.createUrlButton(btnName, btnLink, {
                    icon_custom_emoji_id: design.CUSTOM_EMOJIS.CHANNEL,
                    style: 'primary'
                })
            ]]);
            broadcast(ctx, state.msg.message_id, false, kb);
            delete adminState[userId];
            return;
        }

        if (state.step === 'ad_forward') {
            broadcast(ctx, message.message_id, true);
            delete adminState[userId];
            return;
        }
    }

    // Foydalanuvchi xabari
    if (text && !text.startsWith('/')) {
        const unsubbed1 = await getUnsubscribedChannels(ctx, 'channels');
        if (unsubbed1.length > 0) {
            return ctx.reply(
                `✨ <b>KINO CITY | OBUNA TALAB QILINADI</b> ✨\n\n` +
                `⚠️ <i>Botdan foydalanish va kino ko'rish uchun quyidagi kanallarga obuna bo'ling:</i>`,
                {
                    parse_mode: 'HTML',
                    ...design.getSubscriptionKeyboard(unsubbed1, 'check_sub', 1)
                }
            );
        }

        // Agar matn faqat raqamlardan iborat bo'lsa (Kino kodi)
        if (/^\d+$/.test(text)) {
            const unsubbed2 = await getUnsubscribedChannels(ctx, 'channels2');
            if (unsubbed2.length > 0) {
                return ctx.reply(
                    `🍿 <b>QO'SHIMCHA OBUNA TALAB QILINADI</b> 🍿\n\n` +
                    `⚠️ <i>Kino havolasini ochish uchun quyidagi qo'shimcha kanallarga ham obuna bo'ling:</i>`,
                    {
                        parse_mode: 'HTML',
                        ...design.getSubscriptionKeyboard(unsubbed2, 'check_sub_2', 2)
                    }
                );
            }

            const settings = await Config.findOne({ key: 'settings' });
            const link = settings ? settings.mandatoryLink : null;

            if (link) {
                ctx.reply(
                    `🍿 <b>KOD QABUL QILINDI!</b> 🎬\n\n` +
                    `🔢 <b>Kino kodi:</b> <code>${text}</code>\n` +
                    `✅ <b>Holati:</b> Muvaffaqiyatli topildi!\n\n` +
                    `🍿 <b>Film havolasi:</b>\n👉 <a href="${link}">${link}</a>\n\n` +
                    `<i>Yoqimli tomosha tilaymiz! 🍿✨</i>`,
                    {
                        parse_mode: 'HTML',
                        ...design.getMovieLinkKeyboard(link)
                    }
                );
            } else {
                ctx.reply("❌ <b>Xatolik:</b> Admin tomonidan link o'rnatilmagan.", { parse_mode: 'HTML' });
            }
        } else {
            ctx.reply(
                `❌ <b>Noto'g'ri format!</b>\n\n` +
                `<i>Iltimos faqat kino kodini (raqam) yuboring. Masalan: <code>123</code></i>`,
                { parse_mode: 'HTML' }
            );
        }
    }
});

// 9. Reklama Funksiyasi
async function broadcast(ctx, msgId, isForward, kb = null) {
    const users = await User.find();
    const total = users.length;
    ctx.reply(`🚀 <b>${total}</b> kishiga xabar yuborish boshlandi...`, { parse_mode: 'HTML' });

    let count = 0;
    let blocked = 0;

    for (const u of users) {
        try {
            if (isForward) {
                await ctx.telegram.forwardMessage(u.userId, ctx.from.id, msgId);
            } else {
                await ctx.telegram.copyMessage(u.userId, ctx.from.id, msgId, kb);
            }
            count++;
            if (count % 25 === 0) await sleep(1000);
        } catch (e) {
            if (e.response && (e.response.error_code === 403 || e.response.error_code === 400)) {
                await User.updateOne({ userId: u.userId }, { status: 'blocked' });
                blocked++;
            }
        }
    }
    ctx.reply(
        `✅ <b>Yuborish yakunlandi!</b>\n\n` +
        `📬 Yetkazildi: <b>${count}</b> ta\n` +
        `🚫 Bloklagan: <b>${blocked}</b> ta`,
        { parse_mode: 'HTML' }
    );
}

bot.action('btn_yes', ctx => {
    if (!adminState[ctx.from.id]) return;
    adminState[ctx.from.id].step = 'ad_btn_data';
    ctx.reply(
        `✍️ <b>Tugma formatini yuboring:</b>\n\n` +
        `<code>Tugma Nomi | Havola</code>\n\n` +
        `Masalan: <code>Kino Kanal | https://t.me/kino</code>`,
        { parse_mode: 'HTML' }
    );
});

bot.action('btn_no', ctx => {
    if (!adminState[ctx.from.id]) return;
    const state = adminState[ctx.from.id];
    broadcast(ctx, state.msg.message_id, false);
    delete adminState[ctx.from.id];
});

// 10. Global Xatolarni boshqarish
bot.catch((err) => {
    console.error("🔴 Global xato:", err.message);
});

// 11. Botni ishga tushirish
bot.launch()
    .then(() => console.log("🚀 Kino City bot muvaffaqiyatli ishga tushdi!"))
    .catch((err) => console.error("❌ Bot ishga tushmadi:", err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

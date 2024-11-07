const telegramAuthToken = 'your_token';
const webhookEndpoint = "/endpoint";

addEventListener("fetch", event => {
    event.respondWith(handleIncomingRequest(event));
});

async function handleIncomingRequest(event) {
    let url = new URL(event.request.url);
    let path = url.pathname;
    let method = event.request.method;

    if (method === "POST" && path === webhookEndpoint) {
        const update = await event.request.json();
        event.waitUntil(processUpdate(update));
        return new Response("OK", { status: 200 });
    }
    return new Response("Not Found", { status: 404 });
}

async function processUpdate(update) {
    if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        let messageText = update.message.text;

        // If the message starts with '/', do nothing (silent)
        if (messageText.startsWith('/')) {
            return;
        }

        // Check if the message contains a valid X.com link
        if (messageText.includes('https://x.com')) {
            // Replace x.com with fixupx.com in the message text
            let newLink = messageText.replace(/https:\/\/x\.com/g, 'https://fixupx.com');
            
            // Send confirmation message with modified link
            await sendMessage(chatId, "🔧 Here is your link:");
            await sendMessage(chatId, newLink);
        } else {
            // For any other text, send the warning message
            await sendMessage(chatId, "🚫 Oops! This bot only works with x.com links. Please provide another one. 🙏");
        }
    }
}

async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text
    };

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    // Send the message via Telegram API
    await fetch(url, requestOptions);
}

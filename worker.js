// Telegram bot token and other configuration details
const telegramAuthToken = 'your-token'; // Bot token from BotFather
const webhookEndpoint = "/endpoint"; // The URL endpoint to receive Telegram webhook updates
const channelChatId = 'your-channel-id';  // ID of the private channel to send feedback to

// Set to keep track of users who are in feedback mode
const feedbackModeUsers = new Set(); // Stores chat IDs of users currently in feedback mode

// Event listener for incoming HTTP requests (used in Cloudflare Workers or similar environment)
addEventListener("fetch", event => {
    event.respondWith(handleIncomingRequest(event)); // Respond to the event with handleIncomingRequest function
});

async function handleIncomingRequest(event) {
    // Parse URL and extract path and request method
    let url = new URL(event.request.url);
    let path = url.pathname;
    let method = event.request.method;

    // If the request is a POST request to the specified webhook endpoint, process the update
    if (method === "POST" && path === webhookEndpoint) {
        const update = await event.request.json(); // Parse the incoming update as JSON
        event.waitUntil(processUpdate(update)); // Handle the update without delaying the response
        return new Response("OK", { status: 200 }); // Respond with status 200 to acknowledge the request
    }
    // Return 404 for any other request paths or methods
    return new Response("Not Found", { status: 404 });
}

// Function to handle incoming messages and commands
async function processUpdate(update) {
    // Check if the update contains a text message
    if (update.message && update.message.text) {
        const chatId = update.message.chat.id; // Get the chat ID
        const chatType = update.message.chat.type; // Determine chat type ('private', 'group', 'supergroup', 'channel')
        let messageText = update.message.text; // Store the message text

        // Ignore the /start command and do nothing
        if (messageText.toLowerCase() === '/start') {
            return; // Exit function without further action
        }

        // Handle /feedback command to put user in feedback mode
        if (messageText.toLowerCase() === '/feedback' && chatType === 'private') {
            feedbackModeUsers.add(chatId); // Add user to feedback mode
            await sendMessage(chatId, "👍 Please share your feedback"); // Prompt user to share feedback
        }
        
        // If user is in feedback mode, forward their messages to the designated private channel
        else if (feedbackModeUsers.has(chatId)) {
            // Forward user's feedback message to the private channel
            await sendMessage(channelChatId, `New Feedback from ${chatId}:\n${messageText}`);

            // Send confirmation to the user that their feedback was received
            await sendMessage(chatId, "🙏 Thanks!");

            // Remove user from feedback mode after feedback is sent
            feedbackModeUsers.delete(chatId);
        }

        // For private chats, handle messages that contain 'https://x.com' for link modification
        else if (chatType === 'private') {
            if (messageText.includes('https://x.com')) {
                // Replace 'https://x.com' with 'https://fixupx.com' in the message
                let newLink = messageText.replace(/https:\/\/x\.com/g, 'https://fixupx.com');
                await sendMessage(chatId, "🔧 Here is your fixed link:"); // Inform user about the modified link
                await sendMessage(chatId, newLink); // Send modified link to the user
            } else {
                await sendMessage(chatId, "🚫 Please send a valid X.com link for modification."); // Error message for invalid link
            }
        }

        // Handle group or supergroup chats to modify links without additional prompts
        else if (chatType === 'group' || chatType === 'supergroup') {
            if (messageText.includes('https://x.com')) {
                // Replace 'https://x.com' with 'https://fixupx.com' in the message
                let newLink = messageText.replace(/https:\/\/x\.com/g, 'https://fixupx.com');
                await sendMessage(chatId, newLink); // Send modified link to the group without any extra messages
            }
        }
    }
}

// Helper function to send messages via Telegram API
async function sendMessage(chatId, text) {
    // Construct the Telegram API endpoint URL for sending messages
    const url = `https://api.telegram.org/bot${telegramAuthToken}/sendMessage`;
    
    // Define the payload with the chat ID and text message
    const payload = {
        chat_id: chatId,
        text: text
    };

    // Set up the request options for a POST request with JSON content
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload) // Convert payload to JSON string
    };

    // Send the message to the Telegram API
    await fetch(url, requestOptions);
}

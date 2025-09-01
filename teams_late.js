const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");
const axios = require("axios");

// ✅ Use Cloud Run backend (unauthenticated)
const BACKEND_API_URL = process.env.BACKEND_API_URL || "https://bot-v2-670869581400.europe-west1.run.app";
console.log("[DEBUG] BACKEND_API_URL:", BACKEND_API_URL);

const storage = new MemoryStorage();
const teamsBot = new AgentApplication({ storage });

teamsBot.conversationUpdate("membersAdded", async (context, state) => {
    await context.sendActivity("Hi! I am AskMaf! I'm here to help you query Google Analytics data directly from Teams.");
    await context.sendActivity("Please include the **market** and **brand** in your questions (e.g., 'How many users did we have in the US for BrandA last week?').");
});

teamsBot.activity(ActivityTypes.Message, async (context, state) => {
    let userQuery = context.activity.text;
    const conversationId = context.activity.conversation.id;

    if (context.activity.value && context.activity.value.msteams && context.activity.value.msteams.text) {
        userQuery = context.activity.value.msteams.text;
    }

    if (typeof userQuery !== 'string') {
        console.warn("[WARN] Received a message activity with no processable text. Ignoring.");
        return;
    }

    await context.sendActivity("Thinking... I'm processing your request. This may take a moment. 🤔");

    try {
        // ✅ Direct call to Cloud Run endpoint
        const response = await axios.post(`${BACKEND_API_URL}/api/query`, {
            userQuery,
            conversationId
        });
        console.log("[DEBUG] Backend response:", response.data);
        const { type, content, attachments } = response.data;

        if (type === 'text') {
            await context.sendActivity(content);
        } else if (type === 'card') {
            await context.sendActivity({
                type: ActivityTypes.Message,
                attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content }]
            });
        } else if (type === 'multiple') {
            for (const item of content) {
                if (item.type === 'text') {
                    await context.sendActivity(item.content);
                } else if (item.type === 'card') {
                    await context.sendActivity({
                        type: ActivityTypes.Message,
                        attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content: item.content }]
                    });
                }
            }
        }
    } catch (error) {
        console.error("[ERROR] Backend API call failed:", {
            message: error.message,
            code: error.code,
            url: `${BACKEND_API_URL}/api/query`,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data // 👈 log response body too
        });
        
        await context.sendActivity("⚠️ I'm having trouble reaching the backend right now. Please check if the Cloud Run service is deployed and accessible.");
    }
});

module.exports.teamsBot = {
  run: async (context) => {
    await teamsBot.run(context);
  },
};

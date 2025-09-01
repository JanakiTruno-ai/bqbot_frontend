const { ActivityTypes } = require("@microsoft/agents-activity");
const { AgentApplication, MemoryStorage } = require("@microsoft/agents-hosting");
const axios = require("axios");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 8080;

// parse incoming JSON
app.use(express.json());

// ✅ Use Cloud Run backend (unauthenticated)
const BACKEND_API_URL = process.env.BACKEND_API_URL || "https://botv1-670869581400.europe-west1.run.app";
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

  if (context.activity.value?.msteams?.text) {
    userQuery = context.activity.value.msteams.text;
  }

  if (typeof userQuery !== "string") {
    console.warn("[WARN] Received a message activity with no processable text. Ignoring.");
    return;
  }

  await context.sendActivity("Thinking... I'm processing your request. This may take a moment. 🤔");

  try {
    const response = await axios.post(`${BACKEND_API_URL}/api/query`, {
      userQuery,
      conversationId
    });

    console.log("[DEBUG] Backend response:", response.data);
    const { type, content } = response.data;

    if (type === "text") {
      await context.sendActivity(content);
    } else if (type === "card") {
      await context.sendActivity({
        type: ActivityTypes.Message,
        attachments: [{ contentType: "application/vnd.microsoft.card.adaptive", content }]
      });
    } else if (type === "multiple") {
      for (const item of content) {
        if (item.type === "text") {
          await context.sendActivity(item.content);
        } else if (item.type === "card") {
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
      data: error.response?.data
    });

    await context.sendActivity("⚠️ I'm having trouble reaching the backend right now. Please check if the Cloud Run service is deployed and accessible.");
  }
});

// ✅ Teams entrypoint
app.post("/api/messages", async (req, res) => {
  try {
    await teamsBot.run(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error("Bot error:", err);
    res.sendStatus(500);
  }
});

// health check
app.get("/", (req, res) => res.send("Teams frontend bot running ✅"));

app.listen(PORT, () => {
  console.log(`🚀 Bot frontend listening on port ${PORT}`);
});

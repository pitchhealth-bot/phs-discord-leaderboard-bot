import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});

const {
  DISCORD_TOKEN,
  FRONTERS_INPUT_CHANNEL_ID,
  MEDICARE_INPUT_CHANNEL_ID,
  FRONTERS_AIRTABLE_WEBHOOK_URL,
  MEDICARE_AIRTABLE_WEBHOOK_URL,
} = process.env;

function parseLog(content) {
  // Accepts: log 1, log 12, LOG 3
  const txt = content.trim().toLowerCase();
  const match = txt.match(/^log\s*(\d+)$/);
  if (!match) return null;
  return Number(match[1]);
}

async function postToAirtable(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Airtable webhook failed (${res.status}): ${text}`);
  }
}

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    const value = parseLog(message.content);
    if (value === null) return;

    let webhookUrl = null;

    if (message.channel.id === FRONTERS_INPUT_CHANNEL_ID) {
      webhookUrl = FRONTERS_AIRTABLE_WEBHOOK_URL;
    }

    if (message.channel.id === MEDICARE_INPUT_CHANNEL_ID) {
      webhookUrl = MEDICARE_AIRTABLE_WEBHOOK_URL;
    }

    if (!webhookUrl) return;

    await postToAirtable(webhookUrl, {
      discordUserId: message.author.id,
      discordUserName: message.member?.displayName || message.author.username,
      currentTotalInput: value
    });

    await message.react("✅").catch(() => {});
    // Optional cleanup:
    // await message.delete().catch(() => {});
  } catch (err) {
    console.error("❌ messageCreate error:", err);
  }
});

client.once("ready", () => {
  console.log(`✅ Bot logged in as ${client.user.tag}`);
});

client.login(DISCORD_TOKEN);

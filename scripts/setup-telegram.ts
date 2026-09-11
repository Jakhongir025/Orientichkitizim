// Run explicitly after HTTPS deployment; never prints the bot token.
async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const app = process.env.APP_URL;
  if (!token || !app || !app.startsWith("https://")) {
    console.error("TELEGRAM_BOT_TOKEN va HTTPS APP_URLni .envda kiriting.");
    process.exit(1);
  }
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/setChatMenuButton`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menu_button: {
            type: "web_app",
            text: "RentCarni ochish",
            web_app: { url: new URL("/mini", app).href },
          },
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    const result = (await response.json()) as { ok: boolean };
    if (!response.ok || !result.ok) throw new Error();
    console.log("Telegram menyusi sozlandi: RentCarni ochish");
  } catch {
    console.error(
      "Telegram menyusini sozlab bo‘lmadi. Token va internetni tekshiring.",
    );
    process.exit(1);
  }
}
void main();

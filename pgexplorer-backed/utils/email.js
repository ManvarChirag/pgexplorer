const nodemailer = require("nodemailer");

const buildTransporter = async () => {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM } =
    process.env;

  const isProd = process.env.NODE_ENV === "production";

  // Dev fallback: no SMTP configured
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    if (isProd) {
      throw new Error(
        "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (and optionally SMTP_FROM).",
      );
    }
    return null;
  }

  const port = Number(SMTP_PORT);
  const secure = String(SMTP_SECURE).toLowerCase() === "true";

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Avoid requests hanging forever when SMTP is blocked by hosting provider.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  // verify() throws on misconfig
  try {
    await transporter.verify();
  } catch (err) {
    throw new Error(`SMTP verify failed: ${err?.message || err}`);
  }

  return { transporter, from: SMTP_FROM || SMTP_USER };
};

const sendEmail = async ({ to, subject, text, html }) => {
  const built = await buildTransporter();

  if (!built) {
    // In dev, we log links/tokens rather than failing registration.
    console.log("\n[EMAIL:DEV]", { to, subject, text });
    return { mode: "dev-log" };
  }

  let info;
  try {
    info = await built.transporter.sendMail({
      from: built.from,
      to,
      subject,
      text,
      html,
    });
  } catch (err) {
    throw new Error(`SMTP send failed: ${err?.message || err}`);
  }

  return { mode: "smtp", messageId: info.messageId };
};

module.exports = { sendEmail };

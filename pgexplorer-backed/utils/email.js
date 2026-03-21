const nodemailer = require("nodemailer");
const https = require("https");

const parseFrom = (raw) => {
  const value = String(raw || "").trim();
  const m = value.match(/^(.*)<([^>]+)>$/);
  if (!m) return { name: "PG Explorer", email: value };
  const name = m[1].trim().replace(/^"|"$/g, "") || "PG Explorer";
  const email = m[2].trim();
  return { name, email };
};

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const apiKey = String(process.env.BREVO_API_KEY || "")
    .trim()
    .replace(/^"|"$/g, "")
    .replace(/\s+/g, "");
  if (!apiKey) {
    throw new Error(
      "BREVO_API_KEY is not configured. Set BREVO_API_KEY or configure SMTP.",
    );
  }

  const fromRaw =
    process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER;
  const sender = parseFrom(fromRaw);
  if (!sender.email || !String(sender.email).includes("@")) {
    throw new Error(
      "Sender email is not configured. Set EMAIL_FROM (recommended) or SMTP_FROM.",
    );
  }

  const payload = {
    sender,
    to: [{ email: String(to).trim() }],
    subject: String(subject || ""),
    textContent: text ? String(text) : undefined,
    htmlContent: html ? String(html) : undefined,
  };

  const body = JSON.stringify(payload);

  return await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.brevo.com",
        path: "/v3/smtp/email",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "api-key": apiKey,
        },
        timeout: 20_000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = data ? JSON.parse(data) : {};
              return resolve({ mode: "brevo", messageId: parsed.messageId });
            } catch {
              return resolve({ mode: "brevo" });
            }
          }

          return reject(
            new Error(
              `BREVO send failed: ${res.statusCode || "?"} ${data || ""}`.trim(),
            ),
          );
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error("BREVO send failed: Connection timeout"));
    });

    req.on("error", (err) => reject(err));
    req.write(body);
    req.end();
  });
};

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

  const cleanUser = String(SMTP_USER || "")
    .trim()
    .replace(/^"|"$/g, "");
  let cleanPass = String(SMTP_PASS || "")
    .trim()
    .replace(/^"|"$/g, "");

  // Gmail "App Password" is often shown with spaces (xxxx xxxx xxxx xxxx).
  // Strip whitespace to avoid 535 auth failures caused by copy/paste.
  if (String(SMTP_HOST || "").includes("gmail") && /\s/.test(cleanPass)) {
    cleanPass = cleanPass.replace(/\s+/g, "");
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure,
    auth: { user: cleanUser, pass: cleanPass },
    // Avoid requests hanging forever when SMTP is blocked by hosting provider.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  // verify() throws on misconfig
  try {
    await transporter.verify();
  } catch (err) {
    const msg = `SMTP verify failed: ${err?.message || err}`;
    if (isProd) {
      throw new Error(msg);
    }

    // Dev-friendly fallback: if SMTP is misconfigured, don't block registration.
    // We'll log OTP/reset links to the console instead.
    console.warn("[EMAIL:DEV]", msg);
    return null;
  }

  return { transporter, from: SMTP_FROM || SMTP_USER };
};

const sendEmail = async ({ to, subject, text, html }) => {
  const provider = String(process.env.EMAIL_PROVIDER || "").toLowerCase();

  // Force Brevo (useful on hosts that block SMTP).
  if (provider === "brevo") {
    return await sendViaBrevo({ to, subject, text, html });
  }

  let built;
  try {
    built = await buildTransporter();
  } catch (err) {
    // If SMTP is blocked/misconfigured in production, fall back to Brevo API (HTTPS)
    // when configured. This covers failures during transporter.verify().
    if (process.env.BREVO_API_KEY) {
      try {
        return await sendViaBrevo({ to, subject, text, html });
      } catch (brevoErr) {
        throw new Error(
          `BREVO send failed: ${brevoErr?.message || brevoErr} (after ${err?.message || err})`,
        );
      }
    }
    throw err;
  }

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
    // If SMTP is blocked on the host, fall back to Brevo API (HTTPS) when configured.
    if (process.env.BREVO_API_KEY) {
      try {
        return await sendViaBrevo({ to, subject, text, html });
      } catch (brevoErr) {
        throw new Error(`BREVO send failed: ${brevoErr?.message || brevoErr}`);
      }
    }

    throw new Error(`SMTP send failed: ${err?.message || err}`);
  }

  return { mode: "smtp", messageId: info.messageId };
};

module.exports = { sendEmail };

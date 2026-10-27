import "server-only";
import nodemailer from "nodemailer";
import { Resend } from "resend";

type Mail = { to: string | string[]; subject: string; html: string; text?: string; replyTo?: string };

/**
 * Wysyłka maili. Kolejność:
 * 1. SMTP (dowolna skrzynka: Gmail z hasłem aplikacji, skrzynka hurtowni na home.pl/OVH itd.)
 *    SMTP_HOST, SMTP_PORT (465/587), SMTP_USER, SMTP_PASS, opcjonalnie MAIL_FROM
 * 2. Resend (RESEND_API_KEY) — gdy będzie własna domena
 * Brak konfiguracji → mail pomijany, zamówienie i tak jest w panelu.
 */
export async function sendMail(m: Mail): Promise<boolean> {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, RESEND_API_KEY } = process.env;

  if (SMTP_USER && SMTP_PASS) {
    const port = Number(SMTP_PORT || 465);
    const transport = nodemailer.createTransport({
      host: SMTP_HOST || "smtp.gmail.com",
      port,
      secure: port === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from: MAIL_FROM || `BEST-POL Hurt <${SMTP_USER}>`,
      to: m.to,
      subject: m.subject,
      html: m.html,
      replyTo: m.replyTo,
    });
    return true;
  }

  // FormSubmit.co: bez hasła i bez konta. Pierwszy mail przychodzi z linkiem „Activate”
  // na adres hurtowni — po kliknięciu kolejne zamówienia idą już normalnie.
  // Włączane zmienną FORMSUBMIT=1 (wysyła tylko na adres hurtowni, nie do sklepów).
  if (process.env.FORMSUBMIT === "1") {
    const to = Array.isArray(m.to) ? m.to[0] : m.to;
    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: m.subject,
        _template: "box",
        _captcha: "false",
        ...(m.replyTo ? { _replyto: m.replyTo } : {}),
        "Zamówienie": m.text ?? m.html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(tr|p|h2)>/gi, "\n").replace(/<\/td>/gi, " | ").replace(/<[^>]+>/g, "").replace(/\n{3,}/g, "\n\n").trim(),
      }),
    });
    if (!res.ok) throw new Error(`FormSubmit ${res.status}`);
    return true;
  }

  if (RESEND_API_KEY) {
    await new Resend(RESEND_API_KEY).emails.send({
      from: MAIL_FROM || "Zamówienia <onboarding@resend.dev>",
      to: m.to,
      subject: m.subject,
      html: m.html,
      replyTo: m.replyTo,
    });
    return true;
  }

  console.warn("Brak konfiguracji maila (SMTP_* lub RESEND_API_KEY) — mail nie wysłany");
  return false;
}

/** Czy można wysyłać maile do dowolnych adresów (potwierdzenia dla sklepów). */
export const canMailCustomers = () =>
  !!(process.env.SMTP_USER && process.env.SMTP_PASS) || !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

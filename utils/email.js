import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarCorreo(to, subject, html) {
  try {
    const data = await resend.emails.send({
      from: "HomeClick24 <noreply@homeclick24.com>",
      to,
      subject,
      html
    });

    console.log("EMAIL ENVIADO:", data);

  } catch (err) {
    console.error("ERROR EMAIL:", err);
  }
}
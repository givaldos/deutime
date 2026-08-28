export type RegistrationEmailMessage = {
  recipient: string;
  teamName: string;
  teamSlug: string;
};

export type RegistrationEmailDeliveryResult =
  | { kind: "accepted"; providerMessageId: string }
  | {
      kind: "rejected";
      failureClass: "transient" | "permanent";
      errorCode: string;
    }
  | { kind: "ambiguous"; errorCode: string };

export interface RegistrationEmailAdapter {
  send(message: RegistrationEmailMessage): Promise<RegistrationEmailDeliveryResult>;
}

export function registrationEmailContent(
  message: RegistrationEmailMessage,
  appUrl: URL,
) {
  const teamName = escapeHtml(message.teamName);
  const subjectTeamName = message.teamName.replace(/[\r\n]+/g, " ").trim();
  const queueUrl = new URL(
    `/app/${encodeURIComponent(message.teamSlug)}/athletes`,
    appUrl,
  ).toString();
  const logoUrl = new URL(
    "/brand/logo-deutime-email-640-fundo-escuro.png",
    appUrl,
  ).toString();

  return {
    subject: `Novo pedido de entrada — ${subjectTeamName}`,
    text: [
      `Há um novo pedido de entrada no ${message.teamName}.`,
      "Abra a fila autenticada para revisar.",
      queueUrl,
      "Este aviso não inclui dados pessoais do atleta.",
    ].join("\n\n"),
    html: `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Novo pedido de entrada — DeuTime</title></head>
<body style="margin:0;padding:0;background:#F7FAF5;color:#16211C;font-family:Inter,Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Há um novo pedido aguardando revisão no DeuTime.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#F7FAF5"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px">
<tr><td align="center" bgcolor="#0D2B22" style="padding:28px 32px;border-radius:18px 18px 0 0"><img src="${logoUrl}" width="224" alt="DeuTime" style="display:block;width:224px;max-width:100%;height:auto;border:0"></td></tr>
<tr><td bgcolor="#FFFFFF" style="padding:36px 32px 32px;border-right:1px solid #E3EAE4;border-left:1px solid #E3EAE4">
<p style="margin:0 0 10px;color:#0D2B22;font-size:12px;font-weight:700;line-height:18px;letter-spacing:1.4px;text-transform:uppercase">Fila do time</p>
<h1 style="margin:0 0 16px;color:#16211C;font-size:28px;line-height:34px">Novo pedido de entrada</h1>
<p style="margin:0 0 26px;color:#5B6B62;font-size:16px;line-height:25px">Há um novo pedido aguardando revisão no <strong>${teamName}</strong>.</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px"><tr><td bgcolor="#BDF63C" style="border-radius:10px"><a href="${queueUrl}" style="display:inline-block;padding:14px 22px;color:#0D2B22;font-size:16px;font-weight:700;text-decoration:none">Abrir fila de cadastros</a></td></tr></table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#EFF7E8" style="border-left:4px solid #0D2B22;border-radius:8px"><tr><td style="padding:14px 16px;color:#5B6B62;font-size:13px;line-height:20px">Por privacidade, este e-mail não mostra nome, telefone, e-mail ou outras informações do atleta. Entre na área protegida para revisar.</td></tr></table>
</td></tr>
<tr><td align="center" bgcolor="#EDF2EC" style="padding:20px 24px;border:1px solid #E3EAE4;border-top:0;border-radius:0 0 18px 18px"><p style="margin:0 0 4px;color:#0D2B22;font-size:13px;font-weight:700">Deu time, deu jogo.</p><p style="margin:0;color:#8CA096;font-size:12px"><a href="${appUrl.toString()}" style="color:#5B6B62;text-decoration:none">deutime.app</a></p></td></tr>
</table></td></tr></table></body></html>`,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

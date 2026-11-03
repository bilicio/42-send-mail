/**
 * Template do email de código de acesso. Fica gravado no PocketBase como
 * qualquer outro template (ver ensureCodeTemplate em src/auth.ts), então
 * pode ser disparado por outras plataformas via POST /send-email com
 * { templateId, to, variables: { code } }.
 */
export const ACCESS_CODE_TEMPLATE_NAME = 'Código de acesso'

export const accessCodeTemplate = {
  name: ACCESS_CODE_TEMPLATE_NAME,
  subject: 'Seu código de acesso',
  variables: ['code'],
  // Vazio: o editor monta o MJML a partir do HTML ao abrir.
  design_json: {},
  html_content: `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Seu código de acesso</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;">
        <tr>
          <td style="padding:40px 32px;font-family:Arial,Helvetica,sans-serif;color:#18181b;">
            <p style="margin:0 0 8px 0;font-size:20px;font-weight:bold;">Seu código de acesso</p>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:22px;color:#52525b;">Use o código abaixo para entrar. Ele expira em 10 minutos.</p>
            <p style="margin:0 0 24px 0;padding:16px 0;font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;background-color:#f4f4f5;border-radius:8px;">{{code}}</p>
            <p style="margin:0;font-size:13px;line-height:20px;color:#71717a;">Se não foi você que pediu, ignore este email.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

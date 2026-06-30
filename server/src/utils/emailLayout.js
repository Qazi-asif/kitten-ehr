export const EMAIL_LAYOUT_KEY = 'email.layout';

export function buildDefaultEmailLayout() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{orgName}}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#059669 0%,#047857 100%);padding:28px 32px;text-align:center;">
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.25em;text-transform:uppercase;color:#d1fae5;">Pawsitive Rescue</p>
              <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;color:#ffffff;">{{orgName}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-size:15px;line-height:1.7;color:#334155;">
              {{content}}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background-color:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:13px;color:#64748b;">Thank you for supporting {{orgName}}.</p>
              <p style="margin:0;font-size:12px;color:#94a3b8;">This is an automated message. Please do not reply directly to this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function wrapEmailContent(contentHtml, variables, layoutTemplateHtml) {
  const layout = layoutTemplateHtml || buildDefaultEmailLayout();
  const withContent = layout.replace(/\{\{content\}\}/g, contentHtml || '');
  return withContent.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key === 'content') return contentHtml || '';
    const value = variables[key];
    return value == null ? '' : String(value);
  });
}

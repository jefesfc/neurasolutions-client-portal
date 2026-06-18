const TIER_STYLES: Record<string, { bg: string; border: string; badge: string; badgeTxt: string; icon: string }> = {
  PLATINUM: { bg: '#1e1b4b', border: '#4338ca', badge: '#6366f1', badgeTxt: '#fff', icon: '✦' },
  GOLD:     { bg: '#451a03', border: '#d97706', badge: '#f59e0b', badgeTxt: '#fff', icon: '★' },
  SILVER:   { bg: '#0f172a', border: '#64748b', badge: '#94a3b8', badgeTxt: '#fff', icon: '◆' },
};

export function buildEmailHtml(body: string, senderEmail: string): string {
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const lines = body.split('\n');
  let html = '';
  let inList = false;
  let inTierCard = false;

  const closeTierCard = () => {
    if (inTierCard) { html += '</td></tr></table>'; inTierCard = false; }
  };
  const closeList = () => {
    if (inList) { html += '</ul>'; inList = false; }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      closeList();
      if (!inTierCard) html += '<div style="height:12px;"></div>';
      continue;
    }

    const sectionMatch = line.match(/^\*\*([A-Z]+(?:\s+MEMBERSHIP)?[^*]*?)\*\*/);
    if (sectionMatch) {
      closeList();
      closeTierCard();
      const heading = sectionMatch[1].trim();
      const tierKey = Object.keys(TIER_STYLES).find(k => heading.toUpperCase().startsWith(k));
      const ts = tierKey ? TIER_STYLES[tierKey] : null;

      const priceMatch = heading.match(/(£[\d,]+(?:\/\w+)?(?:\s*\(or\s*£[\d,]+\/\w+\))?)/i);
      const priceHtml = priceMatch
        ? `<span style="float:right;font-size:13px;font-weight:700;color:${ts ? ts.badge : '#6366f1'};background:rgba(255,255,255,0.12);padding:2px 10px;border-radius:20px;">${priceMatch[1]}</span>`
        : '';
      const headingClean = heading.replace(/—\s*£[\d,/()a-z\s]+/gi, '').trim();

      if (ts) {
        html += `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;border-radius:12px;overflow:hidden;border:1px solid ${ts.border};">
            <tr><td style="background:${ts.bg};padding:14px 20px;">
              <span style="display:inline-block;background:${ts.badge};color:${ts.badgeTxt};font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;padding:3px 10px;border-radius:20px;margin-right:10px;">${ts.icon} ${headingClean}</span>
              ${priceHtml}
            </td></tr>
            <tr><td style="background:#f8fafc;padding:16px 20px;">`;
        inTierCard = true;
      } else {
        html += `<div style="background:linear-gradient(90deg,#6366f1,#818cf8);border-radius:8px;padding:10px 16px;margin:16px 0 8px;">
          <span style="color:#fff;font-size:14px;font-weight:700;">${headingClean}</span>${priceHtml}
        </div>`;
      }
      const rest = line.slice(sectionMatch[0].length).replace(/^[\s—-]+/, '');
      if (rest) html += `<p style="margin:0 0 8px;color:#334155;font-size:14px;">${rest}</p>`;
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) { html += '<ul style="margin:4px 0 8px;padding:0;list-style:none;">'; inList = true; }
      const item = line.slice(2)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(£[\d,]+(?:\/\w+)?)/g, '<span style="color:#6366f1;font-weight:700;">$1</span>');
      html += `<li style="display:flex;align-items:baseline;gap:8px;padding:3px 0;color:#334155;font-size:13.5px;">
        <span style="color:#6366f1;font-weight:900;flex-shrink:0;">✓</span>
        <span>${item}</span>
      </li>`;
      continue;
    }

    closeList();
    const para = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/(£[\d,]+(?:\/\w+)?)/g, '<span style="color:#6366f1;font-weight:600;">$1</span>');
    const paraStyle = inTierCard
      ? 'margin:0 0 6px;color:#334155;font-size:13.5px;line-height:1.6;'
      : 'margin:0 0 12px;color:#1e293b;font-size:14px;line-height:1.7;';
    html += `<p style="${paraStyle}">${para}</p>`;
  }

  closeList();
  closeTierCard();

  const signatureHtml = `
    <div style="margin-top:28px;padding-top:18px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 2px;color:#1e293b;font-size:14px;line-height:1.6;">Kind regards,</p>
      <p style="margin:0 0 1px;color:#1e293b;font-size:14px;font-weight:700;">Noor Aesthetics</p>
      <p style="margin:0 0 1px;color:#475569;font-size:13px;">Ingrid Banegas&nbsp;&nbsp;/&nbsp;&nbsp;Client Relationship Manager</p>
      <p style="margin:0;color:#6366f1;font-size:13px;font-weight:600;">+44 7519685477</p>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:18px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.13);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f0c29 0%,#1e1b4b 40%,#4338ca 100%);padding:32px 36px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:rgba(255,255,255,0.12);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle;font-size:20px;color:#fff;">✦</td>
          <td style="padding-left:12px;vertical-align:middle;">
            <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.5px;">AIOS</div>
            <div style="color:rgba(255,255,255,0.45);font-size:10px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">by NeuraSolutions</div>
          </td>
        </tr></table>
      </td>
      <td align="right" style="vertical-align:middle;">
        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:20px;padding:5px 14px;display:inline-block;">
          <span style="color:rgba(255,255,255,0.7);font-size:11px;">${date}</span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Accent bar -->
  <tr><td style="height:3px;background:linear-gradient(90deg,#818cf8,#6366f1,#4f46e5,#7c3aed);"></td></tr>

  <!-- Body -->
  <tr><td style="background:#ffffff;padding:36px 36px 28px;">
    ${html}
    ${signatureHtml}
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e1b4b);padding:20px 36px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <p style="margin:0;color:rgba(255,255,255,0.45);font-size:11px;line-height:1.6;">
          Sent via <strong style="color:#818cf8;">AIOS</strong> — AI Operating System &nbsp;·&nbsp;
          <a href="mailto:${senderEmail}" style="color:#818cf8;text-decoration:none;">${senderEmail}</a>
        </p>
      </td>
      <td align="right">
        <div style="width:30px;height:30px;background:linear-gradient(135deg,#4338ca,#7c3aed);border-radius:8px;text-align:center;line-height:30px;color:#fff;font-size:14px;">✦</div>
      </td>
    </tr></table>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

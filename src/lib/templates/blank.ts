import { writePageSize, type PageSize } from '$lib/render/page';

/** A starting point: frame, title, one {field} for the recipient, a line of text, a signature line. */
export function blankDesign(opts: { title: string; size: PageSize; nameToken: string }): string {
  const { width: w, height: h } = opts.size;
  const at = (fraction: number) => Math.round(h * fraction);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${opts.title.replace(/[<>&]/g, '')}</title>
  <style>
    .cert { position: relative; width: ${w}px; height: ${h}px; box-sizing: border-box; background: #fffdf7; color: #1f2d4d; font-family: Georgia, 'Times New Roman', serif; }
    .frame { position: absolute; inset: 24px; border: 3px double #1f2d4d; pointer-events: none; }
    .line { position: absolute; left: 50%; width: ${Math.round(w * 0.72)}px; margin-left: -${Math.round(w * 0.36)}px; text-align: center; }
    .title { top: ${at(0.2)}px; font-size: 44px; letter-spacing: 4px; text-transform: uppercase; }
    .sub { top: ${at(0.36)}px; font-size: 20px; font-style: italic; color: #5b6478; }
    .name { top: ${at(0.45)}px; font-size: 64px; }
    .text { top: ${at(0.64)}px; font-size: 20px; line-height: 1.5; color: #3a4252; }
    .sign { position: absolute; bottom: ${at(0.12)}px; left: 50%; width: 240px; margin-left: -120px; border-top: 1px solid #1f2d4d; padding-top: 8px; text-align: center; font-size: 16px; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="frame"></div>
    <div class="line title">Certificate of Achievement</div>
    <div class="line sub">This certificate is proudly presented to</div>
    <div class="line name">{${opts.nameToken}}</div>
    <div class="line text">in recognition of outstanding effort and dedication.</div>
    <div class="sign">Authorised signature</div>
  </div>
</body>
</html>
`;
  return writePageSize(html, opts.size);
}

// Fonts offered in the inspector. Google fonts are linked from the design's <head> (needs internet);
// a later step can download them into files/ so they work offline.
export const SYSTEM_FONTS = ['Georgia', 'Times New Roman', 'Palatino Linotype', 'Garamond', 'Arial', 'Helvetica', 'Verdana', 'Trebuchet MS', 'Courier New'];

export const GOOGLE_FONTS = [
  'Cinzel', 'Great Vibes', 'Playfair Display', 'EB Garamond', 'Cormorant Garamond', 'Lora', 'Merriweather', 'Libre Baskerville',
  'Montserrat', 'Poppins', 'Raleway', 'Roboto', 'Oswald', 'Dancing Script', 'Pinyon Script', 'Alex Brush',
];

export const googleFontHref = (family: string) => `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}&display=swap`;

export const isGoogleFont = (family: string) => GOOGLE_FONTS.includes(family);

/** First family of a CSS font-family list, without quotes. */
export const firstFamily = (css: string) => css.split(',')[0].trim().replace(/^["']|["']$/g, '');

/** Adds the stylesheet link for a Google font to a document's <head> unless it is already there. */
export function ensureFontLink(doc: Document, family: string) {
  const href = googleFontHref(family);
  if (Array.from(doc.head.querySelectorAll('link')).some((l) => l.getAttribute('href') === href)) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  doc.head.appendChild(link);
}

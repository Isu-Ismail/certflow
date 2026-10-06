// The mark that says "this folder is a CertFlow workspace": config/workspace.json with a SHA-256 fingerprint.
// The fingerprint is computed from the other fields, so a hand-made or damaged file is noticed.
export const MARKER_PATH = 'config/workspace.json';

export interface Marker {
  app: 'certflow';
  version: 1;
  id: string;
  created: string;
  /** sha-256 of `certflow|workspace|<version>|<id>|<created>` */
  fingerprint: string;
}

export async function sha256(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const material = (m: Pick<Marker, 'version' | 'id' | 'created'>) => `certflow|workspace|${m.version}|${m.id}|${m.created}`;

export async function makeMarker(): Promise<Marker> {
  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  return { app: 'certflow', version: 1, id, created, fingerprint: await sha256(material({ version: 1, id, created })) };
}

/** null = the marker is genuine; otherwise what is wrong with it. */
export async function markerProblem(value: unknown): Promise<string | null> {
  const m = value as Partial<Marker> | null;
  if (!m || typeof m !== 'object') return 'It is not a JSON object.';
  if (m.app !== 'certflow') return 'It was not made by CertFlow.';
  if (m.version !== 1) return `Its version (${String(m.version)}) is not supported.`;
  if (typeof m.id !== 'string' || !m.id || typeof m.created !== 'string' || !m.created || typeof m.fingerprint !== 'string') return 'It is missing fields (id, created or fingerprint).';
  return (await sha256(material(m as Marker))) === m.fingerprint ? null : 'Its fingerprint does not match: the file was changed or damaged.';
}

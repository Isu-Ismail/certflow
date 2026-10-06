import type { FlowGraph } from '$lib/flow/types';

import type { Marker } from './marker';

export type Step = 'data' | 'design' | 'flow' | 'generate';

export type Row = Record<string, string>;

/** The workspace's data file (data.csv on disk). */
export interface Sheet {
  fileName: string;
  columns: string[];
  rows: Row[];
  /** The identity column: says who a row is (all different). Missing = found automatically. */
  identity?: string;
  /** The kind of file it came from (and is saved as): CSV text or an Excel workbook. Missing = csv. */
  format?: 'csv' | 'xlsx';
}

/** One `<name>.cert.html` file. `name` has no extension. */
export interface DesignFile {
  name: string;
  html: string;
}

/** One file under `files/`. */
export interface WorkFile {
  name: string;
  blob: Blob;
}

/** Everything a workspace folder contains. */
export interface LoadedWorkspace {
  name: string;
  /** The data files. The first is the main one; the others are merged in by `combine` (same index - 1). */
  sources: Sheet[];
  combine: CombineStep[];
  /** design name -> the data list it uses ('combined' or a data file name). Missing = the default list. */
  designData: Record<string, string>;
  designs: DesignFile[];
  flowJson: string | null;
  /** Design token -> data column, for tokens whose name differs from the column (stored in flow.json "fields"). */
  fieldMap: Record<string, string>;
  /** The flow graph (which design each row gets). null = never edited: everyone gets the first design. */
  flow: FlowGraph | null;
  /** The options of the Generate step (config/generate.config.json). */
  genConfig: Record<string, unknown> | null;
  /** The mark that makes the folder a CertFlow workspace (config/workspace.json). */
  marker: Marker | null;
  files: WorkFile[];
}

/** Raw files read from a picked folder (paths are relative to the folder root). */
export interface FolderContents {
  name: string;
  handle: unknown | null;
  entries: { path: string; file: File }[];
}

/** How a data file after the first one is merged into the table. */
export type CombineStep =
  | { mode: 'stack' }
  | { mode: 'join'; leftKey: string; rightKey: string; keep: 'all' | 'matched'; rename?: Record<string, string> }
  /** kept as its own list: not merged into the table (a design can be bound to it, see `designData`) */
  | { mode: 'separate' };

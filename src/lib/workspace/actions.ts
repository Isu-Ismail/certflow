// User-level actions. UI components call these; they handle errors and show toasts.
import { toast } from '$lib/ui/toast.svelte';
import { dataUi } from '../../steps/data/data.svelte';
import { classify, WorkspaceProblems } from './loadWorkspace';
import { canLinkFolder, listTop, pickLinkFolder, readTextAt } from './folder';
import { inspectEntries } from './inspect';
import { MARKER_PATH, makeMarker } from './marker';
import { showProblems } from './problems.svelte';
import { canPickFolder, fromFileList, pickFolder } from './openFolder';
import { parseDelimited, parseSheetFile } from './parseSheet';
import { makeSampleSheet } from './sample';
import { downloadZip } from './saveFolder';
import { ws } from './store.svelte';
import type { FolderContents } from './types';

const fail = (e: unknown) => toast(e instanceof Error ? e.message : String(e), 'error');

export async function importFile(file: File) {
  try {
    const sheet = await parseSheetFile(file);
    ws.setSheet(sheet, `Import ${file.name}`);
    toast(`Loaded ${sheet.rows.length} rows from ${file.name}`, 'success');
  } catch (e) {
    fail(e);
  }
}

/** Reads another data file and opens the dialog that asks how to merge it. */
export async function addDataFile(file: File) {
  try {
    const sheet = await parseSheetFile(file);
    if (!ws.sources.length) {
      ws.setSheet(sheet, `Import ${file.name}`);
      return toast(`Loaded ${sheet.rows.length} rows from ${file.name}`, 'success');
    }
    dataUi.pending = { sheet, editing: null };
  } catch (e) {
    fail(e);
  }
}

/** Replaces the content of one data file with another file's. */
export async function replaceDataFile(index: number, file: File) {
  try {
    const sheet = await parseSheetFile(file);
    ws.replaceSource(index, sheet, `Replace data with ${file.name}`);
    toast(`Loaded ${sheet.rows.length} rows from ${file.name}`, 'success');
  } catch (e) {
    fail(e);
  }
}

export function importText(text: string) {
  try {
    const sheet = parseDelimited(text, 'data.csv');
    ws.setSheet(sheet, 'Paste data');
    toast(`Pasted ${sheet.rows.length} rows`, 'success');
  } catch (e) {
    fail(e);
  }
}

export function useSample() {
  ws.setSheet(makeSampleSheet(), 'Load sample data');
}

async function openContents(folder: FolderContents) {
  try {
    // is it a CertFlow workspace, and are its files usable?
    const found = await inspectEntries(folder.entries);
    if (found.kind === 'empty' || found.kind === 'foreign') {
      return showProblems('Cannot open this folder', [{
        where: folder.name,
        text: found.kind === 'empty'
          ? 'The folder is empty. Open a CertFlow workspace, or choose this folder from the workspace menu to save your work into it.'
          : 'This is not a CertFlow workspace: it has no config/workspace.json. CertFlow only uses folders it made itself.',
      }]);
    }
    if (found.problems.length) return showProblems('This folder cannot be used as a workspace', found.problems, 'These files are broken. Fix or remove them, then open the folder again. Nothing was loaded.');
    const loaded = await classify(folder);
    if (found.kind === 'legacy') toast('This folder used the older layout. It is saved as data/, designs/ and config/ from now on.');
    else if (found.warnings.length) toast(`${found.warnings.length} file${found.warnings.length === 1 ? ' is' : 's are'} not part of the workspace and ${found.warnings.length === 1 ? 'was' : 'were'} ignored`);
    ws.load(loaded, folder.handle, new Set(folder.entries.map((e) => e.path)));
    const parts = [`${loaded.designs.length} design${loaded.designs.length === 1 ? '' : 's'}`];
    if (loaded.sources.length) parts.unshift(`${loaded.sources.reduce((n, s) => n + s.rows.length, 0)} rows`);
    toast(`Opened “${loaded.name}” — ${parts.join(', ')}`, 'success');
    if (!loaded.sources.length) toast('No data file found. Add a CSV or Excel file to continue.');
  } catch (e) {
    if (e instanceof WorkspaceProblems) showProblems('This folder cannot be used as a workspace', e.items, 'Nothing was loaded.');
    else fail(e);
  }
}

/** Opens the native folder picker, or returns false so the caller can use the <input> fallback. */
export async function openFolder(): Promise<boolean> {
  if (!canPickFolder()) return false;
  try {
    const folder = await pickFolder();
    if (folder) await openContents(folder);
  } catch (e) {
    fail(e);
  }
  return true;
}

export const openFileList = (list: FileList) => openContents(fromFileList(list));

const MAX_FILE_MB = 5;

/** Adds uploaded files (images, fonts…) to files/. */
export function addFiles(list: FileList | File[]) {
  for (const file of list) {
    if (file.size > MAX_FILE_MB * 1024 * 1024) toast(`${file.name} is over ${MAX_FILE_MB} MB — it will make the workspace heavy`);
    const name = ws.addFile(file.name, file);
    toast(`Added files/${name}`, 'success');
  }
}

export function undo() {
  const label = ws.undo();
  toast(label ? `Undid: ${label}` : 'Nothing to undo');
}

export function redo() {
  const label = ws.redo();
  toast(label ? `Redid: ${label}` : 'Nothing to redo');
}

/** Save to the browser right now (the autosave already does this after every change; this is the explicit button). */
export async function saveNow() {
  if (!(await ws.flush(true))) return;
  if (ws.handle && ws.folderState === 'linked') {
    const ok = await ws.syncFolder();
    toast(ok ? `Saved in this browser and in the folder “${ws.handle.name}”` : 'Saved in this browser, but the folder could not be written', ok ? 'success' : 'error');
  } else {
    toast('Saved in this browser only. To keep a copy on your computer, open the workspace menu and choose a folder or .zip.', 'success');
  }
}

/** Links the workspace to a folder (asks for one) and writes everything into it; from then on edits are saved there. */
export async function saveWorkspace() {
  if (!canLinkFolder()) return downloadWorkspaceZip();
  try {
    if (ws.handle && ws.folderState !== 'none') {
      if (ws.folderState === 'needs-permission' && !(await ws.reconnectFolder())) return toast('Could not get access to the folder', 'error');
      if (await ws.syncFolder()) toast(`Saved to “${ws.handle.name}”`, 'success');
      return;
    }
    const handle = await pickLinkFolder();
    if (!handle) return;
    // only an empty folder can become a workspace; a folder that already is one is opened, not overwritten
    const top = await listTop(handle);
    if (top.length) {
      const isWorkspace = (await readTextAt(handle, MARKER_PATH)) !== null;
      return showProblems('Choose an empty folder', [{
        where: handle.name,
        text: isWorkspace
          ? 'This folder already holds a CertFlow workspace. Use Open… to open it, or pick another folder.'
          : `This folder is not empty (${top.length} item${top.length === 1 ? '' : 's'}) and is not a CertFlow workspace. Pick an empty folder so nothing of yours is mixed up.`,
      }]);
    }
    ws.name = handle.name;
    await ws.linkFolder(handle);
    toast(`Linked to “${handle.name}”. Changes are now saved there automatically.`, 'success');
  } catch (e) {
    fail(e);
  }
}

export async function reconnectFolder() {
  if (!(await ws.reconnectFolder())) toast('Could not get access to the folder', 'error');
}

export async function downloadWorkspaceZip() {
  try {
    ws.marker ??= await makeMarker();
    await downloadZip(ws.toWorkspace());
  } catch (e) {
    fail(e);
  }
}

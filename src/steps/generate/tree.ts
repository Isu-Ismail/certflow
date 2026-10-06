// The folders and files a run will make, as a tree (built from the planned paths), flattened into rows for a long list.
export interface TreeDir {
  name: string;
  /** path from output/, e.g. "batch-01/Team 1" ('' for the root) */
  path: string;
  dirs: Map<string, TreeDir>;
  /** file name -> how many certificates it holds (more than 1 only in "one PDF per batch" mode) */
  files: Map<string, number>;
  /** certificates inside this folder, all levels */
  total: number;
}

const dir = (name: string, path: string): TreeDir => ({ name, path, dirs: new Map(), files: new Map(), total: 0 });

export function buildTree(paths: Iterable<string>): TreeDir {
  const root = dir('output', '');
  for (const path of paths) {
    const parts = path.split('/');
    const file = parts.pop()!;
    let node = root;
    node.total++;
    for (const p of parts) {
      let next = node.dirs.get(p);
      if (!next) { next = dir(p, node.path ? `${node.path}/${p}` : p); node.dirs.set(p, next); }
      node = next;
      node.total++;
    }
    node.files.set(file, (node.files.get(file) ?? 0) + 1);
  }
  return root;
}

export type TreeRow =
  | { kind: 'dir'; depth: number; path: string; name: string; total: number; open: boolean }
  | { kind: 'file'; depth: number; path: string; name: string; pages: number }
  | { kind: 'more'; depth: number; path: string; text: string };

/**
 * The rows to show, top to bottom. Closed folders show nothing below them. A folder lists at most `maxFiles` files and
 * `maxDirs` sub-folders ("… and N more" for the rest), unless those are Infinity.
 */
export function flatten(root: TreeDir, isOpen: (dir: TreeDir, depth: number) => boolean, maxFiles: number, maxDirs: number): TreeRow[] {
  const rows: TreeRow[] = [];
  const visit = (node: TreeDir, depth: number) => {
    const open = isOpen(node, depth);
    rows.push({ kind: 'dir', depth, path: node.path, name: node.name, total: node.total, open });
    if (!open) return;
    let shown = 0;
    for (const d of node.dirs.values()) {
      if (shown++ >= maxDirs) break;
      visit(d, depth + 1);
    }
    if (node.dirs.size > maxDirs) rows.push({ kind: 'more', depth: depth + 1, path: `${node.path}#dirs`, text: `… and ${node.dirs.size - maxDirs} more folders` });
    let n = 0;
    for (const [name, pages] of node.files) {
      if (n++ >= maxFiles) break;
      rows.push({ kind: 'file', depth: depth + 1, path: `${node.path}/${name}`, name, pages });
    }
    if (node.files.size > maxFiles) rows.push({ kind: 'more', depth: depth + 1, path: `${node.path}#files`, text: `… and ${node.files.size - maxFiles} more files` });
  };
  visit(root, 0);
  return rows;
}

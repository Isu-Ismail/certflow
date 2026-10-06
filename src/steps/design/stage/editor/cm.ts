// CodeMirror 6 setup. Imported lazily (dynamic import) so the editor's code is only downloaded
// when someone opens Code or Split. Everything CodeMirror-specific lives in this file.
import { autocompletion, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { html } from '@codemirror/lang-html';
import { bracketMatching, defaultHighlightStyle, indentOnInput, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { Annotation, EditorState } from '@codemirror/state';
import {
  Decoration, drawSelection, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers,
  MatchDecorator, ViewPlugin, type DecorationSet, type ViewUpdate,
} from '@codemirror/view';

export interface EditorHandlers {
  onChange: (doc: string) => void; // user edits only (not setDoc)
  onBlur: () => void;
  onCursor: (line: number, col: number) => void;
  onProblems: (count: number) => void;
}

export interface Editor {
  getDoc(): string;
  setDoc(text: string): void;
  focus(): void;
  destroy(): void;
}

const external = Annotation.define<boolean>(); // marks changes pushed in from outside (undo, rename…)

// {Field} names get a chip-like highlight. Same shape as lib/workspace/tokens.ts, so CSS braces are skipped.
const tokenMatcher = new MatchDecorator({
  regexp: /\{[\p{L}\p{N}_ .\-#/]{1,60}\}/gu,
  decoration: Decoration.mark({ class: 'cm-token' }),
});
const tokenPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = tokenMatcher.createDeco(view); }
    update(update: ViewUpdate) { this.decorations = tokenMatcher.updateDeco(update, this.decorations); }
  },
  { decorations: (v) => v.decorations },
);

const theme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px', backgroundColor: '#fff', color: '#121212' },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.65', overflow: 'auto' },
  '.cm-content': { padding: '8px 0' },
  '.cm-gutters': { backgroundColor: '#f4f1e8', color: '#706c62', borderRight: '2px solid #121212' },
  '.cm-activeLine': { backgroundColor: 'color-mix(in srgb, var(--soft-c) 55%, transparent)' },
  '.cm-activeLineGutter': { backgroundColor: 'var(--soft-c)', color: '#121212' },
  '.cm-cursor': { borderLeftColor: '#121212', borderLeftWidth: '2px' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': { backgroundColor: 'var(--soft-c)' },
  '.cm-token': { backgroundColor: 'var(--soft-c)', border: '1px solid #121212', borderRadius: '3px', padding: '0 1px' },
  '.cm-tooltip': { border: '2px solid #121212', borderRadius: '6px', backgroundColor: '#fff' },
});

export function createEditor(host: HTMLElement, doc: string, h: EditorHandlers): Editor {
  // Syntax problems from the HTML parser (unclosed / mismatched tags) as warnings in the gutter.
  const problems = linter(
    (view) => {
      const found: Diagnostic[] = [];
      syntaxTree(view.state).iterate({
        enter: (node) => {
          if (node.type.isError) found.push({ from: node.from, to: Math.max(node.to, node.from + 1), severity: 'warning', message: 'HTML problem — check the tags here' });
        },
      });
      h.onProblems(found.length);
      return found.slice(0, 100);
    },
    { delay: 350 },
  );

  const view = new EditorView({
    parent: host,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(), highlightActiveLine(), highlightActiveLineGutter(), drawSelection(), history(),
        indentOnInput(), bracketMatching(), closeBrackets(), autocompletion(), highlightSelectionMatches(),
        html({ autoCloseTags: true }),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        tokenPlugin, problems, lintGutter(), theme, EditorView.lineWrapping,
        keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...searchKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && !u.transactions.some((t) => t.annotation(external))) h.onChange(u.state.doc.toString());
          if (u.docChanged || u.selectionSet) {
            const head = u.state.selection.main.head;
            const line = u.state.doc.lineAt(head);
            h.onCursor(line.number, head - line.from + 1);
          }
        }),
        EditorView.domEventHandlers({ blur: () => { h.onBlur(); } }),
      ],
    }),
  });

  return {
    getDoc: () => view.state.doc.toString(),
    setDoc: (text) => view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text }, annotations: external.of(true) }),
    focus: () => view.focus(),
    destroy: () => view.destroy(),
  };
}

import type { Step } from '$lib/workspace/types';

export interface PageHelp {
  title: string;
  purpose: string;
  steps: string[];
  tips: string[];
  next?: string;
  note?: string; // shown when the page is not built yet
}

/** Text for the "What is this page?" popover, one entry per step. */
export const HELP: Record<Step, PageHelp> = {
  data: {
    title: 'Data — who gets a certificate',
    purpose:
      'This page holds your data: a table with one row per certificate. Every column becomes a {field} that you can place on a certificate, like {Name} or {Roll Number}.',
    steps: [
      'Start by opening a workspace folder you saved before, or import a CSV / Excel file. You can also drop a file or paste a table with Ctrl+V.',
      'Check the table. Click any cell to fix a typo. Use “Add row” or the × on a row to change what is in the table.',
      'The Fields strip shows each column as a {field}. Click one to copy it, then paste it into text in a design.',
      'The key icon marks the identity column: the column that says who a row is, such as a roll number. It must be different for everyone. It names people across the app and names their certificate files. Change it with the Identity menu.',
      'If a design uses a field that is not a column name, pick the column it should read from in the Fields strip.',
      'More than one file? Press “Add data file”. Add its rows below (more people), match it to your table on a shared column such as Roll Number (more columns), or keep it as a separate data file (then pair it with a design in the Design step). If a column name already exists, use {file.Column} in designs or give it a new name. The Combined tab shows the result; each file keeps its own tab for editing.',
    ],
    tips: [
      'Column names are kept exactly as written (capitals and spaces), because they become the field names.',
      'Ctrl+Z undoes your last change, Ctrl+Shift+Z redoes it.',
      'Your work is autosaved in this browser. “Save workspace” writes everything to a folder you can keep.',
    ],
    next: 'When the list looks right, go to Design.',
  },
  design: {
    title: 'Design — lay out the certificate',
    purpose:
      'Create the certificate pages. Each design is one .cert.html file in your workspace, with text, logos, shapes and {fields} that are filled from your data.',
    steps: [
      'Press + next to Designs in the explorer to create a design: a blank page, or an HTML file you already have.',
      'Click anything on the page to select it. Drag to move, use the square handles to resize, arrow keys to nudge (Shift = 10 px). Double-click text to edit it right on the page. Hold Space and drag (or use the middle mouse button) to pan, and Ctrl + mouse wheel to zoom.',
      'Use Add (above the page) for basics (text, rectangle, line, images) and ready-made certificate parts: frames, a header with logos, title, subtitle, recipient name, body text, signature and seal. Click a {field} in the explorer to put it into the selected text.',
      'Set the page background in the right panel with nothing selected: a colour, and/or an image from Files (PNG, JPG or SVG).',
      'The panel on the right changes with what you select: font, size, colour, alignment, position, order, and a list of layers. With nothing selected it sets the page size.',
      'Use Preview, Split or Code at the top to switch between the page, both side by side, or the HTML.',
    ],
    tips: [
      'Everything here can be undone with Ctrl+Z. Delete removes the selected item, Ctrl+D duplicates it.',
      'The row arrows show the page with each row of your data. “Fields” shows the {field} names instead of the values.',
      'Google fonts need internet. The status line warns about online resources and missing files.',
    ],
    next: 'Then go to Flow if you have more than one design.',
    note: 'Starter templates, Canva import and offline fonts are coming next.',
  },
  flow: {
    title: 'Flow — which design for whom',
    purpose: 'Choose which design each person gets. Use a simple list of rules, or draw the same thing as boxes and lines. The flow is saved in flow.json.',
    steps: [
      'Simple form: add a rule, pick a column, a condition and a value, then the design to use. Rules are checked from the top.',
      'Choose what everyone else gets: a design, or no certificate.',
      'Node graph: press Data, If, Design or Skip to add boxes. An If box gives every condition row its own “yes”, and “else” for the rest. A Data box can also take connections: a person who reaches it is looked up in that other data file (by a shared column such as a roll number) and continues with their row there. Use a design paired with that data file after it. Drag from a round dot to another box to connect them. Press Backspace to delete.',
      'Check “Who gets what” to see how many people get each design.',
    ],
    tips: ['Both views edit the same flow. A graph with branches inside branches cannot be shown as a simple form.', 'With only one design you can skip this page.'],
    next: 'Then go to Generate.',
  },
  generate: {
    title: 'Generate — make the certificates',
    purpose: 'Makes a PDF for everyone the flow gave a design to, in batches, and saves them into your workspace folder.',
    steps: [
      'Press “Preview 10” to see ten random certificates first. View, open in a tab or download each one. Nothing is saved.',
      'Press Generate. Certificates are made 50 at a time and saved in the folder output/batch-01, output/batch-02 and so on.',
      'Stop at any time. It finishes the certificate it is on, and Continue picks up where it stopped, even tomorrow.',
      'The four cards below the summary set the options: Files (one PDF per student or per batch), Folders (None, Auto or Choose), Batches (size, extra room, edit the plan) and Quality and names. Press the ! on a card to see what it does.',
    ],
    tips: ['Save the workspace into a folder first (workspace menu). Without a folder, each finished batch is downloaded as a zip.', 'Keep this tab open while it runs: browsers slow down hidden tabs.', 'File names come from a column whose values are all different, such as a roll number.'],
  },
};

import { ws } from '$lib/workspace/store.svelte';
import type { Sheet } from '$lib/workspace/types';

/** UI state of the Data step when there is more than one data file. */
class DataUi {
  /** the tab the user picked: the merged table or one data file */
  tab = $state<'combined' | number>('combined');
  /** a parsed file waiting in the merge dialog (`editing` = the data file whose merge settings are being changed) */
  pending = $state.raw<{ sheet: Sheet; editing: number | null } | null>(null);

  /** Some file is merged into the table (stacked or matched), so a Combined tab makes sense. */
  hasMerged = $derived(ws.combine.some((c) => c.mode !== 'separate'));

  /** What the table shows: 'combined', or the index of one data file. One data file = always that file. */
  view = $derived<'combined' | number>(
    ws.sources.length < 2
      ? 0
      : this.tab === 'combined' || this.tab >= ws.sources.length
        ? this.hasMerged ? 'combined' : 0
        : this.tab,
  );
}

export const dataUi = new DataUi();

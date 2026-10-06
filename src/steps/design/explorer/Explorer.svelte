<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { design } from '../design.svelte';
  import Section from './Section.svelte';
  import DesignList from './DesignList.svelte';
  import FileList from './FileList.svelte';
  import FieldList from './FieldList.svelte';
  import DataList from './DataList.svelte';
  import { Plus, Upload, Trash } from '@lucide/svelte';

  let fileList: FileList;
  const iconBtn = 'grid size-7 place-items-center rounded hover:bg-soft';
</script>

<div class="flex h-full min-h-0 flex-col overflow-y-auto">
  <Section title="Data" count={ws.lists.length} tip="The data files you can fill a design from. A design reads one data file at a time." steps={['Open a design.', 'Click a data file here to pair it with that design.', 'The Fields section below then shows that file\'s fields.']}>
    <DataList />
  </Section>

  <Section title="Designs" count={ws.designs.length} tip="Your certificate designs. Each one is a .cert.html file in your workspace." steps={['Click a design to open it.', 'Use + to make a new one.', 'The ... menu renames, copies or deletes a design.']}>
    {#snippet actions()}
      <button class={iconBtn} aria-label="New design" title="New design" onclick={() => (design.newOpen = true)}><Plus class="size-4" /></button>
    {/snippet}
    <DesignList />
  </Section>

  <Section title="Files" count={ws.files.length} tip="Pictures and fonts your designs use, such as logos and backgrounds. They are saved in the files/ folder." steps={['Drop files here or use the upload button.', 'Click a picture to look at it.', 'Add it to a design from the Add menu or the design code.']}>
    {#snippet actions()}
      {#if design.selectedFiles.length}
        <button
          class="flex items-center gap-1 rounded border-2 border-ink bg-[#fbd5cf] px-1.5 py-0.5 text-xs font-bold text-ink shadow-[1px_1px_0_#121212] hover:bg-[#f8b4a8]"
          title="Delete selected files"
          onclick={() => fileList.removeSelected()}
        >
          <Trash class="size-3" />Delete ({design.selectedFiles.length})
        </button>
      {/if}
      <button class={iconBtn} aria-label="Upload files" title="Upload files" onclick={() => fileList.openPicker()}><Upload class="size-4" /></button>
    {/snippet}
    <FileList bind:this={fileList} />
  </Section>

  <Section title="Fields" count={design.fieldCount} tip={"Fields are {placeholders} such as {Name} that are replaced by each person data. Each field reads one column of the data file paired with this design."} steps={['Write {Name} in the page text, or choose + Add a field.', 'Pick the column each field should read from.', 'Fields of other data files are shown dimmed; pick that file in the Data section to use them.']}>
    <FieldList />
  </Section>
</div>

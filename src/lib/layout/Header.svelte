<script lang="ts">
  import { ws } from '$lib/workspace/store.svelte';
  import { saveNow } from '$lib/workspace/actions';
  import Button from '$lib/ui/Button.svelte';
  import WorkspaceMenu from './WorkspaceMenu.svelte';
  import StepNav from './StepNav.svelte';
  import UndoRedo from './UndoRedo.svelte';
  import PageHelp from './PageHelp.svelte';
  import SaveStatus from './SaveStatus.svelte';
  import { Save } from '@lucide/svelte';
</script>

<!-- One row: logo · workspace · steps · help · undo/redo · save. Phones: steps drop to a second row. -->
<header class="flex flex-wrap items-center gap-1.5 px-2 py-2 sm:gap-3 sm:px-3 md:flex-nowrap">
  <div class="flex items-center gap-2 text-lg font-bold tracking-tight">
    <!-- the CertFlow mark without the dark tile (public/logo-mark.svg, derived from favicon.svg) -->
    <img src="{import.meta.env.BASE_URL}logo-mark.svg" alt="" class="size-10" />
    <h1 class="sr-only">CertFlow — certificate generator</h1>
    <!-- Space Grotesk's heaviest weight is 700, so a thin text-stroke makes it look bolder still -->
    <span class="hidden text-[26px] leading-none font-bold tracking-tight [-webkit-text-stroke:0.8px_currentColor] lg:inline">CertFlow</span>
  </div>

  <WorkspaceMenu />

  <span class="flex-1 md:hidden"></span>
  <StepNav />
  <PageHelp />
  <UndoRedo />

  <SaveStatus />
  <Button variant="dark" class="shrink-0 px-2.5 sm:w-24 sm:px-3.5" disabled={ws.isEmpty} onclick={saveNow} aria-label="Save" title="Save now (Ctrl+S). Changes are also saved automatically.">
    <Save class="size-4" /><span class="hidden sm:inline">Save</span>
  </Button>
</header>

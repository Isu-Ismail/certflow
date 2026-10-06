<script lang="ts">
  import type { Target } from '$lib/flow/types';
  import { flowUi } from '../flow.svelte';

  let { target, allowNone = false, onchange }: { target: Target | null; allowNone?: boolean; onchange: (t: Target | null) => void } = $props();

  const value = $derived(target === null ? '' : target.kind === 'skip' ? '__skip__' : target.design);
  const missing = $derived(target?.kind === 'design' && !flowUi.designNames.includes(target.design));

  function pick(v: string) {
    onchange(v === '' ? null : v === '__skip__' ? { kind: 'skip' } : { kind: 'design', design: v });
  }
</script>

<select
  class="h-8 min-w-0 rounded-md border-2 bg-white px-2 text-sm font-semibold {missing ? 'border-[#d6361f]' : 'border-ink'}"
  aria-label="Design"
  {value}
  onchange={(e) => pick(e.currentTarget.value)}
>
  {#if allowNone}<option value="">Nobody (no certificate)</option>{/if}
  {#if missing && target?.kind === 'design'}<option value={target.design}>{target.design} (missing)</option>{/if}
  {#each flowUi.designNames as d (d)}<option value={d}>{d}</option>{/each}
  <option value={'__skip__'}>Skip (no certificate)</option>
</select>

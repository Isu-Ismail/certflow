<script lang="ts">
  // One choice out of a few, as joined buttons (instead of radio buttons).
  let { options, value, onchange, label, disabled = false }: {
    options: { value: string; label: string; title?: string }[];
    value: string;
    onchange: (value: string) => void;
    label: string;
    disabled?: boolean;
  } = $props();
</script>

<div class="flex w-full overflow-hidden rounded-md border-2 border-ink {disabled ? 'opacity-60' : ''}" role="radiogroup" aria-label={label}>
  {#each options as o, i (o.value)}
    <button
      type="button"
      role="radio"
      aria-checked={o.value === value}
      title={o.title}
      {disabled}
      class="h-8 min-w-0 flex-1 truncate px-2 text-sm font-semibold whitespace-nowrap {i ? 'border-l-2 border-ink' : ''} {o.value === value ? 'bg-ink text-white' : 'bg-white hover:bg-step-soft'}"
      onclick={() => o.value !== value && onchange(o.value)}
    >{o.label}</button>
  {/each}
</div>

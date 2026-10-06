<script lang="ts">
  let { title, note }: { title: string; note: string } = $props();
</script>

<div class="grid min-h-64 flex-1 place-items-center px-6 text-center">
  <div>
    <h1 class="text-2xl font-bold tracking-tight">{title}</h1>
    <p class="mt-2 max-w-sm text-mute">{note}</p>
  </div>
</div>

<script lang="ts">
  import { Handle, Position } from '@xyflow/svelte';
  import { Database } from 'lucide-svelte';

  let { data }: { data: any } = $props();
</script>

<div class="bg-white border-3 border-black rounded-2xl p-4 shadow-[6px_6px_0px_0px_#000] min-w-[210px] text-black font-bold">
  <div class="flex items-center gap-2.5 mb-2 pb-2 border-b-3 border-black bg-lime-300 -mx-4 -mt-4 p-3 rounded-t-xl">
    <div class="p-1 rounded-lg bg-black text-white">
      <Database class="w-4 h-4" />
    </div>
    <div>
      <h4 class="font-black text-xs uppercase">Data Source Node</h4>
      <span class="text-[10px] font-extrabold text-black">Input Dataset</span>
    </div>
  </div>

  <div class="text-xs space-y-1.5 pt-1">
    <div class="flex items-center justify-between">
      <span class="text-slate-700">Records:</span>
      <span class="font-black bg-yellow-200 px-2 py-0.5 border border-black rounded-md">{data.recordCount ?? 0} students</span>
    </div>
    <div class="flex items-center justify-between text-[11px]">
      <span class="text-slate-700">Columns:</span>
      <span class="font-mono font-bold text-black">{(data.columns || []).length} fields</span>
    </div>
  </div>

  <!-- Output Handle -->
  <Handle
    type="source"
    position={Position.Right}
    id="output"
    class="!w-4 !h-4 !bg-lime-400 !border-3 !border-black"
  />
</div>

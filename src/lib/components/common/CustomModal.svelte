<script lang="ts">
  import { modalStore } from '../../stores/modalStore.svelte';
  import { AlertTriangle, CheckCircle, Info, Trash2, X } from 'lucide-svelte';
</script>

{#if modalStore.state.isOpen}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
    <div 
      class="w-full max-w-md bg-white border-4 border-black rounded-3xl p-6 shadow-[10px_10px_0px_0px_#000] relative flex flex-col gap-4 animate-in zoom-in-95 duration-150"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b-3 border-black pb-3">
        <div class="flex items-center gap-2.5">
          {#if modalStore.state.type === 'danger'}
            <div class="w-10 h-10 rounded-2xl bg-rose-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Trash2 class="w-5 h-5 text-black stroke-[2.5]" />
            </div>
          {:else if modalStore.state.type === 'success'}
            <div class="w-10 h-10 rounded-2xl bg-lime-400 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <CheckCircle class="w-5 h-5 text-black stroke-[2.5]" />
            </div>
          {:else if modalStore.state.type === 'confirm'}
            <div class="w-10 h-10 rounded-2xl bg-yellow-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <AlertTriangle class="w-5 h-5 text-black stroke-[2.5]" />
            </div>
          {:else}
            <div class="w-10 h-10 rounded-2xl bg-cyan-300 border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Info class="w-5 h-5 text-black stroke-[2.5]" />
            </div>
          {/if}
          
          <h3 class="font-black text-black text-lg uppercase tracking-tight">
            {modalStore.state.title}
          </h3>
        </div>

        <button 
          onclick={() => modalStore.cancel()}
          class="w-8 h-8 rounded-xl bg-slate-100 border-2 border-black flex items-center justify-center hover:bg-rose-300 cursor-pointer shadow-[2px_2px_0px_0px_#000] transition-all"
        >
          <X class="w-4 h-4 text-black stroke-[3]" />
        </button>
      </div>

      <!-- Message Content -->
      <div class="text-sm font-bold text-slate-800 leading-relaxed py-2">
        {modalStore.state.message}
      </div>

      <!-- Footer Action Buttons -->
      <div class="flex items-center justify-end gap-3 pt-2">
        {#if modalStore.state.cancelText}
          <button
            onclick={() => modalStore.cancel()}
            class="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 border-2 border-black font-black text-xs uppercase text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer"
          >
            {modalStore.state.cancelText}
          </button>
        {/if}

        <button
          onclick={() => modalStore.confirm()}
          class={`px-5 py-2.5 rounded-xl border-3 border-black font-black text-xs uppercase text-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all cursor-pointer ${
            modalStore.state.type === 'danger'
              ? 'bg-rose-400 hover:bg-rose-300'
              : modalStore.state.type === 'success'
              ? 'bg-lime-400 hover:bg-lime-300'
              : 'bg-yellow-300 hover:bg-yellow-400'
          }`}
        >
          {modalStore.state.confirmText}
        </button>
      </div>

    </div>
  </div>
{/if}

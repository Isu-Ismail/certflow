<script lang="ts">
  import { visual } from '../visual/visual.svelte';
  import Section from '../explorer/Section.svelte';
  import TextStyle from './TextStyle.svelte';
  import BoxStyle from './BoxStyle.svelte';
  import Geometry from './Geometry.svelte';
  import Arrange from './Arrange.svelte';

  const titles = { text: 'Text', image: 'Image', shape: 'Shape', group: 'Group' } as const;
</script>

{#if visual.selected !== null && visual.kind}
  <Section title={titles[visual.kind]}>
    {#if visual.kind === 'text' || visual.kind === 'group'}<TextStyle />{/if}
    {#if visual.kind !== 'text'}<div class="mt-3"><BoxStyle /></div>{/if}
  </Section>
  <Section title="Position and size"><Geometry /></Section>
  <Section title="Arrange"><Arrange /></Section>
{/if}

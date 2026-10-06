<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  type Props = HTMLButtonAttributes & {
    variant?: 'default' | 'dark' | 'step' | 'danger' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    children: Snippet;
  };

  let { variant = 'default', size = 'md', class: extra = '', children, ...rest }: Props = $props();

  const base =
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border-2 border-ink font-semibold whitespace-nowrap select-none transition-[transform,box-shadow,background-color] disabled:pointer-events-none disabled:opacity-50';
  const press = 'shadow-hard active:translate-x-[3px] active:translate-y-[3px] active:shadow-none';
  const variants = {
    default: `bg-white hover:bg-step-soft ${press}`,
    dark: `bg-ink text-white hover:bg-step hover:text-on-step ${press}`,
    step: `bg-step text-on-step ${press}`,
    danger: `bg-[#d6361f] text-white hover:bg-[#b52c18] ${press}`,
    outline: 'border-[1.5px] bg-white hover:bg-step-soft',
    ghost: 'border-transparent bg-transparent hover:bg-soft',
  };
  const sizes = {
    sm: 'h-8 px-2.5 text-[13px]',
    md: 'h-9 px-3.5 text-sm',
    lg: 'h-11 px-5 text-[15px]',
    icon: 'size-9',
  };
</script>

<button type="button" class="{base} {variants[variant]} {sizes[size]} {extra}" {...rest}>
  {@render children()}
</button>

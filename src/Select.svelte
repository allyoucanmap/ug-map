<script>
    import { createEventDispatcher, onMount } from 'svelte';

    export let value = '';
    export let options = [];

    let select;
    let showList = false;

    const dispatch = createEventDispatcher();

    function handleSelect(id) {
        dispatch('change', {
            value: id
        });
        showList = false;
    }

    function handleEnable(value) {
        showList = value;
    }

    onMount(() => {
        function iconsListClickOut(event) {
            if (select && !select.contains(event.target)) {
                showList = false;
            }
        }
        document.addEventListener('mousedown', iconsListClickOut);
        return () => {
            document.removeEventListener('mousedown', iconsListClickOut);
        };
    });

    $: selected = (options.find(option => option.id === value) || {}).label;

</script>

<div class="select" bind:this={select}>
    <div class="select-input" on:click={handleEnable.bind(null, true)}>
        {selected}
    </div>
    {#if showList}
    <ul class="select-list no-bullets" >
        {#each options as option}
            <li on:click={handleSelect.bind(null, option.id)}>
                {option.label}
            </li>
        {/each}
    </ul>
    {/if}
</div>

<style>
.select {
    position: relative;
    cursor: pointer;
    background: var(--background-color);
}
.select-input {
    padding: 0.2rem;
    background-color: rgba(0,0,0,.05);
    border: 1px solid var(--border-color);
}
.select-list {
    background: var(--background-color);
    position: absolute;
    border: 1px solid var(--border-color);
    z-index: 1;
    right: 0;
}
.select-list li {
    padding: 0.2rem;
    cursor: pointer;
}
.select-list li:hover {
    padding: 0.2rem;
    background: rgba(0,0,0,.05);
    outline: 1px solid var(--outline-color);
}
</style>

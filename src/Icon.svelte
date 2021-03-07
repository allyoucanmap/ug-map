<script>
    import { createEventDispatcher, onMount } from 'svelte';
    export let edit = false;
    export let src;
    export let color;
    export let icons = {};
    export let selected = false;
    export let rootPath = '';

    let inputColorNode;
    let iconsListNode;
    let showIconsList = false;

    const dispatch = createEventDispatcher();

    function handleColorChange(event) {
        dispatch('change', {
            color: event.target.value
        });
    }

    function handleSrcChange(newSrc) {
        dispatch('change', {
            src: newSrc
        });
    }

    function handleColorClick() {
        inputColorNode.click();
    }

    onMount(() => {
        function iconsListClickOut(event) {
            if (iconsListNode && !iconsListNode.contains(event.target)) {
                showIconsList = false;
            }
        }
        document.addEventListener('mousedown', iconsListClickOut);
        return () => {
            document.removeEventListener('mousedown', iconsListClickOut);
        };
    });

</script>

<div class="icon">
    {#if color}
        {#if edit}
        <i class="circle" style={'background:radial-gradient(' + color + ', #ffffff);'} on:click={handleColorClick}></i>
        <input bind:this={inputColorNode} type="color" value={color} on:change={handleColorChange} style="height:0;width:0;visibility:hidden;padding:0;margin:0;border:none;"/>
        {:else}
        <i class="circle" style={'background:radial-gradient(' + color + ', #ffffff);'}></i>
        {/if}
    {:else}
        {#if edit}
        <div
            class="mark"
            style={src ? 'background-image:url(' + rootPath + 'static/icons/' + src + (selected ? '_selected' : '') + '.svg);' : ''}
            on:click={() => { showIconsList = true; }}
        />
            {#if Object.keys(icons).length > 0 && showIconsList}
            <div class="icons-list">
                <ul class="no-bullets" bind:this={iconsListNode}>
                    {#each Object.keys(icons) as name}
                        {#if !name.endsWith('_selected')}
                        <li>
                            <button
                                title={name}
                                class={src === name ? 'selected' : ''}
                                style={src ? 'background-image:url(' + rootPath + 'static/icons/' + name + '.svg);' : ''}
                                on:click={handleSrcChange.bind(null, name)}
                            ></button>
                        </li>
                        {/if}
                    {/each}
                </ul>
            </div>
            {/if}
        {:else}
        <div class="mark" style={src ? 'background-image:url(' + rootPath + 'static/icons/' + src + (selected ? '_selected' : '') + '.svg);' : ''}/>
        {/if}
    {/if}
</div>

<style>
.icon {
    display: inline-block;
    font-size: inherit;
}
.icon .circle {
    display: inline-block;
    width: 2em;
    height: 2em;
    min-width: 2em;
    min-height: 2em;
    border-radius: 50%;
}
.icon .mark {
    display: inline-block;
    width: 2em;
    height: 2em;
    min-width: 2em;
    min-height: 2em;
    background-size: contain;
    background-position: center;
}
.icons-list {
    position: relative;
}
.icons-list ul {
    position: absolute;
    width: 266px;
    max-height: 266px;
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    z-index: 1;
    padding: 4px;
    background-color: #fff;
    border: 1px solid #ddd;
}
.icons-list ul li button {
    width: 32px;
    height: 32px;
    background-position: center;
    background-size: contain;
}
</style>

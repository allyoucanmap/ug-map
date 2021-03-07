<script>
    import { createEventDispatcher } from 'svelte';
    import Icon from './Icon.svelte';
    export let collection = {};
    export let selected = {};
    export let edit;
    export let href;
    export let rootPath = '';
    export let language;
    let filter = '';
    let type = '';
    let expanded = true;

    const dispatch = createEventDispatcher();

    function updateType() {
        if (selected.type === 'topics') {
            type = 'features';
        } else {
            type = 'topics';
        }
    }
    $: updateType(selected);

    function handleCheckboxUpdate(itemId, checked) {
        const selectedKey = selected.type === 'topics'
            ? 'topics'
            : 'features';
        const itemKey = selected.type === 'topics'
            ? 'features'
            : 'topics';
        dispatch('update', {
            collection: {
                ...collection,
                [selectedKey]: collection[selectedKey].map((item) => item.id === selected.id
                    ? {
                        ...item,
                        properties: {
                            ...item.properties,
                            connections: checked
                                ? [...item.properties.connections, itemId]
                                : item.properties.connections.filter(id => id !== itemId)
                        }
                    }
                    : item),
                [itemKey]: collection[itemKey].map((item) => item.id === itemId
                    ? {
                        ...item,
                        properties: {
                            ...item.properties,
                            connections: checked
                                ? [...item.properties.connections, selected.id]
                                : item.properties.connections.filter(id => id !== selected.id)
                        }
                    }
                    : item),
            }
        });
    }
    function removeItem(itemId) {
        dispatch('update', {
            collection: {
                ...collection,
                topics: collection.topics
                    .filter(({ id }) => id !== itemId)
                    .map((item) => ({
                        ...item,
                        properties: {
                            ...item.properties,
                            connections: item.properties.connections
                                .filter(connectionId => connectionId !== itemId)
                        }
                    })),
                features: collection.features
                    .filter(({ id }) => id !== itemId)
                    .map((item) => ({
                        ...item,
                        properties: {
                            ...item.properties,
                            connections: item.properties.connections
                                .filter(connectionId => connectionId !== itemId)
                        }
                    }))
            }
        });
    }
    function addItem() {
        const itemKey = selected.type === 'topics'
            ? 'features'
            : 'topics';
        const id = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const item = selected.type === 'topics'
            ? {
                type: 'Feature',
                id,
                properties: {
                    iconSrc: 'building',
                    height: 0,
                    address: { _: '' },
                    title: { _: 'New feature' },
                    content: { _: '' },
                    connections: []
                },
                geometry: null
            }
            : {
                type: 'topics',
                id,
                properties: {
                    color: '#333333',
                    title: { _: 'New topic' },
                    content: { _: '' },
                    connections: []
                }
            };
        dispatch('update', {
            collection: {
                ...collection,
                [itemKey]: [
                    item,
                    ...collection[itemKey]
                ]
            }
         });
    }
    function handleToggleExpand() {
        expanded = !expanded;
    }
    function handleSelect(values) {
        dispatch('click', {
            ...values
         });
    }
</script>

<div class="list-title">
    <button
        on:click={handleToggleExpand}
        class={expanded
            ? 'button-icon icon-bottom'
            : 'button-icon icon-right'}>
    </button>
    <div on:click={handleToggleExpand}>Related {type}</div>
</div>

<ul class={'no-bullets list' + (expanded ? ' expanded' : ' collapsed')}>
    {#if edit}
    <div class="input">
        <input
            placeholder="search..."
            bind:value={filter}
        />
        <button
            on:click={addItem}
            class="button-icon icon-add"
            title={'Add ' + type}>
        </button>
    </div>
        {#if collection[type] && selected.properties}
            {#each collection[type] as item}
                {#if !filter || (item.properties.title[language] || item.properties.title._).toLowerCase().indexOf(filter.toLowerCase()) !== -1}
                <li class={!(!selected.properties.connections || selected.properties.connections.indexOf(item.id) !== -1) ? 'disabled' : ''}>
                    <a href={href({ type, itemId: item.id })}>
                        <Icon color={item.properties.color} src={item.properties.iconSrc} rootPath={rootPath}/>
                        <span>{item.properties.title[language] || item.properties.title._}</span>
                    </a>
                    {#if selected.type !== 'FeatureCollection'}
                    <div class="tools">
                        <button
                            on:click={() => handleCheckboxUpdate(item.id, !(selected.properties.connections.indexOf(item.id) !== -1))}
                            class={selected.properties.connections.indexOf(item.id) !== -1
                                ? 'button-icon icon-checked'
                                : 'button-icon icon-unchecked'}
                            title={selected.properties.connections.indexOf(item.id) !== -1
                                ? 'Remove from related ' + type
                                : 'Add to related ' + type}>
                        </button>
                        <button
                            on:click={removeItem.bind(null, item.id)}
                            class="button-icon icon-remove"
                            title="Delete">
                        </button>
                    </div>
                    {:else}
                    <div class="tools">
                        <button
                            on:click={removeItem.bind(null, item.id)}
                            class="button-icon icon-remove"
                            title="Delete">
                        </button>
                    </div>
                    {/if}
                </li>
                {/if}
            {/each}
        {/if}
    {:else}
        {#if collection[type] && selected.properties}
            {#each collection[type] as item}
                {#if !selected.properties.connections || selected.properties && selected.properties.connections.indexOf(item.id) !== -1}
                <li>
                    <a href={href({ type, itemId: item.id })} on:click={() => handleSelect({ type, itemId: item.id })}>
                        <Icon color={item.properties.color} src={item.properties.iconSrc} rootPath={rootPath}/>
                        <span>{item.properties.title[language] || item.properties.title._}</span>
                    </a>
                </li>
                {/if}
            {/each}
        {/if}
    {/if}
</ul>

<style>
.list-title {
    display: flex;
    align-items: center;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
    font-size: 0.75rem;
    cursor: pointer;
}
.list-title > div {
    flex: 1;
    padding: 0.25rem;
    text-transform: uppercase;
    font-weight: bold;
}
.list {
    max-height: 156px;
    overflow: auto;
    transition: 0.3s max-height;
}
.list.collapsed {
    max-height: 0;
    overflow: hidden;
}
.list li {
    padding: 0.25rem 0.5rem;
    font-size: 0.7rem;
    display: flex;
}
.list li > *:not(.tools) {
    flex: 1;
}
.list li a {
    display: flex;
    align-items: center;
}
:global(.list li a .icon) {
    margin-right: 0.5rem;
}
.list li a span {
    text-transform: uppercase;
}
.list .input {
    position: sticky;
    top: 0;
    width: 100%;
    padding: 0.25rem 0.5rem;
    background-color: var(--background-color);
    display: flex;
    z-index: 1;
    align-items: center;
}
.list .input input {
    width: 100%;
    padding: 0.25rem;
    flex: 1;
    font-size: 0.75rem;
}
.list li.disabled {
    opacity: 0.4;
}
input + .button-icon {
    position: relative;
    margin-left: 0.25rem;
}
</style>

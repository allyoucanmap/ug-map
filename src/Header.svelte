<script>
    import { createEventDispatcher } from 'svelte';
    import Icon from './Icon.svelte';
    export let edit = false;
    export let selected = {};
    export let collection = {};
    export let icons = {};
    export let href;
    export let language;
    export let rootPath = '';

    const dispatch = createEventDispatcher();

    function getIds() {
        const {
            topics = [],
            features = []
        } = collection;
        return [
            ...topics.map(({ id }) => id),
            ...features.map(({ id }) => id)
        ];
    }

    $: ids = getIds(collection);

    function updateIcon(event) {
        if (event.detail.color) {
            selected.properties.color = event.detail.color;
        }
        if (event.detail.src) {
            selected.properties.iconSrc = event.detail.src;
        }
        dispatch('update', {});
    }

    function updateTitle(event) {
        selected.properties.title[language] = event.target.value;
        dispatch('update', {});
    }

    function updateId(event) {
        const oldId = selected.id;
        const newId = event.target.value;
        const type = selected.type === 'Feature'
            ? 'features'
            : 'topics';
        if (/^[a-z0-9-_]+$/.test(newId) && ids.indexOf(newId) === -1) {
            dispatch('update', {
                disableHashUpdate: true,
                collection: {
                    ...collection,
                    topics: collection.topics.map((topic) => ({
                        ...topic,
                        id: topic.id === oldId
                            ? newId
                            : topic.id,
                        properties: {
                            ...topic.properties,
                            connections: topic.properties.connections.map(connectionId =>
                                connectionId === oldId ? newId : connectionId
                            )
                        }
                    })),
                    features: collection.features.map((feature) => ({
                        ...feature,
                        id: feature.id === oldId
                            ? newId
                            : feature.id,
                        properties: {
                            ...feature.properties,
                            connections: feature.properties.connections.map(connectionId =>
                                connectionId === oldId ? newId : connectionId
                            )
                        }
                    }))
                }
            });
            window.history.replaceState({}, '', window.location.href.replace(window.location.hash, href({ type, itemId: newId })));
        }
        
    }

    function updateAddress(event) {
        selected.properties.address[language] = event.target.value;
        dispatch('update', {});
    }

    function updateHeight(event) {
        const value = parseFloat(event.target.value);
        if (!isNaN(value)) {
            selected.properties.height = value;
            dispatch('update', {});
        }
    }

</script>

<header>
    <div class="title">
        {#if selected && selected.properties}
            <Icon
                edit={edit}
                color={selected.properties.color}
                src={selected.properties.iconSrc}
                selected
                icons={icons}
                rootPath={rootPath}
                on:change={updateIcon}
            />
            {#if edit}
            <div class="inputs">
                <label for="title">title:</label>
                <input id="title" class="h1" value={selected.properties.title[language] || ''} on:keyup={updateTitle}/>
                {#if selected.type === 'Feature'}
                <label for="address">address:</label>
                <input id="address" value={selected.properties.address[language] || ''} on:keyup={updateAddress}/>
                <label for="height">height (m):</label>
                <input id="height" type="number" value={selected.properties.height || 0} on:keyup={updateHeight}/>
                {/if}
                {#if selected.type !== 'FeatureCollection'}
                <label for="identifier">id:</label>
                <input id="identifier" value={selected.id} on:change={updateId}/>
                {/if}
            </div>
            {:else}
            <div class="title-text">
                <h1>
                    {selected.properties.title[language] || selected.properties.title._ || ''}
                </h1>
                {#if selected.properties.address}
                <div class="address">{selected.properties.address[language] || selected.properties.address._ || ''}</div>
                {/if}
            </div>
            <slot></slot>
            {/if}
        {/if}
    </div>
</header>

<style>
header {
    padding: 0.5rem;
}
header .title {
    display: flex;
    align-items: center;
}
.title-text {
    flex: 1;
}
header .title h1 {
    margin: 0;
    font-size: 1.25rem;
}
header .title .h1 {
    font-size: 1.25rem;
}
:global(header .title .icon) {
    margin-right: 0.5rem;
}
header .title input {
    display: block;
    width: 100%;
}
:global(header .title input + input){
    margin-top: 0.25rem;
}
header .title .inputs {
    width: 100%;
}
.address {
    font-size: 0.85rem;
    font-style: italic;
}
</style>

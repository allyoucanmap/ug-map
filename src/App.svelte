<script>
    import { onMount, onDestroy } from 'svelte';
    import bbox from '@turf/bbox';
    import DOMPurify from 'dompurify';
    import Header from './Header.svelte';
    import Article from './Article.svelte';
    import List from './List.svelte';
    import Map from './Map.svelte';
    import Select from './Select.svelte';
    import Section from './Section.svelte';

    export let lang;
    export let api;
    export let editEnabled;
    export let rootPath;
    export let id;
    export let initCollection;
    export let initConfig;

    const STORAGE_KEY = 'geo-blog';
    let config = {};
    const BASE_JSON = {
        type: 'FeatureCollection',
        properties: {
            iconSrc: 'arch5v',
            title: { _: 'Empty' },
            content: { _: '' }
        },
        topics: [],
        features: []
    };

    let language = '_';
    let languages = [
        { id: '_', label: 'Default' },
        { id: 'en', label: 'English' }
    ];

    let collection = {
        type: 'FeatureCollection',
        properties: {
            iconSrc: 'arch5v',
            title: { _: 'Empty' },
            content: { _: '' }
        },
        topics: [],
        features: []
    };
    let error = '';
    let loading = false;
    let selected;
    let icons;
    let edit;
    let history = [];
    let historyLoc = 0;
    let showTitleOnMap = false;
    let hideOverlay = false;
    let map;
    let mapView;
    let articleSize = 0;
    let articleResizeDirection = '';

    function getLocalStorageCollection() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || BASE_JSON;
        } catch (e) {
            return BASE_JSON;
        }
    }

    function setLocalStorageCollection() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
    }

    function handleEdit(value) {
        edit = value;
    }

    function getCurrentHashParams() {
        const hash = window.location.hash;
        const parts = hash.match(/\/(features|topics)\/([a-zA-Z0-9-_]+)/) || [];
        const type = parts[1];
        const itemId = parts[2];
        return { type, itemId };
    }

    function hashChange() {
        const { type, itemId } = getCurrentHashParams();
        selected = collection[type] && collection[type].find((item) => item.id === itemId);
        if (!selected) {
            selected = collection;
        }
    }

    function computeExtent() {
        collection.extent = bbox(collection);
        if (collection.extent && (collection.extent[0] === Infinity || collection.extent[0] === -Infinity)) {
            collection.extent = undefined;
        }
        collection.topics.forEach(topic => {
            const topicFeatures = collection.features.filter(feature => topic.properties.connections.indexOf(feature.id) !== -1);
            if (topicFeatures.length > 0) {
                topic.extent = bbox({
                    type: 'FeatureCollection',
                    features: topicFeatures
                });
            }
        });
        collection.features.forEach(feature => {
            if (feature.geometry) {
                feature.extent = bbox(feature);
            }
        });
    }

    function sortItems() {
        collection.topics.sort((a, b) => {
            const titleA = a.properties && a.properties.title && (a.properties.title[language] || a.properties.title._);
            const titleB = b.properties && b.properties.title && (b.properties.title[language] || b.properties.title._);
            return titleA > titleB ? 1 : -1;
        });
        collection.features.sort((a, b) => {
            const titleA = a.properties && a.properties.title && (a.properties.title[language] || a.properties.title._);
            const titleB = b.properties && b.properties.title && (b.properties.title[language] || b.properties.title._);
            return titleA > titleB ? 1 : -1;
        });
    }

    function parseConfig(data) {
        try {
            const features = data.features.map((feature) => {
            const connections = data.topics
                .filter((topic) => topic.properties.connections.indexOf(feature.id) !== -1)
                .map((topic) => topic.id);
                    return {
                        ...feature,
                        properties: {
                            ...feature.properties,
                            connections
                        }
                    }
                });
            return {
                ...data,
                features,
                topics: data.topics
                    .map((topic) => ({
                        ...topic,
                        type: 'topics'
                    }))
            };
        } catch (e) {
            console.error(e);
            return collection;
        }
    }

    function getHref({ type, itemId }) {
        const path = type && itemId
            ? type + '/' + itemId
            : '';
        return '#/' + path;
    }

    function downloadCollection() {
        computeExtent();
        sortItems();
        const link = document.createElement('a');
        const download = JSON.parse(JSON.stringify(collection));
        const file = new Blob([ JSON.stringify({
            ...download,
            extent: undefined,
            topics: download.topics.map((topic) => ({
                ...topic,
                extent: undefined
            })),
            features: download.features.map((feature) => ({
                ...feature,
                extent: undefined,
                properties: {
                    ...feature.properties,
                    connections: undefined
                }
            }))
        }) ], { type: 'application/json' });
        link.setAttribute('href', URL.createObjectURL(file));
        link.setAttribute('download', id ? id + '.json' : 'new.json');
        link.click();
    }

    function clearCollection() {
        collection = JSON.parse(JSON.stringify(BASE_JSON));
        history = history.filter((frame, idx) => idx >= historyLoc && idx < historyLoc + 20);
        historyLoc = 0;
        window.history.replaceState({}, '', window.location.href.replace(window.location.hash, '#/'));
        localStorage.removeItem(STORAGE_KEY);
        hashChange();
    }

    function update(event) {
        error = '';
        const newCollectionStr = JSON.stringify(event && event.detail.collection || collection);
        if (!(event && event.detail.historyAction)) {
            const { type, itemId } = getCurrentHashParams();
            history = [
                {
                    type,
                    itemId,
                    collection: JSON.parse(newCollectionStr)
                },
                ...history
                    .filter((frame, idx) => idx >= historyLoc && idx < historyLoc + 20)
            ];
            historyLoc = 0;
        }
        collection = JSON.parse(newCollectionStr);
        computeExtent();
        sortItems();
        setLocalStorageCollection();
        if (!(event && event.detail && event.detail.disableHashUpdate)) {
            hashChange();
        }
    }

    function changeArticleContent(event) {
        error = '';
        if (event.detail.content !== selected.properties.content[language]) {
            selected.properties.content = {
                ...selected.properties.content,
                [language]: event.detail.content
            };
            update();
        }
    }

    function undo() {
        if (history[historyLoc + 1]) {
            update({
                detail: {
                    collection: history[historyLoc + 1].collection,
                    historyAction: 'UNDO'
                }
            });
            window.history.replaceState({}, '', window.location.href.replace(window.location.hash, getHref(history[historyLoc + 1])));
            historyLoc += 1;
        }
    }

    function redo() {
        if (history[historyLoc - 1]) {
            update({
                detail: {
                    collection: history[historyLoc - 1].collection,
                    historyAction: 'REDO'
                }
            });
            window.history.replaceState({}, '', window.location.href.replace(window.location.hash, getHref(history[historyLoc - 1])));
            historyLoc -= 1;
        }
    }

    function save() {
        error = '';
        loading = true;
        api.saveCollectionById(id, collection)
            .then(() => {
                loading = false;
            })
            .catch((e) => {
                console.error(e);
                loading = false;
                error = 'SAVE ERROR';
            });
    }
    function createNew() {
        error = '';
        loading = true;
        api.createNewCollection({
            type: 'FeatureCollection',
            properties: {
                iconSrc: 'arch5v',
                title: { _: 'Empty' },
                content: { _: '' }
            },
            topics: [],
            features: []
        })
            .then(() => {
                loading = false;
            })
            .catch((e) => {
                console.error(e);
                loading = false;
                error = 'CREATE ERROR';
            });
    }
    function uploadMedia(event) {
        loading = event.detail.loading;
        error = event.detail.error;
    }

    function handleHistory(event) {
        if (event.ctrlKey && event.key === 'z') {
            event.preventDefault();
        }
        if (event.ctrlKey && event.key === 'y') {
            event.preventDefault();
        }
    }

    function updateLanguage(event) {
        language = event.detail.value;
    }

    function handleDrop(event) {
        event.preventDefault();
        const file = event.dataTransfer.files && event.dataTransfer.files[0];
        const allowedTypes = ['application/json'];
        if (file && allowedTypes.indexOf(file.type) !== -1) {
            const objUrl = URL.createObjectURL(file);
            fetch(objUrl)
                .then(res => res.json())
                .then((data) => {
                    collection = parseConfig(data);
                    hashChange();
                    URL.revokeObjectURL(objUrl);
                });
        }
    }

    function handleDragOver(event) {
        event.preventDefault();
    }

    function handleCloseArticle(event) {
        showTitleOnMap = event.detail.value;
    }
    function handleResizeArticle(event) {
        articleSize = event.detail.size;
        articleResizeDirection = event.detail.direction;
    }

    function handleHideOverlay() {
        hideOverlay = !hideOverlay;
    }

    function getBottomControlsPosition() {
        if (mapView) {
            const mapViewBoundingClientRect = mapView.getBoundingClientRect();
            return window.innerHeight - (mapViewBoundingClientRect.top + mapViewBoundingClientRect.height);
        }
        return 0;
    }

    function zoomTo(item) {
        const target = item || selected;
        if (map && target && target.extent) {
            const mapViewBoundingClientRect = mapView.getBoundingClientRect();
            const padding = 50;
            map.fitBounds(target.extent, {
                padding: {
                    top: mapViewBoundingClientRect.top + padding,
                    left: mapViewBoundingClientRect.left + padding,
                    bottom: window.innerHeight - (mapViewBoundingClientRect.top + mapViewBoundingClientRect.height) + padding,
                    right: window.innerWidth - (mapViewBoundingClientRect.left + mapViewBoundingClientRect.width) + padding
                },
                maxZoom: 17
            });   
        }
    }
    function handleSelectItem(event) {
        if (collection && collection[event.detail.type]) {
            const newSelected = collection[event.detail.type].find((item) => item.id === event.detail.itemId);
            zoomTo(newSelected);
        }
    }

    function initMap(event) {
        map = event.detail.map;
        zoomTo();
    }

    onMount(() => {
        window.addEventListener('drop', handleDrop);
        window.addEventListener('dragover', handleDragOver);
        window.addEventListener('hashchange', hashChange, false);
        window.addEventListener('keydown', handleHistory);
        loading = true;
        Promise.all([
            id
                ? initCollection
                    ? new Promise(resolve => resolve(initCollection))
                    : api.getCollectionById(id, { rootPath })
                : new Promise(resolve => resolve(getLocalStorageCollection())),
            fetch(rootPath + 'static/icons.json').then(res => res.json()),
            initConfig
                ? new Promise(resolve => resolve(initConfig))
                : fetch(rootPath + 'static/config.json').then(res => res.json())
        ]).then(([data, newIcons, configData]) => {
            icons = newIcons;
            collection = parseConfig(data);
            computeExtent();
            sortItems();
            hashChange();
            zoomTo();
            language = lang;
            config = configData || {};
            loading = false;
            error = '';
        })
        .catch((e) => {
            console.error(e);
            loading = false;
            error = 'LOADING ERROR';
        });
    });
    onDestroy(() => {
        window.removeEventListener('hashchange', hashChange, false);
        window.removeEventListener('keydown', handleHistory);
        window.removeEventListener('drop', handleDrop);
        window.removeEventListener('drop', handleDragOver);
    });

</script>

<div
    class="container"
    style={
        '--icon-add-url: url(' + rootPath + 'static/img/add.svg);' +
        '--icon-bottom-url: url(' + rootPath + 'static/img/bottom.svg);' +
        '--icon-checked-url: url(' + rootPath + 'static/img/checked.svg);' +
        '--icon-left-url: url(' + rootPath + 'static/img/left.svg);' +
        '--icon-remove-url: url(' + rootPath + 'static/img/remove.svg);' +
        '--icon-right-url: url(' + rootPath + 'static/img/right.svg);' +
        '--icon-top-url: url(' + rootPath + 'static/img/top.svg);' +
        '--icon-unchecked-url: url(' + rootPath + 'static/img/unchecked.svg);' +
        '--icon-zoom-to-url: url(' + rootPath + 'static/img/zoom-to.svg);' +
        '--icon-map-url: url(' + rootPath + 'static/img/map.svg);' +
        '--icon-heatmap-url: url(' + rootPath + 'static/img/heatmap.svg);' +
        '--controls-bottom: ' + getBottomControlsPosition(articleSize, articleResizeDirection) + 'px;' +
        ''
    }>
    {#if editEnabled}
    <nav>
        
        <div class="toolbar">
            <button on:click={downloadCollection}>Download</button>
            <button on:click={clearCollection}>Clear</button>
            <button on:click={undo}>Undo</button>
            <button on:click={redo}>Redo</button>
            {#if api.createNewCollection}
                <button on:click={createNew}>New</button>
            {/if}
            {#if api.saveCollectionById && id}
                <button on:click={save}>Save</button>
            {/if}
            <Select value={language} options={config.languages || languages} on:change={updateLanguage}/>
        </div>
        <ul class="no-bullets tabs">
            <li><button class={!edit ? 'selected' : ''} on:click={handleEdit.bind(null, false)}>Preview</button></li>
            <li><button class={edit ? 'selected' : ''} on:click={handleEdit.bind(null, true)}>Edit</button></li>
        </ul>
    </nav>
    {/if}
    <div class="content">
        <Section
            name="map">
            {#if icons}
            <Map
                edit={edit}
                icons={icons}
                selected={selected}
                collection={collection}
                href={getHref}
                hideOverlay={hideOverlay}
                language={language}
                config={config}
                rootPath={rootPath}
                on:init={initMap}
                on:update={update}
            />
            {/if}
        </Section>
        <Section
            name="article"
            resize
            on:resize={handleResizeArticle}
            on:close={handleCloseArticle}>
            <Header
                edit={edit}
                icons={icons}
                selected={selected}
                collection={collection}
                href={getHref}
                language={language}
                rootPath={rootPath}
                on:update={update}
            >
                {#if selected && selected.extent}
                <button
                    title="Zoom to extent"
                    class="button-icon icon-zoom-to icon-2x"
                    on:click={() => zoomTo()}>
                </button>
                {/if}
            </Header>
            <Article
                api={api}
                edit={edit}
                selected={selected}
                language={language}
                on:upload={uploadMedia}
                on:change={changeArticleContent}
            />
            <List
                edit={edit}
                selected={selected}
                collection={collection}
                href={getHref}
                rootPath={rootPath}
                language={language}
                on:update={update}
                on:click={handleSelectItem}
            />
        </Section>
        <div class="map-view" bind:this={mapView}>
            {#if showTitleOnMap && selected}
            <div class="map-title">
                {selected.properties.title[language] || selected.properties.title._}
            </div>
            {/if}
            {#if error}
            <div class="error">
                {error}
            </div>
            {/if}
            <button
                title={hideOverlay
                    ? 'Show heatmap'
                    : 'Hide heatmap'}
                class={hideOverlay
                    ? 'hide-overlay button-icon icon-heatmap'
                    : 'hide-overlay button-icon icon-map'}
                on:click={handleHideOverlay}>
            </button>
        </div>
    </div>
    <footer>
        {#if config && config.credits}
            {@html DOMPurify.sanitize(config.credits)}
        {/if}
    </footer>
</div>
{#if loading}
<div class="loading">
    <img 
        src={rootPath + 'static/img/loading.gif'}
        alt="loading"
    />
</div>
{/if}
<style>
:root {
    --color: #333;
    --background-color: #fff;
    --border-color: #ddd;
    --outline-color: #21e2d0;
    --edit-background-color: #f2f2f2;
    --button-selected-background-color: #d9fffb;
}
:global(.no-bullets) {
    list-style-type: none;
    margin: 0;
    padding: 0;
}
:global(*) {
    box-sizing: border-box;
    font-family: 'Open Sans', sans-serif;
    color: var(--color);
}
:global(*:focus) {
    outline-color: var(--outline-color);
}
:global(button) {
    border: 1px solid var(--border-color);
    background-color: var(--background-color);
    position: relative;
    cursor: pointer;
    padding: 0.2rem;
}
:global(button + button) {
    border-left: none;
}
:global(button:hover) {
    outline-color: var(--outline-color);
}
:global(button:focus),
:global(button:active) {
    outline-color: var(--outline-color);
}
:global(button.selected) {
    background-color: var(--button-selected-background-color);
}
:global(.section-map) {
    position: absolute;
    width: 100%;
    height: 100%;
}
:global(a),
:global(a:link),
:global(a:visited) {
    color: var(--color);
    text-decoration: none;
}
:global(a:hover) {
    color: var(--color);
    text-decoration: underline;
}
:global(a:active) {
    color: var(--color);
}
:global(::-webkit-scrollbar) {
    width: 0.75rem;
}
:global(::-webkit-scrollbar-track) {
    background: #ccc;
}
:global(::-webkit-scrollbar-thumb) {
    background: #555;
    padding: 0.25rem;
    border: 2px solid #ccc;
}
:global(::-webkit-scrollbar-thumb:hover) {
    background: #333;
    
}
:global(hr) {
    border: none;
    border-bottom: 1px solid var(--border-color);
}
.container {
    position: absolute;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}
.content {
    flex: 1;
    position: relative;
    display: flex;
    overflow: hidden;
}
.map-view {
    position: relative;
    pointer-events: none;
    flex: 1;
    width: 100%;
    height: 100%;
}
.map-title {
    margin: 0.25rem;
    padding: 0.25rem 0.5rem;
    background-color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    display: inline-block;
}
.error {
    position: absolute;
    right: 0;
    top: 0;
    margin: 0.25rem;
    padding: 0.25rem 0.5rem;
    background-color: rgba(255, 255, 255, 0.6);
    font-size: 1rem;
    display: inline-block;
    color: #ff0000;
}
footer {
    min-height: 24px;
    background-color: var(--color);
    text-align: center;
    padding: 0.1rem;
    color: var(--background-color);
    font-size: 0.7rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

:global(footer a),
:global(footer a:link),
:global(footer a:visited) {
    color: var(--background-color);
    text-decoration: underline;
}
:global(footer a:hover) {
    color: var(--background-color);
    text-decoration: underline;
}
:global(footer a:active) {
    color: var(--background-color);
}

:global(section.section-article) {
    background-color: rgba(240, 240, 240, 0.85);
}

:global(.section-article .section-body) {
    max-width: 900px;
    margin: 0 auto;
    width: 100%;
    background-color: var(--background-color);
}

:global(label) {
    font-family: 'EB Garamond', serif;
    font-style: italic;
    display: block;
    margin: 0.25rem 0;
}
:global(input) {
    border: 1px solid var(--border-color);
    background-color: var(--edit-background-color);
}
:global(input + button) {
    border-left: 0;
}
nav {
    color: var(--background-color);
    background-color: var(--color);
    display: flex;
    flex-wrap: wrap;
    font-size: 0.75rem;
    flex-direction: row-reverse;
}
.toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
}
.toolbar button + button {
    margin-left: 0.25rem;
}
:global(.toolbar .select) {
    margin: 0 0.25rem;
}
.tabs {
    display: flex;
    position: relative;
    background: var(--color);
    flex: 1;
}
.tabs button {
    padding: 0.5rem;
}
.tabs button:not(.selected) {
    border: none;
    background-color: var(--color);
    color: var(--background-color);
}
.tabs button.selected {
    background-color: var(--background-color);
    border-bottom: 1px solid var(--background-color);
    font-weight: bold;
}
.hide-overlay {
    pointer-events: auto;
    position: absolute;
    width: 2rem;
    height: 2rem;
    margin: 0.2rem;
    bottom: 0;
    left: 0;
}
.loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(240, 240, 240, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
}
.loading img {
    width: 64px;
}
:global(.tools) {
    display: flex;
    align-items: center;
}
:global(.tools .button-icon + .button-icon) {
    margin-left: 0.25rem;
}
:global(.mapboxgl-ctrl-bottom-right) {
    position: fixed !important;
    bottom: var(--controls-bottom) !important;
}
@media (max-width: 900px) {
    .content {
        flex-direction: column-reverse;
    }
}
:global(.button-icon) {
    border-color: transparent;
    background-position: center;
    background-size: contain;
    background-repeat: no-repeat;
    width: 1rem;
    height: 1rem;
}
:global(.icon-add) {
    background-image: var(--icon-add-url);
}
:global(.icon-bottom) {
    background-image: var(--icon-bottom-url);
}
:global(.icon-checked) {
    background-image: var(--icon-checked-url);
}
:global(.icon-left) {
    background-image: var(--icon-left-url);
}
:global(.icon-remove) {
    background-image: var(--icon-remove-url);
}
:global(.icon-right) {
    background-image: var(--icon-right-url);
}
:global(.icon-top) {
    background-image: var(--icon-top-url);
}
:global(.icon-unchecked) {
    background-image: var(--icon-unchecked-url);
}
:global(.icon-zoom-to) {
    background-image: var(--icon-zoom-to-url);
}
:global(.icon-map) {
    background-image: var(--icon-map-url);
}
:global(.icon-heatmap) {
    background-image: var(--icon-heatmap-url);
}
:global(.icon-2x) {
    width: 2rem;
    height: 2rem;
}
</style>


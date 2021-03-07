<script>
    import { createEventDispatcher } from 'svelte';
    import marked from 'marked';
    import DOMPurify from 'dompurify';

    export let edit = false;
    export let selected = {};
    export let language;
    export let imageWidth = 512;
    export let imageQuality = 0.5;
    export let api;

    let markdown = '';
    let textarea;

    const dispatch = createEventDispatcher();

    function updateMarkdown() {
        if (!edit) {
            return selected && selected.properties && selected.properties.content
                && (selected.properties.content[language] || selected.properties.content._) || '';
        }
        return selected && selected.properties && selected.properties.content && selected.properties.content[language] || '';
    }

    function handleKeyUp(event) {
        dispatch('change', {
            content: event.target.value
        });
    }

    function handleDrop(event) {
        event.preventDefault();
        event.stopPropagation();
        dispatch('upload', {
            loading: true
        });
        api.uploadMedia(event, { imageWidth, imageQuality })
            .then((markdownImage) => {
                dispatch('change', {
                    content: textarea.selectionStart !== undefined
                        ? markdown.slice(0, textarea.selectionStart) + markdownImage + markdown.slice(textarea.selectionStart, markdown.length)
                        : (markdown || '') + markdownImage
                });
                dispatch('upload', {
                    loading: false
                });
            })
            .catch(() => {
                dispatch('upload', {
                    error: 'MEDIA UPLOAD ERROR',
                    loading: false
                });
            });
    }

    function handleDragOver(event) {
        event.preventDefault();
    }

    $: markdown = updateMarkdown(selected, language);
    $: value = DOMPurify.sanitize(marked(markdown));

</script>

{#if edit}
<div class="article">
    <div class="article-body">
        <textarea
            bind:this={textarea}
            value={markdown}
            on:drop={handleDrop}
            on:dragover={handleDragOver}
            on:keyup={handleKeyUp}
        />
    </div>
</div>
{:else}
<div class="article">
    <div class="article-body">
        <article>
            {@html value}
        </article>
    </div>
</div>
{/if}

<style>
:global(article a),
:global(article a:link),
:global(article a:visited) {
    color: #333;
    text-decoration: none;
    background-color: rgba(33, 226, 208, 0.25);
}
:global(article a:hover) {
    color: #333;
    text-decoration: underline;
    background-color: rgba(33, 226, 208, 0.4);
}
:global(article a:active) {
    color: #333;
}
:global(article *) {
    font-family: 'EB Garamond', serif;
}
:global(article img) {
    width: 100%;
    height: auto;
}
.article {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
}
.article-body {
    position: relative;
    flex: 1;
}
.article-body textarea {
    position: absolute;
    width: calc(100% - 1rem);
    height: calc(100% - 1rem);
    resize: none;
    border: 1px solid var(--border-color);
    position: relative;
    background-color: var(--edit-background-color);
    padding: 0.5rem;
    margin: 0.5rem;
    font-family: 'EB Garamond', serif;
}
.article-body article {
    position: absolute;
    width: 100%;
    height: 100%;
    overflow: auto;
    padding: 0.5rem;
}

</style>

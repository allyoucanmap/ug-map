<script>
    import { onMount, createEventDispatcher } from 'svelte';

    export let name = '';
    export let resize = false;
    export let minWidth = 300;
    export let minHeight = 200;
    export let resizeBreakpoint = 900;
    export let defaultWidth = '500px';
    export let defaultHeight = '50%';

    const dispatch = createEventDispatcher();

    let hadle;
    let section;
    let width;
    let height;
    let move = false;
    let show = true;
    let resizeDirection = 'vertical';

    function handleMouseDown(event) {
        if (event.target.contains(hadle)) {
            event.stopPropagation();
            move = true;
        }
    }

    function getSize(size, containerSize, minSize) {
        if (size < minSize) {
            return minSize;
        }
        if (size > containerSize) {
            return containerSize;
        }
        return size;
    }

    function getEvent(event) {
        if (event.touches) {
            return event.touches[0] || {};
        }
        return event;
    }

    function handleMouseMove(event) {
        const parent = section && section.parentNode;
        
        if (move && parent) {
            event.stopPropagation();
            const parentBoundingClientRect = parent.getBoundingClientRect();
            const x = getEvent(event).clientX - parentBoundingClientRect.left;
            const y = getEvent(event).clientY - parentBoundingClientRect.top;
            if (resizeDirection === 'horizontal') {
                const w = getSize(x, parentBoundingClientRect.width, minWidth);
                width = w + 'px';
                if (w === minWidth) {
                    show = false;
                }
                dispatch('resize', {
                    size: w,
                    direction: resizeDirection
                });
            } else if (resizeDirection === 'vertical') {
                const h = getSize(parentBoundingClientRect.height - y, parentBoundingClientRect.height, minHeight);
                height = h + 'px';
                if (h === minHeight) {
                    show = false;
                }
                dispatch('resize', {
                    size: h,
                    direction: resizeDirection
                });
            }
            
        }
        
    }

    function handleMouseUp() {
        move = false;
    }

    function handleShow() {
        show = true;
        if (resizeDirection === 'horizontal') {
            width = defaultWidth;
        } else if (resizeDirection === 'vertical') {
            height = defaultHeight;
        }
    }

    function getStyle() {
        if (!resize) {
            return '';
        }
        return '' +
            (width ? 'width:' + width + ';' : '') +
            (height ? 'height:' + height + ';' : '') +
            '';
    }

    function getClassName() {
        return 'section' +
            (name ? ' section-' + name : '') +
            (resizeDirection && resize ? ' ' + resizeDirection : '') +
            (!show ? ' collapsed' : '') +
            '';
    }

    function handleResize() {
        const parent = section && section.parentNode;
        const parentBoundingClientRect = parent && parent.getBoundingClientRect() || {};
        const isHorizontal = parentBoundingClientRect.width === undefined || parentBoundingClientRect.width > resizeBreakpoint;
        resizeDirection = isHorizontal
            ? 'horizontal'
            : 'vertical';
        width = isHorizontal ? defaultWidth : '100%';
        height = isHorizontal ? '100%' : defaultHeight;
        dispatch('resize', {
            size: isHorizontal ? 0 : defaultHeight,
            direction: resizeDirection
        });
    }

    function handleClose() {
        dispatch('close', {
            value: !show
        });
    }

    $: handleClose(show);


    onMount(() => {
        handleResize();
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchstart', handleMouseDown);
        window.addEventListener('touchmove', handleMouseMove);
        window.addEventListener('touchend', handleMouseUp);
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchstart', handleMouseDown);
            window.removeEventListener('touchmove', handleMouseMove);
            window.removeEventListener('touchend', handleMouseUp);
            window.removeEventListener('resize', handleResize);
        };
    });

</script>


<section
    bind:this={section}
    class={getClassName({ name, resizeDirection, show })}
    style={getStyle({ width, height, resizeDirection })}>
    {#if resize}
    <div class="section-body">
        <slot></slot>
    </div>
    <div class="section-handle" bind:this={hadle}>
    </div>
    {:else}
    <div class="section-body">
        <slot></slot>
    </div>
    {/if}
</section>
{#if !show}
<button
    title="Show content"
    class={('button-' + resizeDirection) +
        (resizeDirection === 'horizontal'
            ? ' button-icon icon-right'
            : ' button-icon icon-top')}
    on:click={handleShow}>
</button>
{/if}

{#if move}
<div class="cover"></div>
{/if}

<style>
    .section {
        display: flex;
    }
    .section.collapsed {
        display: none;
    }
    .section.horizontal,
    .section.vertical {
        position: relative;
        width: 100%;
        height: 100%;
    }
    .section-body {
        flex: 1;
        position: relative;
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    .section-handle {
        background-color: var(--border-color);
        position: relative;
        z-index: 2;
    }
    .section.horizontal {
        flex-direction: row;
    }
    .section.horizontal .section-handle {
        width: 4px;
        height: 100%;
        cursor: ew-resize;
        border-left: 1px solid var(--background-color);
    }
    .section-handle:after {
        content: '';
        border: 1px solid var(--color);
        display: block;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }
    .section.horizontal .section-handle:after {
        width: 2px;
        height: 32px;
        border-top: none;
        border-bottom: none;
    }
    .section.vertical {
        flex-direction: column-reverse;
    }
    .section.vertical .section-handle {
        width: 100%;
        height: 6px;
        cursor: ns-resize;
    }
    .section.vertical .section-handle:after {
        width: 32px;
        height: 2px;
        border-left: none;
        border-right: none;
    }
    .cover {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        z-index: 50;
        cursor: grabbing;
        cursor: -moz-grabbing;
        cursor: -webkit-grabbing;
    }
    .button-horizontal {
        width: 1rem;
        height: 100%;
        border: 1px solid var(--border-color);
    }
    .button-vertical {
        width: 100%;
        height: 1rem;
        border: 1px solid var(--border-color);
    }
</style>

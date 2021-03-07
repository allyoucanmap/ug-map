<svelte:options immutable/>
<script>
    import { onMount, createEventDispatcher } from 'svelte';
    import { Map, Popup, LngLat } from 'maplibre-gl';
    import MapboxDraw from "@mapbox/mapbox-gl-draw";
    import 'maplibre-gl/dist/maplibre-gl.css';
    import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
    export let selected;
    export let collection;
    export let icons;
    export let edit = false;
    export let href;
    export let hideOverlay;
    export let language;
    export let config;
    export let rootPath;

    const dispatch = createEventDispatcher();

    let target;
    let map;
    let loaded;
    let draw;
    let popup;

    function getPopupHTML(event) {
        try {
            const icon = event.features[0].properties.iconSrc;
            const titleObj = JSON.parse(event.features[0].properties.title);
            const title = titleObj[language] || titleObj._;
            const addressObj = JSON.parse(event.features[0].properties.address);
            const address = addressObj[language] || addressObj._;
            return `
                ${icon ? '<img src="' + rootPath + 'static/icons/' + icon + '.svg"/>' : ''}
                <div class="title">${title}</div>
                <div class="address">${address}</div>
            `;
        } catch (e) {
            return '';
        }
    }

    function addInfo(event) {
        if (!edit && popup) {
            const htmlContent = getPopupHTML(event);
            map.getCanvas().style.cursor = 'pointer';
            if (htmlContent) {
                const feature = collection.features.find((feature) => event.features[0].properties.id === feature.id);
                if (feature.extent) {
                    const coordinates = new LngLat(
                        feature.extent[0] + (feature.extent[2] - feature.extent[0]) / 2,
                        feature.extent[3]
                    );
                    popup.setLngLat(coordinates)
                        .setHTML(htmlContent)
                        .addTo(map);
                }
            }
        }
    }

    function removeInfo() {
        map.getCanvas().style.cursor = '';
        if (!edit && popup && popup.isOpen()) {
            popup.remove();
        }
    }

    function updateGeometry(event) {
        const drawCollection = draw.getAll();
        selected.geometry = drawCollection.features.length === 1
            ? drawCollection.features[0].geometry
            : {
                type: 'GeometryCollection',
                geometries: drawCollection.features.map(({ geometry }) => geometry)
            };
        dispatch('update', {});
    }

    function updateDraw() {
        if (loaded && map.getStyle()) {
            if (map.hasControl(draw)) {
                map.removeControl(draw);
            }
            if (edit && selected.type === 'Feature') {
                map.addControl(draw, 'bottom-right');
                if (selected.geometry) {
                    if (selected.geometry.type === 'GeometryCollection') {
                        selected.geometry.geometries.forEach(geometry => {
                            draw.add(geometry);
                        });
                    } else {
                        draw.add(selected.geometry);
                    }
                }
            }
        }
    }

    function updateSelected() {
        if (loaded && map.getStyle()) {
            const { topics = [] } = collection;
            const { id, type, properties = {} } = selected || {};
            topics.forEach((topic) => {
                if (map.getLayer('$private-' + topic.id)) {
                    map.setLayoutProperty('$private-' + topic.id, 'visibility', 'visible');
                }
            });
            if (id && type === 'topics') {
                if (map.getLayer('$private-line-selected')) {
                    map.setLayoutProperty('$private-line-selected', 'visibility', 'none');
                }
                if (map.getLayer('$private-selected')) {
                    map.setLayoutProperty('$private-selected', 'visibility', 'none');
                }
                if (map.getLayer('$private-markers')) {
                    map.setFilter('$private-markers',
                        ['all', 
                            ['==', ["geometry-type"], 'Point'],
                            ['any', ["in", id, ["get", "connections"]]]
                        ]
                    );
                }
                if (map.getLayer('$private-lines')) {
                    map.setFilter('$private-lines',
                        ['all', 
                            ['==', ["geometry-type"], 'LineString'],
                            ['any', ["in", id, ["get", "connections"]]]
                        ]);
                }
                if (map.getLayer('$private-polygons')) {
                    map.setFilter('$private-polygons',
                        ['all', 
                            ['==', ["geometry-type"], 'Polygon'],
                            ['any', ["in", id, ["get", "connections"]]]
                        ]);
                }
                topics.forEach((topic) => {
                    if (map.getLayer('$private-' + topic.id)) {
                        map.setLayoutProperty('$private-' + topic.id, 'visibility', id === topic.id ? 'visible' : 'none');
                    }
                });
                
            } else if (id && type === 'Feature') {
                topics.forEach((topic) => {
                    if (map.getLayer('$private-' + topic.id)) {
                        map.setLayoutProperty('$private-' + topic.id, 'visibility', properties.connections.indexOf(topic.id) !== -1 ? 'visible' : 'none');
                    }
                });
                if (map.getLayer('$private-markers')) {
                    map.setFilter('$private-markers',
                        ['all', 
                            ['==', ["geometry-type"], 'Point'],
                            ['any', ...properties.connections.map((connection) => ["in", connection, ["get", "connections"]])]
                        ]
                    );
                }
                if (map.getLayer('$private-lines')) {
                    map.setFilter('$private-lines',
                        ['all', 
                            ['==', ["geometry-type"], 'LineString'],
                            ['any', ...properties.connections.map((connection) => ["in", connection, ["get", "connections"]])]
                        ]);
                }
                if (map.getLayer('$private-polygons')) {
                    map.setFilter('$private-polygons',
                        ['all', 
                            ['==', ["geometry-type"], 'Polygon'],
                            ['any', ...properties.connections.map((connection) => ["in", connection, ["get", "connections"]])]
                        ]);
                }
                if (map.getLayer('$private-line-selected')) {
                    map.setFilter('$private-line-selected', ['all', ['!=', ["geometry-type"], 'Point'], ['==', ['get', 'id'], selected.id]]);
                    map.setLayoutProperty('$private-line-selected', 'visibility', 'visible');
                }
                if (map.getLayer('$private-selected')) {
                    map.setFilter('$private-selected', ['all', ['==', ["geometry-type"], 'Point'], ['==', ['get', 'id'], selected.id]]);
                    map.setLayoutProperty('$private-selected', 'visibility', 'visible');
                }
            } else {
                topics.forEach((topic) => {
                    if (map.getLayer('$private-' + topic.id)) {
                        map.setLayoutProperty('$private-' + topic.id, 'visibility', 'visible');
                    }
                });
                if (map.getLayer('$private-markers')) {
                    map.setFilter('$private-markers', ['==', ["geometry-type"], 'Point']);
                }
                if (map.getLayer('$private-lines')) {
                    map.setFilter('$private-lines', ['==', ["geometry-type"], 'LineString']);
                }
                if (map.getLayer('$private-polygons')) {
                    map.setFilter('$private-polygons', ['==', ["geometry-type"], 'Polygon']);
                }
                if (map.getLayer('$private-line-selected')) {
                    map.setLayoutProperty('$private-line-selected', 'visibility', 'none');
                }
                if (map.getLayer('$private-selected')) {
                    map.setLayoutProperty('$private-selected', 'visibility', 'none');
                }
            }
            if (hideOverlay) {
                topics.forEach((topic) => {
                    if (map.getLayer('$private-' + topic.id)) {
                        map.setLayoutProperty('$private-' + topic.id, 'visibility', 'none');
                    }
                });
            }
        }
    }

    function updateCollectionLayers({
        topics = [],
        features = []
    } = {}) {
        const mapStyle = map && map.getStyle();
        if (loaded && mapStyle) {
            const {
                layers = [],
                sources = {}
            } = mapStyle;

            

            layers.forEach(({ id }) => {
                if (id.startsWith('$private-') && map.getLayer(id)) {
                    map.removeLayer(id);
                }
            });
            Object.keys(sources).forEach((key) => {
                if (key.startsWith('$private-') && map.getSource(key)) {
                    map.removeSource(key);
                }
            });

            map.addSource('$private-features', {
                'type': 'geojson',
                'data': {
                    type: 'FeatureCollection',
                    features: features.map((feature) => ({
                        ...feature,
                        properties: {
                            ...feature.properties,
                            id: feature.id
                        }
                    }))
                }
            });
            topics.forEach((topic) => {
                map.addLayer({
                    'id': '$private-' + topic.id,
                    'type': 'heatmap',
                    'source': '$private-features',
                    'paint': {
                        'heatmap-weight': [
                            'interpolate',
                            ['linear'],
                            ["length", ["get", "connections"]],
                            1,
                            0.6,
                            topics.length + 1,
                            1
                        ],
                        'heatmap-intensity': 3,
                        'heatmap-color': [
                            'interpolate',
                            ['linear'],
                            ['heatmap-density'],
                            0,
                            'rgba(255,255,255,0)',
                            1,
                            topic.properties.color
                        ],
                        'heatmap-radius': 100,
                        'heatmap-opacity': 0.75
                    },
                    'filter': ['all', ['==', ["geometry-type"], 'Point'], ["in", topic.id, ["get", "connections"]]]
                });
            });
            map.addLayer({
                'paint': {
                    'fill-extrusion-color': '#dddddd',
                    'fill-extrusion-height': ["get", "height"],
                    'fill-extrusion-opacity': 0.8
                },
                'type': 'fill-extrusion',
                ...(config.map && config.map.polygonStyle),
                'id': '$private-polygons',
                'source': '$private-features',
                'filter': ['==', ["geometry-type"], 'Polygon']
            });
            map.addLayer({
                'paint': {
                    'line-color': '#333333'
                },
                'type': 'line',
                ...(config.map && config.map.lineStyle),
                'id': '$private-lines',
                'source': '$private-features',
                'filter': ['==', ["geometry-type"], 'LineString']
            });
            map.addLayer({
                'paint': {
                    'line-color': '#ff0000',
                    'line-width': 2
                },
                'type': 'line',
                ...(config.map && config.map.lineSelectedStyle),
                'id': '$private-line-selected',
                'source': '$private-features',
                'visibility': 'none',
                'filter': ['!=', ["geometry-type"], 'Point']
            });
            map.addLayer({
                'paint': {
                    'circle-color': '#222',
                    'circle-radius': 4
                },
                'type': 'circle',
                ...(config.map && config.map.markerStyle),
                'id': '$private-markers',
                'source': '$private-features',
                'filter': ['==', ["geometry-type"], 'Point']
            });
            map.addLayer({
                'paint': {
                    'circle-color': '#ff0000',
                    'circle-radius': 4
                },
                'type': 'circle',
                ...(config.map && config.map.markerSelectedStyle),
                'id': '$private-selected',
                'source': '$private-features',
                'visibility': 'none',
                'filter': ['==', ["geometry-type"], 'Point']
            });
            updateSelected();
        }
    }

    function clickMap(event) {
        if (!(edit && selected.type === 'Feature')) {
            const bbox = [
                [event.point.x - 1, event.point.y - 1],
                [event.point.x + 1, event.point.y + 1]
            ];
            const queryFeatures = map.queryRenderedFeatures(bbox, {
                layers: ['$private-markers', '$private-polygons', '$private-lines']
            });
            const link = document.createElement('a');
            link.setAttribute('href', !queryFeatures[0]
                ? href({})
                : href({ type: 'features', itemId: queryFeatures[0].properties.id }));
            link.click();
        }
        
    }

    function loadMap() {
        dispatch('init', {
            map
        });
        const setImage = (key, path) => new Promise(resolve => {
            map.loadImage(path, (err, image) => {
                    if (err) {
                        console.error(err);
                    } else {
                        map.addImage(key, image);
                    }
                    resolve([err, image]);
                }
            );
        });
        Promise.all(
            Object.keys(icons)
                .map((key) => setImage(key, rootPath + 'static/icons/' + key + '.png'))
        ).then(() => {
            loaded = true;
            updateCollectionLayers(collection);
            map.on('click', clickMap);
        });
    }

    onMount(() => {
        loaded = false;
        const mapConfig = config.map || {};
        map = new Map({
            container: target,
            style: mapConfig.style || {
                version: 8,
                sources: {},
                layers: []
            },
            center: mapConfig.center || [9.2, 45.45],
            zoom: mapConfig.zoom || 11
        });
        draw = new MapboxDraw({
            controls: {
                combine_features: false,
                line_string: true,
                point: true,
                polygon: true,
                trash: true,
                uncombine_features: false
            }
        });
        popup = new Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'map-popup'
        });
        map.on('load', loadMap);
        map.on('draw.create', updateGeometry);
        map.on('draw.delete', updateGeometry);
        map.on('draw.update', updateGeometry);
        map.on('mouseenter', '$private-markers', addInfo);
        map.on('mouseleave', '$private-markers', removeInfo);
        map.on('mouseenter', '$private-polygons', addInfo);
        map.on('mouseleave', '$private-polygons', removeInfo);
        return () => {
            map.off('load', loadMap);
            map.off('click', clickMap);
            map.off('draw.create', updateGeometry);
            map.off('draw.delete', updateGeometry);
            map.off('draw.update', updateGeometry);
            map.off('mouseenter', '$private-markers', addInfo);
            map.off('mouseleave', '$private-markers', removeInfo);
            map.off('mouseenter', '$private-polygons', addInfo);
            map.off('mouseleave', '$private-polygons', removeInfo);
            map.remove();
            loaded = false;
        };
    });

    $: updateCollectionLayers(collection);
    $: updateSelected(selected);
    $: updateDraw(edit, selected);

    function handleDrop(event) {
        if (edit) {
            event.preventDefault();
            event.stopPropagation();
            if (selected && selected.type === 'Feature' && map && draw && draw.add) {
                const file = event.dataTransfer.files && event.dataTransfer.files[0];
                const allowedTypes = ['application/json'];
                if (file && allowedTypes.indexOf(file.type) !== -1) {
                    const objUrl = URL.createObjectURL(file);
                    fetch(objUrl)
                        .then(res => res.json())
                        .then((data) => {
                            if (data.geometry && data.geometry.type !== 'GeometryCollection') {
                                draw.add(data.geometry);
                            } else if (data.geometry && data.geometry.geometries) {
                                data.geometry.geometries.forEach(geometry => {
                                    draw.add(geometry);
                                });
                            }
                            if (data.type === 'FeatureCollection' && data.features) {
                                data.features.forEach(feature => {
                                    if (feature.geometry && feature.geometry.type !== 'GeometryCollection') {
                                        draw.add(feature.geometry);
                                    } else if (feature.geometry && feature.geometry.geometries) {
                                        feature.geometry.geometries.forEach(geometry => {
                                            draw.add(geometry);
                                        });
                                    }
                                });
                            }
                            updateGeometry();
                            URL.revokeObjectURL(objUrl);
                        });
                }
            }
        }
    }

    function handleDragOver(event) {
        if (edit) {
            event.preventDefault();
        }
    }


    $: updateSelected(hideOverlay);

</script>
  
<div
    id="map"
    class="map"
    bind:this={target}
    on:drop={handleDrop}
    on:dragover={handleDragOver}
>
</div>

<style>
.map {
    position: relative;
    width: 100%;
    height: 100%;
}
:global(.mapbox-gl-draw_ctrl-draw-btn.active) {
    outline: 1px solid var(--outline-color);
    z-index: 2;
    background-color: rgba(0,0,0,.05);
}
:global(.map-popup) {
    font-size: 0.75rem;
    text-align: center;
}
:global(.map-popup .mapboxgl-popup-content) {
    padding: 0.5rem;
}
:global(.map-popup .mapboxgl-popup-content .title) {
    font-weight: bold;
}
:global(.map-popup .mapboxgl-popup-content img) {
    height: 32px;
    width: auto;
}
:global(.map-popup .mapboxgl-popup-content .address) {
    font-size: 0.65rem;
    font-style: italic;
}
</style>

import App from "./App.svelte";
import 'normalize.css';
import api from './api/index.js';

const query = (window.location.search || '')
    .split('&')
    .reduce((acc, str) => {
        const parts = str.split('=');
        const key = parts[0].replace('?', '');
        const value = parts[1];
        return {
            ...acc,
            [key]: value === 'true'
                ? true
                : value === 'false'
                    ? false
                    : value
        };
    }, {}) || {};

const config = window._UG_CONFIG || {};

let app = new App({
    target: document.body,
    props: {
        lang: config.lang || query.lang || '_',
        id: config.id || query.id || '',
        api: config.api || api,
        editEnabled: config.edit || !!query.edit,
        rootPath: config.rootPath || '',
        initCollection: config.collection || null,
        initConfig: config.config || null
    }
});

export default app;

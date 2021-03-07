

const api = {
    createNewCollection: null,
    getCollectionById: (id, options) => {
        return fetch(options.rootPath + 'static/data/' + id + '.json')
            .then(res => res.json());
    },
    saveCollectionById: null,
    uploadMedia: (event, options) => {
        return new Promise((resolve, reject) => {
            const file = event.dataTransfer.files && event.dataTransfer.files[0];
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            const objUrl = URL.createObjectURL(file);
            if (file && allowedTypes.indexOf(file.type) !== -1) {
                const img = new Image();
                img.onerror = () => {
                    reject('');
                };
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ratio = img.naturalWidth / img.naturalHeight;
                    const width = options.imageWidth;
                    const height = width / ratio;
                    canvas.setAttribute('width', width);
                    canvas.setAttribute('height', height);
                    canvas.style.width = width + 'px';
                    canvas.style.height = height + 'px';
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    const markdownImage = '![original image ' + file.name + '](' + canvas.toDataURL('image/jpeg', options.imageQuality) + ')';
                    resolve(markdownImage);
                    URL.revokeObjectURL(objUrl);
                };
                img.src = objUrl;
            } else {
                reject('');
            }
        });

    }
};

export default api;

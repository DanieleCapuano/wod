export const init_data = _init_data;


function _init_data(data) {
    return new Promise((res, err) => {
        data = data || {};
        if (!data.objects_desc_url || !data.scene_desc_url) return err();
        Promise.all([
            _get_url(data.objects_desc_url),
            _get_url(data.scene_desc_url)
        ]).then((json_files) => {
            let objects = json_files[0];
            Promise.all(Object.keys(objects).map((obj_key) => _get_url(objects[obj_key])))
                .then(objects_jsons => {
                    res({
                        scene_desc: json_files[1],
                        objects_desc: objects_jsons
                    });
                })
        });
    });
}

function _get_url(url) {
    return fetch(url).then(o => o.json());
}
const path = require('path');

//format date to yyyy-MM-dd HH:mm:ss
Date.prototype.format = function () {
    const date = this;
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    const hours = ("0" + date.getHours()).slice(-2);
    const minutes = ("0" + date.getMinutes()).slice(-2);
    const seconds = ("0" + date.getSeconds()).slice(-2);
    return year + "-" + month + "-" + day + " " + hours + ":" + minutes + ":" + seconds;
}

const raw = Function.prototype.bind.call(console.log, console);
console.log = function () {
    raw.apply(console, [new Date().format(), '-'].concat(Array.from(arguments)));
};

class Err {
    constructor(code, message) {
        this.c = code;
        this.m = message;
    }

    toString() {
        return this.m;
    }
}

const api = Object.freeze({
    //https://alist.nn.ci/zh/guide/api/fs.html
    fs: Object.freeze({

        isDir: (f) => {
            return f && f.is_dir;
        },

        join: (...paths) => {
            return path.join(...paths);
        },

        // base fetch
        request: async (url, token, api, body, method = 'POST') => {
            const headers = new Headers();
            headers.append('Authorization', token);
            headers.append('Content-Type', 'application/json');

            const req = {
                method,
                headers,
                body: JSON.stringify(body),
                redirect: 'follow'
            };

            return fetch(url + '/api/fs/' + api, req)
                .then(r => r.json())
                .then(r => {
                    if (r.code === 200) {
                        return r.data;
                    }
                    return new Err(r.code, r.message);
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9
        mkdir: async (url, token, fPath) => {
            return api.fs.request(url, token, 'mkdir',
                {
                    'path': fPath
                })
                .then(r => {
                    if (r instanceof Err) {
                        console.log('fs.mkdir error:', r);
                        return false;
                    }
                    return true;
                })
                .catch(e => {
                    console.log('fs.mkdir error:', e);
                    return false;
                });
        },

        // https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%88%97%E5%87%BA%E6%96%87%E4%BB%B6%E7%9B%AE%E5%BD%95
        list: async (url, token, fPath) => {
            return api.fs.request(url, token, 'list',
                {
                    'path': fPath,
                    'password': '',
                    'page': 1,
                    'per_page': 0,
                    'refresh': true
                })
                .then(r => {
                    if (r instanceof Err) {
                        console.log('fs.list error:', r);
                        return [r.toString()];
                    }
                    return r.content || [];
                })
                .catch(e => {
                    console.log('fs.list error:', e);
                    return [e.toString()];
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%A4%8D%E5%88%B6%E6%96%87%E4%BB%B6
        copy: async (url, token, srcDir, dstDir, names) => {
            return api.fs.request(url, token, 'copy',
                {
                    'src_dir': srcDir,
                    'dst_dir': dstDir,
                    'names': names
                })
                .then(r => {
                    if (r instanceof Err) {
                        console.log('fs.copy error:', r);
                        return false;
                    }
                    return true;
                })
                .catch(e => {
                    console.log('fs.copy error:', e);
                    return false;
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%88%A0%E9%99%A4%E6%96%87%E4%BB%B6%E6%88%96%E6%96%87%E4%BB%B6%E5%A4%B9
        remove: async (url, token, dir, ...name) => {
            return api.fs.request(url, token, 'remove',
                {
                    'names': name,
                    'dir': dir
                })
                .then(r => {
                    if (r instanceof Err) {
                        console.log('fs.remove error:', r);
                        return false;
                    }
                    return true;
                })
                .catch(e => {
                    console.log('fs.remove error:', e);
                    return false;
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E8%8E%B7%E5%8F%96%E6%9F%90%E4%B8%AA%E6%96%87%E4%BB%B6-%E7%9B%AE%E5%BD%95%E4%BF%A1%E6%81%AF
        get: async (url, token, fPath) => {
            return api.fs.request(url, token, 'get',
                {
                    'path': fPath,
                    'password': '',
                    'page': 1,
                    'per_page': 0,
                    'refresh': true
                })
                .then(r => {
                    if (r instanceof Err) {
                        console.log('fs.get error:', r);
                        return undefined;
                    }
                    return r;
                })
                .catch(e => {
                    console.log('fs.get error:', e);
                    return undefined;
                });

        }
    })
});

module.exports = api;

const fs = require('fs');
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
        request: async (api, body, method = 'POST') => {
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
                    return undefined;
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E6%96%B0%E5%BB%BA%E6%96%87%E4%BB%B6%E5%A4%B9
        mkdir: async (fPath) => {
            return api.fs.request('mkdir',
                {
                    'path': fPath
                })
                .then(r => r !== undefined)
                .catch(e => {
                    console.log('fs.mkdir error:', e);
                    return false;
                });
        },

        // https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%88%97%E5%87%BA%E6%96%87%E4%BB%B6%E7%9B%AE%E5%BD%95
        list: async (fPath) => {
            return api.fs.request('list',
                {
                    'path': fPath,
                    'password': '',
                    'page': 1,
                    'per_page': 0,
                    'refresh': true
                })
                .then(r => {
                    if (r) {
                        return r.content || [];
                    }
                    return [];
                })
                .catch(e => {
                    console.log('fs.list error:', e);
                    return [];
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%A4%8D%E5%88%B6%E6%96%87%E4%BB%B6
        copy: async (srcDir, dstDir, names) => {
            return api.fs.request('copy',
                {
                    'src_dir': srcDir,
                    'dst_dir': dstDir,
                    'names': names
                })
                .then(r => r !== undefined)
                .catch(e => {
                    console.log('fs.copy error:', e);
                    return false;
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E5%88%A0%E9%99%A4%E6%96%87%E4%BB%B6%E6%88%96%E6%96%87%E4%BB%B6%E5%A4%B9
        remove: async (dir, ...name) => {
            return api.fs.request('remove',
                {
                    'names': name,
                    'dir': dir
                })
                .then(r => r !== undefined)
                .catch(e => {
                    console.log('fs.remove error:', e);
                    return false;
                });
        },

        //https://alist.nn.ci/zh/guide/api/fs.html#post-%E8%8E%B7%E5%8F%96%E6%9F%90%E4%B8%AA%E6%96%87%E4%BB%B6-%E7%9B%AE%E5%BD%95%E4%BF%A1%E6%81%AF
        get: async (fPath) => {
            return api.fs.request('get',
                {
                    'path': fPath,
                    'password': '',
                    'page': 1,
                    'per_page': 0,
                    'refresh': false
                })
                .catch(e => {
                    console.log('fs.get error:', e);
                    return undefined;
                });

        }
    })
});

async function walk(src, dst, filter, depth = 0) {
    console.log(`Process ${src} => ${dst}, exclude [${Array.from(filter).join(', ')}]`);

    const af = api.fs;
    const srcFs = await af.list(src);
    const dstFs = await af.list(dst);
    const mapping = new Map();
    for (const f of dstFs) {
        mapping.set(f.name, f);
    }

    const [dirs, needCopies] = [[], []];
    for (const sf of srcFs) {
        const name = sf.name;

        if (filter.has(name)) {
            continue;
        }

        if (af.isDir(sf)) {
            dirs.push(name);
        }

        const df = mapping.get(name);
        if (!df) {
            if (af.isDir(sf)) {
                await af.mkdir(af.join(dst, name));
            } else {
                needCopies.push(name);
            }
        } else {
            if (af.isDir(sf)) {
                if (af.isDir(df)) {
                    // same type, do nothing
                } else {
                    console.log(`  Because source is dir, ${name} is file, delete it`);
                    await af.remove(dst, name);
                    await af.mkdir(af.join(dst, name));
                }
            } else {
                if (af.isDir(df)) {
                    console.log(`  Because source is file, ${name} is dir, delete it`);
                    await af.remove(dst, name);
                    needCopies.push(name);
                } else {
                    if (sf.size != df.size) {
                        needCopies.push(name);
                    }
                }
            }
        }
    }

    if (needCopies.length) {
        console.log(`  Copy [${needCopies.join(', ')}]`);
        await af.copy(src, dst, needCopies);
    }
    if (dirs.length) {
        for (const dir of dirs) {
            await walk(af.join(src, dir), af.join(dst, dir), filter, depth + 1);
        }
    }
}

let [url, token] = ['', ''];
async function main() {
    const config = JSON.parse(fs.readFileSync('./backup.config.json', 'utf8'));
    url = config.server;
    token = config.token;

    if (url && token && url.length && token.length) {
        const copies = config.copy;
        if (Array.isArray(copies)) {
            for (const copy of copies) {
                const src = copy.from, dst = copy.to, filter = new Set(copy.filter);
                await walk(src, dst, filter);
            }
        }
    } else {
        console.log(`server or token is invalid`);
    }
}
main()
    .then(() => {
        console.log('Finish');
    })
    .catch(e => {
        console.log(e);
    });

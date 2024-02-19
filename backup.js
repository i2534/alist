
const api = require('./api');
const cfg = require('./config');

async function walk(src, dst, filter, depth = 0) {
    console.log(`Process ${src} => ${dst}, exclude [${Array.from(filter).join(', ')}]`);

    const af = api.fs;
    const srcFs = await af.list(url, token, src);
    if (srcFs.length && typeof srcFs[0] === 'string') {
        console.log(`  ${src} is invalid: ${srcFs[0]}`);
        return;
    }
    const dstFs = await af.list(url, token, dst);
    if (dstFs.length && typeof dstFs[0] === 'string') {
        console.log(`  ${dst} is invalid: ${dstFs[0]}`);
        return;
    }
    
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
                await af.mkdir(url, token, af.join(dst, name));
            } else {
                needCopies.push(name);
            }
        } else {
            if (af.isDir(sf)) {
                if (af.isDir(df)) {
                    // same type, do nothing
                } else {
                    console.log(`  Because source is dir, ${name} is file, delete it`);
                    await af.remove(url, token, dst, name);
                    await af.mkdir(url, token, af.join(dst, name));
                }
            } else {
                if (af.isDir(df)) {
                    console.log(`  Because source is file, ${name} is dir, delete it`);
                    await af.remove(url, token, dst, name);
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
        await af.copy(url, token, src, dst, needCopies);
    }
    if (dirs.length) {
        for (const dir of dirs) {
            await walk(af.join(src, dir), af.join(dst, dir), filter, depth + 1);
        }
    }
}

let [url, token] = ['', ''];
async function main() {
    const config = cfg.load('backup');
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
const api = require('./api');
const cfg = require('./config');

const config = cfg.load('check');

async function notify(msg) {
    const webhook = config.webhook;
    if (!webhook || !webhook.url) {
        return;
    }
    if (msg) {
        msg = msg.replace(/\"/g, "\\\"");
    }
    let body = webhook.body;
    if (body) {
        if (typeof body === 'object') {
            body = JSON.stringify(body);
        } else {
            body = body.toString();
        }
        body = body.replace(/\{message\}/g, msg);
    } else {
        body = msg;
    }
    // console.log(body);
    return fetch(webhook.url, {
        method: webhook.method || 'POST',
        headers: webhook.headers || {},
        body,
    });
}

async function main() {
    const url = config.server;
    const token = config.token;

    const af = api.fs;
    const root = await af.list(url, token, '/');
    const failed = new Map();
    for (const fp of root) {
        const name = fp.name;
        console.log('Check', fp.name);
        const ret = await af.list(url, token, name);
        if (typeof ret[0] === 'string') {
            console.log('Check failed:', ret[0]);
            failed.set(name, ret[0]);
        }
    }
    if (failed.size > 0) {
        let msg = '\n';
        for (const [name, err] of failed) {
            msg += `${name}: ${err}\n`;
        }
        await notify(msg);
    } else {
        console.log('Check all success');
    }
}

main()
    .then(() => {
        console.log('Finish');
    })
    .catch(e => {
        console.log(e);
    });
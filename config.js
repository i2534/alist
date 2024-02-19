const fs = require('fs');

module.exports = {
    load: function (name) {
        const dir = __dirname
        const base = JSON.parse(fs.readFileSync(dir + '/base.config.json', 'utf8'));
        if (name && name.length) {
            const config = JSON.parse(fs.readFileSync(`${dir}/${name}.config.json`, 'utf8'));
            return Object.assign(base, config);
        }
        return base;
    }
}
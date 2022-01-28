const path = require('path')

const Default = {

    server: {
        port: 19196,
        randomPort: false,
        get sharePath() {
            switch (process.platform) {
                case 'darwin': {
                    return path.resolve(process.env.HOME, 'Library', 'Application Support', 'simple-sharing-file', 'share');
                }
                case 'win32': {
                    return path.resolve(process.env.APPDATA, '..', '..', 'Documents', 'simple-sharing-file', 'share');
                    //return path.resolve('.', 'share')
                }
                case 'linux': {
                    return path.resolve(process.env.HOME, 'simple-sharing-file', 'share');
                }
            }
        }
    }

}

module.exports = { Default }
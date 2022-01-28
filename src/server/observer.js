const chokidar = require('chokidar')

class Observer {
    constructor(targetPath, server) {
        this.targetPath = targetPath
        this.server = server
        this.watcher = null
    }

    watchFolder() {
        const watchingHandler = filePath => {
            if (this.server.application.state.isServerOn === true) {
                this.server.sendFileList()
            }
        }

        if (this.targetPath) {
            try {
                if (process.platform === 'win32') {
                    this.watcher = chokidar.watch(this.targetPath, { persistent: true })
                }
                else if (process.platform === 'darwin') {
                    this.watcher = chokidar.watch(this.targetPath, {
                        persistent: true, usePolling: true, useFsEvents: false
                    })
                }

                if (this.watcher !== null) {
                    this.watcher.on('add', watchingHandler)
                        .on('change', watchingHandler)
                        .on('unlink', watchingHandler)
                }

            } catch (error) {
                console.log(error)
            }
        }
    }

    close() {
        this.watcher.close().then(() => console.log('closed'));
    }
}

module.exports = Observer
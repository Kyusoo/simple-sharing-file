const path = require('path')
const fs = require('fs')
const { BrowserWindow, clipboard, dialog, globalShortcut, shell } = require('electron')
const Server = require('./server/server')
const { Default } = require('./config')

// This module runs on Main Process

class Application {
    constructor(app) {
        this.app = app
        this.state = {
            port: Default.server.port,
            sharePath: Default.server.sharePath,
            isServerOn: false,
            server: {
                secure: false
            }
        }
    }

    onReady() {
        this.createMainWindow()
        this.mainWindow.show()

        if (MODE === 'development') {
            this.mainWindow.setAlwaysOnTop(true)
            this.mainWindow.setAlwaysOnTop(false)
        }
    }

    onActivate() {
        if (BrowserWindow.getAllWindows().length === 0) {
            this.createMainWindow()
        }
    }

    onAllWindowsClosed() {
        if (process.platform !== 'darwin') {
            this.app.quit()
        }
    }

    createMainWindow() {
        this.mainWindow = new BrowserWindow({
            title: `Simple Sharing File (v${this.app.getVersion()})`,
            width: 600,
            height: 400,
            icon: path.resolve(__dirname, '..', 'assets', 'icon.png'),
            show: false,
            resizable: false,
            useContentSize: true,
            webPreferences: {
                contextIsolation: false,
                nodeIntegration: true
            }
        })

        this.mainWindow.on('closed', () => {
            const wins = BrowserWindow.getAllWindows()
            wins.forEach(win => {
                win.destroy()
            })

            this.mainWindow = null

            if (process.platform === 'darwin') {
                this.app.quit()
            }
        })

        this.mainWindow.removeMenu()
        this.mainWindow.loadFile(path.resolve(__dirname, 'index.html'))

        if (MODE === 'development') {
            this.app.whenReady().then(() => {
                fs.watch(path.resolve(__dirname), (eventType, filename) => {

                    if (filename === 'index.js') {
                        this.mainWindow.reload()
                    }

                    if (filename === 'main.js') {
                        process.exit(RELOAD) // Refer to DefinePlugin in webpack.config.js
                    }

                })

                globalShortcut.register('CommandOrControl+F12', () => {
                    this.mainWindow.webContents.openDevTools({ mode: 'detach' })
                })
            })
        }
    }

    onLog(event, data) {
        console.log(`[Log][Render->Main] ${data}`)
    }

    onReq(event, req) {

        console.log(`[onReq] ${JSON.stringify(req)}`)

        switch (req.type) {
            case 'app-init':
                this.#makeShareFolder()
                this.state = { ...this.state, ...req.data }
                event.sender.send('State', { type: 'ipAddresses', data: Server.getIpAddresses() })
                break
            case 'change-share-folder':
                this.#changeShareFolder()
                break
            case 'open-share-folder':
                this.#openShareFolder()
                break
            case 'server':
                this.#operateServer(req.data)
                break
            case 'clipboard-copy':
                clipboard.writeText(`http://${req.data}`)
                break
        }
    }

    onState(event, state) {
        console.log(`[onState] ${JSON.stringify(state)}`)

        if(state.type === 'server') {
            this.server?.stateHandler(state.data)
        }

        this.state = {...this.state, [state.type]: state.data}
    }

    emitState(state) {
        this.mainWindow.webContents.send('State', state)
    }

    emitError(error) {
        this.mainWindow.webContents.send('Error', error)
    }

    #makeShareFolder() {
        const sharePath = this.state.sharePath

        if (fs.existsSync(sharePath) === false) {
            fs.mkdirSync(sharePath, { recursive: true })
        }
    }

    #openShareFolder() {
        shell.openPath(this.state.sharePath)
    }

    #changeShareFolder() {
        const directoryPath = dialog.showOpenDialogSync(this.mainWindow, {
            title: 'Select Share Path',
            properties: ['openDirectory', 'createDirectory', 'noResolveAliases']
        })

        if (directoryPath) {
            this.emitState({ type: 'sharePath', data: directoryPath[0] })
        }
    }

    #operateServer(serverSwitch) {
        if (serverSwitch) {
            this.server = new Server(this)
            this.server.openServer()
        }
        else {
            this.server.closeServer()
            this.server = null
        }
    }
}

module.exports.Application = Application
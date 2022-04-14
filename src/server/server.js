const fs = require('fs')
const os = require('os')
const path = require('path')
const express = require('express')
const favicon = require('serve-favicon')
const multer = require('multer')
const checkDiskSpace = require('check-disk-space').default
const Util = require('../util')
const Socket = require('./socket')
const Observer = require('./observer')


class Server {
    constructor(application) {
        this.application = application
        this.exp = express()
        this.server = null
        this.socket = null

        this.#setMiddleWare()
        this.#setRoutes()
    }

    static getIpAddresses() {
        const nets = os.networkInterfaces()
        const addresses = []

        for (const name of Object.keys(nets)) {
            for (const net of nets[name]) {
                if (net.family === 'IPv4' && !net.internal) {
                    addresses.push(net.address)
                }
            }
        }

        console.log(`IP Address : ${addresses.join(' / ')}`)

        return addresses
    }

    getFilesInDirectory(targetPath) {
        const fileArray = []
        const ignoreList = ['.DS_Store']

        fs.readdirSync(targetPath).forEach(file => {
            const fstat = fs.statSync(`${targetPath}/${file}`)
            const sizeInfo = Util.calcFileSize(fstat.size)

            if (fstat.isFile()) {
                fileArray.push({
                    name: file,
                    size: fstat.size,
                    sizeInfo,
                })
            }
        })

        const files = fileArray.filter(fileInfo => ignoreList.includes(fileInfo.name) === false)

        return files
    }

    #setMiddleWare() {
        this.exp.set('views', path.resolve(__dirname, 'views'))
        this.exp.set('view engine', 'ejs')

        this.exp.use(favicon(path.resolve(__dirname, '..', 'assets', 'icon.ico')))
        this.exp.use('/scripts', express.static(path.resolve(__dirname, 'scripts')))

        this.exp.use(express.json())
        this.exp.use(express.urlencoded({ extended: false }))
    }

    #setRoutes() {

        const storage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.application.state.sharePath);
            },
            filename: (req, file, cb) => {
                cb(null, `${file.originalname}`);
            },
        });

        const limits = {
            fieldNameSize: 200, // 필드명 사이즈 최대값 (기본값 100bytes)
            filedSize: 1024 * 1024, // 필드 사이즈 값 설정 (기본값 1MB)
            fields: 2, // 파일 형식이 아닌 필드의 최대 개수 (기본 값 무제한)
            fileSize: 16777216, //multipart 형식 폼에서 최대 파일 사이즈(bytes) "16MB 설정" (기본 값 무제한)
            files: 10, //multipart 형식 폼에서 파일 필드 최대 개수 (기본 값 무제한)
        }

        const fileFilter = (req, file, cb) => {

            /*
            const typeArray = file.mimetype.split('/')

            const fileType = typeArray[1]; // 이미지 확장자 추출

            //이미지 확장자 구분 검사
            if(fileType == 'jpg' || fileType == 'jpeg' || fileType == 'png'){
                cb(null, true)
            }else {
                return cb({message: "*.jpg, *.jpeg, *.png 파일만 업로드가 가능합니다."}, false)
            }
            */
        }

        const upload = multer({
            storage: storage,
            //limits: limits,
            //fileFilter: fileFilter,
        })

        this.exp.get('/', (req, res) => {
            res.redirect('/share')
        })
            .get('/share', (req, res) => {

                if (this.application.state.isServerOn) {

                    checkDiskSpace(this.application.state.sharePath).then(diskSpace => {
                        const disk = {
                            free: Util.calcFileSize(diskSpace.free),
                            total: Util.calcFileSize(diskSpace.size)
                        }


                        const host = {
                            name: os.hostname(),
                            username: os.userInfo().username,
                            disk
                        }

                        const secure = this.application.state.server.secure ? true : false
                        const files = this.getFilesInDirectory(this.application.state.sharePath)
                        const data = { host, secure, files: (secure ? [] : files) }

                        res.render('share', { data })
                    }).catch(e => {
                        console.error(e)
                        res.json(500).send(e.toString())
                    })

                }
                else {
                    res.render('close')
                }
            })
            .post('/secure', (req, res) => {

                const secure = this.application.state.server.secure ? true : false

                console.log(`[POST] /secure : ${secure}`)
                res.status(200).json({ 'secure': secure })
            })
            .post('/auth', (req, res) => {
                console.log(`[POST] /auth [REQ] ${JSON.stringify(req.body)}`)

                const password = req.body.password
                let auth = false

                if (!this.application.state.serverPassword || this.application.state.serverPassword.length === 0) {
                    auth = true
                    res.json({ auth })
                }
                else {
                    if (this.application.state.serverPassword != password) {

                        res.json({ auth, 'message': 'Wrong Password' })
                    }
                    else {
                        auth = true
                        res.json({ auth, 'message': 'PASS' })
                        this.sendFileList()
                    }
                }

                this.auth = auth
            })
            .get('/download/:fileName', (req, res) => {

                const fileName = req.params.fileName
                console.log(`[GET] /download [FileName] ${fileName}`)

                const file = path.resolve(this.application.state.sharePath, fileName)

                try {
                    if (fs.existsSync(file)) {
                        res.status(200).download(file)
                    }
                    else {
                        res.status(404).send('Not Found')
                    }
                } catch (e) {
                    console.log(e);
                    res.send(e.toString())
                }
            })
            .post('/upload', upload.array('upload'), (req, res) => {

                console.log(`[POST] /upload [REQ] ${JSON.stringify(req.body)}`)

                const result = { 'result': 'OK', 'message': 'Upload Successful' }
                res.status(200).json(result)
            })

        this.exp.use((req, res, next) => {
            const err = new Error('Not Found')
            err.status = 404
            next(err)
        })

        // Error Handler
        this.exp.use((err, req, res, next) => {
            console.error(`Stats[${err.status}] / Msg[${err.message}]`)
            res.status(err.status)
            res.send(err.message)
        })
    }

    openServer() {

        const listeningPort = (this.application.state.randomPort) ? 0 : this.application.state.port

        this.server = this.exp.listen(listeningPort, () => {
            const port = this.server.address().port
            console.log(`Listening at ${port}`)
            this.application.emitState({ type: 'port', data: port })
            this.socket = new Socket(this.server)
        })

        this.server.on('error', error => {
            console.log(`[Server][Error] Code=${error.code}`)

            if (error.code === 'EADDRINUSE') {
                this.application.emitError({ type: 'server', data: 'EADDRINUSE' })
            }

            this.application.emitState({ type: 'isServerOn', data: false })
        })

        this.observer = new Observer(this.application.state.sharePath, this)
        this.observer.watchFolder()
    }

    closeServer() {
        console.log('Close the server.')
        this.observer?.close()
        this.socket?.disconnect()
        this.server?.close()
    }

    stateHandler(data) {

        console.log(`[Server] ${JSON.stringify(data)}`)

        if (data?.secure !== undefined) {
            this.socket.sendToClients({ type: 'secure', data: data.secure })
            if (data.secure) this.sendFileList()
        }
    }

    sendFileList() {
        const files = this.getFilesInDirectory(this.application.state.sharePath)
        this.socket.sendToClients({ type: 'files', data: files })
    }

}

module.exports = Server
const SocketIO = require('socket.io')

class Socket {

    constructor(server) {

        this.io = SocketIO(server, { path: '/socket.io' })

        this.io.on('connection', socket => {
            const req = socket.request
            const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress

            console.log(`[Socket][Connection] IP[${ip}] / ID[${socket.id}]`)

            socket.on('disconnect', () => {
                console.log(`[Socket][Disconnect] IP[${ip}] / ID[${socket.id}]`)
            })

            socket.on('error', err => {
                console.error(err)
            })

            socket.on('message', message => {
                console.log(`[Socket][MSG][${ip}] ${message}`)
            })
        })
    }

    sendToClients(data) {
        this.io.fetchSockets()
            .then(sockets => {
                sockets.forEach(socket => {
                    socket.send(data)
                })
            })
            .catch(error => console.log(error))
    }

    disconnect() {
        this.io.disconnectSockets()
    }
}

module.exports = Socket
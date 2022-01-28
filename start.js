 const path = require('path')
const webpack = require('webpack')
const { exec } = require('child_process')
const { EOL } = require('os')
const EventEmitter = require('events')
const chalk = require('chalk') // From ver 5.0.0 chalk is pure ESM, cannot use require.
const config = require('./webpack.config')

const eventEmitter = new EventEmitter()

const LOGE = str => {
    console.log(`${chalk.hex('#74B1BE')('[Electron]')} ${str}`)
}

const launchElectron = delayTime => {
    setTimeout(() => {
        LOGE('Start !')
        const launchElectron = exec('npx electron .')

        launchElectron.stdout.on('data', data => {
            LOGE(data.toString())
        })

        launchElectron.on('exit', code => {
            LOGE(`Exit Code = ${code}`)

            if (code === 88) {
                eventEmitter.emit('electron-restart', 0)
            }
            else {
                process.exit(code)
            }
        })

    }, delayTime)
}

eventEmitter.once('electron-init', () => {
    launchElectron(0)
})

eventEmitter.on('electron-restart', () => {
    launchElectron(0)
})


/* Webpack */
const SRC = path.resolve(__dirname, 'src')
const DIST = path.resolve(__dirname, 'dist')
const MODE = process.env.NODE_ENV || 'development'

console.log(`MODE = ${MODE}`)

eventEmitter.on('webpack-watch', () => {

    webpack(config).watch(100, (err, stats) => {
        if (err) {
            console.log('[Webpack][Error]', err);
        }
        else {
            console.log(stats.toString());
        }
    })

})

webpack(config).run((err, status) => {
    if (err) {
        console.log('[Webpack][Error]', err);
    }
    else {
        const data = status.toString()
        console.log(data)

        data.split(EOL).forEach(line => {
            if (line.includes('compiled')) {
                if (line.includes('successfully')) {
                    console.log(`Webpack Compiled ${chalk.green('Successfully')}`)
                    eventEmitter.emit('electron-init')
                    setTimeout(() => {
                        eventEmitter.emit('webpack-watch')
                    }, 1000)
                }
                else {
                    console.log(`Webpack Compiled ${chalk.red('Failed')}`)
                }
            }
        })
    }
})
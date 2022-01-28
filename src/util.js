class Util {

    static calcFileSize(size) {
        let number = 0
        let unit = ''

        if (size < 1024) {
            number = size.toString()
            unit = 'bytes'
        }
        else if (size < (1024 ** 2)) {
            number = (size / 1024).toFixed(2)
            unit = 'KB'
        }
        else if (size < (1024 ** 3)) {
            number = (size / (1024 ** 2)).toFixed(2)
            unit = 'MB'
        }
        else if (size < (1024 ** 4)) {
            number = (size / (1024 ** 3)).toFixed(2)
            unit = 'GB'
        }

        return { number: Number(number), unit }
    }

    static isValidUrl(url) {
        const pattern = new RegExp('^(http:\\/\\/).+:([0-9])+$')

        return !!pattern.test(url)
    }
}

module.exports = Util
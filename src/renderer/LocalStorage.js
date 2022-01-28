export default class LocalStorage {

    static SET(key, value) {
        window.localStorage.setItem(key, JSON.stringify(value))
    }

    static GET(key) {

        return JSON.parse(window.localStorage.getItem(key))

        //return window.localStorage[key]
    }
}
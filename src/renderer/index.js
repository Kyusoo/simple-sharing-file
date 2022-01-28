import React, { useState, useEffect, useReducer } from 'react'
import ReactDOM from 'react-dom'
import { Alert, Box, Snackbar, Tabs, Tab } from '@mui/material'
import { TabPanel, applyTabProps } from '../mui-components/TabPanel'
import { PageServer, PageUpload, PageSettings } from './components/TabPages'
import { Default } from '../config'
import Storage from './LocalStorage'
import IPC from '../ipc'

// This module runs on Render Process

export const ViewContext = React.createContext(null)

const INITIAL_STATE = {
    port: (Storage.GET('port') || Default.server.port),
    randomPort: (Storage.GET('randomPort') || Default.server.randomPort),
    sharePath: (Storage.GET('sharePath') || Default.server.sharePath),
    isServerOn: false,
    serverPassword: '',
    ipAddresses: [],
    server: {
        secure: false
    },
    upload: {
        active: false,
        auth: false,
        url:'',
        password:''
    },
    snackbar: {
        open: false,
        severity: 'success',
        message: '',
        anchorOrigin : {
            vertical: 'bottom', horizontal: 'right'
        }
    }
}

function reducer(state, action) {

    console.log(`[index.js][Reducer]\n ${JSON.stringify(action)}`)

    switch (action.type) {
        case 'setPort':
            Storage.SET('port', action.port)
            IPC.sendToMain('State', { type: 'port', data: action.port })
            return { ...state, port: action.port }
        case 'setRandomPort':
            Storage.SET('randomPort', action.randomPort)
            IPC.sendToMain('State', { type: 'randomPort', data: action.randomPort })
            return { ...state, randomPort: action.randomPort }
        case 'setSharePath':
            Storage.SET('sharePath', action.sharePath)
            IPC.sendToMain('State', { type: 'sharePath', data: action.sharePath })
            return { ...state, sharePath: action.sharePath }
        case 'setIsServerOn':
            IPC.sendToMain('State', { type: 'isServerOn', data: action.isServerOn })
            IPC.sendToMain('Req', { type: 'server', data: action.isServerOn })
            return { ...state, isServerOn: action.isServerOn }
        case 'setServerPassword':
            IPC.sendToMain('State', { type: 'serverPassword', data: action.serverPassword })

            if(!action.serverPassword || action.serverPassword.length === 0) {
                IPC.sendToMain('State', { type: 'server', data: {...state.server, secure:false} })
                return { ...state, serverPassword: action.serverPassword, server:{...state.server, secure:false} }
            }
            else {
                IPC.sendToMain('State', { type: 'server', data: {...state.server, secure:true} })
                return { ...state, serverPassword: action.serverPassword, server:{...state.server, secure:true} }
            }            
        case 'ipAddresses':
            return { ...state, ipAddresses: action.ipAddresses }
        case 'server':
            IPC.sendToMain('State', { type: 'server', data: action.server})
            return {...state, server: action.server}
        case 'upload':
            return {...state, upload: action.upload}
        case 'snackbar':
        
            if(action.req === 'copyUrl') {
                IPC.sendToMain('Req', {
                    type: 'clipboard-copy',
                    data: action.snackbar.data
                })
            }

            return {...state, snackbar: action.snackbar}
        default:
            return state
    }
}

const App = () => {

    const [tabIndex, setTabIndex] = useState(0)
    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') {
            return
        }
        
        dispatch({type: 'snackbar', snackbar:{...state.snackbar, open:false}})
    }

    useEffect(() => {
        console.log('[Renderer][App] Mounted!')
        IPC.sendToMain('Req', {
            type: 'app-init',
            data: {
                port: state.port,
                sharePath: state.sharePath,
                randomPort: state.randomPort,
                serverPassword: state.serverPassword
            }
        })

        IPC.addRendererReceiver('State', (event, res) => {
            switch (res.type) {
                case 'port':
                    dispatch({ type: 'setPort', port: res.data })
                    break
                case 'sharePath':
                    dispatch({ type: 'setSharePath', sharePath: res.data })
                    break
                case 'ipAddresses':
                    dispatch({ type: 'ipAddresses', ipAddresses: res.data })
                    break
                case 'isServerOn':
                    dispatch({ type: 'setIsServerOn', isServerOn: res.data })
                    break
            }
        })

        IPC.addRendererReceiver('Error', (event, res) => {
            console.log(`[Error] ${res}`)
            switch(res.type) {
                case 'server':
                    if(res.data === 'EADDRINUSE') {
                        dispatch({ type: 'snackbar', req: 'serverError', snackbar: {
                                open: true,
                                severity: 'error',
                                message: `PORT[${state.port}] is already in use`,
                                anchorOrigin : {
                                    vertical: 'top', horizontal: 'center'
                                }
                            } 
                        })
                    }
                break
            }
        })

    }, [])

    useEffect(() => {
        console.log('[index.js][State]\n', JSON.stringify(state, null, 2))
    }, [state])

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={(evt, newValue) => setTabIndex(newValue)} aria-label="Application Tabs">
                    <Tab label="Server" disabled={state.upload.active}   {...applyTabProps(0)} />
                    <Tab label="Upload"                                  {...applyTabProps(1)} />
                    <Tab label="Settings" disabled={state.upload.active} {...applyTabProps(2)} />
                </Tabs>
            </Box>

            <ViewContext.Provider value={{ state, dispatch }}>
                <TabPanel value={tabIndex} index={0}>
                    <PageServer />
                </TabPanel>
                <TabPanel value={tabIndex} index={1}>
                    <PageUpload />
                </TabPanel>
                <TabPanel value={tabIndex} index={2}>
                    <PageSettings />
                </TabPanel>
            </ViewContext.Provider>

            <Snackbar open={state.snackbar.open} onClose={handleCloseSnackbar} autoHideDuration={1500} anchorOrigin={state.snackbar.anchorOrigin}>
                <Alert severity={state.snackbar.severity} sx={{ width: '100%' }}>
                    {state.snackbar.message}
                </Alert>
            </Snackbar>

        </Box>
    )
}

ReactDOM.render(<App />, document.getElementById('root'))
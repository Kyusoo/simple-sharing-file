import React, { useState, useEffect, useReducer } from 'react'
import ReactDOM from 'react-dom'
import { Alert, Box, Button, Container, Divider, Grid, Paper, Snackbar, TextField, Tab, Tabs, Typography } from '@mui/material'
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'
import { TabPanel, applyTabProps } from '../../mui-components/TabPanel'

import IconSearch from '@mui/icons-material/Search'
import IconPassword from '@mui/icons-material/Password'

import LinearProgressWithValue from '../../renderer/components/LinearProgressWithValue'

import Util from '../../util'

const ShareContext = React.createContext(null)

const INITIAL_STATE = {
    search: ''
}

function reducer(state, action) {
    switch (action.type) {
        case 'setSearch':
            sessionStorage.setItem('search', action.search)
            return { ...state, search: action.search }
    }
}

const App = () => {

    const [state, dispatch] = useReducer(reducer, INITIAL_STATE)
    const [secure, setSecure] = useState(false)
    const [fileList, setFileList] = useState([])
    const [uploadFiles, setUploadFiles] = useState([])
    const [isUploading, setIsUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [snackbar, setSnackBar] = useState({
        open: false,
        severity: '',
        message: '',
        anchorOrigin: {
            vertical: 'top', horizontal: 'center'
        },
        handleCloseSnackbar: (event, reason) => {
            if (reason === 'clickaway') {
                return
            }
            setSnackBar({ ...snackbar, open: false })
        }
    })
    const [password, setPassword] = useState({
        value: '',
        label: 'Password',
        error: false,
        auth: false
    })
    const [dialog, setDialog] = useState({
        open: false
    })

    const inputFileHandler = ({ target: { files } }) => {

        const fileList = Array.from(files)

        fileList.forEach(file => {
            file.sizeInfo = Util.calcFileSize(file.size)
        })

        setUploadFiles(fileList)
    }

    const uploadHandler = e => {
        const xhrUpload = new XMLHttpRequest();
        const formData = new FormData(formFile)

        xhrUpload.upload.onload = e => {
            setIsUploading(false)
        }

        xhrUpload.upload.onloadstart = e => {
            setIsUploading(true)
            setDialog({ ...dialog, open: true })
        }

        xhrUpload.upload.onprogress = e => {
            if (e.lengthComputable) {
                const percentComplete = Math.floor(e.loaded / e.total * 100);
                setProgress(percentComplete)
            } else {
                console.log('Not Computable')
            }
        }

        xhrUpload.upload.onabort = () => {
            setProgress(0)
            setIsUploading(false)
            setSnackBar({ ...snackbar, severity: 'error', open: true, message: 'Upload cancelled' })
        }

        xhrUpload.onerror = error => {
            console.error(error)
        }

        xhrUpload.onload = e => {
            const data = JSON.parse(e.target.response)
            console.log(data)
            if (data?.result === 'OK') {
                setSnackBar({ ...snackbar, severity: 'success', open: true, message: data?.message })
            }
            else {
                throw new Error('Fail to Upload file')
            }
            setUploadFiles([])
            setProgress(0)
        }
        xhrUpload.open('POST', formFile.action)
        xhrUpload.send(formData)
        window.xhrUpload = xhrUpload

        inputFile.value = ''
    }

    const uploadCancelHandler = () => {
        if (window.xhrUpload) {
            window.xhrUpload.abort()
            window.xhrUpload = null
        }

        setUploadFiles([])
        setDialog({ ...dialog, open: false })
    }

    const downloadHandler = ({ target }) => {
        const filename = target.firstChild.textContent
        const url = `${location.origin}/download`

        const xhr = new XMLHttpRequest()

        console.log(`[Down] filename[${filename}] / url[${url}]`)

        xhr.onload = e => {
            try {
                if (e.target.status === 200) {
                    const blob = e.target.response

                    let a = document.createElement("a");
                    a.style = "display: none";
                    document.body.appendChild(a);
                    //Create a DOMString representing the blob
                    //and point the link element towards it
                    let url = window.URL.createObjectURL(blob);
                    a.href = url;
                    a.download = filename;
                    //programatically click the link to trigger the download
                    a.click();
                    //release the reference to the file by revoking the Object URL
                    window.URL.revokeObjectURL(url);

                    document.body.removeChild(a)
                }
                else {
                    console.log(e.target.response)
                    const reader = new FileReader()
                    reader.onload = () => {
                        const result = JSON.parse(reader.result)
                        console.log(result)
                        setSnackBar({ ...snackbar, severity: 'error', open: true, message: result.message })
                    }
                    reader.readAsText(e.target.response)
                }
            } catch (error) {
                console.log(error)
            } finally {

            }
        }

        const data = { filename }
        xhr.responseType = 'blob'
        xhr.open('POST', url)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify(data))
    }

    const passwordChangeHandler = ({ target: { value } }) => {
        setPassword({ ...password, value })

        const data = { password: value }
        const xhr = new XMLHttpRequest()

        xhr.timeout = 250

        xhr.onload = e => {
            const data = JSON.parse(e.target.response)

            let auth = data.auth
            let error = false
            let label = ''

            if (value?.length > 0) {
                label = data.message
                if (data.auth === false) {
                    error = true
                }
            }
            else {
                error = true
                label = 'Server Password'
            }

            setPassword({ ...password, auth, error, label })
        }

        xhr.ontimeout = e => {
            console.error(`[Timeout][Auth]`)
        }

        xhr.open('POST', `/auth`)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify(data))
    }

    const filterFileList = (value) => {

        if (!value || value.length === 0) {
            setFileList(props.files)
        }
        else {
            setFileList(props.files.filter(file => file.name.includes(value) === true))
        }
    }

    const searchChangeHandler = ({ target: { value } }) => {
        dispatch({ type: 'setSearch', search: value })
        filterFileList(value)
    }

    useEffect(() => {
        setFileList(props.files)
        setSecure(props.secure)

        const socket = io.connect(location.origin)

        socket.on('connect', () => {

            console.log(`[Socket][Connect] ID : ${socket.id}`)

            socket.on('message', msg => {
                console.log(`[Socket][MSG] ${JSON.stringify(msg)}`)

                if (msg.type === 'files') {
                    props.files = msg.data
                    const search = sessionStorage.getItem('search')
                    filterFileList(search)
                }
                else if (msg.type === 'secure') {
                    setSecure(msg.data)
                }
            })

            socket.on('disconnect', () => {
                console.log(`[Socket][Disconnect]`)
                document.getElementById('share').innerHTML = `<h1>Server Closed.</h1>`
            })
        })

    }, [])

    const [tabIndex, setTabIndex] = useState(0)

    return (
        <Container>
            <Typography variant="h4">Simple Sharing File</Typography>
            <Typography variant="h5">HOST : {props.host.name} ({props.host.username})</Typography>
            <Typography variant="h5">Disk : {props.host.disk.free.number} {props.host.disk.free.unit} / {props.host.disk.total.number} {props.host.disk.total.unit}</Typography>

            {secure &&
                <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                    <IconPassword sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                    <TextField id="inputPassword" type="password" label={password.label} error={password.error} size="small" variant="standard" onChange={passwordChangeHandler}>{password.value}</TextField>
                </Box>
            }

            {((!secure) || (secure && password.auth)) &&
                <Box sx={{ width: '100%', marginTop: '20px' }}>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={tabIndex} onChange={(evt, newValue) => setTabIndex(newValue)} aria-label="Application Tabs">
                            <Tab label="Download" {...applyTabProps(0)} />
                            <Tab label="Upload"   {...applyTabProps(1)} />
                        </Tabs>
                    </Box>

                    <ShareContext.Provider value={{ state, dispatch }}>
                        {
                            // Download Tab
                        }
                        <TabPanel value={tabIndex} index={0}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-end', marginBottom: '20px' }}>
                                <IconSearch sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
                                <TextField id="inputSearch" label="Search" size="small" variant="standard" fullWidth={true} onChange={searchChangeHandler} value={state.search} />
                            </Box>
                            <TableContainer component={Paper}>
                                <Table sx={{ minWidth: 800 }} size="small">
                                    <TableHead sx={{ backgroundColor: '#EEE' }}>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>File</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }} align="right">Size</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {fileList.map((file, idx) => (
                                            <TableRow sx={{ cursor: 'pointer' }} hover key={idx} onClick={downloadHandler}>
                                                <TableCell>{file.name}</TableCell>
                                                <TableCell align="right">{file.sizeInfo.number} {file.sizeInfo.unit}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </TabPanel>

                        {
                            // Upload Tab
                        }
                        <TabPanel value={tabIndex} index={1}>

                            <Grid container spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                                <Grid item>
                                    <form id="formFile" method="POST" action="/upload" encType="multipart/form-data">
                                        <label htmlFor="inputFile" style={{ border: '1px solid skyblue', color: 'skyblue', borderRadius: '4px', padding: '4px 20px', cursor: 'pointer' }}>File Select</label>
                                        <input id="inputFile" type="file" name="upload" multiple onChange={inputFileHandler} style={{ display: "none" }} />
                                    </form>
                                </Grid>
                                <Grid item><Button disabled={uploadFiles.length === 0} variant="outlined" size="small" onClick={uploadHandler}>Upload</Button></Grid>
                            </Grid>

                            {uploadFiles.length > 0 &&
                                <Box>
                                    <Divider sx={{ margin: '10px 0px' }} />
                                    <TableContainer component={Paper}>
                                        <Table sx={{ minWidth: 400 }} size="small">
                                            <TableHead sx={{ backgroundColor: '#EEE' }}>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="left">File</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }} align="right">Size</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {uploadFiles.map((file, idx) => (
                                                    <TableRow key={`upload-file-${idx}`}>
                                                        <TableCell>{file.name}</TableCell>
                                                        <TableCell align="right">{`${file.sizeInfo.number} ${file.sizeInfo.unit}`}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </Box>
                            }

                            {isUploading &&
                                <Dialog open={dialog.open}>
                                    <DialogTitle>{"File Upload"}</DialogTitle>
                                    <DialogContent>
                                        <Box sx={{ minWidth: 400 }}>
                                            <LinearProgressWithValue value={progress} />
                                        </Box>
                                    </DialogContent>
                                    <DialogActions>
                                        <Button onClick={uploadCancelHandler} disabled={!isUploading} size="small" variant="outlined">Cancel</Button>
                                    </DialogActions>
                                </Dialog>
                            }
                        </TabPanel>
                    </ShareContext.Provider>
                </Box>
            }

            <Snackbar open={snackbar.open} onClose={snackbar.handleCloseSnackbar} autoHideDuration={1500} anchorOrigin={snackbar.anchorOrigin}>
                <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    )
}

ReactDOM.render(<App />, document.getElementById('share'))
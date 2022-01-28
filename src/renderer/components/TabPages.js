import React, { useContext, useEffect, useState } from 'react'
import { Box, Button, Checkbox, Divider, FormControlLabel, Grid, Input, List, ListItem, ListItemButton, ListItemText, Switch, Tooltip, Typography } from '@mui/material'
import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { Dialog, DialogActions, DialogContent, DialogTitle} from '@mui/material'
import { makeStyles } from '@mui/styles'
import IPC from '../../ipc'
import Util from '../../util'
import LinearProgressWithValue from './LinearProgressWithValue'
import { ViewContext } from '../index'

const PageServer = () => {

    const { state, dispatch } = useContext(ViewContext);

    const onSwitchHandler = ({ target: { checked } }) => {
        dispatch({ type: 'setIsServerOn', isServerOn: checked })
    }

    const onServerPassword = ({target:{value}}) => {
        dispatch({ type: 'setServerPassword', serverPassword: value })
    }

    const onSelectIpAddress = ({ target }) => {
       dispatch({ type: 'snackbar', req: 'copyUrl', snackbar: {
                open: true,
                severity: 'info',
                message: 'Copied to clipboard.',
                anchorOrigin : {
                    vertical: 'bottom', horizontal: 'right'
                },
                data: target.textContent
            }
        })
    }

    return (
        <div>
            <Grid container spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                <Grid item >Server State : {state.isServerOn ? "ON" : "OFF"}</Grid>
                <Grid item ><Input type="password" placeholder="Server Password" onChange={onServerPassword} value={state.serverPassword}></Input></Grid>
                <Grid item ><Switch onChange={onSwitchHandler} checked={state.isServerOn} /></Grid>
            </Grid>

            {state.isServerOn &&
                <Box>
                    <Divider sx={{ margin: '10px 0' }} />
                    <Typography variant='caption'>IP Address List</Typography>
                    <List>
                        {
                            (state.ipAddresses.length > 0) ?
                                [state.ipAddresses].map((address, i) => {
                                    return (
                                        <React.Fragment key={i}>
                                            <ListItem disablePadding>
                                                <ListItemButton onClick={onSelectIpAddress}>
                                                    <ListItemText>{`${address}:${state.port}`}</ListItemText>
                                                </ListItemButton>
                                            </ListItem>
                                            <Divider light />
                                        </React.Fragment>
                                    )
                                })
                                : null
                        }
                    </List>
                </Box>
            }
        </div>
    )
}

const useStyles = makeStyles({
    labelFileSelect: {
        border:'1px solid skyblue',
        color:'skyblue',
        borderRadius:'4px',
        padding:'4px 20px',
        cursor:'pointer',
        '&:hover': {
            border:'1px solid #1976D2',
            color: '#1976D2',
            backgroundColor: '#F6FAFD'
        }
    }
});

const PageUpload = () => {

    const { state, dispatch } = useContext(ViewContext);

    const [isSecure, setIsSecure] = useState(false)
    const [isValidUrl, setIsValidUrl] = useState(false)
    const [isAuth, setIsAuth] = useState(false)
    const [uploadFiles, setUploadFiles] = useState([])
    const [progress, setProgress] = useState(0)
    const [dialog, setDialog] = useState({
        open: false
    })

    const classes = useStyles()

    const getIsSecure = value => {

        const url = value ? value : state.upload.url

        console.log(`[GetSecure] value=${value} url=${url}`)

        if(url.length > 0) {
            const xhr = new XMLHttpRequest()
            xhr.open('POST', `${url}/secure`)
            xhr.timeout = 200
            xhr.onload = e => {
                const data = JSON.parse(e.target.response)
                setIsSecure(data.secure)
                setIsValidUrl(true)

                console.log(`[GetSecure] ${data.secure}`)
            }
            xhr.ontimeout = e => {
                console.error(`[GetSecure] Timeout !`)
                setIsValidUrl(false)
            }
            xhr.send()
        }
    }

    const getAuth = value => {

        const password = value ? value : state.upload.password

        const data = {password}
        const xhr = new XMLHttpRequest()

        xhr.timeout = 250

        xhr.onload = e => {
            const data = JSON.parse(e.target.response)
            setIsAuth(data.auth)
        }

        xhr.ontimeout = e => {
            console.error(`[Timeout][Auth]`)
        }

        xhr.open('POST', `${state.upload.url}/auth`)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(JSON.stringify(data))
    }

    const urlChangeHandler = ({target:{value}}) => {
        dispatch({type:'upload', upload:{...state.upload, url:value}})
        const isValid = Util.isValidUrl(value)
        if(isValid) {
            getIsSecure(value)
        }
    }

    const passwordChangeHandler = ({target:{value}}) => {
        dispatch({type:'upload', upload:{...state.upload, password:value}})
        getAuth(value)
    }

    const inputFileHandler = ({target:{files}}) => {

        console.dir(files)

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
            console.log('upload complete', e);
            dispatch({type:'upload', upload:{...state.upload, active:false}})
        }
        xhrUpload.upload.onloadstart = e => {
            console.log('upload start')
            setProgress(0)
            dispatch({type:'upload', upload:{...state.upload, active:true}})
            setDialog({...dialog, open:true})
        }

        xhrUpload.upload.onprogress = e => {
            if( e.lengthComputable ) {
                const percentComplete = Math.floor(e.loaded / e.total * 100);
                setProgress(percentComplete)
                console.log(percentComplete)
            } else {
                console.log('Not Computable')
            }
        }
        xhrUpload.upload.onabort = () => {
            setProgress(0)
            dispatch({type:'upload', upload:{...state.upload, active:false}})
            dispatch({type: 'snackbar', snackbar: {
                open: true,
                severity: 'error',
                message: 'Upload cancelled',
                anchorOrigin : {
                    vertical: 'bottom', horizontal: 'right'
                }
            }})
        }

        xhrUpload.onerror = error => {
            console.error(error)
        }

        xhrUpload.onload = e => {
            const data = JSON.parse(e.target.response)
            if (data?.result === 'OK') {

                dispatch({ type: 'snackbar', snackbar: {
                        open: true,
                        severity: 'success',
                        message: data.message,
                        anchorOrigin : {
                            vertical: 'bottom', horizontal: 'right'
                        },
                        data: null
                    }
                })
                setUploadFiles([])
                setProgress(0)
            }
            else {
                throw new Error('Fail to Upload file')
            }
        }
        xhrUpload.open('POST', `${state.upload.url}/upload`)
        xhrUpload.send(formData)
        window.xhrUpload = xhrUpload

        inputFile.value = ''
    }

    const uploadCancelHandler = e => {
        if(window.xhrUpload) {
            window.xhrUpload.abort()
            window.xhrUpload = null
        }

        setUploadFiles([])
        setDialog({...dialog, open:false})
    }

    useEffect(() => {
        console.log(`[Mounted] Upload Tab`)

        getIsSecure()
        getAuth()

    }, [])

    return (
        <div>
            <Grid container spacing={1} direction="column">
                <Grid container spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                    <Grid xs={4} item>URL</Grid>
                    <Grid xs={8} item><Input placeholder="http://address:port" onChange={urlChangeHandler} fullWidth={true} value={state.upload.url} /></Grid>
                </Grid>
                { isValidUrl && isSecure &&
                <Grid container spacing={1} direction="row" alignItems="center" justifyContent="space-between">
                    <Grid xs={4} item>Upload Password</Grid>
                    <Grid xs={8} item><Input type="password" placeholder="Upload Password" error={!isAuth} fullWidth={true} onChange={passwordChangeHandler} value={state.upload.password} /></Grid>
                </Grid>
                }
                { ( ( isValidUrl && !isSecure ) || ( isValidUrl && isSecure && isAuth )) &&
                <Grid container spacing={1} direction="row" alignItems="center" justifyContent="space-between" sx={{marginTop:'10px'}}>
                    <Grid item>
                        <form id="formFile" method="POST" encType="multipart/form-data">
                            <label className={classes.labelFileSelect} htmlFor="inputFile">File Select</label>
                            <input id="inputFile" type="file" name="upload" multiple onChange={inputFileHandler} style={{display:"none"}} disabled={state.upload.active} />
                        </form>
                    </Grid>
                    <Grid item><Button disabled={!isValidUrl || uploadFiles.length === 0} variant="outlined" size="small" onClick={uploadHandler}>Upload</Button></Grid>
                </Grid>
                }
            </Grid>

            {uploadFiles.length > 0 &&
            <Box>
                <Divider sx={{margin:'10px 0px'}} />
                <TableContainer component={Paper}>
                    <Table sx={{minWidth: 400}} size="small">
                        <TableHead sx={{backgroundColor:'#EEE'}}>
                            <TableRow>
                                <TableCell sx={{fontWeight:'bold'}} align="left">File</TableCell>
                                <TableCell sx={{fontWeight:'bold'}} align="right">Size</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                                {uploadFiles.map( (file, idx) => (
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

            { state.upload.active &&
            <Dialog open={dialog.open}>
                <DialogTitle>{"File Upload"}</DialogTitle>
                <DialogContent>
                    <Box sx={{minWidth: 400}}>
                        <LinearProgressWithValue value={progress} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={uploadCancelHandler} disabled={!state.upload.active} size="small" variant="outlined">Cancel</Button>
                </DialogActions>
            </Dialog>
            }
        </div>
    )
}

const PageSettings = () => {

    const { state, dispatch } = useContext(ViewContext);

    const onChangePort = ({ target: { value } }) => {
        let strValue = value

        const nValue = Number(strValue)

        if (Number.isInteger(nValue)) {
            if (strValue.length > 1) {
                strValue = strValue.replace(/^0+/, '')
            }
            else {
                strValue = strValue.replace(/^0+/, '0')
            }
        }

        if (!Number.isNaN(nValue) && nValue <= 65535) {
            dispatch({ type: 'setPort', port: nValue })
        }
    }

    const onClickChangeSharePath = e => {
        IPC.sendToMain('Req', {
            type: 'change-share-folder'
        })
    }

    const onClickOpenSharePath = e => {
        IPC.sendToMain('Req', {
            type: 'open-share-folder'
        })
    }

    const onChangeRandomPort = ({ target: { checked } }) => {
        dispatch({ type: 'setRandomPort', randomPort: checked })
    }

    return (
        <div>
            <Grid container spacing={1} direction="column">
                <Grid>
                    <Typography variant="h6">Server [{state.isServerOn ? 'ON' : 'OFF'}]</Typography>
                </Grid>

                <Divider sx={{ margin: '10px 0' }} />

                <Grid container spacing={2} direction="row" alignItems="center">
                    <Grid item xs={3}>Port Number</Grid>
                    <Grid item xs={5}>
                        <Tooltip title="0 to 65535">
                            <Input disabled={(state.isServerOn || state.randomPort)} onChange={onChangePort} value={state.port} placeholder="0 to 65535" fullWidth={true} />
                        </Tooltip>
                    </Grid>
                    <Grid item xs={4}>
                        <FormControlLabel label="Random" control={<Checkbox checked={state.randomPort} onChange={onChangeRandomPort} />} />
                    </Grid>
                </Grid>

                <Grid container spacing={2} direction="row" alignItems="center">
                    <Grid item xs={3}>Share Path</Grid>
                    <Grid item xs={5}>
                        <Tooltip title={state.sharePath}>
                            <Input label="Path" value={state.sharePath} readOnly={true} fullWidth={true} />
                        </Tooltip>
                    </Grid>
                    <Grid item xs={2}>
                        <Button onClick={onClickOpenSharePath} variant="outlined" size="small">OPEN</Button>
                    </Grid>
                    <Grid item xs={2}>
                        <Button disabled={state.isServerOn} onClick={onClickChangeSharePath} variant="outlined" size="small">Change</Button>
                    </Grid>
                </Grid>

            </Grid>
        </div>
    )
}

export { PageServer, PageUpload, PageSettings }
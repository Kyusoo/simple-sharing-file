import React from 'react'
import { Box } from '@mui/material'

const TabPanel = props => {
    const { children, value, index, ...other } = props

    return (
        <div role="tabpanel"
             hidden={value !== index}
             id={`simple-tabpanel=${index}`}
             aria-labelledby={`simple-tab-${index}`}
             {...other}
        >
            {value === index && (
                <Box sx={{ p:3 }}>
                    {children}
                </Box>
            )}
        </div>
    )
}

const applyTabProps = (index) => {
    return {
        id: `simple-tab-${index}`,
        'aria-controls': `simple-tabpanel-${index}`
    }
}

export { TabPanel, applyTabProps }
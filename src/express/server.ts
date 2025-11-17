// express/server.ts
import express from 'express'
import cors from 'cors'
import saveRoute from './routes/saveRoute'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())
app.use('/api', saveRoute)

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`)
})
import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const router = express.Router()

router.post('/save-route', (req, res) => {
  const { coords, travelTimeSec, totalDistanceMiles } = req.body

  if (!Array.isArray(coords)) {
    return res.status(400).json({ error: 'Invalid route data' })
  }

  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)
  const outputPath = path.join(__dirname, '../data/savedRoute.json')

  const newRoute = {
    coords,
    travelTimeSec,
    totalDistanceMiles,
    savedAt: new Date().toISOString()
  }

  // Read existing file (if it exists)
  fs.readFile(outputPath, 'utf8', (readErr, data) => {
    let existingRoutes = []

    if (!readErr && data) {
      try {
        const parsed = JSON.parse(data)
        existingRoutes = parsed.routes || []
      } catch {
        console.warn('Failed to parse existing route data, starting fresh.')
      }
    }

    const updatedPayload = {
      routes: [...existingRoutes, newRoute]
    }

    fs.writeFile(outputPath, JSON.stringify(updatedPayload, null, 2), (writeErr) => {
      if (writeErr) {
        console.error('Failed to save route:', writeErr)
        return res.status(500).json({ error: 'Failed to save route' })
      }

      res.status(200).json({ message: 'Route saved successfully' })
    })
  })
})

router.get('/saved-route', (_req, res) => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const filePath = path.join(__dirname, '../data/savedRoute.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Failed to read savedRoute.json:', err);
      return res.status(500).json({ error: 'Failed to read route data' });
    }

    try {
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (parseErr) {
      console.error('Invalid JSON in savedRoute.json:', parseErr);
      res.status(500).json({ error: 'Invalid route data format' });
    }
  });
});
export default router
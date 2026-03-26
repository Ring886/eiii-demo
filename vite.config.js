import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'
import { execFile } from 'child_process'

// 自定义插件：用于保存前端上传的图片
function saveImagePlugin() {
  return {
    name: 'save-image-plugin',
    configureServer(server) {
      let count = 0
      let runStatuses = []
      server.middlewares.use(async (req, res, next) => {
        if (count >= 5) {
          count = 0
          const picDir = path.resolve(process.cwd(), 'src/pic')
          if (fs.existsSync(picDir)) {
            fs.readdirSync(picDir).forEach(file => {
              fs.unlinkSync(path.join(picDir, file))
            })
          }
          runStatuses = []
        }
        if (req.url === '/api/clear-results' && req.method === 'POST') {
          try {
            const resultDir = path.resolve(process.cwd(), 'src/result_dir')
            if (fs.existsSync(resultDir)) {
              fs.readdirSync(resultDir).forEach(file => {
                fs.unlinkSync(path.join(resultDir, file))
              })
            } else {
              fs.mkdirSync(resultDir, { recursive: true })
            }
            runStatuses = []
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ success: false, error: err.message }))
          }
        } else if (req.url === '/api/save-pic' && req.method === 'POST') {
          let body = ''
          req.on('data', chunk => {
            body += chunk.toString()
          })
          req.on('end', () => {
            try {
              const data = JSON.parse(body)
              const base64Data = data.image.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64Data, 'base64')
              
              const picDir = path.resolve(process.cwd(), 'src/pic')
              if (!fs.existsSync(picDir)) {
                fs.mkdirSync(picDir, { recursive: true })
              }
              const filename = `${count++}.png`
              fs.writeFileSync(path.join(picDir, filename), buffer)
              
              const scriptPath = path.resolve(process.cwd(), 'demo-300W-eiii.sh')
              const imagePath = path.join(picDir, filename)
              const resultDir = path.resolve(process.cwd(), 'src/result_dir')
              if (!fs.existsSync(resultDir)) {
                fs.mkdirSync(resultDir, { recursive: true })
              }
              const outputPath = path.join(resultDir, filename)
              const capturedAt = Date.now()
              const runScript = () => new Promise((resolve) => {
                try {
                  execFile('bash', [scriptPath, imagePath, outputPath], (error) => {
                    resolve(!error)
                  })
                } catch (_) {
                  resolve(false)
                }
              })
              runScript().then((ok) => {
                runStatuses.push({ time: capturedAt, state: ok ? 1 : 0 })
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, filename, runStatuses }))
              })
            } catch (err) {
              res.statusCode = 500
              res.end(JSON.stringify({ success: false, error: err.message }))
            }
          })
        } else {
          next()
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), saveImagePlugin()],
})

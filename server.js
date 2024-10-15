const express = require("express")
const axios = require("axios")
const cors = require("cors")
const Redis = require("redis")

const port = 3990
const DEFAULT_EXPIRATION = 3600

const redisClient = Redis.createClient({
    legacyMode: true,
    PORT: 6397
  })
  redisClient.connect().catch(console.error)

const app = express();
app.use(express.urlencoded({ extended: true }))
app.use(cors())

app.get("/photos", async (req, res) => {
    const albumId = req.query.albumId //extract album id from param
    const photos = await getOrSetCache(`photos?albumId=${albumId}`, async () => {
        const { data } = await axios.get(
            "https://jsonplaceholder.typicode.com/photos", 
            { params: {albumId} }
        )
        return data
    })
    
    res.json(photos)
})


app.get("/photos/:id", async (req, res) => {
    const photo = await getOrSetCache(`photos:albumId=${req.params.id}`, async () => {
        const { data } = await axios.get(
            `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
        )
        return data
    })

    res.json(photo)
})

function getOrSetCache(key, cb) {
    return new Promise((resolve, reject) => {
        redisClient.get(key, async (error, data) => {
            if (error) return reject(error)
            if (data != null) return resolve(JSON.parse(data))
            const freshData = await cb()
            redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData))
            resolve(freshData)
        })
    })
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
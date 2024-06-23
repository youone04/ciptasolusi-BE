const express = require('express');
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const doteenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const bodyParser = require('body-parser');
const zlib = require('zlib');

doteenv.config();

const uri = "mongodb+srv://yudi:Z38fmgx0fLcBjMG3@yudi.8tlyt75.mongodb.net/?retryWrites=true&w=majority&appName=yudi";
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: false,
        deprecationErrors: true,
    }
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        await client.close();
    }
}
run().catch(console.dir);


// middleware
app.use(cors({
    "origin": "*",
    "methods": "GET,HEAD,PUT,PATCH,POST,DELETE",
    "preflightContinue": false,
    "optionsSuccessStatus": 204
}));
app.use(bodyParser.json({ limit: '50mb' })); // Adjust the limit as needed
app.use(express.json());
app.use(helmet());
app.use(morgan("common"));

//Home Route
app.get('/', (req, res) => {

    try{
     res.send({
         status: 200,
         message: "api berhasil di jalankan",
         data: []
     })
    }catch(e){
     res.send({
         status: 500,
         message: "api gagal di jalankan"
     })
    }
 })

// Define a route to handle data insertion
app.post('/addPost', async (req, res) => {
    const { userId, idFilm, nama, namaFilm, kategoriFilm, latitude, longitude, img } = req.body;

    try {
        // Connect the client to the server

        // Compress the base64 image data
        const buffer = Buffer.from(img.split(',')[1], 'base64'); // Remove data URL prefix
        zlib.deflate(buffer, async (err, compressedBuffer) => {
            if (err) {
                return res.status(500).json({ message: 'Compression failed' });
            }

            // Encode the compressed data in base64
            const compressedBase64 = compressedBuffer.toString('base64');

            const newPost = {
                userId,
                idFilm,
                nama,
                namaFilm,
                kategoriFilm,
                latitude,
                longitude,
                img: compressedBase64, // Store the compressed base64 string
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await client.connect();
            const database = client.db('yudi');
            const collection = database.collection('posts');

            const result = await collection.insertOne(newPost);

            res.status(201).json(result);
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    } finally {
        // Close the client connection
        await client.close();
    }
});

// Route to retrieve and decompress the image by ID
app.get('/getPost/:id', async (req, res) => {
    try {
        await client.connect();

        const database = client.db('yudi');
        const collection = database.collection('posts');

        const post = await collection.findOne({ _id: new MongoClient.ObjectId(req.params.id) });

        if (!post) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Decode the base64 string
        const compressedBuffer = Buffer.from(post.img, 'base64');

        // Decompress the data
        zlib.inflate(compressedBuffer, (err, buffer) => {
            if (err) {
                return res.status(500).json({ message: 'Decompression failed' });
            }

            // Convert the buffer back to base64 string
            const decompressedBase64 = `data:image/png;base64,${buffer.toString('base64')}`;

            res.status(200).json({ ...post, img: decompressedBase64 });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    } finally {
        await client.close();
    }
});


app.get('/getPosts', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('yudi');
        const collection = database.collection('posts');

        const posts = await collection.find({}).toArray();

        res.status(200).json(posts);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.get('/topIdFilms', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('yudi');
        const collection = database.collection('posts');

        const pipeline = [
            {
                $group: {
                    _id: "$idFilm",
                    count: { $sum: 1 },
                    namaFilm: { $first: "$namaFilm" }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 5
            }
        ];

        const topIdFilms = await collection.aggregate(pipeline).toArray();

        res.status(200).json(topIdFilms);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

app.listen(8800, () => {
    console.log('Server Running 8800')
})
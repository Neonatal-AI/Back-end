// environment variable declaration n shit. 
// DOTENV mod only for local env. fallbacks in case.
require('dotenv').config()
const EXPRESS_PORT = process.env.PORT || 8000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const SECRET = process.env.SECRET

// connect to either local mongodb server or centralized server
const CONNECTION_STRING = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017"
const FRONT_END = process.env.FRONT_END || "http://localhost:3000"
console.log(`key${CONNECTION_STRING}\nExpress port: ${EXPRESS_PORT}\nTalking to: ${FRONT_END}`)

// express modules
const express = require('express')
const session = require('express-session')
const cors = require('cors')
const morgan = require('morgan')

// Mongo Modules
const {MongoClient, ServerApiVersion} = require('mongodb')
const MongoStore = require('connect-mongo')

// encryption modules
const bcrypt = require('bcrypt')


// note
// local imports
const { getEpboResults } = require('./util/scraper.js')
const validateUrl = require('./util/UrlCheck.js')
const jobDescription = require('./util/GetJobDescription')

// MongoDB client object
// we will need to update the CONNECTION_STRING environment variable. this is dont on Heroku
const client = new MongoClient(CONNECTION_STRING, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      }
})
// MongoDB connection establishment
async function run() {
    try {
      // Connect the client to the server
      await client.connect();
      // Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!")
    }catch(error){
        console.error(error)
    }
  }
  run().catch(console.dir)

// session storage on mongo
const sessionStore = MongoStore.create({
    mongoUrl: `${CONNECTION_STRING}`,
    collectionName: "sessions",
    ttl: 3600
})

// express middleware
const app = express()
    .set("trust proxy", 1)
    .use(session({
            store: sessionStore,
            proxy: true,
            secret: SECRET, // Set a secret key for session signing (replace 'your-secret-key' with your own secret)
            resave: false, // Disable session resaving on each request
            saveUninitialized: false, // Do not save uninitialized sessions
            unset: 'destroy',
            cookie: {
                proxy: true,
                sameSite: 'none', // cross-site
                secure: true, // Set to true if using HTTPS
                httpOnly: true, // Prevent client-side JavaScript from accessing cookies
                maxAge: 1000*60*30, // Session expiration time (in milliseconds)
                domain: process.env.COOKIE_ALLOW,
                path: "/"
    }}))
    .use(express.json())
    .use(cors({
        credentials: true,
        origin: FRONT_END
    }))
    .use(morgan('tiny'))


// API ENDPOINTS


// why not. a little fun html output in case someone navigates to my server url
app.get("/", (req, res) => {
    res.send("What are you doing here?\nI didn't want you to see me naked!")
})

// The registration endpoint should still exist, so users can create an account. 
// it will need to be edited though.
app.post('/registration', async (req, res) => {
    // our database and collection as variables
    const db = client.db('resGen')
    const collection = db.collection('users')
    try {
        // map request body elements to valiables for readability. 
        const {firstName, lastName, email, username, password} = req.body
        // Hash the password before saving in the database
        const hashedPassword =  await bcrypt.hash(password, 10)
        // store to object
        const user = {
            firstName,
            lastName,
            username,
            password: hashedPassword,
            email: email.toLowerCase()
        }
        // look for a username and email corresponding with the ones in the request body
        // if exists, reject registration
        const existingUser = await collection.findOne({ username: username })
        const existingEmail = await collection.findOne({ email: email })
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists.' })
        } else if (existingEmail) {
            return res.status(400).json({ message: 'Email already in use.' })
        }
        // insert new user into the user db collection
        let newUser = await collection.insertOne(user)

        console.log(req.session)
        console.log(newUser.insertedId.toString())
        res.header('Access-Control-Allow-Origin', FRONT_END);
        res.header('Access-Control-Allow-Credentials', 'true');
        res.cookie("session", newUser.insertedId.toString(), {
            proxy: true,
            sameSite: 'none', // cross-site
            secure: true, // Set to true if using HTTPS
            httpOnly: true, // Prevent client-side JavaScript from accessing cookies
            maxAge: 60*30*1000, // Session expiration time (in milliseconds)
            domain: process.env.COOKIE_ALLOW,
            path: "/"
        })

        // return to the front end
        return res.status(200).json({ 
            message: 'User created'
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'OH NO! something went wrong!', error })
    }
})

app.post('/login', async (req, res) => {
    let db = client.db('resGen')
    let collection = db.collection('users') 
    try {
        const {username, password} = req.body
        // check to see if usename in database
        const existingUser = await collection.findOne({ 
            username: username
        })
        // obscure rejection
        if (!existingUser) {
            return res.status(403).json({
                message: 'invalid credentials' 
            })
        }
        // password check using bcrypt
        const correctPass = await bcrypt.compare(password, existingUser.password)
        // obscure rejection
        if (!correctPass) {
            return res.status(403).json({ message: 'invalid credentials' })
        } else {
            req.session.isAuth = existingUser._id.toString()
            console.log(process.env.COOKIE_ALLOW)
            const expires = req.session.cookie.expires
            res.header('Access-Control-Allow-Origin', FRONT_END);
            res.header('Access-Control-Allow-Credentials', 'true');
            res.cookie("session", existingUser._id.toString(), {
                proxy: true,
                sameSite: 'none', // cross-site
                secure: true, // Set to true if using HTTPS
                httpOnly: false, // Prevent client-side JavaScript from accessing cookies
                maxAge: 60*30*1000, // Session expiration time (in milliseconds)
                domain: process.env.COOKIE_ALLOW,
                path: "/"
            })
            return res.status(200).json({
                message: "Login Successful"
            })
        }
    }catch (error){
        console.error(error)
    } 
})
// all og the authentication functions are kind of inadequate. needs better security.
app.get('/logout', (req, res) => {
    // Destroy the session
    req.session.destroy(err => {
      if (err) {
        console.error('Error destroying session:', err);
        res.status(500).send('Error destroying session');
      } else {
        // Clear the session cookies
        res.clearCookie('your-session-cookie-name');
        // Redirect or send response as needed
        res.redirect('/'); // Redirect to homepage after logout
      }
    });
  });
// We should create an enpoint for renewing session cookies, so that users can stay logged in while active.
// this backend endpoint should be hit every time the user does something, so that while they are active on the site
// they will remain logged in.
app.post('/refreshCookie', async (req, res) => {
})

// this function adds to the database.... It will require EXTENSIVE revision. 
// Our database may be a little more complex than what I implemented for this last application.
// We will want to include separation between user accounts and patient information
// we may be able to generalize to some degree and have a single endpoint to store information to the database, 
// but we may also want to consider 
app.post('/historyPost', async (req, res) => {
    const db = client.db('resGen')
    const document = req.body
    // document['"date"'] = new Date(document.date)
    console.log("ID Here:", req.headers.id)
    const collection = db.collection('history')
    try {
        await collection.insertOne(document)
        res.json({ message: 'History data stored successfully' })
        console.log("History data sent to server.", document)
    } catch (error) {
        console.error(`Error occurred while inserting document: ${error}`, "\n\nREQUEST BODY:\n\n",req.body)
        res.status(500).json({ message: 'An error occurred' })
    }
})

// app.get('/historyGet', async (req, res) => {
//     const db = client.db('resGen');
//     try {
//         const collection = db.collection('history');

//         const data = await collection.find({userid: req.headers.id}).toArray();
//         res.json(data);
//     } catch (error) {
//         res.status(500).json({ error: error.toString() });
//     }
// })

// this endpoint was never fully built out. 
// it might prove useful, however
app.post('/handleFile', async (req, res) => {
    console.log(req)
})
// This enpoint recieves user input from the front end and sends it to the OpenAI completions endpoint.
app.post('/createDocs', async (req, res) => {
// unpack input from the front end
    gestational_age = req.body.inputFields.gestational_age
    birth_weight = req.body.inputFields.birth_weight
    singleton = req.body.inputFields.singleton
    steroids = req.body.inputFields.steroids
    sex = req.body.inputFields.sex
    ethnicity = req.body.inputFields.ethnicity
    ruptured_membrane = req.body.inputFields.birth_weight
    length_of_ruptured_membrane = req.body.inputFields.length_of_ruptured_membrane
    pre_eclampsia = req.body.inputFields.pre_eclampsia
    clinician_notes = req.body.inputFields.clinician_notes

    // unpack output options
    literacy_level = req.body.outputOptions.literacy_level
    translate = req.body.outputOptions.translate
    language = req.body.outputOptions.language

    // assign the return from the scraper tool to a document 

    let survival = await fetchAndParse(gestational_age, birth_weight, sex, singleton, steroids)
    console.log(survival)





    // const options = {
    //     method: "POST",
    //     headers: {
    //         "Authorization": `Bearer ${OPENAI_API_KEY}`,
    //         "content-Type": "application/json"
    //     },
    //     body: JSON.stringify({
    //         model:"gpt-3.5-turbo",
    //         messages: [{role:"system",content:"You are to respond to requests for polished resume's and cover letters, helping job seekers match these documents to job descriptions they also provide you."},{role: "user", content: req.body.prompt}],
    //         temperature: 0.5,
    //         max_tokens: 2000,
    //     })
    // }
    // console.log("error on server before fetch", options)
    // try{
    //     options.body["stream"] = true
    //     const response = await fetch("https://api.openai.com/v1/chat/completions", options)
    //     const data = await response.json()
    //     res.send(data)
    //     console.log("nice! this user made an API request")
    // }catch(error){
    //     console.log(error)
    //     console.log(`these were your options: ${options}`)
    // }
})


// this is a reconstruction of the input handling and 
// subsequent api requests to OpenAI
// we could 
app.post('/completions2', async (req, res) => {
    // top level vars for 
    
    const job = jobDescription(req, OPENAI_API_KEY)
    console.log(job)
})


// socket configuration
// I never got sockets working. but it really would be nice... not necessary but nice.
// const { Server } = require("socket.io");

// const io = new Server({ /* options */ });

// io.on("connection", (socket) => {
//   // ...
//   console.log("connection made")
// });

// io.listen(8002);
app.listen(EXPRESS_PORT, () => console.log(`Listening on ${EXPRESS_PORT}`));


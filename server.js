// environment variable declaration n shit. 
// DOTENV mod only for local env. fallbacks in case.
require('dotenv').config()
const EXPRESS_PORT = process.env.PORT || 8000
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
const scraper = require('./util/scraper.js')
const openAI = require('./util/openAI/openAICall.js')

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

// This enpoint recieves user input from the front end and sends it to the OpenAI completions endpoint.
app.post('/createDocs', async (req, res) => {

    // unpack input from the front end
    gestational_age = req.body.inputFields.gestational_age
    birth_weight = req.body.inputFields.birth_weight
    singleton = req.body.inputFields.singleton
    steroids = req.body.inputFields.steroids
    sex = req.body.inputFields.sex
    ethnicity = req.body.inputFields.ethnicity
    ruptured_membrane = req.body.inputFields.ruptured_membrane
    length_of_ruptured_membrane = req.body.inputFields.length_of_ruptured_membrane
    pre_eclampsia = req.body.inputFields.pre_eclampsia
    clinician_notes = req.body.inputFields.clinician_notes

    // unpack output options
    literacy_level = req.body.outputOptions.literacy_level
    translate = req.body.outputOptions.translate
    language = req.body.outputOptions.language
    
    docType = req.body.docType
    
    // assign the return from the scraper tool to a document 
    try{
        let results = await scraper.getEpboResults(Number(gestational_age), Number(birth_weight), sex, singleton, steroids)
        let prompt = `Create an outline to help a NICU employee in their fellowship training to conduct a prenatal consult, using the following information about the pregnancy:
        gestational_age = ${gestational_age} weeks
        birth_weight = ${birth_weight} grams
        singleton birth = ${singleton}
        use of antenatal steroids = ${steroids}
        baby's sex = ${sex}
        baby's ethnicity = ${ethnicity}
        premature ruptured membrane = ${ruptured_membrane}
        length of ruptured membrane = ${length_of_ruptured_membrane}
        pre-eclampsia = ${pre_eclampsia}
        clinician_notes = ${clinician_notes}
        NICHD survival rate prediction (with active treatment) = ${results[0]}
        NICHD survival rate prediction (without active treatment) = ${results[2]}
        NICHD profound neurodevelopmental impairment chance = ${results[4]}
        NICHD moderate-severe neurodevelopmental impairment chance = ${results[5]}
        NICHD blindness chance = ${results[6]}
        NICHD deafness chance = ${results[7]}
        NICHD moderate-server cerebral palsy chance = ${results[8]}
        NICHD cognitive developmental delay chance = ${results[9]}`
        
        console.log("****************************************************************")
        console.log("BELOW IS THE PROMPT SENT TO OPENAI:\n")
        console.log(prompt)
    
        let config = `parameters which you are to adhere to in your response:
            literacy_level = ${literacy_level}
            translate = ${translate}
            language = ${language}`

        console.log("AND THE CONFIG PROMPT:\n")
        console.log(config)
        console.log("****************************************************************")
        
        let promptResponse = await openAI.promptGPT(prompt, config, docType) // this is the only really important piece of code.
        let document = promptResponse.choices[0].message.content.toString()
        console.log("hasn't sent stuff...")
        res.send({
            document: document,
            prompt: prompt
        })

        console.log("****************************************************************")
        console.log("BELOW IS THE RESPONSE FROM OPENAI:\n")
        console.log(promptResponse.choices[0])
        console.log("****************************************************************")
    }catch(error){
        res.status(500).json({ error: error.toString() });
        console.log(error)
    }
})


app.listen(EXPRESS_PORT, () => console.log(`Listening on ${EXPRESS_PORT}`));


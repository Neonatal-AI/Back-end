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
        let S = parseInt(results[0])/100
        // results of EPBO calculator used in calculation of intact survival 
        let PN1 = parseInt(results[4].split(" - ")[0])/100
        if(results[4].split(" - ")[1]){
            let PN2 = parseInt(results[4].split(" - ")[1])/100
        }else{let PN2 = PN1}
        let MSN1 = parseInt(results[5].split(" - ")[0])/100
        if(results[5].split(" - ")[1]){
            let MSN2 = parseInt(results[5].split(" - ")[1])/100
        }else{let MSN2 = MSN1}
        let intact_survival = (S * (1 - (((PN1+PN2)/2) + ((MSN1+MSN2)/2))))*100
        
        // intact_survival = Number((intact_survival).toFixed(2))
        console.log(intact_survival)
        // console.log(PN1, PN2, MSN1, MSN2, intact_survival)
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
        NICHD calculated chance of intact survival: ${intact_survival}`
        
    
        let config = `parameters which you are to adhere to in your response:
            literacy_level = ${literacy_level}
            translate = ${translate}
            language = ${language}`

        // let promptResponse = {
        //     choices: [
        //         { text: "Simulated response from OpenAI." }
        //     ]
        // };
        let promptResponse = await openAI.promptGPT(prompt, config, docType) // this is the only really important piece of code.
        
        return res.status(200).send({
            document: promptResponse.choices[0].text,
            prompt: prompt
        });
    }catch(error){
        console.log(error)
        return res.status(500).send({ 
            error: error.toString() ,
            document: "ERROR",
            prompt: "ERROR"
        });
    }
})


app.listen(EXPRESS_PORT, () => console.log(`Listening on ${EXPRESS_PORT}`));


const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const fs = require('fs');
const sysPromptPath = './fellow_handout_sys.txt';
let sysPrompt = '';
const promptPath = './testPrompt.txt';
let prompt = '';
const configPath = './output_config.txt';
let config = '';

function readPrompt(path) {
    return new Promise((resolve, reject) => {
        fs.readFile(path, 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading file:', err);
                reject(err);
            } else {
                resolve(data);}
        });
    });
}

async function fetchData(sysPrompt, prompt, config){
    // debugging print statements
    // console.log('Sys prompt file:');
    // console.log(sysPromptPath);
    // console.log('Sys prompt:');
    // console.log(sysPrompt);
    // console.log('Prompt file:');
    // console.log(promptPath);
    // console.log('Prompt:');
    // console.log(prompt);
    const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "content-Type": "application/json"
        },
        body: JSON.stringify({
            model:"gpt-3.5-turbo",
            messages: [{role:"system",content:sysPrompt},
                {role: "user", content: prompt},
                {role: "user", content: config},
                {role:"user", content: "ALL CHUNKS SENT!!!"}],
            temperature: 0.5,
            max_tokens: 2000,
        })
    }
    try{
        const response = await fetch("https://api.openai.com/v1/chat/completions", options)
        const data = await response.json()
        console.log(data)
        const messageContent = data.choices[0].message.content.toString()
        console.log(data.choices[0].message.content.toString())
        // res.send(data)
        console.log("nice! this user made an API request")
        return messageContent
    }catch(error){
        throw error
    }
}
async function promptGPT(prompt, config) {
    [sysPrompt] = await Promise.all([
        readPrompt(sysPromptPath)
    ])
    fetchData(sysPrompt, prompt, config)
}
const test_prompt_params = {gestational_age : 30,
    birth_weight :500,
    singleton : true,
    steroids : false,
    sex : "male",
    ethnicity : "white",
    ruptured_membrane : false,
    length_of_ruptured_membrane : null,
    pre_eclampsia : false,
    clinician_notes : "The parents are very worried about outcomes."};
const testConfig = {
    literacy_level : "basic",
    translate : "no",
    language : null
};
promptGPT(JSON.stringify(test_prompt_params), JSON.stringify(testConfig))

module.exports = { promptGPT }

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const fs = require('fs');

let sysPrompt = '';


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
    const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "content-Type": "application/json"
        },
        body: JSON.stringify({
            model:"gpt-4o-2024-05-13",
            messages: [{role:"user",content:sysPrompt},
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
        console.log("nice! this user made an API request")
        return data
    }catch(error){
        throw error
    }
}
async function promptGPT(prompt, config, docType) {
    // get the 'system' prompt from files
    const sysPromptPath = `${__dirname}/${docType}.txt`;
    [sysPrompt] = await Promise.all([
        readPrompt(sysPromptPath)
    ])

    return await fetchData(sysPrompt, prompt, config)
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

module.exports = { promptGPT }

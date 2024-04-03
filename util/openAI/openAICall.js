const fs = require('fs');
const sysPromptPath = 'fellow_handout_sys.txt';
let sysPrompt = '';
fs.readFile(sysPromptPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading file:', err);
      return;
    }
  
    // Print the content of the system message
    console.log('Sys prompt file:');
    console.log(sysPromptPath);
    console.log('Sys prompt:');
    console.log(data);
    sysPrompt = data;
   });
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function fetchData(){
    const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "content-Type": "application/json"
        },
        body: JSON.stringify({
            model:"gpt-3.5-turbo",
            messages: [{role:"system",content:sysPrompt},
                {role: "user", content: ""}],
            temperature: 0.5,
            max_tokens: 2000,
        })
    }
    try{
        options.body["stream"] = true
        const response = await fetch("https://api.openai.com/v1/chat/completions", options)
        const data = await response.json()
        console.log(data.choices[0].message.content.toString())
        // res.send(data)
        console.log("nice! this user made an API request")
    }catch(error){
        console.log(error)
        console.log(`these were your options: ${options}`)
    }
}
fetchData()
module.exports = { fetchData }

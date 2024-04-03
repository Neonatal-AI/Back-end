const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const options = {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${OPENAI_API_KEY}`,
            "content-Type": "application/json"
        },
        body: JSON.stringify({
            model:"gpt-3.5-turbo",
            messages: [{role:"system",content:"You are to respond to requests for polished resume's and cover letters, helping job seekers match these documents to job descriptions they also provide you."},{role: "user", content: "This is not a resume. Tell me I'm wrong..."}],
            temperature: 0.5,
            max_tokens: 2000,
        })
    }
async function fetchData(){
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

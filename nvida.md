import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: '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',
  baseURL: 'https://integrate.api.nvidia.com/v1',
})

async function main() {
  const completion = await openai.chat.completions.create({
    model: "nvidia/llama-3.3-nemotron-super-49b-v1",
    messages: [{"role":"system","content":"detailed thinking off"}],
    temperature: 0.6,
    top_p: 0.95,
    max_tokens: 4096,
    frequency_penalty: 0,
    presence_penalty: 0,
    stream: true,
  })
   
  for await (const chunk of completion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || '')
  }
  
}

main();
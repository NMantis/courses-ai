import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


export async function getCompletion(
    system_prompt: string,
    user_promt: string | string[],
    output_format: any,
    model: string = "gpt-3.5-turbo"
) {
    const output_format_prompt = `\nYou are to output ${/\[.*?\]/.test(JSON.stringify(output_format)) && "an array of objects in"
        } the following in json format: ${JSON.stringify(
            output_format
        )}. \nDo not put quotation marks or escape character \\ in the output fields.`;

    const response = await openai.chat.completions.create({
        model: model,
        temperature: 1,
        messages: [
            { role: "system", content: system_prompt + output_format_prompt },
            { role: "user", content: user_promt.toString() }
        ],
    });

    let res: string =
        response.choices[0].message.content!.replace(/'/g, '"').replace(/(\w)"(\w)/g, "$1'$2");

    return res;
}

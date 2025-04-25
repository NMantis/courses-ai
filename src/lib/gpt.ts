import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const COURSE_FORMAT = {
    title: "title of the unit",
    chapters: "an array of chapters, each chapter should have a youtube_search_query and a chapter_title key in the JSON object",
};

const IMG_FORMAT = {
    image_search_term: "a good search term for the title of the course",
};
export async function getCompletion(
    system_prompt: string,
    user_promt: string | string[],
    request_content: 'course' | 'img' = 'course',
    model: string = "gpt-3.5-turbo"
) {
    const output_format = request_content === 'course' ? COURSE_FORMAT : IMG_FORMAT;
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

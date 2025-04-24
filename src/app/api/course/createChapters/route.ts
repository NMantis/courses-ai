import { NextResponse } from "next/server";
import { createChaptersSchema } from "@/validators/course";
import { ZodError } from "zod";
import { strict_output } from "@/lib/gpt";

export async function POST(req: Request, res: Response) {
    try {
        const body = await req.json();
        const { title, units } = createChaptersSchema.parse(body);

        type outputUnits = {
            title: string;
            chapters: {
                youtube_search_query: string;
                chapter_title: string;
            }[];
        }

        const output_units: outputUnits[] = [];

        for (const unit of units) {
            const singlePrompt = `Create chapters for the calculus unit on "${unit}". For each chapter, provide a descriptive YouTube search query and a clear chapter title. The goal is to help a student learn this topic from high-quality educational videos.`;

            const result = await strict_output(
                "You are an AI that creates structured course content with YouTube search prompts.",
                singlePrompt,
                {
                    title: "title of the unit",
                    chapters: "an array of chapters, each chapter should have a youtube_search_query and a chapter_title key in the JSON object",
                },
                "",
                false,
                "gpt-3.5-turbo", // Try 'gpt-3.5-turbo-0125' if available
                0.7,
                3,  // retry 3 times if needed
                true // log verbose output
            );

            output_units.push(result);
        }

        return output_units;

        return NextResponse.json({ output_units });
    } catch (error) {
        if (error instanceof ZodError) {
            return NextResponse.json({ error: error.issues }, { status: 400 });
        }

        return NextResponse.json({ error: error }, { status: 500 });
    }
}
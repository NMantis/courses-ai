
import { NextResponse } from "next/server";
import { createChaptersSchema } from "@/validators/course";
import { ZodError } from "zod";
import { getCompletion } from "@/lib/gpt";
import { getUnsplashImage } from "@/lib/unsplash";
import { getAuthSession } from "@/lib/auth";
// import { checkSubscription } from "@/lib/subscription";
import prisma from "@/lib/db";
import OpenAI from "openai";

const client = new OpenAI();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request, res: Response) {

    try {
        const session = await getAuthSession();
        if (!session?.user) {
            return new NextResponse("unauthorised", { status: 401 });
        }
        // const isPro = await checkSubscription();
        // if (session.user.credits <= 0 && !isPro) {
        //   return new NextResponse("no credits", { status: 402 });
        // }
        const body = await req.json();
        const { title, units } = createChaptersSchema.parse(body);

        type outputUnits = {
            title: string;
            chapters: {
                youtube_search_query: string;
                chapter_title: string;
            }[];
        }[];

        const output_units = await getCompletion(
            "You are an AI capable of curating course content, coming up with relevant chapter titles, and finding relevant youtube videos for each chapter",
            new Array(units.length).fill(
                `It is your job to create a course about ${title}. The user has requested to create chapters for each of the units (${JSON.stringify(units)}).
                    Then, for each chapter, provide a detailed youtube search query that can be used to find an informative educationalvideo for each chapter. Each query should give an educational informative course in youtube.`
            )
        );

        const image = await getCompletion(
            "You are an AI capable of finding the most relevant image for a course.",
            `Please provide a good image search term for the title of a course about ${title}. This search term will be fed into the unsplash API, so make sure it is a good search term that will return good results`,
            'img'
        );

        const course_image = await getUnsplashImage(
            JSON.parse(image).image_search_term
        );

        const course = await prisma.course.create({
            data: {
                name: title,
                image: course_image,
            },
        });

        const transform = JSON.parse(output_units);
        const units_array: outputUnits = Array.isArray(transform) ? transform : [transform];

        for (const unit of units_array) {
            const title = unit.title;
            const prismaUnit = await prisma.unit.create({
                data: {
                    name: title,
                    courseId: course.id,
                },
            });

            await prisma.chapter.createMany({
                data: unit.chapters.map((chapter: { youtube_search_query: string; chapter_title: string }) => {
                    return {
                        name: chapter.chapter_title,
                        youtubeSearchQuery: chapter.youtube_search_query,
                        unitId: prismaUnit.id,
                    };
                }),
            });
        }

        // await prisma.user.update({
        //     where: {
        //         id: session.user.id,
        //     },
        //     data: {
        //         credits: {
        //             decrement: 1
        //         },
        //     },
        // });

        return NextResponse.json({ course_id: course.id });
    } catch (error) {
        if (error instanceof ZodError) {
            return new NextResponse("invalid body", { status: 400 });
        }

        return NextResponse.json({ error });
    }
}
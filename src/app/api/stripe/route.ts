import { getAuthSession } from "@/lib/auth";
import prisma from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";


export async function GET() {
    try {
        const session = await getAuthSession();

        if (!session?.user) {
            return new NextResponse("unauthorised", { status: 401 });
        }

        const userSubscription = await prisma.userSubscription.findUnique({
            where: {
                userId: session.user.id
            }
        })

        if (userSubscription && userSubscription.stripeCustomerId) {
            const stripeSession = await stripe.billingPortal.sessions.create({
                customer: userSubscription.stripeCustomerId,
                return_url: `${process.env.NEXT_PUBLIC_URL}/settings`
            });

            return new NextResponse(JSON.stringify({ url: stripeSession.url }));
        }

        // user first time subscribing
        const stripeSession = await stripe.checkout.sessions.create({
            success_url: `${process.env.NEXT_PUBLIC_URL}/settings` || '',
            cancel_url: `${process.env.NEXT_PUBLIC_URL}/settings` || '',
            payment_method_types: ["card"],
            mode: "subscription",
            billing_address_collection: "auto",
            customer_email: session.user.email || '',
            line_items: [
                {
                    price_data: {
                        currency: "USD",
                        product_data: {
                            name: "Course Ai Pro",
                            description: "Unlimited Course Generations"
                        },
                        unit_amount: 2000,
                        recurring: {
                            interval: "month"
                        }
                    },
                    quantity: 1
                }
            ],
            metadata: {
                userId: session.user.id
            }
        });

        return new NextResponse(JSON.stringify({ url: stripeSession.url }));
    } catch (error) {
        console.log("[STRIPE ERROR]", error);
        return new NextResponse("internal server error", { status: 500 });
    }
}
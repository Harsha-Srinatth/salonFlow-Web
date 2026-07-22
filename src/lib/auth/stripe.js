export const STRIPE_PLANS = [
    {
        name: "basic",
        priceId: process.env.STRIPE_BASIC_PRICE_ID,
        limits: {
            projects: 10,
        },
    },
    {
        name: "pro",
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        limits: {
            projects: 50,
        },
    },
];
export const PLAN_TO_PRICE = {
    basic: 19,
    pro: 49,
};

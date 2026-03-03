import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';

const stripe = new Stripe('sk_test_51SwOtNCXb5UF7f4wMIkz8qYooEhhGSI7XufacjKsHC5yrqOprx5nkWwqoPExSAMHvJX187L3BEyjJYmSPxbafpKx000RYDygRh');
const app = express();

app.use(cors());
// We will use raw body for stripe webhook, but json for everything else
app.use(express.json());

const planPrices = {
    'Professional Resume': 1500,
    'Starter Pack': 3000,
    'Success Pack': 6000,
    'Elite Pack': 10000,
};

// Create a PaymentIntent
app.post('/api/create-payment-intent', async (req, res) => {
    try {
        const { plan, email } = req.body;

        const amount = planPrices[plan] || 6000;

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency: 'usd',
            // In the latest version of the API, specifying the `automatic_payment_methods` parameter is optional because Stripe enables its functionality by default.
            automatic_payment_methods: {
                enabled: true,
            },
            receipt_email: email,
            metadata: {
                plan,
                email
            }
        });

        res.send({
            clientSecret: paymentIntent.client_secret,
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

// Mock webhook to simulate step 8
app.post('/api/webhook', express.raw({ type: 'application/json' }), (req, res) => {
    // In a real application, you would verify the signature:
    // const signature = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, signature, endpointSecret);
    const event = req.body; // Unverified for this dummy project

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log(`[Webhook] PaymentIntent for ${paymentIntent.amount} was successful!`);
            // Backend activates service here!
            break;
        default:
            // Unexpected event type
            break;
    }

    res.json({ received: true });
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}!`));

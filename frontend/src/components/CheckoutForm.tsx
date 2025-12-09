
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from './ui/button';
import { CheckCheck } from 'lucide-react';

// Initialize Stripe Key
const stripePromise = loadStripe("pk_live_51SbMfL4fEK1Kwnr2m9bCv4EXYNpjaFiAQsjiOOvPxwaupSlZ74oGhrWjiaJaXd6CFI52hbsAOsprm7woAKv5RmpT0015RxdwHy");

export interface CheckoutFormProps {
    clientSecret: string;
    onComplete: () => void;
}

function PaymentForm({ onComplete }: { onComplete: () => void }) {
    const stripe = useStripe();
    const elements = useElements();

    const [message, setMessage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return to the current page (managed by frontend state if not redirected)
                // But Payment Element usually redirects unless redirect: 'if_required' 
                // For simplicity in this demo, let's redirect to success param
                return_url: window.location.origin + "/?success=true",
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "An unexpected error occurred.");
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === "succeeded") {
            setMessage("Payment succeeded!");
            // Wait a moment then close
            setTimeout(() => {
                onComplete();
            }, 1000);
        } else {
            // Processing or requires action
            setMessage("Payment processing...");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto p-4">
            <PaymentElement id="payment-element" options={{ layout: "tabs" }} />

            {message === "Payment succeeded!" ? (
                <div className="mt-4 flex flex-col items-center justify-center p-4 bg-green-500/10 border border-green-500/20 rounded-lg animate-in fade-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-green-500/20">
                        <CheckCheck className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-green-400 font-semibold">Payment Successful!</p>
                    <p className="text-zinc-400 text-xs mt-1">Adding credits to your account...</p>
                </div>
            ) : (
                message && <div id="payment-message" className="mt-4 text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center">{message}</div>
            )}

            {message !== "Payment succeeded!" && (
                <Button
                    disabled={isLoading || !stripe || !elements}
                    id="submit"
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                    {isLoading ? "Processing..." : "Pay Now"}
                </Button>
            )}
        </form>
    );
}

export function CheckoutForm({ clientSecret, onComplete }: CheckoutFormProps) {
    const options = React.useMemo(() => ({
        clientSecret,
        appearance: {
            theme: 'flat' as const, // Start fresh with flat theme
            variables: {
                fontFamily: 'Inter, system-ui, sans-serif',
                spacingUnit: '4px',
                borderRadius: '8px',

                // COLORS (Manually set Dark Mode)
                colorPrimary: '#6366f1', // Indigo 500
                colorBackground: '#18181b', // Main background zinc-900
                colorText: '#ffffff',
                colorDanger: '#df1b41',
                accessibleColorOnColorPrimary: '#ffffff',

                // FOCUS
                focusBoxShadow: 'none',
                focusBorder: '#6366f1',
            },
            rules: {
                '.Input': {
                    backgroundColor: '#27272a', // zinc-800
                    border: 'none',
                    boxShadow: 'none',
                    color: '#ffffff',
                    padding: '12px',
                },
                '.Input::placeholder': {
                    color: '#71717a', // zinc-500
                },
                '.Input:focus': {
                    border: '1px solid #6366f1',
                    boxShadow: 'none',
                },
                '.Label': {
                    color: '#e4e4e7',
                    fontWeight: '600',
                    marginBottom: '8px',
                },
                '.Tab': {
                    backgroundColor: '#27272a',
                    border: 'none',
                    color: '#ffffff',
                },
                '.Tab:hover': {
                    backgroundColor: '#3f3f46',
                },
                '.Tab--selected': {
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    border: '1px solid #6366f1',
                }
            }
        },
    }), [clientSecret]);

    return (
        <div className="w-full h-full bg-zinc-900 rounded-lg overflow-hidden flex flex-col items-center justify-center relative">
            <Elements key={JSON.stringify(options)} options={options} stripe={stripePromise}>
                <PaymentForm onComplete={onComplete} />
            </Elements>
            <div className="pb-6 text-zinc-500 text-xs font-medium flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity">
                Powered by <span className="font-bold text-zinc-400">Stripe</span>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Shield, CheckCircle2, Copy, AlertCircle, Code2, Terminal, Key } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface WebhookDocsProps {
    onBack: () => void;
}

export const WebhookDocs = ({ onBack }: WebhookDocsProps) => {
    const [activeLang, setActiveLang] = useState<'node' | 'python'>('node');
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Code snippet copied to clipboard');
    };

    const nodeCode = `const express = require('express');
const crypto = require('crypto');
const app = express();

// Secret from your API Settings
const WEBHOOK_SECRET = 'your_webhook_secret';

// Use express.json() to parse the body
app.use(express.json());

app.post('/webhook', (req, res) => {
    const signature = req.headers['x-interview-lens-signature'];
    const timestamp = req.headers['x-interview-lens-timestamp'];

    if (!signature || !timestamp) {
        return res.status(401).send('Missing headers');
    }

    // 1. Reconstruct the signature payload
    // Note: We use compact JSON (no spaces) for signing
    const payloadStr = JSON.stringify(req.body);
    const signaturePayload = \`\${timestamp}.\${payloadStr}\`;

    // 2. Verify HMAC-SHA256
    const expectedSignature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(signaturePayload)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.error('❌ Signature mismatch');
        return res.status(401).send('Invalid signature');
    }

    // 3. Process the analysis
    console.log('✅ Webhook received:', req.body.analysis.executiveSummary);
    res.json({ received: true });
});

app.listen(8001, () => console.log('Listening on port 8001'));`;

    const pythonCode = `from fastapi import FastAPI, Request, Header, HTTPException
import hmac
import hashlib
import json

app = FastAPI()

# Secret from your API Settings
WEBHOOK_SECRET = "your_webhook_secret"

@app.post("/webhook")
async def webhook_listener(
    request: Request,
    x_interview_lens_signature: str = Header(None),
    x_interview_lens_timestamp: str = Header(None)
):
    if not x_interview_lens_signature or not x_interview_lens_timestamp:
        raise HTTPException(status_code=401, detail="Missing headers")

    # 1. Get components
    payload = await request.json()
    
    # 2. Reconstruct signature payload (compact JSON)
    payload_str = json.dumps(payload, separators=(',', ':'))
    signature_payload = f"{x_interview_lens_timestamp}.{payload_str}"
    
    # 3. Verify HMAC-SHA256
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode(),
        signature_payload.encode(),
        hashlib.sha256
    ).hexdigest()

    if not hmac.compare_digest(expected_signature, x_interview_lens_signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    print(f"✅ Success! Analysis received for interview ID: {payload.get('interview_id')}")
    return {"status": "success"}`;

    return (
        <div className="h-screen overflow-y-auto bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="max-w-4xl mx-auto"
            >
                <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
                    onClick={onBack}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8 group"
                >
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                    Back to Settings
                </motion.button>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
                    className="flex items-center gap-4 mb-2"
                >
                    <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
                        <Shield className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Webhook Security</h1>
                        <p className="text-zinc-400">Verifying authenticity with X-Interview-Lens-Signature</p>
                    </div>
                </motion.div>

                <div className="mt-12 space-y-12">
                    {/* Introduction */}
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
                    >
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            How it works
                        </h2>
                        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 leading-relaxed text-zinc-300">
                            <p className="mb-4">
                                To ensure that webhooks received by your server are actually sent by us, we sign each request with a HMAC (Hash-based Message Authentication Code).
                            </p>
                            <p>
                                The signature is included in the <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-sm">X-Interview-Lens-Signature</code> header. It's generated using your individual Webhook Secret, the <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 font-mono text-sm">X-Interview-Lens-Timestamp</code>, and the request body.
                            </p>
                        </div>
                    </motion.section>

                    {/* Verification Steps */}
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
                    >
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            Verification Steps
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                {
                                    title: "1. Define Secret",
                                    desc: "Enter a strong, random string in your API Settings under Webhooks.",
                                    icon: Key
                                },
                                {
                                    title: "2. Hash Payload",
                                    desc: "The signature uses a combination of timestamp and body.",
                                    icon: Terminal
                                },
                                {
                                    title: "3. Verify",
                                    desc: "Use timing-safe comparison to check the signature header.",
                                    icon: CheckCircle2
                                }
                            ].map((step, i) => (
                                <motion.div
                                    key={i}
                                    whileHover={{ y: -4, backgroundColor: 'rgba(24, 24, 27, 0.4)' }}
                                    className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5 transition-colors"
                                >
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800/50 flex items-center justify-center text-zinc-400 mb-4">
                                        <step.icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-bold text-white mb-2">{step.title}</h3>
                                    <p className="text-sm text-zinc-500 leading-relaxed">{step.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                        <div className="mt-6 p-6 rounded-xl bg-indigo-500/5 border border-indigo-500/10 space-y-4">
                            <div className="flex items-start gap-2 text-indigo-300">
                                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                <p className="text-sm font-bold">How to create a secret:</p>
                            </div>
                            <p className="text-sm text-zinc-400 leading-relaxed">
                                <button
                                    onClick={onBack}
                                    className="text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-4 transition-colors"
                                >
                                    Navigate to Settings → API & Integrations
                                </button>
                                {" "}and enter a strong, random string in the "Webhook Secret" field and Save Changes. You can generate a secure 32-byte secret using your terminal:
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 px-1">Bash / Terminal</p>
                                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800 flex items-center justify-between group">
                                        <code className="text-xs text-indigo-400 font-mono">openssl rand -hex 32</code>
                                        <button
                                            onClick={() => copyToClipboard('openssl rand -hex 32')}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-all"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 px-1">Python</p>
                                    <div className="bg-black/40 rounded-lg p-3 border border-zinc-800 flex items-center justify-between group">
                                        <code className="text-xs text-emerald-400 font-mono">secrets.token_hex(32)</code>
                                        <button
                                            onClick={() => copyToClipboard('python3 -c "import secrets; print(secrets.token_hex(32))"')}
                                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-all"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.section>

                    {/* Code Examples */}
                    <motion.section
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.25, ease: "easeOut" }}
                        className="space-y-6"
                    >
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-amber-500 rounded-full" />
                                    Implementation Examples
                                </h2>
                                <p className="text-zinc-500 text-sm">Choose your language to view the verification snippet.</p>
                            </div>

                            {/* Tab Switcher */}
                            <div className="flex p-1 bg-zinc-900/80 border border-zinc-800 rounded-xl self-start md:self-auto relative overflow-hidden">
                                {['node', 'python'].map((lang) => (
                                    <button
                                        key={lang}
                                        onClick={() => setActiveLang(lang as any)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all relative z-10 ${activeLang === lang
                                            ? 'text-white'
                                            : 'text-zinc-500 hover:text-zinc-300'
                                            }`}
                                    >
                                        {activeLang === lang && (
                                            <motion.div
                                                layoutId="activeDocTab"
                                                className="absolute inset-0 bg-zinc-800 rounded-lg shadow-lg"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                                            />
                                        )}
                                        <span className="relative z-20">
                                            {lang === 'node' ? 'Node.js' : 'Python'}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 overflow-hidden shadow-2xl relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={activeLang}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                >
                                    <div className="bg-zinc-900/80 px-4 py-3 flex items-center justify-between border-b border-zinc-800">
                                        <div className="flex items-center gap-2">
                                            <Code2 className={`w-4 h-4 ${activeLang === 'node' ? 'text-emerald-400' : 'text-blue-400'}`} />
                                            <span className="text-sm font-medium text-zinc-300">
                                                {activeLang === 'node' ? 'Node.js (Express/Crypto)' : 'Python (Flask/FastAPI)'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => copyToClipboard(activeLang === 'node' ? nodeCode : pythonCode)}
                                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-white transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="p-0 text-sm">
                                        <SyntaxHighlighter
                                            language={activeLang === 'node' ? 'javascript' : 'python'}
                                            style={oneDark}
                                            useInlineStyles={true}
                                            customStyle={{
                                                margin: 0,
                                                padding: '1.5rem',
                                                background: '#09090b',
                                                fontSize: '0.875rem',
                                                lineHeight: '1.7',
                                                borderRadius: '0px'
                                            }}
                                            codeTagProps={{
                                                style: {
                                                    background: 'transparent',
                                                    fontFamily: 'inherit'
                                                }
                                            }}
                                        >
                                            {activeLang === 'node' ? nodeCode : pythonCode}
                                        </SyntaxHighlighter>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </motion.section>

                    {/* Security Note */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-6 flex gap-4"
                    >
                        <div className="flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-amber-500/60" />
                        </div>
                        <div>
                            <h4 className="text-amber-500/90 font-bold mb-1">Security Best Practice</h4>
                            <p className="text-zinc-500 text-sm leading-relaxed">
                                Always use a timing-safe equality comparison when verifying signatures to prevent side-channel timing attacks. Never compare the strings directly using standard equality operators.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        className="pt-8 flex justify-center border-t border-zinc-900"
                    >
                        <Button
                            onClick={onBack}
                            variant="outline"
                            className="bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white"
                        >
                            Return to API Settings
                        </Button>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

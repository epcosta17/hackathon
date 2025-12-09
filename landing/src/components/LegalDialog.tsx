import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "@radix-ui/react-scroll-area";

type LegalType = 'privacy' | 'terms' | 'security' | null;

interface LegalDialogProps {
    type: LegalType;
    isOpen: boolean;
    onClose: () => void;
}

const LEGAL_CONTENT: Record<string, { title: string; content: React.ReactNode }> = {
    terms: {
        title: "Terms of Service",
        content: (
            <div className="space-y-8 text-gray-300">
                <p className="text-gray-400">Last updated: December 9, 2024</p>
                <div className="prose prose-invert prose-sm max-w-none space-y-4">
                    <p>Please read these terms and conditions carefully before using Our Service.</p>
                </div>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">01</span>
                        Interpretation and Definitions
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">The words of which the initial letter is capitalized have meanings defined under the following conditions. The following definitions shall have the same meaning regardless of whether they appear in singular or in plural.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">02</span>
                        Acknowledgment
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">These are the Terms and Conditions governing the use of this Service and the agreement that operates between You and the Company. These Terms and Conditions set out the rights and obligations of all users regarding the use of the Service.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">03</span>
                        User Accounts
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">When You create an account with Us, You must provide Us information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of Your account on Our Service.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">04</span>
                        Content
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">Our Service allows You to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material. You are responsible for the Content that You post to the Service.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">05</span>
                        Termination
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">We may terminate or suspend Your Account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if You breach these Terms and Conditions.</p>
                </section>
            </div>
        )
    },
    privacy: {
        title: "Privacy Policy",
        content: (
            <div className="space-y-8 text-gray-300">
                <p className="text-gray-400">Last updated: December 9, 2024</p>
                <div className="prose prose-invert prose-sm max-w-none space-y-4">
                    <p>This Privacy Policy describes Our policies and procedures on the collection, use and disclosure of Your information when You use the Service and tells You about Your privacy rights and how the law protects You.</p>
                </div>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">01</span>
                        Collecting and Using Your Personal Data
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">While using Our Service, We may ask You to provide Us with certain personally identifiable information that can be used to contact or identify You. Personally identifiable information may include, but is not limited to: Email address, First name and last name, Usage Data.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">02</span>
                        Usage Data
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">Usage Data is collected automatically when using the Service. Usage Data may include information such as Your Device's Internet Protocol address (e.g. IP address), browser type, browser version, the pages of our Service that You visit, the time and date of Your visit, the time spent on those pages, unique device identifiers and other diagnostic data.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">03</span>
                        Security of Your Personal Data
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">The security of Your Personal Data is important to Us, but remember that no method of transmission over the Internet, or method of electronic storage is 100% secure. While We strive to use commercially acceptable means to protect Your Personal Data, We cannot guarantee its absolute security.</p>
                </section>
            </div>
        )
    },
    security: {
        title: "Security Policy",
        content: (
            <div className="space-y-8 text-gray-300">
                <p className="text-gray-400">Last updated: December 9, 2024</p>
                <div className="prose prose-invert prose-sm max-w-none space-y-4">
                    <p>At Interview Lens, we take the security of your data seriously. We employ industry-standard security measures to ensure your information is protected.</p>
                </div>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">01</span>
                        Data Encryption
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">All data transmitted between your browser and our servers is encrypted using TLS 1.2 or higher. Data at rest is encrypted using AES-256 encryption standards.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">02</span>
                        Access Control
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">We implement strict access controls and authentication mechanisms to ensure that only authorized personnel have access to our systems and your data. We use multi-factor authentication (MFA) for all administrative access.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">03</span>
                        Infrastructure Security
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">Our infrastructure is hosted on Google Cloud Platform (GCP), utilizing their world-class security features. We regularly update and patch our systems to protect against known vulnerabilities.</p>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xl text-white font-semibold flex items-center gap-3">
                        <span className="flex-none w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 text-xs">04</span>
                        Incident Response
                    </h3>
                    <p className="pl-9 text-gray-400 leading-relaxed">We have a dedicated incident response team and protocols in place to handle any security events. If a data breach is detected, we will notify affected users within 72 hours.</p>
                </section>
            </div>
        )
    }
};

export function LegalDialog({ type, isOpen, onClose }: LegalDialogProps) {
    if (!type) return null;
    const data = LEGAL_CONTENT[type];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl h-[85vh] p-0 bg-[#0F1115] border-white/10 overflow-hidden flex flex-col">
                {/* Background effects */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

                <DialogHeader className="p-8 pb-4 shrink-0 relative z-10">
                    <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
                        {data.title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    {data.content}
                </div>
            </DialogContent>
        </Dialog>
    );
}

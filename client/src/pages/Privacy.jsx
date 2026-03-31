export default function Privacy() {
    return (
        <section className="min-h-screen bg-[#0a0a0f] text-slate-300 px-6 py-16">
            <div className="max-w-4xl mx-auto">

                {/* Heading */}
                <h1 className="text-4xl font-bold text-white mb-6">
                    Privacy Policy
                </h1>

                <p className="text-slate-400 mb-10">
                    At EduCred, we prioritize your privacy and data security. This policy
                    outlines how we collect, use, and protect your information.
                </p>

                {/* Sections */}
                <div className="space-y-8">

                    {/* Data Collection */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            1. Data We Collect
                        </h2>
                        <p className="text-slate-400">
                            We collect only essential information such as your name, email,
                            and certificate details required for verification purposes.
                        </p>
                    </div>

                    {/* Usage */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            2. How We Use Your Data
                        </h2>
                        <p className="text-slate-400">
                            Your data is used strictly for certificate verification, platform
                            functionality, and communication regarding your requests.
                        </p>
                    </div>

                    {/* Blockchain */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            3. Blockchain Security
                        </h2>
                        <p className="text-slate-400">
                            Certificates are converted into secure cryptographic hashes and
                            stored on the blockchain. No original documents are publicly
                            exposed.
                        </p>
                    </div>

                    {/* Data Sharing */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            4. Data Sharing
                        </h2>
                        <p className="text-slate-400">
                            We do not sell, trade, or share your personal data with third
                            parties except when required for verification or legal compliance.
                        </p>
                    </div>

                    {/* Security */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            5. Data Protection
                        </h2>
                        <p className="text-slate-400">
                            We implement industry-grade security practices to safeguard your
                            data from unauthorized access, alteration, or misuse.
                        </p>
                    </div>

                    {/* Rights */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            6. Your Rights
                        </h2>
                        <p className="text-slate-400">
                            You have the right to access, update, or request deletion of your
                            personal data at any time.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="mt-12 border-t border-white/10 pt-6">
                    <p className="text-sm text-slate-500">
                        Last updated: {new Date().getFullYear()}
                    </p>
                </div>

            </div>
        </section>
    );
}
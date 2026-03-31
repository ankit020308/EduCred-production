export default function Terms() {
    return (
        <section className="min-h-screen bg-[#0a0a0f] text-slate-300 px-6 py-16">
            <div className="max-w-4xl mx-auto">

                {/* Heading */}
                <h1 className="text-4xl font-bold text-white mb-6">
                    Terms of Service
                </h1>

                <p className="text-slate-400 mb-10">
                    By using EduCred, you agree to the following terms and conditions.
                    Please read them carefully before using our platform.
                </p>

                {/* Sections */}
                <div className="space-y-8">

                    {/* Usage */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            1. Use of Service
                        </h2>
                        <p className="text-slate-400">
                            EduCred provides blockchain-based certificate verification.
                            You agree to use the platform only for lawful purposes and in
                            accordance with these terms.
                        </p>
                    </div>

                    {/* User Responsibility */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            2. User Responsibilities
                        </h2>
                        <p className="text-slate-400">
                            Users are solely responsible for the accuracy and authenticity of
                            the data they submit. EduCred is not liable for incorrect or
                            fraudulent information provided by users.
                        </p>
                    </div>

                    {/* Blockchain */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            3. Blockchain Records
                        </h2>
                        <p className="text-slate-400">
                            Certificate data is converted into cryptographic hashes and stored
                            on the blockchain. Once recorded, this data cannot be altered or
                            deleted.
                        </p>
                    </div>

                    {/* Limitation */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            4. Limitation of Liability
                        </h2>
                        <p className="text-slate-400">
                            EduCred is not responsible for any damages, losses, or issues
                            arising from the use or inability to use the platform, including
                            incorrect verification results.
                        </p>
                    </div>

                    {/* Termination */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            5. Termination
                        </h2>
                        <p className="text-slate-400">
                            We reserve the right to suspend or terminate access to the platform
                            if users violate these terms or misuse the service.
                        </p>
                    </div>

                    {/* Changes */}
                    <div>
                        <h2 className="text-xl font-semibold text-white mb-2">
                            6. Changes to Terms
                        </h2>
                        <p className="text-slate-400">
                            EduCred may update these terms at any time. Continued use of the
                            platform after changes implies acceptance of the revised terms.
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
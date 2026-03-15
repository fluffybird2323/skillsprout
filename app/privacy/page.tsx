export const metadata = {
  title: 'Privacy Policy | Manabu',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#121317] text-[#1a1a2e] dark:text-[#e8e8f0]">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <a href="/" className="text-sm font-bold text-blue-500 hover:underline mb-8 inline-block">&larr; Back to Manabu</a>

        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-12">Last updated: March 2026</p>

        <div className="space-y-10 text-[15px] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold mb-3">1. Information We Collect</h2>
            <p className="mb-3">We collect the following information when you use Manabu:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account information:</strong> email address, display name, and avatar (emoji)</li>
              <li><strong>OAuth data:</strong> if you sign in with Google or X, we receive your name and email (or a platform identifier) from those providers</li>
              <li><strong>Learning data:</strong> courses you generate, chapter completion status, XP, and streak</li>
              <li><strong>Usage data:</strong> general app activity to improve the service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and sync your learning progress across sessions</li>
              <li>To authenticate you and keep your account secure</li>
              <li>To personalise AI-generated course content</li>
              <li>To improve the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. Third-Party Services</h2>
            <p className="mb-3">Manabu uses the following third-party services that may process your data:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Groq:</strong> AI inference for course and lesson generation. Prompts include your selected topic but not personal account data.</li>
              <li><strong>Google OAuth:</strong> if you choose to sign in with Google</li>
              <li><strong>X (Twitter) OAuth:</strong> if you choose to sign in with X</li>
              <li><strong>DuckDuckGo / Wikipedia:</strong> used to fetch context for lesson generation; no personal data is sent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. Data Storage</h2>
            <p>Your account and progress data is stored in a secure SQLite database on our server. Lesson content is cached locally in your browser&apos;s IndexedDB storage and is not transmitted to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. Cookies and Local Storage</h2>
            <p>We use short-lived HTTP cookies only during the OAuth login flow (to store PKCE state). After login, your session is maintained via a JWT stored in your browser&apos;s localStorage. We do not use tracking or advertising cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. Data Retention</h2>
            <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us through the app.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. Security</h2>
            <p>Passwords are hashed using bcrypt and never stored in plaintext. JWTs are signed and have a 7-day expiry with automatic refresh. We take reasonable measures to protect your data but cannot guarantee absolute security.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. Children&apos;s Privacy</h2>
            <p>Manabu is not directed at children under 13. We do not knowingly collect personal information from children under 13.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have rights to access, correct, or delete your personal data. Contact us through the app to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">10. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will post the updated policy on this page with a revised date.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">11. Contact</h2>
            <p>For privacy-related questions or data requests, please contact us through the Manabu app.</p>
          </section>

        </div>
      </div>
    </div>
  );
}

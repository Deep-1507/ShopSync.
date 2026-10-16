import Link from "next/link";

const enterpriseFeatures = [
  { icon: "▦", title: "Store management", text: "Manage your business from one dashboard." },
  { icon: "◇", title: "Products & inventory", text: "Keep your catalogue organized and updated." },
  { icon: "▤", title: "Order management", text: "Review orders and simplify daily operations." },
  { icon: "↗", title: "Business growth", text: "Build stronger connections with customers." },
];

const userFeatures = [
  { icon: "⌖", title: "Discover stores", text: "Find businesses and explore their catalogues." },
  { icon: "✦", title: "Explore products", text: "Browse products and discover new favourites." },
  { icon: "◇", title: "Track your orders", text: "Keep up with your shopping journey." },
  { icon: "♡", title: "Shop your way", text: "Enjoy a convenient, connected experience." },
];

const benefits = [
  {
    number: "01",
    icon: "◎",
    title: "One connected platform",
    text: "Bring business operations and customer shopping together in one place.",
  },
  {
    number: "02",
    icon: "↯",
    title: "Simple by design",
    text: "Clear workflows help you find what you need and get things done.",
  },
  {
    number: "03",
    icon: "♧",
    title: "Made for both sides",
    text: "Dedicated experiences for enterprises and everyday shoppers.",
  },
];

const faqs = [
  {
    question: "What is ShopSync?",
    answer:
      "ShopSync connects businesses and shoppers through dedicated portals for managing stores, discovering products, and handling orders.",
  },
  {
    question: "Which portal should I choose?",
    answer:
      "Choose Enterprise Portal if you manage a business, products, or orders. Choose User Portal if you want to discover stores, browse products, and place orders.",
  },
  {
    question: "Can I access my portal later?",
    answer:
      "Yes. Use the relevant portal to sign in whenever you want to access your account.",
  },
  {
    question: "Where can I get help?",
    answer:
      "Use the Contact Us section below to reach the ShopSync team. Replace the sample contact details with your verified support information.",
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="inline-flex rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
        {eyebrow}
      </span>
      <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function PortalCard({ type, features, href }) {
  const enterprise = type === "enterprise";

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-[2rem] border bg-white p-6 shadow-[0_12px_55px_rgba(30,64,175,0.07)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_70px_rgba(37,99,235,0.16)] sm:p-8 ${enterprise
        ? "border-green-200 hover:border-green-400"
        : "border-slate-200 hover:border-blue-300"
        }`}
    >
      <div className={`pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full blur-3xl transition-all duration-700 ${enterprise
          ? "bg-emerald-100/70 group-hover:bg-emerald-200/80"
          : "bg-blue-100/70 group-hover:bg-blue-200/80"
        }`} />

      <div className="relative flex items-start justify-between gap-4">
        <div
          className={`flex h-16 w-16 items-center justify-center rounded-2xl text-3xl text-white shadow-lg transition duration-500 group-hover:rotate-6 group-hover:scale-110 ${enterprise
            ? "bg-gradient-to-br from-green-400 to-green-700 shadow-green-200"
            : "bg-gradient-to-br from-blue-400 to-blue-700 shadow-blue-200"
            }`}
        >
          {enterprise ? "▤" : "♙"}
        </div>

        <span
          className={`rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] ${enterprise
            ? "border-emerald-100 bg-emerald-50 text-emerald-700"
            : "border-blue-100 bg-blue-50 text-blue-700"
            }`}
        >
          {enterprise ? "Business workspace" : "Shopping workspace"}
        </span>
      </div>

      <h3 id="portal" className="relative mt-7 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
        {enterprise ? "Enterprise Portal" : "User Portal"}
      </h3>

      <p className="relative mt-3 min-h-[72px] text-sm leading-6 text-slate-500 sm:text-base">
        {enterprise
          ? "Your business, in sync. Organize products, manage inventory, and handle orders in one dedicated workspace."
          : "Your shopping, simplified. Discover businesses, explore products, and manage your shopping journey."}
      </p>

      <div className="relative my-7 h-px bg-gradient-to-r from-blue-200 via-slate-100 to-transparent" />

      <ul className="relative flex-1 space-y-5">
        {features.map((feature, index) => (
          <li
            key={feature.title}
            className="flex gap-3 transition-transform duration-300 group-hover:translate-x-1"
            style={{ transitionDelay: `${index * 40}ms` }}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl transition-colors ${enterprise
                ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
                : "bg-blue-50 text-blue-600 group-hover:bg-blue-100"
                }`}
            >
              {feature.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-slate-800">{feature.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                {feature.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`relative mt-8 inline-flex items-center justify-center gap-3 rounded-2xl px-5 py-4 text-sm font-bold !text-white shadow-lg transition-all duration-300 hover:gap-5 focus:outline-none focus:ring-4 focus:ring-blue-200 ${enterprise
          ? "bg-green-600 shadow-green-200/70 hover:bg-green-700"
          : "bg-blue-600 shadow-green-200 hover:bg-blue-700"
          }`}
      >
        {enterprise ? "Continue as Enterprise" : "Continue as User"}
        <span className="text-xl transition-transform group-hover:translate-x-1">→</span>
      </Link>
    </article>
  );
}

export default function HomePage() {
  return (
    <main className="scroll-smooth isolate min-h-screen overflow-hidden bg-white text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-48 -top-48 h-[500px] w-[500px] animate-pulse rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute -right-48 top-40 h-[520px] w-[520px] animate-pulse rounded-full bg-sky-100/60 blur-3xl [animation-delay:1.5s]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-blue-50 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(37,99,235,0.08)_1px,transparent_0)] [background-size:34px_34px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />
      </div>

      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-blue-100/70 bg-white/80 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="group flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-2xl text-white shadow-lg shadow-blue-200 transition duration-300 group-hover:rotate-6">
              ✦
            </span>
            <span className="text-2xl font-black tracking-tight">
              Shop<span className="text-blue-600">Sync</span>
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-blue-600">Features</a>
            <a href="#how-it-works" className="transition hover:text-blue-600">How it works</a>
            <a href="#faq" className="transition hover:text-blue-600">FAQs</a>
            <a href="#contact" className="transition hover:text-blue-600">Contact</a>
          </div>

          <a
            href="#portals"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold !text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 sm:px-5"
          >
            Get Started <span className="ml-1">→</span>
          </a>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-24 lg:px-12 lg:pt-28">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex animate-[fadeInUp_0.7s_ease-out_both] items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm backdrop-blur">
              <span className="animate-pulse">✦</span>
              One platform. Two experiences.
            </div>

            <h1 className="mt-8 animate-[fadeInUp_0.8s_ease-out_both] text-4xl font-black leading-[1.08] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Bringing business
              <br />
              and shopping
              <span className="mt-2 block bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 bg-clip-text text-transparent">
                together in sync.
              </span>
            </h1>

            <p className="mx-auto mt-7 max-w-2xl animate-[fadeInUp_0.9s_ease-out_both] text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
              Meet a simpler way to connect businesses and shoppers.
              Manage your store, discover products, and make every step
              of your shopping journey feel effortless.
            </p>

            <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="#portals"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-7 py-4 text-sm font-bold !text-white shadow-xl shadow-blue-200 transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-blue-300"
              >
                Explore the portals
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white/80 px-7 py-4 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:text-blue-700"
              >
                Discover ShopSync
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-slate-500 sm:gap-6 sm:text-sm">
              <span className="flex items-center gap-2">
                <span className="text-emerald-500">●</span> Business tools
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" />
              <span className="flex items-center gap-2">
                <span className="text-blue-500">●</span> Product discovery
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" />
              <span className="flex items-center gap-2">
                <span className="text-sky-500">●</span> Order management
              </span>
            </div>
          </div>

          {/* Decorative preview */}
          <div className="relative mx-auto mt-16 max-w-5xl animate-[fadeInUp_1s_ease-out_both] sm:mt-20">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-blue-100/70 via-white to-sky-100/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-blue-100 bg-white/90 p-5 shadow-[0_25px_100px_rgba(37,99,235,0.13)] backdrop-blur-xl sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-xl text-white">✦</span>
                  <div>
                    <p className="font-extrabold text-slate-900">The ShopSync experience</p>
                    <p className="mt-1 text-xs text-slate-500">A connected place for business and shopping</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  Two dedicated portals
                </span>
              </div>

              <div className="grid gap-4 pt-5 sm:grid-cols-3">
                <div className="rounded-2xl bg-blue-50/80 p-5 transition duration-300 hover:-translate-y-1 hover:bg-blue-100/80">
                  <div className="text-2xl text-blue-600">▤</div>
                  <p className="mt-4 text-sm font-extrabold">Business workspace</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Products, inventory, and orders together.</p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div className="h-full w-4/5 rounded-full bg-blue-600" />
                  </div>
                </div>

                <div className="rounded-2xl bg-sky-50/80 p-5 transition duration-300 hover:-translate-y-1 hover:bg-sky-100/80">
                  <div className="text-2xl text-sky-600">⌕</div>
                  <p className="mt-4 text-sm font-extrabold">Product discovery</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Explore stores and find products to love.</p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-sky-100">
                    <div className="h-full w-3/5 rounded-full bg-sky-500" />
                  </div>
                </div>

                <div className="rounded-2xl bg-indigo-50/80 p-5 transition duration-300 hover:-translate-y-1 hover:bg-indigo-100/80">
                  <div className="text-2xl text-indigo-600">◇</div>
                  <p className="mt-4 text-sm font-extrabold">Order journey</p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Keep business and customer workflows connected.</p>
                  <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-indigo-100">
                    <div className="h-full w-2/3 rounded-full bg-indigo-600" />
                  </div>
                </div>
              </div>
              <p className="mt-5 text-center text-[11px] text-slate-400">
                Illustrative platform overview — features depend on your configured account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Portal cards */}
      <section id="portals" className="scroll-mt-24 border-y border-blue-100/70 bg-white/70 px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Choose your experience"
            title="Your journey starts here."
            description="Choose the portal built around your needs. Each experience has its own dedicated sign-in and workspace."
          />

          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2 md:gap-8">
            <PortalCard
              type="enterprise"
              features={enterpriseFeatures}
              href="/enterprise/auth"
            />
            <PortalCard
              type="user"
              features={userFeatures}
              href="/user/auth"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="features" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Why ShopSync"
            title="Less friction. More connection."
            description="A focused experience that helps businesses organize their work and shoppers navigate their purchases."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.number}
                className="group rounded-3xl border border-slate-200 bg-white p-7 transition-all duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60 sm:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-2xl text-blue-600 transition duration-300 group-hover:rotate-6 group-hover:bg-blue-600 group-hover:text-white">
                    {benefit.icon}
                  </span>
                  <span className="text-sm font-black text-blue-200">{benefit.number}</span>
                </div>
                <h3 className="mt-7 text-xl font-extrabold text-slate-900">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-500">{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 bg-gradient-to-b from-blue-50/80 to-white px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Getting started"
            title="Three simple steps."
            description="Start with the portal that matches what you want to do."
          />

          <div className="mx-auto mt-14 grid max-w-5xl gap-8 md:grid-cols-3">
            {[
              { n: "01", title: "Choose a portal", text: "Select Enterprise for business tools or User for shopping." },
              { n: "02", title: "Sign in or register", text: "Use the portal's authentication page to access your account." },
              { n: "03", title: "Get things moving", text: "Manage your store or start exploring products and orders." },
            ].map((step, index) => (
              <div key={step.n} className="relative text-center">
                {index !== 2 && (
                  <div className="absolute left-[60%] top-7 hidden h-px w-[80%] border-t-2 border-dashed border-blue-200 md:block" />
                )}
                <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-lg font-black text-white shadow-lg shadow-blue-200 transition duration-300 hover:rotate-6 hover:scale-110">
                  {step.n}
                </div>
                <h3 className="mt-6 text-lg font-extrabold text-slate-900">{step.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-slate-500">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <SectionHeading
            eyebrow="Need to know"
            title="Frequently asked questions."
            description="A few quick answers to help you get started with ShopSync."
          />

          <div className="mt-10 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-300 open:border-blue-200 open:bg-blue-50/40 sm:p-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-800 marker:hidden">
                  {faq.question}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-transform duration-300 group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="max-w-3xl pt-4 text-sm leading-7 text-slate-500">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="scroll-mt-24 px-5 pb-20 sm:px-8 sm:pb-24 lg:px-12">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-blue-600 px-6 py-12 text-white shadow-2xl shadow-blue-200 sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border-[45px] border-white/10" />
          <div className="pointer-events-none absolute -bottom-40 left-1/3 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl" />

          <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">We're here to help</span>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                Let’s stay connected.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
                Have a question about ShopSync or need help choosing a portal?
                Reach out through your configured support channel.
              </p>
              <a
                href="mailto:YOUR_SUPPORT_EMAIL"
                className="mt-7 inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3.5 text-sm font-bold !text-blue-700 transition hover:-translate-y-1 hover:bg-blue-50"
              >
                Contact ShopSync <span>↗</span>
              </a>

            </div>

            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md sm:p-7">
              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">✉</span>
                <div>
                  <p className="font-bold">Email support</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    Send us your questions using your configured support email.
                  </p>
                </div>
              </div>

              <div className="my-6 h-px bg-white/20" />

              <div className="flex gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-xl">⌖</span>
                <div>
                  <p className="font-bold">Our location</p>
                  <p className="mt-1 text-sm leading-6 text-blue-100">
                    Add your official office address here when it is available.
                  </p>
                  <p className="mt-2 text-xs text-blue-200">
                    No office location has been configured on this page.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-5 pb-8 pt-12 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 text-xl font-black">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">✦</span>
              Shop<span className="-ml-2 text-blue-600">Sync</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
              Connecting businesses and shoppers through a simpler digital experience.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Explore</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p><a href="#features" className="transition hover:text-blue-600">Features</a></p>
              <p><a href="#how-it-works" className="transition hover:text-blue-600">How it works</a></p>
              <p><a href="#faq" className="transition hover:text-blue-600">FAQs</a></p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Portals</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p><Link href="/enterprise/auth" className="transition hover:text-blue-600">Enterprise sign in</Link></p>
              <p><Link href="/user/auth" className="transition hover:text-blue-600">User sign in</Link></p>
              <p><a href="#contact" className="transition hover:text-blue-600">Contact us</a></p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Legal & support</h3>
            <div className="mt-4 space-y-3 text-sm text-slate-500">
              <p><Link href="/privacy-policy" className="transition hover:text-blue-600">Privacy policy</Link></p>
              <p><Link href="/terms" className="transition hover:text-blue-600">Terms of service</Link></p>
              <p><a href="#contact" className="transition hover:text-blue-600">Get support</a></p>
            </div>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-3 border-t border-slate-100 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 ShopSync. All rights reserved.</p>
          <p>Designed to bring business and shopping together.</p>
        </div>
      </footer>
    </main>
  );
}
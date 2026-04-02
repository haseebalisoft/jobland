# ⚡ HiredLogics – AI-Powered Job Search & Interview Landing Service

> **Land your next job faster with guaranteed interviews.**  
> We build your ATS CV, apply to jobs using AI, and help you secure real interviews.

---

## 🌐 Live Demo

Coming soon — deploy via Vercel / Netlify.

---

## 📌 About the Project

**HiredLogics** is a premium SaaS landing page for a job automation and interview-landing service. It is designed to convert visitors into leads and paid users by clearly communicating value, trust, and ease of use.

### Who It's For
- Fresh graduates entering the job market
- Mid-level professionals looking to switch roles
- International applicants targeting remote or onsite positions
- Anyone tired of spending hours manually applying to jobs

### What the Service Does
- ✅ Builds professional, ATS-optimized CVs
- ✅ Auto-applies to 20–50 jobs per day using AI
- ✅ Tracks all applications in a real-time dashboard
- ✅ Provides interview preparation & coaching
- ✅ Offers Pay Per Interview ($100) or Pro Subscription ($30/month)

---

## 🎨 Design System

| Token | Value |
|---|---|
| Primary Color | `#4F46E5` (Indigo) |
| Accent Color | `#22C55E` (Green) |
| Dark Text | `#0F172A` |
| Soft Gray | `#6B7280` |
| Border Radius | `16px` |
| Typography | Inter (Google Fonts) |
| Design Inspiration | Linear, Notion |

- Glassmorphism hero section  
- Soft gradients and subtle shadows  
- 8px grid spacing system  
- Fully responsive (desktop, tablet, mobile)

---

## 🧱 Page Sections

| # | Section | Description |
|---|---|---|
| 1 | **Navbar** | Sticky, blur-on-scroll, mobile hamburger menu |
| 2 | **Hero** | Headline + live dashboard preview UI |
| 3 | **Intake Form** | 3-step lead capture form with progress bar |
| 4 | **How It Works** | 3-step process cards (CV → Apply → Interview) |
| 5 | **Services** | 5 service cards with icons & descriptions |
| 6 | **Pricing** | Pay Per Interview vs Pro Subscription |
| 7 | **Why HiredLogics** | Stats row + 6 benefit bullets |
| 8 | **Testimonials** | 4 success story cards with star ratings |
| 9 | **FAQ** | Accordion with 7 questions |
| 10 | **Final CTA** | Gradient card with dual CTA buttons |
| 11 | **Footer** | Logo, links, contact info, social icons |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React 18** | Component-based UI |
| **Vite** | Fast development build tool |
| **Vanilla CSS** | Custom design system (no Tailwind) |
| **Lucide React** | Icon library |
| **Inter (Google Fonts)** | Typography |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/haseebalisoft/jobland.git
cd jobland

# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Start frontend (Vite)
npm run dev

# In another terminal, start backend (Express)
cd backend
npm start
```

The frontend will be available at **http://localhost:5173** and the backend at **http://localhost:5000**.

### Environment Variables

Create the following file (it is already in `.gitignore`):

- `backend/.env` for **backend (Express)**:

  ```env
  EMAIL_USER=your_smtp_email_here
  EMAIL_PASS=your_smtp_app_password_here
  PORT=5000
  ```

#### Stripe (checkout)

Pack plans (**starter**, **success**, **elite**) use **one-time** Stripe Prices with Checkout `mode: payment`. In the [Stripe Dashboard](https://dashboard.stripe.com), create a **one-time** Price for each product and set:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PROFESSIONAL_RESUME_ID=price_...
STRIPE_PRICE_STARTER_ID=price_...
STRIPE_PRICE_SUCCESS_ID=price_...
STRIPE_PRICE_ELITE_ID=price_...
```

Recurring monthly Price IDs **cannot** be used for pack checkout. Optional aliases: `STRIPE_PRICE_STARTER_PACK_ID`, `STRIPE_PRICE_SUCCESS_PACK_ID`, `STRIPE_PRICE_ELITE_PACK_ID`.

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

---

## 📁 Project Structure

```
jobland/
├── public/                    # Static assets
├── src/
│   ├── components/
│   │   ├── Navbar.jsx         # Sticky navigation with mobile menu
│   │   ├── Navbar.css
│   │   ├── Hero.jsx           # Hero section with dashboard preview
│   │   ├── Hero.css
│   │   ├── IntakeForm.jsx     # 3-step multi-step lead capture form
│   │   ├── IntakeForm.css
│   │   ├── HowItWorks.jsx     # 3-step process section
│   │   ├── HowItWorks.css
│   │   ├── Services.jsx       # Services grid
│   │   ├── Services.css
│   │   ├── Pricing.jsx        # Pricing plans
│   │   ├── Pricing.css
│   │   ├── WhyJobLand.jsx     # Stats + benefits (Legacy Filename: WhyJobLand.jsx)
│   │   ├── WhyJobLand.css
│   │   ├── Testimonials.jsx   # Success stories
│   │   ├── Testimonials.css
│   │   ├── FAQ.jsx            # Accordion FAQ
│   │   ├── FAQ.css
│   │   ├── CTA.jsx            # Final call-to-action
│   │   ├── CTA.css
│   │   ├── Footer.jsx         # Site footer
│   │   └── Footer.css
│   ├── App.jsx                # Root component
│   ├── main.jsx               # Entry point
│   └── index.css              # Global design system
├── index.html                 # HTML entry with SEO meta tags
├── vite.config.js
├── package.json
└── README.md
```

---

## 💰 Pricing Plans

### Pay Per Interview — $100 / interview
- ATS CV creation included
- Unlimited AI job applications
- Pay only when you get results

### Pro Subscription — $30 / month ⭐ Most Popular
- Everything in Pay Per Interview
- Unlimited job applications (20–50/day)
- AI auto-apply 24/7
- Real-time dashboard tracking
- Priority support
- Interview prep coaching
- Cancel anytime

---

## 📊 Key Stats

- 🏆 **2,500+** interviews secured
- ⭐ **4.9/5** client satisfaction rating
- 🌍 **50+** job platforms covered
- ⚡ **14 days** average time to first interview

---

## 🤝 Contact

- 📧 Email: [hello@hiredlogics.com](mailto:hello@hiredlogics.com)
- 📞 Phone: +1 (234) 567-890
- 🌐 Remote-first · Serving worldwide

---

## 📄 License

This project is proprietary. All rights reserved © 2026 HiredLogics.

---

*Built with ❤️ for job seekers worldwide.*
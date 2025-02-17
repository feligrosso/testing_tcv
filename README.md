# TuConsultor V2A

A Next.js application that helps generate consultant-quality slides using AI assistance. Built with Next.js 14 App Router, React, TypeScript, and Tailwind CSS.

## Features

- 🎨 Professional slide generation with V2A consulting standards
- 🤖 AI-powered content generation and refinement
- 📊 Smart data visualization suggestions
- 🔒 Secure authentication with Firebase
- 🎯 "So What?" analysis for impactful insights
- 🎭 Multiple theme options (Standard, Minimalist, Modern)

## Prerequisites

Before you begin, ensure you have:
- Node.js 18.17 or later
- npm or yarn
- Git

## Getting Started

1. Clone the repository:
```bash
git clone [your-repo-url]
cd [your-repo-name]
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Set up environment variables:
- Copy `.env.example` to `.env.local`
- Fill in your API keys and configuration values

4. Run the development server:
```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

The following environment variables are required:

```env
# OpenAI (optional)
OPENAI_API_KEY=

# Firebase (required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# Anthropic (optional)
ANTHROPIC_API_KEY=

# Replicate (required for DeepSeek)
REPLICATE_API_TOKEN=
```

## Tech Stack

- [Next.js 14](https://nextjs.org/)
- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Firebase](https://firebase.google.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Acknowledgments

- V2A Consulting for design guidelines and consulting expertise
- [Vercel](https://vercel.com) for the deployment platform
- [OpenAI](https://openai.com) for AI capabilities
- [Replicate](https://replicate.com) for hosting the DeepSeek model

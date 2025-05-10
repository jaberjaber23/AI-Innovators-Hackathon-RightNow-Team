# Smart Financial Advisor - Jordan Retail Transaction Analyzer

A modern web application built with Next.js and Tailwind CSS for analyzing retail transaction data from Jordan malls.

## Features

- 📈 Retail Transaction Analysis
- 💬 Natural Language Financial Queries
- 🔍 Transaction Pattern Detection
- 📋 Report Generation
- 📧 Email Report Capabilities
- 📊 Data-Driven Financial Insights

## Technology Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **API**: Next.js API Routes
- **AI Integration**: OpenAI API
- **UI Components**: Custom Tailwind components
- **Styling**: Tailwind CSS with custom configuration

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- OpenAI API key

### Environment Setup

Create a `.env.local` file in the root directory with the following variables:

```
OPENAI_API_KEY=your_openai_api_key
MODEL=gpt-4.1-nano
```

### Installation

1. Clone the repository
2. Install dependencies:

```bash
cd financial-advisor-nextjs
npm install
# or
yarn install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
financial-advisor-nextjs/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts    # API endpoint for chat
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Main page
│   ├── components/             # React components
│   ├── lib/                    # Utility functions
│   └── styles/
│       └── globals.css         # Global styles with Tailwind
├── public/
│   └── images/                 # Static images
├── tailwind.config.js          # Tailwind configuration
├── postcss.config.js           # PostCSS configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies and scripts
```

## Development

### Adding New Features

1. Create new components in the `components` directory
2. Add new API endpoints in the `app/api` directory
3. Update styles in the `globals.css` file or create new CSS modules

### Customizing the UI

The application uses Tailwind CSS for styling. You can customize the look and feel by:

1. Modifying the `tailwind.config.js` file to change colors, fonts, etc.
2. Adding new utility classes in the `globals.css` file
3. Creating new components with custom styles

## Deployment

This application can be deployed on Vercel, Netlify, or any other Next.js-compatible hosting platform.

### Vercel Deployment

```bash
npm install -g vercel
vercel
```

## License

This project is licensed under the MIT License. 
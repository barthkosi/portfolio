# Portfolio

This is a modern, high-performance portfolio website built using Next.js and Tailwind CSS 4. The project is designed to showcase creative work, writing, and explorations through a refined and interactive user experience.

## Overview

The portfolio serves as a central hub for professional projects and creative experiments. It leverages the Next.js App Router for efficient navigation and Framer Motion for sophisticated animations. The content is managed through a combination of local JSON data and Markdown files, allowing for a structured yet flexible approach to displaying projects and technical writing.

## Core Features

- Smooth Scrolling: Integrated with Lenis to provide a fluid scrolling experience across all devices.
- Dynamic Masonry Layouts: Utilizes Masonic for responsive and efficient grid layouts in the explorations and work sections.
- Markdown Integration: Content for work, explorations and writing is authored in Markdown and rendered dynamically with support for custom components.
- Advanced Animations: Powered by Framer Motion, featuring scroll-triggered reveals, smooth transitions, and interactive interface elements.
- Design System: Built on Tailwind CSS 4, utilizing a modern utility-first approach with custom theme extensions and tokens.
- Optimized Performance: Leverages Next.js features such as Image optimization, font preloading, and server-side rendering for fast load times and SEO.

## Technical Stack

- Framework: Next.js 15+ (App Router)
- Language: TypeScript
- Styling: Tailwind CSS 4
- Animation: Framer Motion
- Content Rendering: React Markdown, Gray Matter
- Layouts: Masonic, React Fast Marquee
- Scroll Physics: Lenis
- Theme Management: Next Themes

## Project Structure

The codebase is organized to separate concerns between application logic, UI components, and static content:

- src/app: Contains the routing logic, global layouts, and page definitions.
- src/components: Divided into interface (reusable UI elements like buttons and modals) and pages (larger sections like project content and hero headers).
- src/content: Stores Markdown files for Work, Writing, and Explorations.
- src/data: Centralized JSON files for navigation links, social profiles, and static collections.
- src/hooks: Custom React hooks for shared logic such as scroll tracking and theme interactions.
- src/lib: Utility functions and shared configuration for external libraries.

## Getting Started

To run the project locally, follow these steps:

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Deployment

The project is optimized for deployment on the Vercel platform, which provides native support for Next.js features and automated CI/CD pipelines.

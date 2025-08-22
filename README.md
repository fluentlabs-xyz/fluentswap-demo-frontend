# Fluentswap Demo Frontend

A React-based frontend application for the Fluentswap decentralized exchange demo.

## Prerequisites

- Node.js (version 18 or higher)
- npm or yarn package manager

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fluentswap-demo-frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:5173` to view the application.

## Available Scripts

- `npm run dev` - Start the development server with hot reload
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint to check code quality

## Project Structure

- `src/components/` - React components organized by feature
- `src/pages/` - Page components and routing
- `src/services/` - API and external service integrations
- `src/store/` - State management
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions and helpers

## Technologies Used

- React 18 with TypeScript
- Vite for build tooling and development server
- Tailwind CSS for styling
- ESLint for code quality
- Web3 integration for blockchain functionality

## Development

The project uses Vite for fast development with Hot Module Replacement (HMR). Any changes you make to the source code will automatically refresh in the browser.

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be in the `dist/` directory, ready for deployment.

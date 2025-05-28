# CeeloSol

A Cee-Lo dice game on Solana blockchain.

## Game Rules

CeeloSol is a dice game with the following rules:
- 4-5-6 OR triples → win
- 1-2-3 → lose
- pair+odd → point = odd
- else → reroll

## Features

- Browser-based wallet generation
- Phantom wallet import
- 3D dice animation
- Provably fair gameplay using commit-reveal scheme

## Project Structure

- Frontend: React application
- Backend: Express server for game logic

## How to Run

### Frontend

```bash
# Install dependencies
npm install

# Start the development server
npm start
```

The frontend will be available at http://localhost:3000

### Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The backend API will be available at http://localhost:3001

## API Endpoints

- POST /api/start - Start a new game
- POST /api/reveal - Reveal the game result

## Technologies Used

- React
- TypeScript
- Express
- Solana Web3.js
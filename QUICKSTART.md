# Quick Start Guide: AI Financial Advice Processor

## What's Been Built

A fully local AI-powered financial advice processing system with:
- **Python FastAPI Backend** (runs on localhost:8000)
- **10-Step AI Analysis Pipeline** using OpenAI
- **Local JSON Storage** (no database needed)
- **React UI Integration** (new AI Analysis tab)

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd advice_processor
pip install -r requirements.txt
```

### 2. Configure OpenAI API Key

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=sk-your-actual-key-here
```

### 3. Start the Backend Server

```bash
python main.py
```

Server will run on `http://localhost:8000`

### 4. Start the React Frontend

In a new terminal:
```bash
npm run dev
```

## How to Use

1. **Start Both Servers** (Python backend + React frontend)
2. **Open the UI** in your browser (usually `http://localhost:5173`)
3. **Select a Client** from the left sidebar (sample client "001" is pre-loaded)
4. **Click the "AI Analysis" tab** in the right panel
5. **Click "Generate AI Analysis"** button
6. **Wait ~30 seconds** for AI processing
7. **View Results** across multiple tabs (Overview, Retirement, Cashflow, Strategies, Risk)

## What the AI Does

The system processes client data through 10 AI steps:
1. Restructures all data for analysis
2. Extracts client names
3. Analyzes retirement goals (priority & timeline)
4. Analyzes cashflow management
5. Analyzes debt situation
6. Identifies coverage gaps
7. Extracts advisor strategies
8. Identifies client objectives
9. Extracts client-specific recommendations
10. Determines investment risk profile

## Data Storage

All data is stored locally in JSON files:
- **Client Data**: `data/clients/client_001.json`
- **Analysis Results**: `data/analysis/client_001_analysis.json`

## Testing

A sample client is included. To test:

```bash
# From advice_processor directory
curl -X POST http://localhost:8000/analyze/001
```

Then check the UI or:
```bash
curl http://localhost:8000/analysis/001
```

## Troubleshooting

**Backend won't start:**
- Check Python dependencies are installed
- Verify `.env` file exists with valid OpenAI key

**UI can't connect to backend:**
- Ensure backend is running on port 8000
- Check browser console for CORS errors

**Analysis fails:**
- Check OpenAI API key is valid
- Check you have API credits
- View backend logs for detailed error messages

## Next Steps

To add more clients:
1. Create a new JSON file in `data/clients/` (e.g., `client_002.json`)
2. Follow the structure of `client_001.json`
3. The client will appear in the UI automatically




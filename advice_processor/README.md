# Financial Advice Processor

A local AI-powered service for processing financial advisor input and generating comprehensive client analysis.

## Features

- **10-Step AI Analysis Pipeline**: Processes client data through retirement, cashflow, debt, and risk analysis
- **Local Storage**: All data stored in JSON files (no external database required)
- **FastAPI Backend**: RESTful API for integration with frontend
- **Comprehensive Logging**: Detailed logging of all processing steps

## Setup

### 1. Install Dependencies

```bash
cd advice_processor
pip install -r requirements.txt
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your OpenAI API key:

```bash
cp .env.example .env
```

Edit `.env`:
```
OPENAI_API_KEY=your_actual_openai_key_here
OPENAI_MODEL=gpt-4o
LOG_LEVEL=INFO
DATA_DIR=../data
```

### 3. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

## API Endpoints

### Health Check
```
GET /health
```

### List Clients
```
GET /clients
```

### Get Client Data
```
GET /clients/{client_id}
```

### Create/Update Client
```
POST /clients
Content-Type: application/json

{client data JSON}
```

### Run AI Analysis
```
POST /analyze/{client_id}
```

This endpoint processes the client through all 10 AI steps and stores results locally.

### Get Analysis Results
```
GET /analysis/{client_id}
```

### Check Status
```
GET /status/{client_id}
```

## Data Structure

```
data/
├── clients/
│   └── client_001.json          # Client input data
└── analysis/
    └── client_001_analysis.json # AI-generated analysis
```

## AI Processing Steps

1. **Comprehensive Data Restructuring**: Formats all client data for downstream processing
2. **Extract Client Names**: Creates formatted name summary
3. **Analyze Retirement Goals**: Evaluates retirement priority and timeline
4. **Analyze Cashflow**: Assesses income/expense management
5. **Analyze Debt**: Reviews debt situation and repayment priority
6. **Identify Coverage Gaps**: Identifies areas needing attention
7. **Extract Strategies**: Parses advisor strategies
8. **Extract Objectives**: Identifies client goals
9. **Extract Recommendations**: Client-specific recommendations
10. **Analyze Risk Profile**: Determines appropriate investment risk profile
11. **Process Assets**: Structures asset data for storage

## Testing

A sample client (`client_001`) is included in `data/clients/`. Test the service:

```bash
# Run analysis
curl -X POST http://localhost:8000/analyze/001

# Get results
curl http://localhost:8000/analysis/001
```

## Integration with UI

The React frontend can call the API:

```typescript
// Trigger analysis
const response = await fetch('http://localhost:8000/analyze/001', {
  method: 'POST'
});

// Get results
const analysis = await fetch('http://localhost:8000/analysis/001');
const data = await analysis.json();
```

## Troubleshooting

- **OpenAI API Errors**: Check your API key in `.env`
- **CORS Issues**: Frontend origins are configured in `main.py` CORS middleware
- **File Not Found**: Ensure `data/` directory exists with proper structure




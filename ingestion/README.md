# PDF Ingestion Service

This Python service replaces the Zapier/Airparser workflow for processing financial planning PDFs. It extracts client data, processes it through OpenAI, and sends structured JSON to the Supabase webhook.

## Setup

1. **Navigate to project root**:
   ```bash
   cd /path/to/bailiwickai
   ```

2. **Install Dependencies**:
   Ensure Python 3.9+ is installed.
   ```bash
   pip install -r ingestion/requirements.txt
   ```

3. **Configuration**:
   Copy the example environment file and fill in your keys:
   ```bash
   cp ingestion/.env.example ingestion/.env
   ```
   Edit `ingestion/.env`:
   - `OPENAI_API_KEY`: Your OpenAI key
   - `WEBHOOK_URL`: Supabase function URL
   - `WEBHOOK_AUTH_TOKEN`: Supabase anon/service_role token

## Usage

Run the ingestion script manually from the command line:

```bash
# Run as a module from the project root
python3 -m ingestion.main /path/to/financial_data.pdf
```

**Example:**
```bash
python3 -m ingestion.main ~/Downloads/Steve_Beth_Smith_Financial_Test_Data.pdf
```

## Testing

Run the test suite using `pytest`:

```bash
# Run all tests
python3 -m pytest ingestion/tests/
```

## Structure

- `ingestion/main.py`: CLI entry point & orchestration
- `ingestion/pdf_parser.py`: Text extraction (PyMuPDF)
- `ingestion/ai_processor.py`: OpenAI prompts & extraction logic (Steps A-M)
- `ingestion/data_processor.py`: Data cleaning & calculations
- `ingestion/webhook_client.py`: Supabase API integration
- `ingestion/models.py`: Pydantic definitions for validation

## Troubleshooting

- **"No text extracted"**: The PDF might be a scanned image without OCR. The current parser expects selectable text.
- **Webhook 500 Errors**: Check the `WEBHOOK_AUTH_TOKEN` and ensure the Supabase Edge Function is running.
- **Date Parsing Errors**: The system tries standard formats (YYYY/MM/DD, DD/MM/YYYY). Unusual formats may return the raw string.




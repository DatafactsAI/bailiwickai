# Bailiwick AI - Financial Advice Processing System

## Overview

**Bailiwick AI** is a comprehensive financial advice processing platform designed exclusively for financial advisors. The system streamlines the entire client engagement workflow from initial fact find intake through to final financial plan document generation. Built with modern web technologies and AI-powered analysis, Bailiwick AI helps advisors efficiently process client data, develop strategies, and produce professional documentation.

### Primary Goal

To provide financial advisors with an integrated, AI-assisted platform that:
- Automates the extraction and structuring of client data from fact find documents
- Enables intelligent querying and analysis of client financial information
- Generates comprehensive AI-powered financial analysis and recommendations
- Facilitates strategy development and storage
- Produces professional financial plan documents from standardized templates

### Target User

**Single Financial Advisor** (MVP scope) - The system is designed for use by one financial advisor managing multiple clients. Multi-advisor support is planned for future releases.

---

## System Architecture

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- React Query for data management
- Resizable panels for flexible UI layout

**Backend:**
- Python FastAPI (advice_processor service) - Runs on `localhost:8000`
- Python CLI service (ingestion service) - PDF processing
- Local JSON file storage (MVP - no database required)

**AI Integration:**
- OpenAI GPT-4o for analysis and document processing
- OpenAI Assistants API for chat functionality
- **Architecture Note:** Local knowledge base infrastructure exists and could support a fully local agent, but the system is designed to use OpenAI Assistant API with local knowledge base enhancement (not replacement)

**Storage:**
- Local file system (`data/` directory)
  - Client data: `data/clients/client_{id}.json`
  - Analysis results: `data/analysis/client_{id}_analysis.json`
  - Templates: `data/templates/`
  - Knowledge base: `data/knowledge_base/`

---

## Core Workflow

### Standard Advisor Workflow

1. **Client Meeting & Fact Find Completion**
   - Advisor meets with client and completes fact find document
   - Fact find is typically a PDF document following a standardized template

2. **Fact Find Upload & Processing**
   - Advisor uploads fact find PDF through Settings → Fact Find tab
   - System processes PDF through ingestion pipeline:
     - Extracts text from PDF
     - Uses AI to extract structured client data
     - Validates and cleans data
     - Stores client data locally

3. **Data Review & Completion**
   - Advisor selects client from left sidebar
   - Views client data in "Client Data" tab (right panel)
   - Updates and corrects any incomplete or inaccurate data
   - Ensures all required fields are populated

4. **AI Analysis & Strategy Development**
   - Advisor queries client data using chat interface (center panel)
   - AI assistant provides advice and insights based on client context
   - Advisor generates comprehensive AI analysis via "AI Analysis" tab
   - System processes data through 11-step AI analysis pipeline
   - Advisor reviews strategies, recommendations, and risk profiles
   - Strategies are stored in the system for reference

5. **Financial Plan Generation**
   - Advisor navigates to "Plan Writer" tab (right panel)
   - Selects standardized document template
   - If template is pre-mapped, generation is one-click
   - If template needs mapping, advisor maps placeholders to client data fields
   - System generates completed Word document (.docx)
   - Advisor downloads and reviews final document

---

## Feature Documentation

### 1. Fact Find PDF Processing

**Location:** Settings Dialog → Fact Find Tab

**Purpose:** Automatically extract structured client data from PDF fact find documents.

**How It Works:**
1. Advisor uploads a PDF fact find document (must follow standardized template format)
2. System extracts raw text from PDF using PyMuPDF
3. AI processes text through multiple extraction steps:
   - **Step A:** Collates asset information
   - **Step B:** Identifies reasons for seeking advice
   - **Core Data Extraction:** Extracts client names, DOB, salaries, super balances, health status, work status, income tax, Centrelink benefits, living expenses
   - **Asset Extraction:** Processes lifestyle assets, investment assets, superannuation assets, vehicle descriptions
4. Data processor cleans and validates extracted data
5. Calculates totals (total assets, etc.)
6. Stores client data locally in JSON format

**Technical Details:**
- **Service:** `ingestion/` Python module
- **Entry Point:** `python3 -m ingestion.main /path/to/fact_find.pdf`
- **API Endpoint:** `POST /fact-find/upload` (via FastAPI backend)
- **File Size Limit:** 50MB
- **Supported Format:** PDF with selectable text (OCR not currently supported)

**Output:** Client data stored in `data/clients/client_{id}.json`

---

### 2. Client Data Management

**Location:** Left Sidebar (Client List) + Right Panel → Client Data Tab

**Purpose:** View, search, and edit client financial information.

**Features:**
- **Client List (Left Sidebar):**
  - Searchable list of all clients
  - Displays client names and consultation dates
  - Click to select and load client data
  - Real-time updates when new clients are added

- **Client Data View (Right Panel):**
  - Comprehensive table view of all client information
  - Organized sections:
    - Client Information (names, DOB, consultation date, advisor name)
    - Financial Summary (totals for assets, expenses, loans, insurance)
    - Detailed Assets (lifestyle, investment, superannuation)
    - Detailed Liabilities (loans with lender, balance, interest rates)
    - Detailed Insurance (policies with provider, premium, sum insured)
    - Advice Context (reasons for advice, current situation, concerns)
    - Advisor Input (analysis, recommendations, strategies, next steps)
  - Editable fields for data correction
  - "Place in Chat" functionality to insert data snippets into chat

**Data Structure:**
- Client data follows Pydantic model structure (`ClientData`)
- Supports single client or couple (client1 + optional client2)
- All financial values stored as floats
- Dates stored as strings (YYYY/MM/DD format)

---

### 3. AI-Powered Chat Assistant

**Location:** Center Panel

**Purpose:** Intelligent assistant that answers advisor queries using client data context and knowledge base.

**Architecture Decision:**
- **Currently uses OpenAI Assistants API** for conversational AI capabilities
- **Local knowledge base infrastructure exists** and is designed to enhance OpenAI responses (not replace it)
- Components are available that could support a fully local agent, but the current implementation uses OpenAI Assistant API with local knowledge base enhancement
- Knowledge base documents are stored locally and will be used to provide context to OpenAI Assistant responses

**Features:**
- **Context-Aware Responses:**
  - Automatically includes selected client's data in conversation context
  - Provides relevant financial advice based on client situation
  - Can reference specific client fields (salary, super balance, assets, etc.)

- **Read-Only Data Access:**
  - Assistant can read and analyze client data
  - Provides advice and recommendations
  - **Cannot modify client data** (read-only for MVP)

- **Knowledge Base Integration (Planned):**
  - Will reference uploaded knowledge base documents when answering queries
  - Will use document embeddings for semantic search
  - Will provide answers based on both client data and knowledge base content
  - **Note:** Knowledge base infrastructure exists but integration is not yet complete (see Alignment Gaps section)

- **Client Data Quick Insert:**
  - Dropdown menu to quickly insert client data fields into chat
  - Formatted display (e.g., "Gross Salary: $120,000")
  - Supports both client1 and client2 fields

**Technical Implementation:**
- Uses OpenAI Assistants API (not a local agent)
- Message history stored locally
- Client context automatically enriched before each query
- Knowledge base documents stored locally (embeddings and retrieval integration pending)

**Limitations (MVP):**
- Does not modify client data
- Knowledge base integration partially implemented (storage exists, retrieval pending)
- Single conversation thread per client

---

### 4. AI Financial Analysis

**Location:** Right Panel → AI Analysis Tab

**Purpose:** Generate comprehensive AI-powered analysis of client's financial situation through an 11-step processing pipeline.

**How It Works:**
1. Advisor clicks "Generate AI Analysis" button
2. System loads client data from local storage
3. Processes data through 11 sequential AI analysis steps:
   - **Step 1:** Comprehensive Data Restructuring - Formats all client data for downstream processing
   - **Step 2:** Extract Client Names - Creates formatted name summary
   - **Step 3:** Analyze Retirement Goals - Evaluates retirement priority (1-10) and timeline (years)
   - **Step 4:** Analyze Cashflow - Assesses income/expense management and priority (1-10)
   - **Step 5:** Analyze Debt - Reviews debt situation and repayment priority (1-10)
   - **Step 6:** Identify Coverage Gaps - Determines gaps in investment, superannuation, cashflow, and debt coverage
   - **Step 7:** Extract Strategies - Parses advisor strategies from input
   - **Step 8:** Extract Objectives - Identifies client goals and objectives
   - **Step 9:** Extract Recommendations - Generates client-specific recommendations (separate for client1 and client2)
   - **Step 10:** Analyze Risk Profile - Determines appropriate investment risk profile with rationale
   - **Step 11:** Process Assets - Structures asset data for storage (Python logic, not AI)
4. Results stored locally in `data/analysis/client_{id}_analysis.json`
5. **Previous analysis is overwritten** (no history maintained)

**Analysis Results Display:**
- **Overview Tab:**
  - Client name summary
  - Coverage status (investment, superannuation, cashflow, debt)
  - Client objectives list

- **Retirement Tab:**
  - Summary paragraph
  - Retirement priority (1-10 scale)
  - Retirement timeline (years)

- **Cashflow Tab:**
  - Cashflow summary and priority
  - Debt management summary and priority

- **Strategies Tab:**
  - List of extracted advisor strategies
  - Each strategy shows name and description

- **Risk Profile Tab:**
  - Investment risk profile classification
  - Rationale for risk assessment

**Technical Details:**
- **API Endpoint:** `POST /analyze/{client_id}`
- **Processing Time:** ~30 seconds (varies with data complexity)
- **Model:** GPT-4o (configurable via settings)
- **Storage:** Local JSON files only

---

### 5. Document Template Management

**Location:** Settings Dialog → Document Templates Tab

**Purpose:** Upload, manage, and configure Word document templates for financial plan generation.

**Features:**
- **Template Upload:**
  - Upload `.docx` (Word) files
  - Maximum file size: 10MB
  - Auto-generates unique template ID
  - Extracts document metadata (word count, page count)
  - Optional description and client ID associations

- **Template Library:**
  - List view of all uploaded templates
  - Shows template name, file size, upload date, word count
  - Indicates if template has saved mapping configuration
  - Search functionality

- **Placeholder Extraction:**
  - Automatically detects placeholders in templates (format: `<PlaceholderName>`)
  - Calculates signature for change detection
  - Lists all placeholders found in document

- **Variable Mapping:**
  - Auto-mapping: System suggests mappings from client data fields
  - Manual mapping: Advisor can customize mappings
  - Mapping types:
    - **Field Mapping:** Maps to existing client data field
    - **Custom Value:** Static text or calculated value
    - **Format Options:** Date, currency, number formatting
  - Confidence scores for auto-mapped fields
  - Save mapping configuration for reuse

- **Mapping Validation:**
  - Detects if template has changed since mapping was saved
  - Identifies missing or extra placeholders
  - Warns about incomplete mappings

**Technical Details:**
- **Storage:** `data/templates/files/` and `data/templates/profiles/`
- **Placeholder Pattern:** `<[a-zA-Z][a-zA-Z0-9_-]*>`
- **Document Engine:** Uses `python-docx` library
- **Preserves Formatting:** Maintains fonts, styles, bold, italic, etc.

---

### 6. Document Generation

**Location:** Right Panel → Plan Writer Tab

**Purpose:** Generate completed financial plan documents by replacing template placeholders with actual client data.

**Workflow:**
1. Advisor selects a client (required)
2. Navigates to Plan Writer tab
3. Selects a document template from library
4. Clicks "Generate Document"
5. System checks for saved mapping:
   - **If mapping exists and is valid:** Generates document immediately
   - **If mapping doesn't exist or is invalid:** Opens mapping dialog
6. In mapping dialog:
   - Advisor reviews auto-mapped placeholders
   - Adjusts mappings as needed
   - Option to save mapping for future use
   - Confirms generation
7. System resolves all placeholder values from client data
8. Replaces placeholders in Word document
9. Generates completed `.docx` file
10. Advisor downloads document

**Features:**
- **Conditional Logic Support:** Templates can include conditional sections (show/hide based on client data)
- **Format Preservation:** Maintains all Word formatting (bold, italic, fonts, tables, etc.)
- **Mapping Reuse:** Saved mappings speed up future generations
- **Download:** Generated documents available for immediate download

**Output:**
- Word document (`.docx` format)
- Stored in `data/templates/generated/`
- Filename includes template ID and client ID

**Technical Details:**
- **API Endpoint:** `POST /knowledge-base/templates/{template_id}/generate`
- **Document Engine:** `DocumentGenerator` class
- **Mapping Resolution:** `MappingEngine` class handles value resolution

---

### 7. Knowledge Base Management

**Location:** Settings Dialog → Knowledge Base Tab

**Purpose:** Upload reference documents that enhance the OpenAI Assistant's responses to advisor queries.

**Architecture Note:**
- Knowledge base is designed to **enhance** OpenAI Assistant API responses, not replace it
- Infrastructure exists for local storage and processing (could support a local agent)
- Current implementation uses OpenAI Assistant API with knowledge base context injection (integration pending)

**Features:**
- **Document Upload:**
  - Supports PDF, TXT, MD, and DOCX files
  - Documents stored locally in `data/knowledge_base/files/` and `data/knowledge_base/text/`
  - Text extraction infrastructure ready
  - Embedding generation and semantic search (pending implementation)

- **Document List:**
  - View all uploaded knowledge base documents
  - Shows filename, file type, size, upload date
  - Documents stored and ready for integration

**Intended Usage (When Fully Integrated):**
- Chat assistant will retrieve relevant knowledge base documents based on query
- Relevant excerpts will be injected into OpenAI Assistant prompts as context
- Assistant will provide answers using both client data and knowledge base content
- Also displayed in Strategy tab (when implemented) in right panel

**Technical Details:**
- Documents are stored locally (infrastructure complete)
- Text extraction ready (pending full implementation)
- Embedding generation and semantic search (pending - see Alignment Gaps)
- Integration with OpenAI Assistant API (pending - retrieval and context injection)

---

### 8. Settings & Configuration

**Location:** Settings icon (top right) → Settings Dialog

**Purpose:** Centralized configuration and management interface.

**Tabs:**
1. **Fact Find:** Upload and process fact find PDFs
2. **Knowledge Base:** Upload reference documents for AI assistant
3. **Document Templates:** Manage document templates and mappings

**Future Configuration Options (Planned):**
- Customize AI prompts for analysis steps
- Adjust analysis parameters (priority scales, risk profiles, etc.)
- Configure document generation rules
- Set default templates
- Manage OpenAI API settings

---

## Technical Architecture Details

### Backend Services

#### 1. Advice Processor Service (`advice_processor/`)

**Purpose:** FastAPI service providing AI analysis and document generation capabilities.

**Key Endpoints:**
- `GET /health` - Health check
- `GET /clients` - List all clients
- `GET /clients/{client_id}` - Get client data
- `POST /clients` - Create/update client
- `POST /analyze/{client_id}` - Run AI analysis
- `GET /analysis/{client_id}` - Get analysis results
- `GET /status/{client_id}` - Check processing status
- `POST /fact-find/upload` - Upload fact find PDF
- `GET /knowledge-base/documents` - List templates/knowledge base docs
- `POST /knowledge-base/upload` - Upload template/knowledge base doc
- `POST /knowledge-base/templates/{id}/extract-placeholders` - Extract placeholders
- `POST /knowledge-base/templates/{id}/auto-map` - Auto-map placeholders
- `GET /knowledge-base/templates/{id}/mapping` - Get saved mapping
- `POST /knowledge-base/templates/{id}/mapping` - Save mapping
- `POST /knowledge-base/templates/{id}/validate-mapping` - Validate mapping
- `POST /knowledge-base/templates/{id}/generate` - Generate document
- `GET /knowledge-base/templates/{id}/generated/{filename}` - Download generated doc

**Configuration:**
- Environment variables in `.env`:
  - `OPENAI_API_KEY` - OpenAI API key
  - `OPENAI_MODEL` - Model to use (default: gpt-4o)
  - `LOG_LEVEL` - Logging level (default: INFO)
  - `DATA_DIR` - Data directory path (default: ../data)

**Storage:**
- Local JSON files only
- Client data: `{DATA_DIR}/clients/client_{id}.json`
- Analysis: `{DATA_DIR}/analysis/client_{id}_analysis.json`
- Templates: `{DATA_DIR}/templates/`

#### 2. Ingestion Service (`ingestion/`)

**Purpose:** CLI service for processing fact find PDFs.

**Usage:**
```bash
python3 -m ingestion.main /path/to/fact_find.pdf
```

**Processing Steps:**
1. PDF text extraction (PyMuPDF)
2. AI processing (Steps A-M)
3. Data cleaning and validation
4. Webhook submission (currently disabled for local-only MVP)

**Configuration:**
- Environment variables in `ingestion/.env`:
  - `OPENAI_API_KEY` - OpenAI API key
  - `WEBHOOK_URL` - (Not used in local-only MVP)
  - `WEBHOOK_AUTH_TOKEN` - (Not used in local-only MVP)
  - `ADVISOR_NAME` - Default advisor name

### Frontend Application

**Entry Point:** `src/main.tsx`

**Key Components:**
- `Index.tsx` - Main application layout with resizable panels
- `ClientSidebar.tsx` - Client list and selection
- `ChatInterface.tsx` - AI chat assistant interface
- `ContextPanel.tsx` - Right panel with Client Data, AI Analysis, Plan Writer tabs
- `AIAnalysis.tsx` - AI analysis display and generation
- `DocumentGenerationPanel.tsx` - Template management and document generation
- `SettingsDialog.tsx` - Settings interface
- `ClientTable.tsx` - Client data display and editing

**State Management:**
- React Query for server state
- Local state for UI interactions
- No global state management library (Redux/Zustand)

**API Integration:**
- Direct fetch calls to FastAPI backend (`http://localhost:8000`)
- Supabase client for chat assistant (edge function)
- OpenAI client for direct API calls (where needed)

### Data Models

**Client Data Model (`ClientData`):**
- `id`: Unique client identifier
- `clientInfo`: Client information (names, DOB, salaries, etc.)
- `financialSummary`: Totals and summaries
- `detailedAssets`: Lifestyle, investment, superannuation assets
- `detailedLiabilities`: Loans and debts
- `detailedInsurance`: Insurance policies
- `adviceContext`: Reasons for advice, situation, concerns
- `advisorInput`: Advisor's analysis, recommendations, strategies

**Analysis Result Model (`AnalysisResult`):**
- `clientId`: Client identifier
- `processedAt`: Timestamp
- `clientNamesSummary`: Formatted name string
- `restructuredData`: Processed data structure
- `retirementAnalysis`: Retirement analysis results
- `cashflowAnalysis`: Cashflow analysis results
- `debtAnalysis`: Debt analysis results
- `coverageGaps`: Coverage gap identification
- `strategies`: Extracted strategies
- `objectives`: Client objectives
- `client1Recommendations`: Recommendations for client 1
- `client2Recommendations`: Recommendations for client 2
- `riskProfile`: Risk profile assessment
- `processedLifestyleAssets`: Processed asset data
- `processedInvestmentAssetsClient1/2`: Processed investment assets
- `processedSuperAssetsClient1/2`: Processed superannuation assets

---

## Setup & Installation

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.9+
- **OpenAI API Key** (for AI features)
- **Local file system** with write permissions

### Installation Steps

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd bailiwickai
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   # Advice processor service
   cd advice_processor
   pip install -r requirements.txt
   
   # Ingestion service
   cd ../ingestion
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**

   **Advice Processor:**
   ```bash
   cd advice_processor
   cp .env.example .env
   # Edit .env and add:
   # OPENAI_API_KEY=sk-your-key-here
   # OPENAI_MODEL=gpt-4o
   # LOG_LEVEL=INFO
   # DATA_DIR=../data
   ```

   **Ingestion Service:**
   ```bash
   cd ingestion
   cp .env.example .env
   # Edit .env and add:
   # OPENAI_API_KEY=sk-your-key-here
   # ADVISOR_NAME=Your Name
   ```

5. **Create Data Directories**
   ```bash
   mkdir -p data/clients
   mkdir -p data/analysis
   mkdir -p data/templates/files
   mkdir -p data/templates/profiles
   mkdir -p data/templates/generated
   mkdir -p data/knowledge_base/files
   mkdir -p data/knowledge_base/text
   mkdir -p data/knowledge_base/embeddings
   mkdir -p data/knowledge_base/profiles
   ```

6. **Start Services**

   **Terminal 1 - Backend:**
   ```bash
   cd advice_processor
   python main.py
   # Server runs on http://localhost:8000
   ```

   **Terminal 2 - Frontend:**
   ```bash
   npm run dev
   # App runs on http://localhost:5173
   ```

### Verification

1. Open browser to `http://localhost:5173`
2. Check backend health: `http://localhost:8000/health`
3. Upload a test fact find PDF through Settings → Fact Find
4. Verify client appears in left sidebar

---

## Development Guidelines

### Code Organization

- **Frontend:** Component-based architecture with hooks for data fetching
- **Backend:** Service-oriented with clear separation of concerns
- **Models:** Pydantic models for data validation
- **Storage:** Local file system with JSON serialization

### Best Practices

- **Error Handling:** Comprehensive error handling with user-friendly messages
- **Logging:** Structured logging throughout backend services
- **Type Safety:** TypeScript for frontend, Pydantic for backend
- **Validation:** Input validation at API boundaries
- **Documentation:** Inline comments for complex logic

### Testing

- Backend tests in `advice_processor/tests/` and `ingestion/tests/`
- Run tests: `pytest` from respective directories
- Frontend testing: (To be implemented)

---

## Known Limitations & Future Enhancements

### Current Limitations (MVP)

1. **Local Storage Only:** No database persistence (Supabase integration removed for MVP)
2. **Single Advisor:** No multi-user support
3. **No Analysis History:** Previous analysis results are overwritten
4. **Read-Only Chat:** Chat assistant cannot modify client data
5. **Specific PDF Format:** Fact find processing requires standardized PDF template
6. **No Zapier Integration:** Financial plan export is in-house only (Zapier removed)

### Planned Enhancements

- Multi-advisor support with data isolation
- Analysis history and versioning
- Chat assistant data modification capabilities
- Enhanced knowledge base search and retrieval
- Additional document template formats
- Real-time collaboration features
- Advanced reporting and analytics

---

## Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python dependencies: `pip install -r requirements.txt`
- Verify `.env` file exists with valid OpenAI API key
- Check port 8000 is not in use

**Frontend can't connect to backend:**
- Ensure backend is running on `localhost:8000`
- Check CORS settings in `advice_processor/main.py`
- Verify API base URL in frontend code

**Analysis fails:**
- Check OpenAI API key is valid and has credits
- Review backend logs for detailed error messages
- Verify client data is complete and valid

**Document generation fails:**
- Ensure template file exists and is valid `.docx`
- Check all placeholders are mapped
- Verify client data contains required fields

**Fact find processing fails:**
- Verify PDF has selectable text (not scanned image)
- Check PDF follows standardized template format
- Review ingestion service logs for extraction errors

---

## Support & Contribution

For issues, questions, or contributions, please refer to the project repository.

---

## License

[License information to be added]

---

# Features Not Yet Implemented / Alignment Gaps

This section documents features and functionality that are described in the system goals but are not yet fully implemented in the current codebase. These items represent work needed to achieve full alignment with the intended system design.

## 1. Strategy Tab in Right Panel

**Status:** Partially Implemented

**Current State:**
- Strategies are displayed within the "AI Analysis" tab under a "Strategies" sub-tab
- Strategies are extracted from AI analysis results

**Required:**
- A dedicated "Strategy" tab in the right panel (ContextPanel)
- Display strategies from knowledge base documents (not just AI analysis)
- Allow advisor to view, edit, and save strategies separately from AI analysis
- Integration with knowledge base for strategy recommendations

**Implementation Needed:**
- Add new tab to `ContextPanel.tsx`
- Create `StrategyPanel.tsx` component
- Integrate knowledge base document content for strategy display
- Add strategy management functionality (save, edit, delete strategies)

---

## 2. Knowledge Base Integration with Chat Assistant

**Status:** Partially Implemented

**Architecture Decision:**
- System uses **OpenAI Assistant API** (not a local agent)
- Knowledge base infrastructure exists and is designed to **enhance** OpenAI responses
- Components are available that could support a fully local agent, but current design uses OpenAI Assistant API with local knowledge base enhancement

**Current State:**
- Knowledge base upload functionality exists
- Documents are stored locally (`data/knowledge_base/files/` and `data/knowledge_base/text/`)
- Basic document listing is available
- Infrastructure ready for embedding generation and semantic search
- **Note:** While local agent components exist, the system is architected to use OpenAI Assistant API

**Required:**
- Chat assistant should actively use knowledge base documents when answering queries
- Semantic search through knowledge base embeddings
- Document retrieval and context injection into OpenAI Assistant prompts
- Display relevant knowledge base excerpts in chat responses

**Implementation Needed:**
- Implement embedding generation for uploaded documents (using OpenAI embeddings API)
- Add semantic search functionality (vector similarity search)
- Integrate knowledge base retrieval into OpenAI Assistant prompts
- Update `supabase/functions/chat-assistant/index.ts` to:
  - Retrieve relevant knowledge base documents based on query
  - Inject retrieved content as context into OpenAI Assistant API calls
- Create embedding storage and retrieval system (embeddings stored in `data/knowledge_base/embeddings/`)

---

## 3. Local-Only Storage Migration

**Status:** In Progress

**Current State:**
- System still references Supabase in some places (client sidebar, chat assistant)
- Mixed storage approach (local JSON + Supabase)

**Required:**
- Complete removal of Supabase dependencies for MVP
- All client data stored in local JSON files only
- Client list loaded from local file system
- Chat assistant uses local client data context only

**Implementation Needed:**
- Update `ClientSidebar.tsx` to load clients from local API instead of Supabase
- Modify chat assistant to use local client data
- Remove Supabase client imports where not needed
- Update all data fetching to use FastAPI endpoints
- Ensure all CRUD operations use local storage

---

## 4. Document Template Conditional Logic

**Status:** Not Implemented

**Current State:**
- Templates support placeholder replacement
- Basic mapping and value resolution works

**Required:**
- Support for conditional sections in templates (show/hide based on client data)
- Template logic for calculations and formatting
- Conditional placeholders (e.g., show section only if client has debt)

**Implementation Needed:**
- Extend `DocumentGenerator` to parse conditional logic
- Add template syntax for conditionals (e.g., `{% if client.has_debt %}...{% endif %}`)
- Implement conditional evaluation engine
- Update placeholder extraction to identify conditional blocks

---

## 5. Settings: AI Prompt Customization

**Status:** Not Implemented

**Current State:**
- AI prompts are hardcoded in `ai_processor.py`
- No UI for customizing prompts

**Required:**
- Settings interface for customizing AI analysis prompts
- Ability to adjust analysis parameters (priority scales, risk profile categories)
- Save and load prompt configurations
- Per-step prompt customization

**Implementation Needed:**
- Create prompt configuration storage (JSON files)
- Add Settings UI tab for "AI Configuration"
- Update `AIProcessor` to load custom prompts
- Add validation for prompt templates
- Provide default prompts with ability to override

---

## 6. Settings: Document Generation Rules

**Status:** Not Implemented

**Current State:**
- Document generation uses hardcoded logic
- No configurable rules

**Required:**
- Configurable rules for document generation
- Default template selection
- Generation preferences (auto-save mappings, default formats)
- Template validation rules

**Implementation Needed:**
- Create configuration model for generation rules
- Add Settings UI for generation preferences
- Implement rule engine for document generation
- Add validation based on configured rules

---

## 7. Financial Plan Export (In-House)

**Status:** Partially Implemented (Zapier references still exist)

**Current State:**
- `FinancialPlanWriter.tsx` contains Zapier webhook URLs
- Document generation exists but export mechanism uses Zapier

**Required:**
- Remove all Zapier dependencies
- Implement in-house document export/download
- Direct Word document generation and download
- No external webhook dependencies

**Implementation Needed:**
- Remove Zapier webhook URLs from `FinancialPlanWriter.tsx`
- Update document generation to use local template system
- Implement direct download functionality
- Remove webhook client code from ingestion service (if not needed)

---

## 8. Chat Assistant: Read-Only Enforcement

**Status:** Partially Implemented

**Current State:**
- Chat assistant has code for updating client data (in `chat-assistant/index.ts`)
- Update functionality exists but should be disabled for MVP

**Required:**
- Ensure chat assistant cannot modify client data
- Remove or disable data update functionality
- Make read-only behavior explicit in code and UI

**Implementation Needed:**
- Remove data update logic from `chat-assistant/index.ts`
- Update chat assistant prompts to clarify read-only behavior
- Add UI indication that chat is read-only
- Remove "update" related code paths

---

## 9. Strategy Storage and Management

**Status:** Not Implemented

**Current State:**
- Strategies are extracted during AI analysis
- No separate strategy storage or management

**Required:**
- Ability to save strategies independently of AI analysis
- Edit and manage strategies separately
- Link strategies to knowledge base documents
- Strategy versioning

**Implementation Needed:**
- Create strategy data model
- Add strategy storage (local JSON files)
- Create strategy management UI
- Implement strategy CRUD operations
- Link strategies to clients and knowledge base

---

## 10. Knowledge Base: Strategy Tab Integration

**Status:** Not Implemented

**Current State:**
- Knowledge base documents are uploaded
- No display in strategy context

**Required:**
- Display knowledge base content in Strategy tab
- Show relevant strategies from knowledge base documents
- Allow advisor to reference knowledge base when developing strategies

**Implementation Needed:**
- Integrate knowledge base content into Strategy tab
- Create strategy extraction from knowledge base documents
- Display knowledge base strategies alongside AI-generated strategies
- Add filtering and search for knowledge base strategies

---

## 11. Template Mapping: Advanced Features

**Status:** Partially Implemented

**Current State:**
- Basic mapping exists
- Auto-mapping works for simple cases

**Required:**
- Support for calculated fields (e.g., total assets = sum of individual assets)
- Nested field access (e.g., `client.clientInfo.client1.name`)
- Format options (currency, date, percentage)
- Custom value expressions

**Implementation Needed:**
- Extend `MappingEngine` to support calculations
- Add expression parser for custom values
- Implement nested field resolution
- Add format options to mapping UI
- Create format helper functions

---

## 12. Analysis History (Future Enhancement)

**Status:** Not Implemented (By Design for MVP)

**Current State:**
- Analysis results overwrite previous results
- No history maintained

**Required (Future):**
- Maintain analysis history
- Version analysis results
- Compare analysis across time
- Rollback to previous analysis

**Implementation Needed (Future):**
- Add versioning to analysis storage
- Create analysis history data model
- Implement history UI
- Add comparison functionality

---

## 13. Multi-Advisor Support (Future Enhancement)

**Status:** Not Implemented (By Design for MVP)

**Current State:**
- Single advisor assumption throughout
- No user authentication or isolation

**Required (Future):**
- User authentication system
- Data isolation per advisor
- Advisor-specific settings and templates
- Shared vs. private templates

**Implementation Needed (Future):**
- Implement authentication system
- Add advisor ID to all data models
- Create data isolation layer
- Update UI for multi-user context

---

## Summary of Priority Items

**High Priority (MVP Completion):**
1. Local-only storage migration (remove Supabase)
2. Knowledge base integration with chat assistant
3. Strategy tab implementation
4. Remove Zapier dependencies
5. Chat assistant read-only enforcement

**Medium Priority (Enhanced MVP):**
6. Document template conditional logic
7. Settings: AI prompt customization
8. Strategy storage and management
9. Knowledge base strategy tab integration

**Low Priority (Future Enhancements):**
10. Analysis history
11. Multi-advisor support
12. Advanced template mapping features

---

*Last Updated: [Current Date]*
*Version: MVP 1.0*

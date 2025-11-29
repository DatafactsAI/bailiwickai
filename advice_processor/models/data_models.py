from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Input Models (Client Data)

class ClientInfo(BaseModel):
    name: str
    dob: str
    grossSalary: float
    superBalance: float
    health: str
    workStatus: str
    incomeTax: float
    centrelinkReceived: float

class ClientInfoPair(BaseModel):
    client1: ClientInfo
    client2: Optional[ClientInfo] = None
    consultationDate: str
    advisorName: str

class FinancialSummary(BaseModel):
    totalLifestyleAssets: float
    totalLivingExpenses: float
    totalInvestmentAssets: float
    totalSuperannuationAssets: float
    totalClientLoans: float
    totalClientInsurance: float

class LifestyleAsset(BaseModel):
    name: str
    value: float
    owner: str

class InvestmentAsset(BaseModel):
    name: str
    value: float
    owner: str
    returnRate: Optional[float] = Field(None, alias="return")

class SuperannuationAsset(BaseModel):
    owner: str
    fundName: str
    balance: float
    investmentOption: str

class DetailedAssets(BaseModel):
    lifestyleAssets: List[LifestyleAsset] = []
    investmentAssets: List[InvestmentAsset] = []
    superannuationAssets: List[SuperannuationAsset] = []

class Loan(BaseModel):
    type: str
    lender: str
    balance: float
    interestRate: float
    repayment: float
    owner: str

class DetailedLiabilities(BaseModel):
    loans: List[Loan] = []

class InsurancePolicy(BaseModel):
    type: str
    provider: str
    premium: float
    sumInsured: float
    owner: str

class DetailedInsurance(BaseModel):
    policies: List[InsurancePolicy] = []

class AdviceContext(BaseModel):
    reasonsForAdvice: str
    currentSituation: str
    concerns: str

class AdvisorInput(BaseModel):
    analysis: str
    recommendations: str
    strategies: str
    nextSteps: str

class ClientData(BaseModel):
    """Complete client data structure"""
    id: str
    clientInfo: ClientInfoPair
    financialSummary: FinancialSummary
    detailedAssets: DetailedAssets
    detailedLiabilities: DetailedLiabilities
    detailedInsurance: DetailedInsurance
    adviceContext: AdviceContext
    advisorInput: AdvisorInput

# Output Models (Analysis Results)

class RetirementAnalysis(BaseModel):
    summaryParagraph: str
    retirementPriority: int  # 1-10
    retirementTimeline: int  # years

class CashflowAnalysis(BaseModel):
    summaryParagraph: str
    cashflowPriority: int  # 1-10

class DebtAnalysis(BaseModel):
    summaryParagraph: str
    debtRepaymentPriority: int  # 1-10

class CoverageGaps(BaseModel):
    investmentCovered: bool
    superannuationCovered: bool
    centrelinkCovered: bool
    cashflowCovered: bool
    debtCovered: bool

class Strategy(BaseModel):
    name: str
    description: str

class Objective(BaseModel):
    name: str
    exists: bool
    progress: str  # "Not Started" | "In Progress" | "Achieved"
    benefits: str
    amount: Optional[float] = None

class ClientRecommendation(BaseModel):
    exists: bool
    description: str

class RiskProfile(BaseModel):
    profile: str  # Conservative / Moderate / Balanced / Growth / Aggressive
    rationale: str

class ProcessedAsset(BaseModel):
    exists: bool
    description: str
    value: float

class AnalysisResult(BaseModel):
    """Complete analysis result structure"""
    clientId: str
    processedAt: datetime
    clientNamesSummary: str
    restructuredData: str
    retirementAnalysis: RetirementAnalysis
    cashflowAnalysis: CashflowAnalysis
    debtAnalysis: DebtAnalysis
    coverageGaps: CoverageGaps
    strategies: List[Strategy]
    objectives: List[Objective]
    client1Recommendations: List[ClientRecommendation]
    client2Recommendations: List[ClientRecommendation]
    riskProfile: RiskProfile
    processedLifestyleAssets: List[ProcessedAsset]
    processedInvestmentAssetsClient1: List[ProcessedAsset]
    processedInvestmentAssetsClient2: List[ProcessedAsset]
    processedSuperAssetsClient1: List[ProcessedAsset]
    processedSuperAssetsClient2: List[ProcessedAsset]




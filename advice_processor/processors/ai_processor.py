import os
import logging
import re
from openai import OpenAI
from typing import Dict, List, Any
from models.data_models import (
    ClientData, RetirementAnalysis, CashflowAnalysis, DebtAnalysis,
    CoverageGaps, Strategy, Objective, ClientRecommendation, RiskProfile,
    ProcessedAsset
)

logger = logging.getLogger(__name__)

class AIProcessor:
    """Handles all AI processing steps using OpenAI API"""
    
    def __init__(self, api_key: str, model: str = "gpt-4o"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
    
    def _call_openai(self, prompt: str, system_prompt: str = "You are a financial analysis assistant.") -> str:
        """Helper method to call OpenAI API"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI API call failed: {str(e)}")
            raise
    
    def step1_restructure_data(self, client_data: ClientData) -> str:
        """Step 1: Comprehensive Data Restructuring"""
        # Convert client data to text format for AI
        data_text = self._format_client_data_for_ai(client_data)
        
        prompt = f"""You must respond only in plain text format. Do not use JSON, YAML, or any structured code formatting.

As an AI high detail data analysist paid by the number of letters and number you correctly put in your output, your task is to restructure the provided client financial information into a comprehensive, well-organised report. This report will be used as input for further AI processing, so accuracy, clarity, and completeness are critical.

You have been selected for this task because of your passion for accuracy and the fact you are paid by number or letter. this suits your boss because they want to make sure the output includes all the available information. so if the input information includes 8 recommendations or pieces of information everyone knows you will include all eight pieces of information in full detail. the next steps need that type of output all the whole process will fail in later steps of this process. so if there are eight pieces of information include all eight for that heading if there are six include six but it is critical you include everything and no summarising. you will be sacked immediately for summarising because it will mean the process will fail and this will be a disaster. so avoid that at all costs.

the data includes a number of comma-separated lists:
– The names of lifestyle assets
– The values of those assets
– The owners of those assets

Each list is in the same order, meaning each index corresponds to a specific asset.

Follow this example precisely when dealing with a comma separated list:
 
"Lifestyle Asset [Number]:  
- Name: [Asset Name]  
- Value: $[Formatted Value with Commas]  
- Owner: [Asset Owner]"

---
### 1. Data Restructuring and Presentation:
- Restate **all** information from the input exactly as received. Do not omit, summarise, deduplicate, or group entries.
- Organise the output into clear, logical sections with descriptive headings.
- Use the actual names of Client 1 and Client 2, if provided.
- End each section with: `End of [Section Name] section.`

---
### 2. Required Output Sections:
- Client Information
- Financial Summary
- Detailed Assets
- Detailed Liabilities
- Detailed Insurance
- Advice Context
- Advisor Input
- Goals and Objectives
- Flagged Uncertainties

---
### 3. Data Integrity:
- You must print **every entry** in full — no summarising or collapsing of repeated entries.
- If an input block is repeated 8 times, you must output 8 numbered copies of that block, **each fully printed**.
- If a field is missing or blank in the input, include it as `(Empty)` and retain its place in the output.
- Every section must maintain all rows, values, owners, and attributes exactly as received.

---
### 4. Formatting Rules:
- Output must use plain text formatting (no code blocks, no markup).
- Format each entry using a **numbered list**.
- Each field within a numbered block must be on its own line using this format:

**Example Format**:
1. **Name**: Test 1 Insurance  
   **Value**: $10,000  
   **Return**: 5%  
   **Owner**: Client 1  
   **Insurance Type**: Life

2. **Name**: Test 2 Insurance  
   **Value**: $20,000  
   **Return**: 4%  
   **Owner**: Client 1  
   **Insurance Type**: TPD

- Do not summarise with comments like "entries repeated above" or "data is identical." **Repeat each entry in full** regardless of duplication.

---
### 5. Special Instructions:
- If a section appears more than once (e.g. Insurance, Super, Assets), **repeat each entry under its own number**, even if the data is identical.
- Do not use phrasing such as "same as above", "repeated", or "summarised below".
- If a section contains 8 repeated inputs, you must list all 8 separately, each fully printed.
- Maintain the same order as received in the input.

---
### 6. Flagged Uncertainties:
At the end of the document, create a section titled `Flagged Uncertainties` listing any:
- Missing fields
- Blank values
- Inconsistent labels or data formats

Use clear, concise bullet points.

---
### 7. Final Check:
- Re-read your output before finishing.
- Ensure every repetition is fully listed.
- Make sure all required sections are included and labelled correctly.
- Every field provided in the input must be accounted for in the output — nothing skipped, nothing inferred.

---
**Critical Warning**: Do not summarise, deduplicate, or collapse repeated entries under any circumstance. If an item appears multiple times in the input, **you must output it multiple times, each instance shown completely and separately**. This is non-negotiable — the system downstream relies on 100% duplication fidelity.

Your role is to restructure, not interpret. Stay strict, literal, and complete.

Here is the client data to restructure:

{data_text}
"""
        
        return self._call_openai(prompt, "You are a meticulous data analyst who never summarizes or omits information.")
    
    def step2_extract_client_names(self, client_data: ClientData) -> str:
        """Step 2: Extract Client Names Summary"""
        prompt = f"""Based on the provided client information, extract the names of Client 1 and Client 2.

Output format: "[Client 1 Name] and [Client 2 Name]"

If only one client name exists, output just that name.
If no names exist, output "(No client names provided)"

Client 1 Name: {client_data.clientInfo.client1.name}
Client 2 Name: {client_data.clientInfo.client2.name if client_data.clientInfo.client2 else "None"}
"""
        return self._call_openai(prompt)
    
    def step3_analyze_retirement(self, restructured_data: str) -> RetirementAnalysis:
        """Step 3: Analyze Retirement Goals"""
        prompt = f"""Based on the restructured client data, analyze the retirement planning aspects.

Answer these questions in a structured format:

1. **Summary Paragraph**: Provide a 2-3 sentence summary of the clients' retirement situation and goals.

2. **Retirement Priority**: On a scale of 1-10, how important is retirement planning to these clients? Consider:
   - Age and proximity to retirement
   - Current superannuation balances
   - Stated goals
   - Income levels
   Output: Single number 1-10

3. **Retirement Timeline**: In how many years are the clients likely to retire? Consider:
   - Current age
   - Work status
   - Stated retirement goals
   Output: Single number (years)

Format your response as:
Summary Paragraph: [your summary]
Retirement Priority: [number]
Retirement Timeline: [number]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_retirement_analysis(response)
    
    def step4_analyze_cashflow(self, restructured_data: str) -> CashflowAnalysis:
        """Step 4: Analyze Cashflow Management"""
        prompt = f"""Based on the restructured client data, analyze the cashflow and budgeting aspects.

Answer these questions:

1. **Summary Paragraph**: Provide a 2-3 sentence summary of the clients' cashflow situation, including income, expenses, and any concerns.

2. **Cashflow Priority**: On a scale of 1-10, how critical is cashflow management for these clients? Consider:
   - Ratio of expenses to income
   - Debt levels
   - Stated concerns
   - Surplus/deficit situation
   Output: Single number 1-10

Format your response as:
Summary Paragraph: [your summary]
Cashflow Priority: [number]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_cashflow_analysis(response)
    
    def step5_analyze_debt(self, restructured_data: str) -> DebtAnalysis:
        """Step 5: Analyze Debt Management"""
        prompt = f"""Based on the restructured client data, analyze the debt management aspects.

Answer these questions:

1. **Summary Paragraph**: Provide a 2-3 sentence summary of the clients' debt situation and repayment strategy.

2. **Debt Repayment Priority**: On a scale of 1-10, how important is debt repayment for these clients? Consider:
   - Total debt levels
   - Interest rates
   - Debt-to-income ratio
   - Stated concerns
   Output: Single number 1-10

Format your response as:
Summary Paragraph: [your summary]
Debt Repayment Priority: [number]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_debt_analysis(response)
    
    def step6_identify_coverage_gaps(self, restructured_data: str) -> CoverageGaps:
        """Step 6: Identify Coverage Gaps"""
        prompt = f"""Based on the restructured client data, identify what areas are adequately covered vs gaps.

For each category below, respond with either "true" or "false":

1. Investment Covered: Do the clients have adequate investment assets?
2. Superannuation Covered: Do the clients have adequate superannuation for retirement?
3. Centrelink Covered: Are Centrelink benefits optimized or relevant?
4. Cashflow Covered: Is cashflow management adequate?
5. Debt Covered: Is debt at manageable levels or being addressed?

Output format (semicolon-separated, no spaces):
true;false;true;true;false

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_coverage_gaps(response)
    
    def step7_extract_strategies(self, restructured_data: str) -> List[Strategy]:
        """Step 7: Extract Advisor Strategies"""
        prompt = f"""Based on the advisor input section, extract up to 6 distinct strategies recommended by the advisor.

For each strategy, provide:
- Strategy Name (brief, 2-5 words)
- Strategy Description (1-2 sentences explaining the strategy)

If fewer than 6 strategies exist, output only the ones present.
If no strategies are mentioned, output "(No strategies provided)"

Format:
Strategy 1: [Name]
Description: [Description]

Strategy 2: [Name]
Description: [Description]

[Continue for all strategies]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_strategies(response)
    
    def step8_extract_objectives(self, restructured_data: str) -> List[Objective]:
        """Step 8: Extract Goals and Objectives"""
        prompt = f"""Based on the client data and advisor input, identify up to 3 primary client objectives/goals.

For each objective, provide:
1. **Objective Name**: Brief title (3-7 words)
2. **Exists**: Does this objective exist? (true/false)
3. **Progress**: What progress has been made? (Not Started/In Progress/Achieved)
4. **Benefits**: What are the expected benefits? (1-2 sentences)
5. **Amount** (if applicable): Dollar amount associated with the goal (for retirement goals)

Format each as:
Objective 1:
Name: [Name]
Exists: [true/false]
Progress: [status]
Benefits: [description]
Amount: [number or N/A]

[Repeat for Objectives 2 and 3]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_objectives(response)
    
    def step9_extract_recommendations(self, restructured_data: str) -> tuple[List[ClientRecommendation], List[ClientRecommendation]]:
        """Step 9: Extract Client-Specific Recommendations"""
        prompt = f"""Based on the advisor recommendations, extract up to 3 specific recommendations for each client.

For Client 1:
1. **Recommendation 1 Exists**: true/false
2. **Recommendation 1 Description**: [description]
3. **Recommendation 2 Exists**: true/false
4. **Recommendation 2 Description**: [description]
5. **Recommendation 3 Exists**: true/false
6. **Recommendation 3 Description**: [description]

For Client 2:
[Same format as Client 1]

If recommendations are not client-specific, apply them to both clients.

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_recommendations(response)
    
    def step10_analyze_risk_profile(self, restructured_data: str) -> RiskProfile:
        """Step 10: Analyze Investment Risk Profile"""
        prompt = f"""Based on the client information (age, income, assets, goals, health, work status), determine the appropriate investor risk profile.

Consider:
- Age and time horizon
- Income stability
- Asset base
- Risk tolerance indicators from goals
- Financial obligations

Output:
1. **Investor Risk Profile**: One of: Conservative / Moderate / Balanced / Growth / Aggressive
2. **Analysis Rationale**: 2-3 sentences explaining why this profile is appropriate

Format:
Investor Risk Profile: [profile]
Analysis Rationale: [explanation]

Client Data:
{restructured_data}
"""
        response = self._call_openai(prompt)
        return self._parse_risk_profile(response)
    
    # Helper methods for formatting and parsing
    
    def _format_client_data_for_ai(self, client_data: ClientData) -> str:
        """Convert ClientData to formatted text for AI processing"""
        lines = []
        
        # Client Information
        lines.append("=== CLIENT INFORMATION ===")
        lines.append(f"Client 1 Name: {client_data.clientInfo.client1.name}")
        lines.append(f"Client 1 DOB: {client_data.clientInfo.client1.dob}")
        lines.append(f"Client 1 Gross Salary: ${client_data.clientInfo.client1.grossSalary:,.2f}")
        lines.append(f"Client 1 Super Balance: ${client_data.clientInfo.client1.superBalance:,.2f}")
        lines.append(f"Client 1 Health: {client_data.clientInfo.client1.health}")
        lines.append(f"Client 1 Work Status: {client_data.clientInfo.client1.workStatus}")
        
        if client_data.clientInfo.client2:
            lines.append(f"\nClient 2 Name: {client_data.clientInfo.client2.name}")
            lines.append(f"Client 2 DOB: {client_data.clientInfo.client2.dob}")
            lines.append(f"Client 2 Gross Salary: ${client_data.clientInfo.client2.grossSalary:,.2f}")
            lines.append(f"Client 2 Super Balance: ${client_data.clientInfo.client2.superBalance:,.2f}")
            lines.append(f"Client 2 Health: {client_data.clientInfo.client2.health}")
            lines.append(f"Client 2 Work Status: {client_data.clientInfo.client2.workStatus}")
        
        lines.append(f"\nConsultation Date: {client_data.clientInfo.consultationDate}")
        lines.append(f"Advisor Name: {client_data.clientInfo.advisorName}")
        
        # Financial Summary
        lines.append("\n=== FINANCIAL SUMMARY ===")
        lines.append(f"Total Lifestyle Assets: ${client_data.financialSummary.totalLifestyleAssets:,.2f}")
        lines.append(f"Total Living Expenses: ${client_data.financialSummary.totalLivingExpenses:,.2f}")
        lines.append(f"Total Investment Assets: ${client_data.financialSummary.totalInvestmentAssets:,.2f}")
        lines.append(f"Total Superannuation Assets: ${client_data.financialSummary.totalSuperannuationAssets:,.2f}")
        lines.append(f"Total Client Loans: ${client_data.financialSummary.totalClientLoans:,.2f}")
        lines.append(f"Total Client Insurance: ${client_data.financialSummary.totalClientInsurance:,.2f}")
        
        # Detailed Assets
        lines.append("\n=== LIFESTYLE ASSETS ===")
        for i, asset in enumerate(client_data.detailedAssets.lifestyleAssets, 1):
            lines.append(f"{i}. {asset.name} - ${asset.value:,.2f} (Owner: {asset.owner})")
        
        lines.append("\n=== INVESTMENT ASSETS ===")
        for i, asset in enumerate(client_data.detailedAssets.investmentAssets, 1):
            lines.append(f"{i}. {asset.name} - ${asset.value:,.2f} (Owner: {asset.owner})")
        
        lines.append("\n=== SUPERANNUATION ASSETS ===")
        for i, asset in enumerate(client_data.detailedAssets.superannuationAssets, 1):
            lines.append(f"{i}. {asset.fundName} - ${asset.balance:,.2f} (Owner: {asset.owner}, Option: {asset.investmentOption})")
        
        # Liabilities
        lines.append("\n=== LIABILITIES ===")
        for i, loan in enumerate(client_data.detailedLiabilities.loans, 1):
            lines.append(f"{i}. {loan.type} with {loan.lender} - Balance: ${loan.balance:,.2f}, Rate: {loan.interestRate}%, Repayment: ${loan.repayment:,.2f} (Owner: {loan.owner})")
        
        # Insurance
        lines.append("\n=== INSURANCE POLICIES ===")
        for i, policy in enumerate(client_data.detailedInsurance.policies, 1):
            lines.append(f"{i}. {policy.type} with {policy.provider} - Premium: ${policy.premium:,.2f}, Sum Insured: ${policy.sumInsured:,.2f} (Owner: {policy.owner})")
        
        # Advice Context
        lines.append("\n=== ADVICE CONTEXT ===")
        lines.append(f"Reasons for Advice: {client_data.adviceContext.reasonsForAdvice}")
        lines.append(f"Current Situation: {client_data.adviceContext.currentSituation}")
        lines.append(f"Concerns: {client_data.adviceContext.concerns}")
        
        # Advisor Input
        lines.append("\n=== ADVISOR INPUT ===")
        lines.append(f"Analysis: {client_data.advisorInput.analysis}")
        lines.append(f"Recommendations: {client_data.advisorInput.recommendations}")
        lines.append(f"Strategies: {client_data.advisorInput.strategies}")
        lines.append(f"Next Steps: {client_data.advisorInput.nextSteps}")
        
        return "\n".join(lines)
    
    def _parse_retirement_analysis(self, response: str) -> RetirementAnalysis:
        """Parse retirement analysis response"""
        lines = response.strip().split('\n')
        summary = ""
        priority = 5
        timeline = 10
        
        for line in lines:
            if line.startswith("Summary Paragraph:"):
                summary = line.replace("Summary Paragraph:", "").strip()
            elif line.startswith("Retirement Priority:"):
                try:
                    priority = int(re.search(r'\d+', line).group())
                except:
                    priority = 5
            elif line.startswith("Retirement Timeline:"):
                try:
                    timeline = int(re.search(r'\d+', line).group())
                except:
                    timeline = 10
        
        return RetirementAnalysis(
            summaryParagraph=summary,
            retirementPriority=priority,
            retirementTimeline=timeline
        )
    
    def _parse_cashflow_analysis(self, response: str) -> CashflowAnalysis:
        """Parse cashflow analysis response"""
        lines = response.strip().split('\n')
        summary = ""
        priority = 5
        
        for line in lines:
            if line.startswith("Summary Paragraph:"):
                summary = line.replace("Summary Paragraph:", "").strip()
            elif line.startswith("Cashflow Priority:"):
                try:
                    priority = int(re.search(r'\d+', line).group())
                except:
                    priority = 5
        
        return CashflowAnalysis(
            summaryParagraph=summary,
            cashflowPriority=priority
        )
    
    def _parse_debt_analysis(self, response: str) -> DebtAnalysis:
        """Parse debt analysis response"""
        lines = response.strip().split('\n')
        summary = ""
        priority = 5
        
        for line in lines:
            if line.startswith("Summary Paragraph:"):
                summary = line.replace("Summary Paragraph:", "").strip()
            elif line.startswith("Debt Repayment Priority:"):
                try:
                    priority = int(re.search(r'\d+', line).group())
                except:
                    priority = 5
        
        return DebtAnalysis(
            summaryParagraph=summary,
            debtRepaymentPriority=priority
        )
    
    def _parse_coverage_gaps(self, response: str) -> CoverageGaps:
        """Parse coverage gaps response"""
        # Expected format: true;false;true;true;false
        parts = response.strip().split(';')
        return CoverageGaps(
            investmentCovered=parts[0].strip().lower() == 'true' if len(parts) > 0 else False,
            superannuationCovered=parts[1].strip().lower() == 'true' if len(parts) > 1 else False,
            centrelinkCovered=parts[2].strip().lower() == 'true' if len(parts) > 2 else False,
            cashflowCovered=parts[3].strip().lower() == 'true' if len(parts) > 3 else False,
            debtCovered=parts[4].strip().lower() == 'true' if len(parts) > 4 else False
        )
    
    def _parse_strategies(self, response: str) -> List[Strategy]:
        """Parse strategies response"""
        strategies = []
        lines = response.strip().split('\n')
        current_strategy = None
        current_description = None
        
        for line in lines:
            if line.startswith("Strategy"):
                if current_strategy and current_description:
                    strategies.append(Strategy(name=current_strategy, description=current_description))
                current_strategy = line.split(":", 1)[1].strip() if ":" in line else ""
                current_description = None
            elif line.startswith("Description:"):
                current_description = line.replace("Description:", "").strip()
        
        # Add last strategy
        if current_strategy and current_description:
            strategies.append(Strategy(name=current_strategy, description=current_description))
        
        return strategies[:6]  # Max 6 strategies
    
    def _parse_objectives(self, response: str) -> List[Objective]:
        """Parse objectives response"""
        objectives = []
        lines = response.strip().split('\n')
        current_obj = {}
        
        for line in lines:
            if line.startswith("Objective"):
                if current_obj:
                    objectives.append(Objective(**current_obj))
                    current_obj = {}
            elif line.startswith("Name:"):
                current_obj['name'] = line.replace("Name:", "").strip()
            elif line.startswith("Exists:"):
                current_obj['exists'] = 'true' in line.lower()
            elif line.startswith("Progress:"):
                current_obj['progress'] = line.replace("Progress:", "").strip()
            elif line.startswith("Benefits:"):
                current_obj['benefits'] = line.replace("Benefits:", "").strip()
            elif line.startswith("Amount:"):
                amount_str = line.replace("Amount:", "").strip()
                try:
                    current_obj['amount'] = float(re.sub(r'[^\d.]', '', amount_str))
                except:
                    current_obj['amount'] = None
        
        if current_obj:
            objectives.append(Objective(**current_obj))
        
        return objectives[:3]  # Max 3 objectives
    
    def _parse_recommendations(self, response: str) -> tuple[List[ClientRecommendation], List[ClientRecommendation]]:
        """Parse client recommendations response"""
        client1_recs = []
        client2_recs = []
        
        lines = response.strip().split('\n')
        current_client = None
        
        for line in lines:
            if "Client 1" in line:
                current_client = 1
            elif "Client 2" in line:
                current_client = 2
            elif "Recommendation" in line and "Exists" in line:
                exists = 'true' in line.lower()
            elif "Recommendation" in line and "Description" in line:
                desc = line.split(":", 1)[1].strip() if ":" in line else ""
                rec = ClientRecommendation(exists=exists, description=desc)
                if current_client == 1:
                    client1_recs.append(rec)
                elif current_client == 2:
                    client2_recs.append(rec)
        
        # Ensure we have exactly 3 recommendations per client
        while len(client1_recs) < 3:
            client1_recs.append(ClientRecommendation(exists=False, description=""))
        while len(client2_recs) < 3:
            client2_recs.append(ClientRecommendation(exists=False, description=""))
        
        return client1_recs[:3], client2_recs[:3]
    
    def _parse_risk_profile(self, response: str) -> RiskProfile:
        """Parse risk profile response"""
        lines = response.strip().split('\n')
        profile = "Balanced"
        rationale = ""
        
        for line in lines:
            if line.startswith("Investor Risk Profile:"):
                profile = line.replace("Investor Risk Profile:", "").strip()
            elif line.startswith("Analysis Rationale:"):
                rationale = line.replace("Analysis Rationale:", "").strip()
        
        return RiskProfile(profile=profile, rationale=rationale)




import openaiService, { OpenAIServiceError } from './service';
import { AdvisorRecommendation } from '../supabase/advisorRecommendations';
import { ProductRecommendation } from '../supabase/productRecommendations';

/**
 * Interface for the extracted recommendations
 */
export interface ExtractedRecommendations {
  advisorRecommendations: string[];
  productRecommendations: Array<{
    name: string;
    description?: string;
    amount?: number;
    clientAllocation?: string;
  }>;
}

/**
 * Service for extracting recommendations from advisor advice text
 */
export const recommendationExtractor = {
  /**
   * Extract recommendations from advisor advice text using OpenAI
   * @param advisorAdvice The advisor advice text
   * @param clientId The client ID
   * @returns The extracted recommendations
   */
  async extractRecommendations(
    advisorAdvice: string,
    clientId: string
  ): Promise<ExtractedRecommendations> {
    // Fallback extraction using regex patterns
    const fallbackExtraction = () => {
      console.log('Using fallback extraction method');
      console.log('Advisor advice content:', advisorAdvice);
      
      // Extract advisor recommendations using regex
      const advisorRecommendations: string[] = [];
      
      // First try to find emoji-marked sections
      const strategicSectionRegex = /(?:🧭|🔍|📝)\s*(?:Strategic|Non-Product)\s*(?:Recommendations|Advice)[\s\S]*?(?=(?:🧾|\n\n\S)|$)/i;
      console.log('Looking for strategic section with regex:', strategicSectionRegex);
      
      const strategicSection = advisorAdvice.match(strategicSectionRegex);
      console.log('Strategic section match result:', strategicSection ? 'Found' : 'Not found');
      
      if (strategicSection) {
        console.log('Strategic section content:', strategicSection[0]);
        // Extract each recommendation
        const strategicBlocks = strategicSection[0].split(/\n\n/);
        console.log('Strategic blocks count:', strategicBlocks.length);
        
        // Skip the section header
        for (let i = 1; i < strategicBlocks.length; i++) {
          const block = strategicBlocks[i].trim();
          if (block) {
            console.log('Adding strategic recommendation:', block);
            advisorRecommendations.push(block);
          }
        }
      }
      
      // If no strategic recommendations found, try to find any bullet points or numbered lists
      if (advisorRecommendations.length === 0) {
        console.log('No strategic recommendations found, looking for bullet points');
        const bulletPoints = advisorAdvice.match(/(?:^|\n)[•\-\*\d\.\)]+\s*([^\n]+)/g);
        if (bulletPoints) {
          bulletPoints.forEach(point => {
            const cleaned = point.replace(/^[\s•\-\*\d\.\)]+\s*/, '').trim();
            if (cleaned) {
              console.log('Adding bullet point recommendation:', cleaned);
              advisorRecommendations.push(cleaned);
            }
          });
        }
      }
      
      // Extract product recommendations using regex
      const productRecommendations: Array<{name: string, description?: string}> = [];
      
      // Look for product recommendations section with emoji marker
      const productSectionRegex = /(?:🧾|📝|📈)\s*(?:Product-Based|Product)\s*(?:Recommendations|Advice)[\s\S]*?(?=(?:🧭|\n\n\S)|$)/i;
      console.log('Looking for product section with regex:', productSectionRegex);
      
      const productSection = advisorAdvice.match(productSectionRegex);
      console.log('Product section match result:', productSection ? 'Found' : 'Not found');
      
      if (productSection) {
        console.log('Product section content:', productSection[0]);
        // Extract each product recommendation block
        const productBlocks = productSection[0].split(/\n\n/);
        console.log('Product blocks count:', productBlocks.length);
        
        // Skip the section header
        for (let i = 1; i < productBlocks.length; i++) {
          const block = productBlocks[i].trim();
          if (!block) continue;
          
          // Try to extract product name and description
          // First look for "Product:" pattern
          const productMatch = block.match(/Product:\s*([^\n]+)/i);
          if (productMatch) {
            const name = productMatch[1].trim();
            
            // Look for Action: pattern for description
            const actionMatch = block.match(/Action:\s*([^\n]+(?:\n[^\n]+)*)/i);
            const description = actionMatch ? actionMatch[1].trim() : undefined;
            
            console.log('Adding product recommendation with Product/Action pattern:', name);
            productRecommendations.push({ name, description });
          } else {
            // If no Product: pattern, try to extract from the title line
            const lines = block.split(/\n/);
            if (lines.length > 0) {
              const name = lines[0].trim();
              const description = lines.length > 1 ? lines.slice(1).join(' ').trim() : undefined;
              console.log('Adding product recommendation from block:', name);
              productRecommendations.push({ name, description });
            }
          }
        }
      }
      
      // If no product recommendations found, try to find product names throughout the text
      if (productRecommendations.length === 0) {
        console.log('No product recommendations found, looking for product names');
        const productPatterns = [
          /(?:Vanguard|iShares|SPDR|Betashares|Magellan|Platinum|Fidelity|BlackRock|State Street|Challenger|Macquarie|REST|AustralianSuper|HostPlus|Colonial)[\s\w]+(?:ETF|Fund|Account|Annuity|CMA|Portfolio|Trust|Super|Pension|Loan)/g,
          /(?:^|\n)[•\-\*\d\.\)]*\s*([A-Za-z0-9\s]+(?:ETF|Fund|Account|Annuity|CMA|Portfolio|Trust|Super|Pension|Loan))/gm
        ];
        
        productPatterns.forEach(pattern => {
          const matches = advisorAdvice.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const name = match.trim();
              if (name && !productRecommendations.some(p => p.name === name)) {
                console.log('Adding product recommendation from pattern:', name);
                productRecommendations.push({ name });
              }
            });
          }
        });
      }
      
      return { advisorRecommendations, productRecommendations };
    };
    
    try {
      console.log('Starting recommendation extraction for client:', clientId);
      console.log('Advisor advice length:', advisorAdvice.length);
      
      // Create a prompt for the OpenAI API
      const prompt = `
You are a financial advisor assistant that extracts and categorizes recommendations from advisor notes.

Please analyze the following advisor advice text and extract two types of recommendations:

1. Strategic (non-product) recommendations: These are general advice or strategies that don't involve specific financial products. For each strategic recommendation:
   - Include specific details about the recommendation
   - Include any relevant timeframes, amounts, or percentages mentioned
   - Include the rationale or benefit of the recommendation if mentioned
   - Keep each recommendation concise but comprehensive (aim for 15-25 words)
   - Ensure each recommendation is actionable and clear

2. Product recommendations: These are specific financial products or services being recommended.

For each product recommendation, include:
- The exact product name (be specific with the exact fund, account type, etc.)
- A detailed description including:
  - Specific actions to take with the product (e.g., "Contribute $X monthly")
  - Purpose of the product recommendation
  - Any relevant amounts, percentages, or timeframes
- The amount in dollars associated with the product (if mentioned)
- The client allocation, indicating who the product is for: "Client 1", "Client 2", or "Joint"

Return your analysis in the following JSON format:
{
  "advisorRecommendations": [
    "First detailed strategic recommendation with specifics and rationale",
    "Second detailed strategic recommendation with specifics and rationale",
    ...
  ],
  "productRecommendations": [
    {
      "name": "Specific Product Name",
      "description": "Detailed action and purpose with specific amounts and timeframes",
      "amount": 10000,
      "clientAllocation": "Client 1" or "Client 2" or "Joint"
    },
    ...
  ]
}

Advisor Advice:
${advisorAdvice}
`;

      try {
        console.log('Sending request to OpenAI API');
        // Send the prompt to the OpenAI API
        const response = await openaiService.sendRequest(prompt, {
          model: 'gpt-3.5-turbo',
          temperature: 0.2,
          maxTokens: 1500,
        });

        console.log('Received response from OpenAI API');
        
        // Extract the content from the response
        const content = response.choices[0]?.message?.content;
        if (!content) {
          console.error('No content in OpenAI response');
          throw new Error('No content in OpenAI response');
        }

        // Parse the JSON response
        try {
          console.log('Parsing OpenAI response');
          // Clean the content in case it has markdown code blocks
          let cleanedContent = content;
          
          // Remove markdown code blocks if present
          if (content.includes('```json')) {
            cleanedContent = content.replace(/```json\n/g, '').replace(/```/g, '');
          }
          
          // Try to find a JSON object in the response
          const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/g);
          if (jsonMatch) {
            cleanedContent = jsonMatch[0];
          }
          
          console.log('Cleaned content for parsing:', cleanedContent);
          
          const parsedResponse = JSON.parse(cleanedContent) as ExtractedRecommendations;
          
          // Validate the response structure
          if (!Array.isArray(parsedResponse.advisorRecommendations) || 
              !Array.isArray(parsedResponse.productRecommendations)) {
            console.error('Invalid response structure from OpenAI');
            throw new Error('Invalid response structure');
          }
          
          console.log('Successfully extracted recommendations:', {
            advisorRecommendations: parsedResponse.advisorRecommendations.length,
            productRecommendations: parsedResponse.productRecommendations.length
          });
          
          return parsedResponse;
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', content);
          console.error('Parse error:', parseError);
          
          // Try to manually extract the JSON from the response
          try {
            console.log('Attempting manual JSON extraction');
            
            // Extract advisor recommendations
            const advisorRecommendations: string[] = [];
            const advisorMatch = content.match(/"advisorRecommendations":\s*\[([^\]]+)\]/s);
            if (advisorMatch && advisorMatch[1]) {
              const recommendations = advisorMatch[1].split(',').map(r => r.trim().replace(/^"(.*)"$/, '$1'));
              advisorRecommendations.push(...recommendations.filter(r => r.length > 0));
            }
            
            // Extract product recommendations
            const productRecommendations: Array<{name: string, description?: string}> = [];
            const productMatch = content.match(/"productRecommendations":\s*\[([^\]]+)\]/s);
            if (productMatch && productMatch[1]) {
              const productBlocks = productMatch[1].split('},');
              productBlocks.forEach(block => {
                const nameMatch = block.match(/"name":\s*"([^"]+)"/s);
                const descMatch = block.match(/"description":\s*"([^"]+)"/s);
                
                if (nameMatch) {
                  productRecommendations.push({
                    name: nameMatch[1],
                    description: descMatch ? descMatch[1] : undefined
                  });
                }
              });
            }
            
            if (advisorRecommendations.length > 0 || productRecommendations.length > 0) {
              console.log('Manual extraction successful:', {
                advisorRecommendations: advisorRecommendations.length,
                productRecommendations: productRecommendations.length
              });
              return { advisorRecommendations, productRecommendations };
            }
            
            console.log('Manual extraction failed, falling back to regex extraction');
            return fallbackExtraction();
          } catch (manualError) {
            console.error('Manual extraction error:', manualError);
            console.log('Falling back to regex extraction');
            return fallbackExtraction();
          }
        }
      } catch (apiError) {
        console.error('OpenAI API error:', apiError);
        console.log('Falling back to regex extraction');
        return fallbackExtraction();
      }
    } catch (error) {
      console.error('Error in extractRecommendations:', error);
      if (error instanceof OpenAIServiceError) {
        console.log('OpenAI service error, falling back to regex extraction');
        return fallbackExtraction();
      }
      
      // Last resort fallback
      try {
        return fallbackExtraction();
      } catch (fallbackError) {
        console.error('Even fallback extraction failed:', fallbackError);
        // Return empty results as absolute last resort
        return { advisorRecommendations: [], productRecommendations: [] };
      }
    }
  },

  /**
   * Format extracted recommendations for the advisor recommendations table
   * @param recommendations The extracted recommendations
   * @param clientId The client ID
   * @returns The formatted advisor recommendations
   */
  formatAdvisorRecommendations(
    recommendations: string[],
    clientId: string
  ): AdvisorRecommendation[] {
    return recommendations.map((text, index) => ({
      client_id: clientId,
      recommendation_text: text,
      position: index,
    }));
  },

  /**
   * Format extracted product recommendations for the product recommendations table
   * @param recommendations The extracted product recommendations
   * @param clientId The client ID
   * @returns The formatted product recommendations
   */
  formatProductRecommendations(
    recommendations: Array<{ 
      name: string; 
      description?: string;
      amount?: number;
      clientAllocation?: string;
    }>,
    clientId: string
  ): ProductRecommendation[] {
    return recommendations.map((rec) => {
      // Validate client allocation
      let clientAllocation: 'Client 1' | 'Client 2' | 'Joint' = 'Joint';
      if (rec.clientAllocation) {
        if (['Client 1', 'Client 2', 'Joint'].includes(rec.clientAllocation)) {
          clientAllocation = rec.clientAllocation as 'Client 1' | 'Client 2' | 'Joint';
        }
      }
      
      return {
        client_id: clientId,
        product_name: rec.description 
          ? `${rec.name}: ${rec.description}` 
          : rec.name,
        amount: rec.amount || 0, // Use provided amount or default to 0
        client_allocation: clientAllocation,
      };
    });
  },
};

export default recommendationExtractor;

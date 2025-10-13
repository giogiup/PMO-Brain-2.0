class PMOPrompts {
    constructor() {
        this.version = "v1.0-inference";
        this.lastUpdated = new Date().toISOString();
    }

    // Refined single-step prompt with better infrastructure filtering
    getSimplifiedSinglePrompt(article) {
        return `Rate PMO relevance (0-100):

"${article.title}"

HIGH scores (70-100) - Direct PMO value:
- "Microsoft Project adds AI scheduling"
- "New workflow automation platform"
- "AI predicts project risks and delays"
- "Resource allocation optimization tool"

MEDIUM scores (40-69) - Business tools PMOs could adapt:
- "Real-time data analytics dashboard"
- "Team collaboration automation system"
- "Process efficiency monitoring software"
- "AI-powered document management"

LOW scores (20-39) - General business/tech:
- "Enterprise cloud infrastructure updates"
- "New programming language released"
- "Company raises funding for expansion"

VERY LOW scores (0-19) - Not business operational:
- "Consumer app features"
- "Gaming industry news"
- "Geopolitical/supply chain news"
- "Hardware manufacturing updates"
- "Investment/funding announcements"
- "Entertainment content"

Key question: Could this help a PMO manage projects, resources, or teams better?

Think about: workflow automation, data insights, team coordination, planning tools.
Avoid: infrastructure, geopolitics, hardware, funding news.

Score:`;
    }

    // Step 1: Identify the core technology capability
    getTechnologyCapabilityPrompt(article) {
        return `Identify the core technology capability described in this content:

"${article.title}"
${article.summary || ''}

Focus on: What specific capability or function does this technology provide?

Examples:
- "Automates data processing workflows"
- "Provides real-time predictive analytics"
- "Enables autonomous decision-making"
- "Streamlines communication between teams"

Respond with a single clear capability statement:`;
    }

    // Step 2: Map to common PMO challenges
    getPMOChallengePrompt(article, capability) {
        return `Given this technology capability: "${capability}"

What common PMO/project management challenges could this address?

Common PMO Challenges:
- Resource allocation and capacity planning
- Project timeline and milestone tracking
- Risk identification and mitigation
- Stakeholder communication and reporting
- Portfolio visibility and governance
- Team coordination and collaboration
- Budget tracking and cost management
- Process standardization and compliance
- Performance measurement and KPIs
- Change management and transformation

List 2-3 specific PMO challenges this capability could solve:`;
    }

    // Step 3: Reasoning about practical application
    getApplicationReasoningPrompt(article, capability, challenges) {
        return `Technology Capability: "${capability}"
PMO Challenges it could address: "${challenges}"

How would a PMO Director practically implement this to solve these challenges?

Consider:
- Would this integrate with existing PMO processes?
- What specific workflows would improve?
- How would project teams benefit?
- What measurable outcomes would result?

Provide a concise practical application scenario:`;
    }

    // Step 4: Final scoring based on inference strength
    getFinalScoringPrompt(article, capability, challenges, reasoning) {
        return `Based on this analysis:

Original Content: "${article.title}"
Technology Capability: "${capability}"
PMO Challenges: "${challenges}"  
Practical Application: "${reasoning}"

Score the PMO relevance potential (0-100):

Scoring Guidelines:
90-100: Direct PMO tool or process (Microsoft Project updates, PMO software)
70-89: Strong indirect application (workflow automation, predictive analytics)
50-69: Moderate application potential (business tools adaptable for PMOs)
30-49: Weak connection (general business technology)
10-29: Minimal relevance (consumer apps, entertainment)
0-9: No PMO application (sports, lifestyle, unrelated content)

Consider:
- Strength of the inference connection
- Practical implementation feasibility
- Potential impact on PMO operations
- Likelihood a PMO Director would find this actionable

Respond with just the numerical score (0-100):`;
    }

    // Alternative simplified prompts for testing different approaches
    getSimplifiedInferencePrompt(article) {
        return `Rate PMO application potential for this technology (0-100):

"${article.title}"
${article.summary || ''}

Key Question: Could a PMO Director use this to improve project management operations?

Score:
80-100: Direct PMO application
60-79: Strong business application for project teams  
40-59: Moderate potential with adaptation
20-39: Weak connection to PMO work
0-19: No PMO relevance

Score only:`;
    }

    // Direct relevance check (for comparison testing)
    getDirectRelevancePrompt(article) {
        return `Score direct PMO relevance (0-100):

"${article.title}"
${article.summary || ''}

Direct PMO Keywords:
- Project management, PMO, portfolio, program
- Planning, scheduling, Gantt, timeline, milestone
- Resource allocation, capacity, workload
- Risk management, governance, compliance
- Stakeholder communication, reporting
- Agile, scrum, waterfall, methodology
- Team coordination, collaboration

High scores only for explicit PMO/project management content.

Score only:`;
    }

    // Version info and prompt selection
    getPromptInfo() {
        return {
            version: this.version,
            lastUpdated: this.lastUpdated,
            availablePrompts: [
                'getTechnologyCapabilityPrompt',
                'getPMOChallengePrompt', 
                'getApplicationReasoningPrompt',
                'getFinalScoringPrompt',
                'getSimplifiedInferencePrompt',
                'getDirectRelevancePrompt'
            ]
        };
    }

    // Test different prompt approaches
    async testPromptApproach(article, approach = 'multi-step') {
        switch(approach) {
            case 'multi-step':
                return 'multi-step-inference'; // Use the 4-step process
            case 'simplified':
                return this.getSimplifiedInferencePrompt(article);
            case 'direct':
                return this.getDirectRelevancePrompt(article);
            default:
                throw new Error(`Unknown approach: ${approach}`);
        }
    }
}

module.exports = PMOPrompts;
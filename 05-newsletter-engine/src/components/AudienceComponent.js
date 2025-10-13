class AudienceComponent {
  constructor() {
    this.audienceProfiles = {
      'pmo_professionals': {
        title: "PMO Professionals & Project Managers",
        description: "Experienced PMO leaders seeking proven methodologies and frameworks"
      },
      'tech_adopters': {
        title: "Technology-Forward PMO Teams", 
        description: "PMO professionals exploring AI and emerging technology applications"
      },
      'ai_enthusiasts': {
        title: "AI-Curious Project Leaders",
        description: "Project managers interested in AI-powered project management solutions"
      },
      'mixed_audience': {
        title: "PMO & Technology Professionals",
        description: "Cross-functional teams bridging traditional PMO practices with modern technology"
      },
      'general_pmo': {
        title: "Project Management Community",
        description: "PMO practitioners, project managers, and organizational leaders"
      }
    };
  }

  process(analysisData) {
    // Handle single analysis or array of analyses
    const analyses = Array.isArray(analysisData) ? analysisData : [analysisData];
    
    if (analyses.length === 0) {
      return this.audienceProfiles.general_pmo;
    }

    // Analyze content characteristics
    const contentTypes = analyses.map(a => a.contentType?.toLowerCase() || '');
    const hasAIContent = contentTypes.some(type => 
      type.includes('ai') || type.includes('artificial intelligence'));
    const hasTechContent = contentTypes.some(type => 
      type.includes('technology') || type.includes('blockchain') || type.includes('automation'));
    const hasPMOContent = contentTypes.some(type => 
      type.includes('pmo') || type.includes('project'));

    // Check inference levels
    const highInferenceCount = analyses.filter(analysis => 
      analysis.inferenceFlags?.inferenceRatio > 0.7).length;
    const lowInferenceCount = analyses.filter(analysis => 
      analysis.inferenceFlags?.inferenceRatio < 0.3).length;

    // Check for explicit PMO content
    const hasExplicitPMO = analyses.some(analysis => 
      analysis.inferenceFlags?.hasExplicitPMOContent);

    // Determine audience based on content analysis
    if (hasExplicitPMO && lowInferenceCount > 0) {
      return this.audienceProfiles.pmo_professionals;
    } else if (hasAIContent && highInferenceCount > 0) {
      return this.audienceProfiles.ai_enthusiasts;
    } else if (hasTechContent && highInferenceCount > 0) {
      return this.audienceProfiles.tech_adopters;
    } else if ((hasAIContent || hasTechContent) && hasPMOContent) {
      return this.audienceProfiles.mixed_audience;
    } else {
      return this.audienceProfiles.general_pmo;
    }
  }
}

module.exports = AudienceComponent;

const TaglineComponent = require('./components/TaglineComponent');
const AudienceComponent = require('./components/AudienceComponent');

class NewsletterModule {
  constructor() {
    this.taglineComponent = new TaglineComponent();
    this.audienceComponent = new AudienceComponent();
  }

  async generateNewsletter(analyzedArticles, newsletterMetadata) {
    const tagline = this.taglineComponent.process({ newsletterMetadata });
    const audience = this.audienceComponent.process({ newsletterMetadata });
    return {
      tagline,
      audience,
      articles: analyzedArticles
    };
  }
}

module.exports = NewsletterModule;

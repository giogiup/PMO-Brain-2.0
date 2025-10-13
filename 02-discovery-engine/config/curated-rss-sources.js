// PMO Brain 2.0 - Curated RSS Sources Configuration
// File: 02-discovery-engine/config/curated-rss-sources.js
// Purpose: External RSS feed configuration for easy maintenance
// Last Updated: Optimized for PMO relevance, reduced noise sources

const curatedRSSSources = [
  // TIER 1: AI NEWS (42 working feeds - all kept for inference potential)
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', tier: 'ai-news' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', tier: 'ai-news' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', tier: 'ai-news' },
  { name: 'AI News', url: 'https://www.artificialintelligence-news.com/feed/', tier: 'ai-news' },
  { name: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml', tier: 'ai-news' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss', tier: 'ai-news' },
  { name: 'Mashable Tech', url: 'https://mashable.com/feeds/rss/tech', tier: 'ai-news' },
  { name: 'Engadget', url: 'https://www.engadget.com/rss.xml', tier: 'ai-news' },
  { name: 'Gizmodo', url: 'https://gizmodo.com/rss', tier: 'ai-news' },
  { name: 'Next Big Future', url: 'https://www.nextbigfuture.com/feed', tier: 'ai-news' },
  { name: 'Singularity Hub', url: 'https://singularityhub.com/feed/', tier: 'ai-news' },
  { name: 'IEEE Spectrum', url: 'https://spectrum.ieee.org/rss/fulltext', tier: 'ai-news' },
  { name: 'Tech Xplore', url: 'https://techxplore.com/rss-feed/', tier: 'ai-news' },
  { name: 'Science Daily AI', url: 'https://www.sciencedaily.com/rss/computers_math/artificial_intelligence.xml', tier: 'ai-news' },
  { name: 'NVIDIA Blog', url: 'https://blogs.nvidia.com/feed/', tier: 'ai-news' },
  { name: 'AWS ML Blog', url: 'https://aws.amazon.com/blogs/machine-learning/feed/', tier: 'ai-news' },
  { name: 'Facebook Engineering', url: 'https://engineering.fb.com/feed/', tier: 'ai-news' },
  { name: 'TensorFlow Blog', url: 'https://blog.tensorflow.org/feeds/posts/default', tier: 'ai-news' },
  { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', tier: 'ai-news' },
  { name: 'DeepMind', url: 'https://deepmind.com/blog/feed/basic/', tier: 'ai-news' },
  { name: 'Towards Data Science', url: 'https://towardsdatascience.com/feed', tier: 'ai-news' },
  { name: 'Analytics India', url: 'https://analyticsindiamag.com/feed/', tier: 'ai-news' },
  { name: 'The Register', url: 'https://www.theregister.com/headlines.atom', tier: 'ai-news' },
  { name: 'AI Business', url: 'https://aibusiness.com/rss.xml', tier: 'ai-news' },
  { name: 'AI Trends', url: 'https://www.aitrends.com/feed/', tier: 'ai-news' },
  { name: 'TechNode', url: 'https://technode.com/feed/', tier: 'ai-news' },
  { name: 'SiliconANGLE', url: 'https://siliconangle.com/feed/', tier: 'ai-news' },
  { name: 'PYMNTS AI', url: 'https://www.pymnts.com/artificial-intelligence/feed/', tier: 'ai-news' },
  { name: 'MarkTechPost', url: 'https://www.marktechpost.com/feed/', tier: 'ai-news' },
  { name: 'Robotics Business', url: 'https://www.roboticsbusinessreview.com/feed/', tier: 'ai-news' },
  { name: 'Emerj', url: 'https://emerj.com/feed/', tier: 'ai-news' },
  { name: 'Tech Monitor', url: 'https://techmonitor.ai/feed', tier: 'ai-news' },
  { name: 'BDTechTalks', url: 'https://bdtechtalks.com/feed/', tier: 'ai-news' },
  { name: 'Inside Big Data', url: 'https://insidebigdata.com/feed/', tier: 'ai-news' },
  { name: 'Voice Bot', url: 'https://voicebot.ai/feed/', tier: 'ai-news' },
  { name: 'Machine Learning Mastery', url: 'https://machinelearningmastery.com/feed/', tier: 'ai-news' },
  { name: 'KDnuggets', url: 'https://www.kdnuggets.com/feed', tier: 'ai-news' },
  { name: 'Analytics Vidhya', url: 'https://www.analyticsvidhya.com/feed/', tier: 'ai-news' },
  { name: 'AI Alignment Forum', url: 'https://www.alignmentforum.org/feed.xml', tier: 'ai-news' },
  { name: 'LessWrong AI', url: 'https://www.lesswrong.com/feed.xml', tier: 'ai-news' },
  { name: 'AI Now Institute', url: 'https://ainowinstitute.org/feed/', tier: 'ai-news' },
  { name: 'Partnership on AI', url: 'https://www.partnershiponai.org/feed/', tier: 'ai-news' },

  // TIER 2: BUSINESS (10 working feeds - all kept for business context)
  { name: 'MIT Sloan Review', url: 'https://sloanreview.mit.edu/feed/', tier: 'business' },
  { name: 'Wharton Knowledge', url: 'https://knowledge.wharton.upenn.edu/feed/', tier: 'business' },
  { name: 'Capgemini', url: 'https://www.capgemini.com/feed/', tier: 'business' },
  { name: 'CNBC Tech', url: 'https://www.cnbc.com/id/19854910/device/rss/rss.html', tier: 'business' },
  { name: 'Microsoft News', url: 'https://news.microsoft.com/feed/', tier: 'business' },
  { name: 'Google Blog', url: 'https://blog.google/rss/', tier: 'business' },
  { name: 'Amazon Science', url: 'https://www.amazon.science/blog/rss.xml', tier: 'business' },
  { name: 'IE Insights', url: 'https://www.ie.edu/insights/feed/', tier: 'business' },
  { name: 'IMD Business', url: 'https://www.imd.org/feed/', tier: 'business' },
  { name: 'IESE Insight', url: 'https://www.iese.edu/insight/feed/', tier: 'business' },

  // TIER 3: PMO (24 working feeds - all kept for direct PMO relevance)
  { name: 'HotPMO', url: 'https://hotpmo.com/feed/', tier: 'pmo' },
  { name: 'Digital Project Manager', url: 'https://thedigitalprojectmanager.com/feed/', tier: 'pmo' },
  { name: 'ProjectManager.com', url: 'https://www.projectmanager.com/blog/feed', tier: 'pmo' },
  { name: 'Project Management', url: 'https://www.projectmanagement.com/rss/', tier: 'pmo' },
  { name: 'PM Today', url: 'https://www.pmtoday.co.uk/feed/', tier: 'pmo' },
  { name: 'PM World 360', url: 'https://pmworldlibrary.net/feed/', tier: 'pmo' },
  { name: 'IPMA USA', url: 'https://www.ipma-usa.org/feed/', tier: 'pmo' },
  { name: 'PM Study Circle', url: 'https://pmstudycircle.com/feed/', tier: 'pmo' },
  { name: 'Project Managers', url: 'https://www.projectmanagers.org/feed/', tier: 'pmo' },
  { name: 'Practical PM', url: 'https://www.practicalpm.net/feed/', tier: 'pmo' },
  { name: 'Project Times', url: 'https://www.projecttimes.com/feed/', tier: 'pmo' },
  { name: 'Project Risk Coach', url: 'https://projectriskcoach.com/feed/', tier: 'pmo' },
  { name: 'Agile Alliance', url: 'https://www.agilealliance.org/feed/', tier: 'pmo' },
  { name: 'Scrum.org', url: 'https://www.scrum.org/feed', tier: 'pmo' },
  { name: 'Scaled Agile', url: 'https://www.scaledagile.com/feed/', tier: 'pmo' },
  { name: 'Mike Cohn Blog', url: 'https://www.mountaingoatsoftware.com/feed', tier: 'pmo' },
  { name: 'Agile For All', url: 'https://www.agileforall.com/feed/', tier: 'pmo' },
  { name: 'Agile Advice', url: 'https://www.agileadvice.com/feed/', tier: 'pmo' },
  { name: 'Scrum Expert', url: 'https://www.scrumexpert.com/feed/', tier: 'pmo' },
  { name: 'Agile Learning Labs', url: 'https://www.agilelearninglabs.com/feed/', tier: 'pmo' },
  { name: 'Lean Enterprise Institute', url: 'https://www.lean.org/feed/', tier: 'pmo' },
  { name: 'Kanban University', url: 'https://kanban.university/feed/', tier: 'pmo' },
  { name: 'PM World Journal', url: 'https://pmworldjournal.com/feed/', tier: 'pmo' },
  { name: 'International PM Association', url: 'https://www.ipma.world/feed/', tier: 'pmo' },

  // TIER 4: MICROSOFT (1 feed - kept for tool relevance)
  { name: 'Microsoft 365 Developer', url: 'https://developer.microsoft.com/en-us/microsoft-365/rss/', tier: 'tools' },

  // TIER 6: INDUSTRY (5 selected business-focused sources - 28 removed)
  { name: 'Enterprise AI', url: 'https://www.enterpriseai.news/feed/', tier: 'industry' },
  { name: 'ZDNet AI', url: 'https://www.zdnet.com/topic/artificial-intelligence/rss.xml', tier: 'industry' },
  { name: 'IT Business Edge', url: 'https://www.itbusinessedge.com/rss.xml', tier: 'industry' },
  { name: 'Datanami', url: 'https://www.datanami.com/feed/', tier: 'industry' },
  { name: 'IT Pro', url: 'https://www.itpro.co.uk/rss', tier: 'industry' },

  // TIER 7: STARTUP (3 business-focused sources - 3 funding sources removed)
  { name: 'Fast Company', url: 'https://www.fastcompany.com/rss', tier: 'startup' },
  { name: 'Inc.com', url: 'https://www.inc.com/rss', tier: 'startup' },
  { name: 'Sequoia Capital Blog', url: 'https://medium.com/feed/sequoia-capital', tier: 'startup' }
];

module.exports = curatedRSSSources;
-- SPEC-B27: Blog Source Expansion
-- Generated: 2026-02-24T20:07:20.678Z
-- Feeds validated: 69 | Passed: 55 | Failed: 14 | Timeout: 0
-- CONTRACT: PMO-ENGINE-DESIGN-CONTRACT.md §7 (Configuration), §8 (Rollback)
--
-- ROLLBACK: UPDATE source_registry SET enabled = 0 WHERE added_by = 'spec-b27';
-- REMOVE:   DELETE FROM source_registry WHERE added_by = 'spec-b27';

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Data Science PM', 'rss', 1, 'https://www.datascience-pm.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Managing data science projects — bridging AI, Agile, PM', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Epicflow Blog', 'rss', 1, 'https://www.epicflow.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI-driven multi-project resource management, predictive analytics', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Thoughtworks Insights', 'rss', 1, 'https://www.thoughtworks.com/rss/insights.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Global consultancy — AI-powered software delivery, agentic AI', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Hive Blog', 'rss', 1, 'https://hive.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'PM tool with AI assistant — AI impact on PM and task automation', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Cprime Blog', 'rss', 1, 'https://www.cprime.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Enterprise agility — AI transformation, strategic portfolio mgmt', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'ITSM.tools', 'rss', 1, 'https://itsm.tools/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Independent ITSM analyst — AI in IT service management', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Emergent Journal', 'rss', 1, 'https://blog.emergentconsultants.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI in change management with practical ROI data', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Decision Intelligence (Cassie Kozyrkov)', 'rss', 1, 'https://decision.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Former Google Chief Decision Scientist — AI-assisted judgment', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Marily''s AI Product Academy', 'rss', 1, 'https://marily.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  '#1 AI PM resource — AI product management guides', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Almost Timely News (Christopher Penn)', 'rss', 1, 'https://almosttimely.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  '5P Framework for AI transformation — Purpose, People, Process', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Dion Hinchcliffe', 'rss', 1, 'https://dionhinchcliffe.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'VP Constellation Research — enterprise digital transformation', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Exponential View (Azeem Azhar)', 'rss', 1, 'https://www.exponentialview.co/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  '84K+ subscribers — how AI reshapes business and work', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Enterprise AI Governance (Oliver Patel)', 'rss', 1, 'https://oliverpatel.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI governance frameworks mapping to PMO governance', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AgileSparks Blog', 'rss', 2, 'https://agilesparks.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Agile consultancy — AI in lean-agile enterprise delivery', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Eficode Blog', 'rss', 2, 'https://www.eficode.com/blog/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'DevOps consultancy — AI in software delivery pipelines', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Hups Blog (Henrik Kniberg)', 'rss', 2, 'https://hups.com/blog/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Agile/Lean coach — AI impact on team collaboration', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'iSixSigma', 'rss', 2, 'https://www.isixsigma.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Six Sigma community — AI in process improvement and quality', 'A', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Krisp Blog', 'rss', 2, 'https://krisp.ai/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI noise cancellation — AI-enhanced meeting productivity', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Constellation Research Blog', 'rss', 2, 'https://www.constellationr.com/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Enterprise technology analyst — AI strategy for CxOs', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AWS Enterprise Strategy', 'rss', 2, 'https://aws.amazon.com/blogs/enterprise-strategy/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AWS enterprise strategy — cloud AI for business transformation', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Whatfix Blog', 'rss', 2, 'https://whatfix.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Digital adoption platform — AI-guided change management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Marketing AI Institute', 'rss', 2, 'https://www.marketingaiinstitute.com/blog/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI in marketing — enterprise AI adoption patterns', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Toggl Blog', 'rss', 2, 'https://toggl.com/blog/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Time tracking tool — AI in project time management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Everhour Blog', 'rss', 2, 'https://everhour.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Time tracking — AI-enhanced project budgeting and reporting', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Document360 Blog', 'rss', 2, 'https://document360.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Knowledge base platform — AI in documentation management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Taskade Blog', 'rss', 2, 'https://www.taskade.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI-powered task management and team collaboration', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Superhuman Email Blog', 'rss', 2, 'https://blog.superhuman.com/rss/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI email client — AI productivity for knowledge workers', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Pipefy Blog', 'rss', 2, 'https://www.pipefy.com/blog/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'BPM platform — AI in business process automation', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'FlowForma Blog', 'rss', 2, 'https://www.flowforma.com/blog/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Process automation — AI-driven workflow digitisation', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Ardoq Blog', 'rss', 2, 'https://www.ardoq.com/blog/rss.xml', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Enterprise architecture platform — AI in EA decision-making', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'BMC Blogs', 'rss', 2, 'https://www.bmc.com/blogs/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'IT service management — AI in ITSM and operations', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'USC Consulting Group', 'rss', 2, 'https://usccg.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Operations consulting — AI in operational excellence', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Tools Business', 'rss', 2, 'https://aitoolsbusiness.com/feed/', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI tools for business — practical AI adoption guides', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'NoCoders', 'rss', 2, 'https://nocoders.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'No-code/low-code with AI — automation without developers', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'GAI Insights (Paul Baier)', 'rss', 2, 'https://gaiinsights.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Generative AI strategy for enterprise leaders', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Realized Now', 'rss', 2, 'https://airealizednow.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Practical AI implementation in enterprise settings', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Enterprise AI Trends (John Hwang)', 'rss', 2, 'https://nextword.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Enterprise AI adoption trends and strategies', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI in Business (John Desmond)', 'rss', 2, 'https://aiinbusiness.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI applications in business operations', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Work3 Future of Work', 'rss', 2, 'https://wrk3.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Future of work — AI reshaping workplace dynamics', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'FullStack HR', 'rss', 2, 'https://www.fullstackhr.io/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'HR tech — AI in people management and workforce planning', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Adopters Club', 'rss', 2, 'https://aiadopters.club/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Community for enterprise AI adoption practitioners', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Platforms AI BigTech (Sangeet Choudary)', 'rss', 2, 'https://platforms.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Platform strategy — AI in platform business models', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Why Try AI (Daniel Nest)', 'rss', 2, 'https://whytryai.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Practical AI tutorials and productivity workflows', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Geek Way (Andrew McAfee MIT)', 'rss', 2, 'https://geekway.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'MIT researcher — AI impact on organisations and management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'The Digital Leader (John Rossman)', 'rss', 4, 'https://thedigitalleader.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Digital leadership — AI strategy for executives', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'The AI Leadership Edge', 'rss', 4, 'https://theaileadershipedge.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI leadership insights for senior managers', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Disruption (Meng Li)', 'rss', 4, 'https://aidisruption.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI disruption patterns across industries', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Organizational AI Weekly', 'rss', 4, 'https://organizationalai.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI in organisational design and management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Workplace Wellness', 'rss', 4, 'https://aiworkplacewellness.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI impact on workplace wellbeing and culture', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'The Maverick Mapmaker (Jurgen Appelo)', 'rss', 4, 'https://substack.jurgenappelo.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Management 3.0 author — AI in modern management', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Honest AI', 'rss', 4, 'https://honestai.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Honest assessment of AI capabilities and limitations', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'The AI Optimist', 'rss', 4, 'https://aioptimist.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'Optimistic AI analysis for business leaders', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'AI Agents Simplified', 'rss', 4, 'https://aiagentssimplified.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI agents explained for business practitioners', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Level Up with AI', 'rss', 4, 'https://levelupwithai.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI skill development for professionals', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

INSERT INTO source_registry (
  source_name, source_type, tier, source_url, enabled, priority,
  total_runs, total_articles_found, total_articles_inserted,
  success_rate, avg_articles_per_run, consecutive_failures,
  description, category, added_by, notes
) VALUES (
  'Wonder Tools (Jeremy Caplan)', 'rss', 4, 'https://wondertools.substack.com/feed', 1, 5,
  0, 0, 0,
  0, 0, 0,
  'AI tools and productivity — curated weekly recommendations', 'B', 'spec-b27',
  'Added 2026-02-24 via SPEC-B27. Source: AI x PMO blog discovery report.'
);

# Agent Instructions

## Deployment Checklist

Before deploying or when making structural changes (adding/removing/renaming pages):

1. Update `roammate.com/public/sitemap.xml` with any new or changed URLs
2. Update `roammate.com/public/llms.txt` with any new content or links
3. Update `roammate.com/public/robots.txt` if crawl rules change
4. Ensure all new pages use `BaseLayout.astro` (provides canonical links automatically)
5. Run `bash deploy.sh` to build and deploy

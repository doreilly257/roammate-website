import { getSearchArticles } from '../lib/search-manifest-data';
export async function GET() {
  return Response.json({ articles: await getSearchArticles() });
}

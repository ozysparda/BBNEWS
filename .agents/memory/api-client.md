---
name: BaleBeleq API client hooks
description: Where generated hooks live and key hook names
---

Generated API hooks: lib/api-client-react/src/generated/api.ts
Key hooks:
- useListArticles — public endpoint, only published articles
- useListAllArticles — admin endpoint /api/admin/articles, requires JWT, returns ALL articles
- useGetArticleStats — dashboard stats
- useDeleteArticle, useCreateArticle, useUpdateArticle — CRUD

Admin article list page MUST use useListAllArticles (not useListArticles) to see drafts.
**Why:** Public endpoint filters isPublished=true; admin needs to manage drafts too.

import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article";
  publishedTime?: string;
  author?: string;
  keywords?: string;
  articleSection?: string;
  noIndex?: boolean;
}

const SITE_NAME = "BerugakNews";
const DEFAULT_DESCRIPTION = "BerugakNews — Portal Berita Lombok. Cepat, Akurat, Berimbang, Terpercaya.";
const DEFAULT_IMAGE = "https://bbnews--hpejanggik.replit.app/opengraph.jpg";
const DEFAULT_DOMAIN = "https://bbnews--hpejanggik.replit.app";

export function SEO({
  title,
  description,
  image,
  url,
  type = "website",
  publishedTime,
  author,
  keywords,
  articleSection,
  noIndex = false,
}: SEOProps) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const pageDesc = description || DEFAULT_DESCRIPTION;
  const pageImage = image || DEFAULT_IMAGE;
  const pageUrl = url ? `${DEFAULT_DOMAIN}${url}` : DEFAULT_DOMAIN;

  return (
    <Helmet>
      {/* Basic Meta */}
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {!noIndex && <meta name="robots" content="index, follow" />}

      {/* Canonical URL */}
      <link rel="canonical" href={pageUrl} />

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title || SITE_NAME} />
      <meta property="og:description" content={pageDesc} />
      <meta property="og:image" content={pageImage} />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:locale" content="id_ID" />

      {/* Article-specific OG tags */}
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && articleSection && (
        <meta property="article:section" content={articleSection} />
      )}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || SITE_NAME} />
      <meta name="twitter:description" content={pageDesc} />
      <meta name="twitter:image" content={pageImage} />
      <meta name="twitter:image:alt" content={title || SITE_NAME} />
    </Helmet>
  );
}

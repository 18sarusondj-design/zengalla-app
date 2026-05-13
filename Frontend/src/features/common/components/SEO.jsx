import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title, 
  description, 
  canonical, 
  ogTitle, 
  ogDescription, 
  ogImage, 
  ogType = 'website',
  jsonLd
}) => {

  const siteTitle = 'ZenGalla | Premium Grocery & Marketplace';
  const fullTitle = title ? `${title} | ZenGalla` : siteTitle;
  const defaultDesc = 'Shop fresh groceries, household essentials, and more with ZenGalla. Fast delivery, premium quality, and a seamless shopping experience.';
  const siteUrl = 'https://zengalla-app-vrkx.vercel.app';

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description || defaultDesc} />
      {canonical && <link rel="canonical" href={`${siteUrl}${canonical}`} />}

      {/* Open Graph / Facebook */}
      <meta property="og:title" content={ogTitle || fullTitle} />
      <meta property="og:description" content={ogDescription || description || defaultDesc} />
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={`${siteUrl}${canonical || ''}`} />
      <meta property="og:image" content={ogImage || `${siteUrl}/og-image.png`} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogTitle || fullTitle} />
      <meta name="twitter:description" content={ogDescription || description || defaultDesc} />
      <meta name="twitter:image" content={ogImage || `${siteUrl}/og-image.png`} />

      {/* Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}

      {/* Accessibility & UX */}
      <html lang="en" />
    </Helmet>
  );
};


export default SEO;

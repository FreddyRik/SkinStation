import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

type JsonLdValue = string | number | boolean | null | JsonLdObject | JsonLdValue[];

type JsonLdObject = {
  [key: string]: JsonLdValue;
};

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        applicationCategory: "GameApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
        },
      },
    ],
  };
}

export function catalogProductJsonLd(item: {
  name: string;
  description?: string | null;
  image?: string | null;
  marketHashName?: string | null;
  path: string;
}): JsonLdObject {
  const url = `${SITE_URL}${item.path}`;
  const description =
    item.description?.slice(0, 300) ||
    `${item.name} in the Counter-Strike 2 skin database on ${SITE_NAME}.`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: item.name,
        description,
        url,
        ...(item.image ? { image: item.image } : {}),
        ...(item.marketHashName ? { sku: item.marketHashName } : {}),
        brand: {
          "@type": "Brand",
          name: "Counter-Strike 2",
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: SITE_NAME,
            item: SITE_URL,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Skin Database",
            item: `${SITE_URL}/database`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: item.name,
            item: url,
          },
        ],
      },
    ],
  };
}

export function homePageJsonLd(): JsonLdObject {
  return websiteJsonLd();
}

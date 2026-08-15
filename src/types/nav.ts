export type SiteNavLink = {
  href: string;
  label: string;
  code: string;
  match: (pathname: string) => boolean;
};

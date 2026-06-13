/** Passthrough root — html/body and i18n live in `app/[locale]/layout.tsx`. */
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}

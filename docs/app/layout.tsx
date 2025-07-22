import { Footer, Layout, Navbar } from "nextra-theme-docs";
import { Banner, Head } from "nextra/components";
import { getPageMap } from "nextra/page-map";
import "nextra-theme-docs/style.css";
import "./app.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  // Define your metadata here
  // For more information on metadata API, see: https://nextjs.org/docs/app/building-your-application/optimizing/metadata
};

const banner = <Banner storageKey="some-key">Nextra 4.0 is released 🎉</Banner>;
const navbar = (
  <Navbar
    logo={
      <div className="flex items-center gap-2">
        <Image src="/icon.png" alt="ATBackup Icon" width={24} height={24} />
        <span>AT Backup</span>
      </div>
    }
    // ... Your additional navbar options
  />
);
const footer = (
  <Footer>
    <div className="flex items-center justify-between w-full">
      <span />
      <Link
        href="https://bsky.app/profile/atbackup.pages.dev"
        className="hover:opacity-80 transition-opacity"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/bsky.svg"
          alt="Bluesky"
          width={24}
          height={24}
          color="white"
        />
      </Link>
    </div>
  </Footer>
);

export default async function RootLayout({
  children,
}: React.PropsWithChildren) {
  return (
    <html
      // Not required, but good for SEO
      lang="en"
      // Required to be set
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head
      // ... Your additional head options
      >
        {/* Your additional tags should be passed as `children` of `<Head>` element */}
      </Head>
      <body>
        <Layout
          //banner={banner}
          navbar={navbar}
          pageMap={await getPageMap()}
          docsRepositoryBase="https://github.com/shuding/nextra/tree/main/docs"
          footer={footer}
          // ... Your additional layout options
        >
          {children}
        </Layout>
      </body>
    </html>
  );
}

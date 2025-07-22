import nextra from "nextra";

// Set up Nextra with its configuration
const withNextra = nextra({
  contentDirBasePath: "/docs",
});

// Export the final Next.js config with Nextra included
export default withNextra({
  output: "export",
  images: {
    unoptimized: true, // mandatory, otherwise won't export
  },
});

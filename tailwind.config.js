/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        shiki: {
          light: "var(--shiki-light)",
          "light-bg": "var(--shiki-light-bg)",
          dark: "var(--shiki-dark)",
          "dark-bg": "var(--shiki-dark-bg)",
        },
      },
    },
  },
};

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## PostgreSQL

Set `DATABASE_URL` in the root `.env.local` file. Keep this file private; it is ignored by Git.
Then create the Fundora tables with:

```bash
npm run db:migrate
```

The migrations are applied in order, transactionally, and are safe to run again. Existing withdrawal details are copied into the new saved-coordinates table, where applicants can manage multiple bank, PayPal, or mobile-money destinations and select one for each withdrawal. Administrators can publish donation campaigns with multiple categories, a target amount, a description, and an image; published campaigns are browsable by category on `/dons`. The applicant dashboard shows task payment links as soon as they are published and provides separate uploads for completed work and payment proofs; administrators can download both submissions. The current prototype stores uploaded PDF, JPG, and PNG files in PostgreSQL (`BYTEA`), with a 400 KB limit per document, and campaign images up to 2 MB. For production-scale file storage, move these bytes to a private object-storage service and keep only its storage key in PostgreSQL.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

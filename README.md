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

Applicants and administrators can also exchange persistent support messages from the floating chat on their dashboards. Migration `007_support_chat.sql` creates the private conversation table; apply it to the production database before deploying the chat feature.

## Production environment

Configure these variables for the production deployment (for example, the Vercel project's **Production** environment):

- `DATABASE_URL`: the connection string for the PostgreSQL database used by the live site.
- `SESSION_SECRET`: a long, random secret kept stable across deployments and server instances. If omitted, the application currently falls back to `DATABASE_URL`; setting a dedicated secret is recommended.

Apply all SQL migrations to that same production database before using the site. From a trusted local terminal, set `DATABASE_URL` to the production database connection string and run:

```bash
npm run db:migrate
```

Never commit or paste database credentials into source code. A local `.env.local` database and the production database are separate: users, login accounts, and donation campaigns created locally do not automatically appear online. Publish campaigns from the live admin site after confirming its `DATABASE_URL` points to the intended database. If using the database admin seed, also set `ADMIN_EMAIL` and `ADMIN_PASSWORD` when running the migration script.

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

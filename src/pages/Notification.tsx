import React from 'react';
import Head from 'next/head';
import type { NextPage } from 'next';

/**
 * Static version of the Notification page that safely redirects to the App Router version
 * This page contains no client hooks or components to ensure it can be statically generated
 */
const NotificationPage: NextPage = () => {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <Head>
        <meta httpEquiv="refresh" content="0;url=/notification" />
        <title>Redirecting to Notifications</title>
      </Head>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
        Redirecting to Notifications...
      </h1>
      <a href="/notification">Click here if not redirected</a>
    </div>
  );
};

// Force static generation with no data dependencies
export const getStaticProps = () => ({ props: {} });

export default NotificationPage;
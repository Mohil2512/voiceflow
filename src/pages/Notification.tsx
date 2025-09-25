import React from 'react';import React from 'react';import React from 'react';import React from 'react';

import Head from 'next/head';

import type { NextPage } from 'next';

const Notification = () => (

  <div style={{ textAlign: 'center', padding: '2rem' }}>import Head from 'next/head';import type { NextPage } from 'next';

    <Head>

      <meta httpEquiv="refresh" content="0;url=/notification" />

      <title>Redirecting to Notifications</title>

    </Head>/**// STATIC version of the page - no client hooks!import Head from 'next/head';

    <h1>Redirecting to Notifications...</h1>

    <a href="/notification">Click here if not redirected</a> * This is a purely static page that redirects to the App Router version

  </div>

); * Uses only static HTML - no hooks or client componentsconst NotificationPage = () => {



export const getStaticProps = () => ({ props: {} }); */



export default Notification;const NotificationStatic: NextPage = () => {  return (/**

  return (

    <div style={{ textAlign: 'center', padding: '2rem' }}>    <div className="text-center p-8"> * This is a completely static page with no hooks or client components

      <Head>

        <meta httpEquiv="refresh" content="0;url=/notification" />      <h1 className="text-xl font-bold mb-4">Redirecting to Notifications...</h1> * It's designed to work safely with Next.js static generation and SSR

        <title>Redirecting to Notifications</title>

      </Head>      <p> */

      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>

        Redirecting to Notifications...        Please wait while we redirect you to the notifications page.const NotificationStatic: NextPage = () => {

      </h1>

      <p style={{ marginBottom: '1rem' }}>        If you are not redirected, <a href="/notification" className="text-blue-500 underline">click here</a>.  return (

        Please wait while we redirect you to the notifications page.

      </p>      </p>    <>

      <a 

        href="/notification"             <Head>

        style={{ color: 'blue', textDecoration: 'underline' }}

      >      {/* Static metadata refresh for client-side redirection */}        <meta httpEquiv="refresh" content="0;url=/notification" />

        Click here if you are not redirected

      </a>      <noscript>        <title>Redirecting to Notifications</title>

    </div>

  );        <meta httpEquiv="refresh" content="0;url=/notification" />      </Head>

};

      </noscript>      <div style={{ maxWidth: '600px', margin: '2rem auto', textAlign: 'center' }}>

// This ensures the page is rendered statically without any client-side hooks

export function getStaticProps() {              <p>Redirecting to notifications page...</p>

  return {

    props: {},      {/* Static script for client-side redirection */}        <div style={{ marginTop: '1rem' }}>

  };

}      <script          <a href="/notification">Click here if you are not redirected</a>



export default NotificationStatic;        dangerouslySetInnerHTML={{        </div>

          __html: `      </div>

            window.location.href = '/notification';    </>

          `,  );

        }}};

      />

    </div>// Static render with no data dependencies

  );export async function getStaticProps() {

};  return {

    props: {},

// Use getStaticProps to make this a static page  };

export async function getStaticProps() {}

  return { props: {} };

}export default NotificationStatic;

export default NotificationPage;
import App, { Container, NextAppContext } from 'next/app'
import Head from 'next/head'
import { ApolloClient } from 'apollo-boost'
import * as React from 'react'
import { ApolloProvider, getDataFromTree } from 'react-apollo'
import { Provider } from 'react-redux'
import { store } from '../src/redux'
import { initApolloClient } from '../src/graphql/apolloClient'
import Header from '../src/components/Header'
import { fromReqToUrl } from '../src/utils/fromReqToUrl'
import { AppStyles, BelowTheFoldStyles } from '../src/AppStyles'
import { UnknownObj } from '../src/typings'

export class InnerApp extends React.PureComponent<{
  apolloClientState?: UnknownObj
  apolloClient?: ApolloClient<any>
  url: URL
}> {
  render() {
    const {apolloClient, apolloClientState, url, children} = this.props

    return (
      <React.StrictMode>
        <ApolloProvider client={apolloClient || initApolloClient(apolloClientState as any, url)}>
          <Provider store={store}>
            <AppStyles />
            <Header />
            {children}
            <BelowTheFoldStyles />
          </Provider>
        </ApolloProvider>
      </React.StrictMode>
    )
  }
}

export default class MyApp extends App<{
  /** these come from getInitialProps */
  apolloClientState?: UnknownObj
  apolloClient?: ApolloClient<any>
  url: URL
}> {
  static async getInitialProps(appContext: NextAppContext) {
    const {Component, router, ctx} = appContext
    const url = fromReqToUrl(ctx.req as any)
    const pageProps = {}

    let appProps = {} as any
    if (App.getInitialProps) {
      appProps = await App.getInitialProps(appContext)
    }

    const apolloClient = initApolloClient(undefined, url)

    if (!process.browser) {
      console.debug('[_app] starting ssr (server)')

      try {
        /**
         * @note !!! this does not properly ssr if we render `<App>` (even if we pass in apolloClient) !!!
         * @description Run all GraphQL queries
         * @todo this is really bad @@perf
         * @description ideally we would combine this into a single tree walking
         *              to get other data needed in ssr to rehydrate from
         * @note this uses old `Context`
         * @see https://github.com/apollographql/react-apollo/blob/master/src/getDataFromTree.ts
         * @see https://github.com/apollographql/react-apollo/blob/master/src/Query.tsx#L164
         */
        await getDataFromTree(
          <InnerApp apolloClient={apolloClient} url={url}>
            <Component {...appProps} />
          </InnerApp>
        )
      } catch (error) {
        // Prevent Apollo Client GraphQL errors from crashing SSR.
        // Handle them in components via the data.error prop:
        // https://www.apollographql.com/docs/react/api/react-apollo.html#graphql-query-data-error
        console.error('Error while running `getDataFromTree`', error)
      }

      // getDataFromTree does not call componentWillUnmount
      // head side effect therefore need to be cleared manually
      Head.rewind()
    } else {
      console.debug('[_app] starting ssr (browser, rehydrate)')
    }

    // Extract query data from the Apollo store
    const apolloClientState = apolloClient.cache.extract()

    console.debug('[_app] done ssr')

    return {
      ...appProps,
      pageProps,
      url,
      apolloClientState,
    } as ReturnType<typeof App.getInitialProps> & {
      apolloState: UnknownObj
    }
  }

  render() {
    const {Component, pageProps, apolloClientState, url} = this.props

    return (
      <Container>
        <InnerApp apolloClientState={apolloClientState} url={url}>
          <Component {...pageProps} />
        </InnerApp>
      </Container>
    )
  }
}

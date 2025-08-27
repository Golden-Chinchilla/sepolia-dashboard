import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'

const query = gql`
  {
    approvals(first: 5) {
      id
      owner
      spender
      value
    }
    burnByOwners(first: 5) {
      id
      from
      amount
      blockNumber
    }
  }
`

const url = 'https://api.studio.thegraph.com/query/42285/phantom-token/version/latest'
const headers = { Authorization: `Bearer ${import.meta.env.VITE_THE_GRAPH_KEY}` }

export function SubgraphViewer() {
  const { data, status } = useQuery({
    queryKey: ['subgraph-data'],
    async queryFn() {
      return await request(url, query, {}, headers)
    }
  })

  return (
    <main>
      {status === 'pending' && <div>Loading...</div>}
      {status === 'error' && <div>Error occurred querying the Subgraph</div>}
      <pre style={{ whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(data ?? {}, null, 2)}
      </pre>
    </main>
  )
}


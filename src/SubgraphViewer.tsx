import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gql, request } from 'graphql-request'

// ======= 配置区（按需修改） =======
const STUDIO_ENDPOINT =
  'https://api.studio.thegraph.com/query/42285/phantom-token/version/latest'

const HEADERS: Record<string, string> = {
  'content-type': 'application/json',
  ...(import.meta.env.VITE_THE_GRAPH_KEY && {
    Authorization: `Bearer ${import.meta.env.VITE_THE_GRAPH_KEY}`,
  }),
}

// 区块浏览器前缀（Sepolia 示例）；主网改为 https://etherscan.io/tx/
const EXPLORER_TX_BASE = 'https://sepolia.etherscan.io/tx/'

// ======= GraphQL 查询（拉取最新 50 条） =======
const QUERY = gql`
{
  approvals(first: 5) {
    id
    owner
    spender
    value
  }
  burnByOwners(first: 10) {
    id
    from
    amount
    blockNumber
  }
}
`

// ======= 类型 =======
type GqlData = {
  approvals: Array<{
    id: string
    owner: string
    spender: string
    value: string
    blockNumber?: string | null
  }>
  burnByOwners: Array<{
    id: string
    from: string
    amount: string
    blockNumber: string
  }>
}

type Row = {
  id: string
  txHash: string
  type: 'Approval' | 'Burn'
  from?: string
  to?: string
  amount?: string
  blockNumber?: string
  raw: any
}

// ======= 工具函数 =======
const txFromEntityId = (id: string) => id.slice(0, 66) // 0x + 64hex
const short = (s: string, left = 6, right = 6) =>
  s.length > left + right + 2 ? `${s.slice(0, left + 2)}…${s.slice(-right)}` : s

// ======= 组件 =======
export function SubgraphViewer() {
  const [q, setQ] = useState('')

  const { data, isPending, isError, refetch, isFetching } = useQuery<GqlData>({
    queryKey: ['subgraph-latest'],
    queryFn: async () => request(STUDIO_ENDPOINT, QUERY, {}, HEADERS),
    refetchOnWindowFocus: false,
  })

  const rows: Row[] = useMemo(() => {
    if (!data) return []

    const a: Row[] = data.approvals.map((e) => ({
      id: e.id,
      txHash: txFromEntityId(e.id),
      type: 'Approval',
      from: e.owner,
      to: e.spender,
      amount: e.value,
      blockNumber: e.blockNumber ?? undefined,
      raw: e,
    }))

    const b: Row[] = data.burnByOwners.map((e) => ({
      id: e.id,
      txHash: txFromEntityId(e.id),
      type: 'Burn',
      from: e.from,
      amount: e.amount,
      blockNumber: e.blockNumber,
      raw: e,
    }))

    // 统一后按 blockNumber(desc) 排；没有 blockNumber 的放后面
    const merged = [...a, ...b].sort((x, y) => {
      const bx = x.blockNumber ? Number(x.blockNumber) : -1
      const by = y.blockNumber ? Number(y.blockNumber) : -1
      return by - bx
    })
    return merged
  }, [data])

  const filtered = useMemo(() => {
    if (!q.trim()) return rows
    const qq = q.trim().toLowerCase()
    return rows.filter((r) =>
      [
        r.txHash,
        r.from,
        r.to,
        r.amount,
        r.blockNumber,
        r.type,
        r.id,
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(qq)),
    )
  }, [q, rows])

  const [detail, setDetail] = useState<Row | null>(null)

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-white/70 p-6 shadow-lg ring-1 ring-black/5 backdrop-blur">
        <h1 className="text-center text-3xl font-bold tracking-tight">
          USDC 转账系统 · 交易浏览
        </h1>
        <p className="mt-2 text-center text-sm text-neutral-500">
          最新事件（Approvals / Burns）。点击行查看详情，或跳转到 Etherscan。
        </p>
        <div className="mt-4 flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="按 TxHash / 地址 / 金额 / 区块筛选…"
            className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 outline-none ring-0 focus:border-transparent focus:ring-2 focus:ring-violet-400"
          />
          <button
            onClick={() => refetch()}
            className="rounded-xl bg-violet-600 px-4 py-2.5 text-white shadow hover:bg-violet-500 active:translate-y-px"
          >
            {isFetching ? '刷新中…' : '刷新'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white/80 shadow-lg ring-1 ring-black/5">
        <div className="grid grid-cols-12 border-b bg-neutral-50/60 px-4 py-3 text-xs font-semibold uppercase text-neutral-500">
          <div className="col-span-3">Txn Hash</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-3">From</div>
          <div className="col-span-2">To / Spender</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-1 text-right">Block</div>
        </div>

        {isPending && (
          <div className="p-6 text-center text-neutral-500">加载中…</div>
        )}
        {isError && (
          <div className="p-6 text-center text-red-500">
            拉取子图数据失败，请检查 endpoint / key
          </div>
        )}
        {!isPending && !isError && filtered.length === 0 && (
          <div className="p-6 text-center text-neutral-500">无匹配记录</div>
        )}

        <ul className="divide-y">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="grid cursor-pointer grid-cols-12 items-center px-4 py-3 hover:bg-violet-50/60"
              onClick={() => setDetail(r)}
            >
              <div className="col-span-3 flex items-center gap-2">
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-mono text-neutral-600">
                  {short(r.txHash)}
                </span>
                <a
                  href={`${EXPLORER_TX_BASE}${r.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-xs text-violet-600 hover:underline"
                >
                  在 Etherscan 打开
                </a>
                <button
                  className="ml-2 rounded px-2 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(r.txHash)
                  }}
                >
                  复制
                </button>
              </div>

              <div className="col-span-2">
                <span
                  className={
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ' +
                    (r.type === 'Approval'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-emerald-700')
                  }
                >
                  {r.type}
                </span>
              </div>

              <div className="col-span-3 font-mono text-sm text-neutral-700">
                {r.from ? short(r.from) : '—'}
              </div>

              <div className="col-span-2 font-mono text-sm text-neutral-700">
                {r.to ? short(r.to) : '—'}
              </div>

              <div className="col-span-1 text-right font-mono text-sm">
                {r.amount ?? '—'}
              </div>

              <div className="col-span-1 text-right font-mono text-sm">
                {r.blockNumber ?? '—'}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 详情弹层 */}
      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">事件详情</h2>
              <button
                onClick={() => setDetail(null)}
                className="rounded-lg bg-neutral-100 px-3 py-1.5 text-sm hover:bg-neutral-200"
              >
                关闭
              </button>
            </div>
            <div className="mb-3 text-sm text-neutral-600">
              <div>
                <span className="font-medium">Tx Hash：</span>
                <a
                  href={`${EXPLORER_TX_BASE}${detail.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-violet-600 hover:underline"
                >
                  {detail.txHash}
                </a>
              </div>
              <div>
                <span className="font-medium">类型：</span>
                {detail.type}
              </div>
              <div>
                <span className="font-medium">区块：</span>
                {detail.blockNumber ?? '—'}
              </div>
            </div>
            <pre className="max-h-[60vh] overflow-auto rounded-xl bg-neutral-50 p-4 text-sm">
              {JSON.stringify(detail.raw, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

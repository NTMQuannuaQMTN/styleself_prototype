import type { AgentComparison } from '../../agent/types'

export function ComparisonCard({ comparison }: { comparison: AgentComparison }) {
  const { products, rows } = comparison
  if (products.length < 2) return null
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-line">
            <th className="p-2 text-left font-medium text-muted"></th>
            {products.map((p) => (
              <th key={p.id} className="p-2 text-left font-medium text-ink">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-line last:border-0">
              <td className="p-2 text-muted">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className="p-2 text-ink">
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../../merchant/useStore'
import { useAsync } from '../../merchant/useAsync'
import { listProducts } from '../../merchant/api'
import { parseCatalogCsv } from '../../merchant/csv'
import {
  applyImport,
  planImport,
  type ImportPlan,
  type ImportResult,
} from '../../merchant/catalogImport'
import { stockColumnsFor, templateCsv } from '../../merchant/catalogTemplate'
import {
  Card,
  InlineError,
  LoadingRow,
  PageHeader,
} from '../../components/merchant/ui'

type Stage = 'upload' | 'preview' | 'applying' | 'done'

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function CatalogImportPage() {
  const { activeStore, agent, locations, isManager, memberLocationId } =
    useStore()
  const navigate = useNavigate()

  const canImport = isManager || Boolean(memberLocationId)
  const products = useAsync(
    () => (activeStore ? listProducts(activeStore.id) : Promise.resolve([])),
    [activeStore?.id],
  )

  const [stage, setStage] = useState<Stage>('upload')
  const [fileName, setFileName] = useState<string | null>(null)
  const [plan, setPlan] = useState<ImportPlan | null>(null)
  const [parseErrors, setParseErrors] = useState<string[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currency = agent?.currency ?? 'USD'
  const stockColumns = useMemo(() => stockColumnsFor(locations), [locations])

  if (!activeStore) return null

  if (!canImport) {
    return (
      <div className="space-y-8">
        <PageHeader eyebrow="Catalog" title="Import from CSV" />
        <InlineError>
          You need an assigned branch to import products. Owners and admins can
          import for any branch.
        </InlineError>
      </div>
    )
  }

  async function onFile(file: File) {
    setError(null)
    setResult(null)
    setFileName(file.name)
    const text = await file.text()
    const parsed = parseCatalogCsv(text)
    setParseErrors(parsed.errors)
    const built = planImport(
      parsed.rows,
      parsed.headers,
      products.data ?? [],
      locations,
    )
    setPlan(built)
    setStage('preview')
  }

  async function apply() {
    if (!plan) return
    setStage('applying')
    setError(null)
    try {
      const res = await applyImport(plan, {
        storeId: activeStore!.id,
        currency,
        locationId: isManager
          ? locations.find((l) => l.is_primary)?.id ?? locations[0]?.id ?? null
          : memberLocationId,
      })
      setResult(res)
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed.')
      setStage('preview')
    }
  }

  function reset() {
    setStage('upload')
    setPlan(null)
    setParseErrors([])
    setResult(null)
    setError(null)
    setFileName(null)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Import from CSV"
        description={
          <Link to="/merchant/catalog" className="text-accent">
            ← Back to products
          </Link>
        }
      />

      {products.loading ? (
        <LoadingRow label="Loading your catalog…" />
      ) : products.error ? (
        <InlineError>{products.error}</InlineError>
      ) : (
        <>
          {stage === 'upload' && (
            <UploadStage
              locations={locations}
              stockColumns={stockColumns}
              onFile={onFile}
              onTemplate={() =>
                downloadText(
                  `${activeStore.slug}-catalog-template.csv`,
                  templateCsv(locations),
                )
              }
            />
          )}

          {stage === 'preview' && plan && (
            <PreviewStage
              fileName={fileName}
              plan={plan}
              parseErrors={parseErrors}
              currency={currency}
              error={error}
              onApply={apply}
              onCancel={reset}
            />
          )}

          {stage === 'applying' && (
            <LoadingRow label="Writing to your catalog…" />
          )}

          {stage === 'done' && result && (
            <DoneStage
              result={result}
              onBackToCatalog={() => navigate('/merchant/catalog')}
              onImportAnother={reset}
            />
          )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
function UploadStage({
  locations,
  stockColumns,
  onFile,
  onTemplate,
}: {
  locations: { id: string; name: string }[]
  stockColumns: string[]
  onFile: (f: File) => void
  onTemplate: () => void
}) {
  const [dragging, setDragging] = useState(false)

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <p className="font-display text-lg text-ink">1 · Get the template</p>
        <p className="mt-1 text-sm text-muted">
          The template already has the right columns and a worked example row.
          Fill in your products and save it as CSV.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onTemplate}
            className="btn btn-primary"
          >
            Download CSV template
          </button>
          <a
            href="/sample-catalog.csv"
            download
            className="text-xs text-accent underline"
          >
            or see a filled-in example
          </a>
        </div>

        <div className="mt-6 border-t border-line pt-5">
          <p className="font-display text-lg text-ink">2 · Upload it back</p>
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              const f = e.dataTransfer.files?.[0]
              if (f) onFile(f)
            }}
            className={`mt-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? 'border-ink bg-accent-soft/40'
                : 'border-line-strong hover:border-ink'
            }`}
          >
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
            <p className="text-sm font-medium text-ink">
              Drop your CSV here, or click to choose
            </p>
            <p className="mt-1 text-xs text-muted">
              Nothing is saved yet — you review the changes first.
            </p>
          </label>
        </div>
      </Card>

      <Card>
        <p className="font-display text-lg text-ink">How the columns work</p>
        <dl className="mt-3 space-y-3 text-sm">
          <Row term="sku" required>
            Your product code, e.g. <code>LB-001</code>. This is how the import
            matches a row to a product you already have. Same code → the product
            is updated. New code → a new product is created.
          </Row>
          <Row term="name, price" required="for new products">
            Needed only when the code is new. Price can be <code>89</code>,{' '}
            <code>89.00</code> or <code>$89</code>.
          </Row>
          <Row term="description, brand, category, style, gender, material, care, image_url, status">
            Optional. Leave a column out entirely, or leave a cell blank, and the
            current value is kept — the import never clears a field.
          </Row>
          <Row term="size, color, variant_sku">
            One row per size/colour. Rows sharing a <code>sku</code> become one
            product with several variants.
          </Row>
          <Row term={stockColumns.join(', ')}>
            {locations.length > 1 ? (
              <>
                One stock column per location. Match the location name, e.g.{' '}
                <code>stock_{locations[0]?.name.toLowerCase().replace(/\s+/g, '_')}</code>
                . Your locations:{' '}
                <span className="text-ink">
                  {locations.map((l) => l.name).join(', ')}
                </span>
                .
              </>
            ) : (
              <>
                Units in stock at <span className="text-ink">{locations[0]?.name}</span>.
              </>
            )}
          </Row>
        </dl>
        <p className="mt-4 rounded-lg bg-paper px-3 py-2 text-xs text-muted">
          Products, variants or stock you don't mention in the file are left
          exactly as they are. The import only adds and updates.
        </p>
      </Card>
    </div>
  )
}

function Row({
  term,
  required,
  children,
}: {
  term: string
  required?: boolean | string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="font-mono text-[0.8rem] text-ink">
        {term}
        {required ? (
          <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-0.5 text-[0.6rem] font-sans uppercase tracking-wide text-accent">
            {typeof required === 'string' ? required : 'required'}
          </span>
        ) : null}
      </dt>
      <dd className="mt-0.5 text-muted">{children}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
function PreviewStage({
  fileName,
  plan,
  parseErrors,
  currency,
  error,
  onApply,
  onCancel,
}: {
  fileName: string | null
  plan: ImportPlan
  parseErrors: string[]
  currency: string
  error: string | null
  onApply: () => void
  onCancel: () => void
}) {
  const nothingToDo = plan.creates.length === 0 && plan.updates.length === 0
  const allErrors = [...parseErrors, ...plan.errors]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted">
          {fileName ? <span className="text-ink">{fileName}</span> : 'File'} —
          review before applying
        </p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted underline hover:text-ink"
        >
          choose a different file
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat n={plan.creates.length} label="new products" tone="create" />
        <Stat n={plan.updates.length} label="products updated" tone="update" />
        <Stat n={allErrors.length} label="rows skipped" tone="error" />
      </div>

      {allErrors.length > 0 && (
        <Card className="border-[#e2b9ad]">
          <p className="text-sm font-medium text-[#8f3a24]">
            These rows will be skipped
          </p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {allErrors.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
          </ul>
        </Card>
      )}

      {plan.warnings.length > 0 && (
        <Card>
          <p className="text-sm font-medium text-ink">Notes</p>
          <ul className="mt-2 space-y-1 text-xs text-muted">
            {plan.warnings.map((w, i) => (
              <li key={i}>• {w}</li>
            ))}
          </ul>
        </Card>
      )}

      {plan.creates.length > 0 && (
        <PlanTable
          title="New products"
          rows={plan.creates}
          currency={currency}
        />
      )}
      {plan.updates.length > 0 && (
        <PlanTable
          title="Updated products"
          rows={plan.updates}
          currency={currency}
        />
      )}

      {error ? <InlineError>{error}</InlineError> : null}

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <button
          type="button"
          onClick={onApply}
          disabled={nothingToDo}
          className="btn btn-primary"
        >
          {nothingToDo
            ? 'Nothing to import'
            : `Apply — ${plan.creates.length} new, ${plan.updates.length} updated`}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-secondary">
          Cancel
        </button>
      </div>
    </div>
  )
}

function Stat({
  n,
  label,
  tone,
}: {
  n: number
  label: string
  tone: 'create' | 'update' | 'error'
}) {
  const color =
    tone === 'error' && n > 0
      ? 'text-[#8f3a24]'
      : tone === 'create' && n > 0
        ? 'text-success'
        : 'text-ink'
  return (
    <div className="rounded-[14px] border border-line bg-surface p-5">
      <p className={`font-display text-2xl ${color}`}>{n}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  )
}

function PlanTable({
  title,
  rows,
  currency,
}: {
  title: string
  rows: import('../../merchant/catalogImport').PlannedProduct[]
  currency: string
}) {
  return (
    <Card>
      <p className="font-display text-lg text-ink">{title}</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-[0.1em] text-muted">
              <th className="py-2 pr-3 font-medium">SKU</th>
              <th className="py-2 pr-3 font-medium">Name</th>
              <th className="py-2 pr-3 font-medium">Price</th>
              <th className="py-2 pr-3 font-medium">Variants</th>
              <th className="py-2 font-medium">Fields set</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const newV = p.variants.filter((v) => !v.existing).length
              const updV = p.variants.filter((v) => v.existing).length
              const stockCells = p.variants.reduce(
                (s, v) => s + Object.keys(v.stockByLocation).length,
                0,
              )
              const fieldList = [
                ...(p.fields.name ? ['name'] : []),
                ...(p.priceCents != null ? ['price'] : []),
                ...Object.keys(p.fields).filter((k) => k !== 'name'),
                ...(p.status ? ['status'] : []),
              ]
              return (
                <tr
                  key={p.merchantSku}
                  className="border-b border-line last:border-0 align-top"
                >
                  <td className="py-2 pr-3 font-mono text-[0.8rem] text-ink">
                    {p.merchantSku}
                  </td>
                  <td className="py-2 pr-3 text-ink">
                    {p.fields.name || (
                      <span className="text-muted">(unchanged)</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-ink">
                    {p.priceCents != null ? (
                      new Intl.NumberFormat(undefined, {
                        style: 'currency',
                        currency,
                      }).format(p.priceCents / 100)
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-muted">
                    {newV > 0 && (
                      <span className="text-success">+{newV} new</span>
                    )}
                    {newV > 0 && updV > 0 && ', '}
                    {updV > 0 && <span>{updV} updated</span>}
                    {stockCells > 0 && (
                      <span className="block text-xs">
                        {stockCells} stock value{stockCells === 1 ? '' : 's'}
                      </span>
                    )}
                    {newV === 0 && updV === 0 && '—'}
                  </td>
                  <td className="py-2 text-xs text-muted">
                    {fieldList.length ? fieldList.join(', ') : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------
function DoneStage({
  result,
  onBackToCatalog,
  onImportAnother,
}: {
  result: ImportResult
  onBackToCatalog: () => void
  onImportAnother: () => void
}) {
  return (
    <div className="space-y-6">
      <Card>
        <p className="flex items-center gap-2 font-display text-lg text-ink">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-sm text-success"
            aria-hidden
          >
            ✓
          </span>
          Import complete
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <Line k="Products created" v={result.createdProducts} />
          <Line k="Products updated" v={result.updatedProducts} />
          <Line k="Variants created" v={result.createdVariants} />
          <Line k="Variants updated" v={result.updatedVariants} />
          <Line k="Stock values written" v={result.stockCellsWritten} />
          <Line
            k="Failed"
            v={result.failures.length}
            danger={result.failures.length > 0}
          />
        </dl>
        {result.failures.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-line pt-3 text-xs text-[#8f3a24]">
            {result.failures.map((f, i) => (
              <li key={i}>
                <span className="font-mono">{f.merchantSku}</span>: {f.message}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBackToCatalog}
          className="btn btn-primary"
        >
          View catalog
        </button>
        <button
          type="button"
          onClick={onImportAnother}
          className="btn btn-secondary"
        >
          Import another file
        </button>
      </div>
    </div>
  )
}

function Line({
  k,
  v,
  danger,
}: {
  k: string
  v: number
  danger?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-line pb-1.5">
      <dt className="text-sm text-muted">{k}</dt>
      <dd
        className={`font-display text-lg ${danger ? 'text-[#8f3a24]' : 'text-ink'}`}
      >
        {v}
      </dd>
    </div>
  )
}

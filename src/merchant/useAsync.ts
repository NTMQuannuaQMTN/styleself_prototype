import { useCallback, useEffect, useState } from 'react'

type AsyncState<T> = {
  loading: boolean
  data: T | undefined
  error: string | undefined
}

/** Run an async loader, re-running when `deps` change or `reload()` is called. */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({
    loading: true,
    data: undefined,
    error: undefined,
  })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let active = true
    setState((s) => ({ ...s, loading: true, error: undefined }))
    loader()
      .then((data) => {
        if (active) setState({ loading: false, data, error: undefined })
      })
      .catch((err: unknown) => {
        if (active)
          setState({
            loading: false,
            data: undefined,
            error: err instanceof Error ? err.message : String(err),
          })
      })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}

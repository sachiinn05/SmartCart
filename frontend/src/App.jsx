import { useEffect, useMemo, useRef, useState } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import PdfUploader from './components/PdfUploader.jsx'
import RuleInput from './components/RuleInput.jsx'
import RuleList from './components/RuleList.jsx'
import CartTable from './components/CartTable.jsx'
import OrderSummary from './components/OrderSummary.jsx'
import HistoryPanel from './components/HistoryPanel.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { parseRulesCSV, parseCartCSV } from './engine/csvParser.js'
import { calculateCart } from './engine/discountEngine.js'
import { loadState, saveRules, saveCart, saveHistory, loadHistory, clearSaved } from './persistence/store.js'

export default function App() {
  const [rules, setRules] = useState([])
  const [rulesErrors, setRulesErrors] = useState([])
  const [rulesFileName, setRulesFileName] = useState('')

  const [cartItems, setCartItems] = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [cartFileName, setCartFileName] = useState('')

  const [calculated, setCalculated] = useState(false)

  const [dbEnabled, setDbEnabled] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [history, setHistory] = useState([])
  const skipNextHistory = useRef(false)

  const canCalculate = rules.length > 0 && cartItems.length > 0
  const results = useMemo(
    () => (calculated && canCalculate ? calculateCart(cartItems, rules) : null),
    [calculated, canCalculate, cartItems, rules]
  )
  const baseTotal = cartItems.reduce((sum, i) => sum + i.basePrice, 0)

  useEffect(() => {
    let cancelled = false
    async function restore() {
      const state = await loadState()
      if (cancelled) return
      if (state.enabled) {
        setDbEnabled(true)
        if (state.rules?.length) {
          setRules(state.rules)
          setRulesFileName('saved rules')
        }
        if (state.cartItems?.length) {
          setCartItems(state.cartItems)
          setCartFileName('saved cart')
        }
        if (state.rules?.length && state.cartItems?.length) {
          skipNextHistory.current = true
          setCalculated(true)
        }
        const h = await loadHistory()
        if (!cancelled) setHistory(h.history ?? [])
      }
      setLoaded(true)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (loaded && dbEnabled) saveRules(rules)
  }, [rules, loaded, dbEnabled])

  useEffect(() => {
    if (loaded && dbEnabled) saveCart(cartItems)
  }, [cartItems, loaded, dbEnabled])

  useEffect(() => {
    if (!results || !loaded || !dbEnabled) return
    if (skipNextHistory.current) {
      skipNextHistory.current = false
      return
    }
    const timer = setTimeout(async () => {
      await saveHistory(results)
      const h = await loadHistory()
      setHistory(h.history ?? [])
    }, 800)
    return () => clearTimeout(timer)
  }, [results, loaded, dbEnabled])

  async function handleClearSaved() {
    await clearSaved()
    setRules([])
    setRulesErrors([])
    setRulesFileName('')
    setCartItems([])
    setCartErrors([])
    setCartFileName('')
    setCalculated(false)
    setHistory([])
  }

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    setRules(data)
    setRulesErrors(errors)
    setRulesFileName(fileName)
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    setCartItems(data)
    setCartErrors(errors)
    setCartFileName(fileName)
  }

  function handlePdfItems(items, fileName) {
    setCartItems(items)
    setCartFileName(fileName)
    if (rules.length > 0) setCalculated(true)
  }

  function handleRuleConfirm(rule) {
    setRules((prev) => [...prev, rule])
    if (cartItems.length > 0) setCalculated(true)
  }

  return (
    <>
      <header className="topbar">
        <span className="wordmark">
          O<b>pp</b>tra
        </span>
        <span className="sub">Discount engine</span>
        {dbEnabled && <span className="status">Saved to database</span>}
      </header>

      <div className="layout">
        <div className="setup">
          <section className="block">
            <h2>Rules</h2>
            <CsvUploader label="rules.csv" onLoad={handleRulesLoad} fileName={rulesFileName} />
            <ErrorBanner errors={rulesErrors} />
            <RuleInput rules={rules} cartItems={cartItems} onConfirm={handleRuleConfirm} />
            <RuleList rules={rules} />
          </section>

          <section className="block">
            <h2>Cart</h2>
            <CsvUploader label="cart.csv" onLoad={handleCartLoad} fileName={cartFileName} />
            <PdfUploader rules={rules} cartItems={cartItems} onItems={handlePdfItems} onErrors={setCartErrors} />
            <ErrorBanner errors={cartErrors} />
            {cartItems.length > 0 && (
              <div className="count">
                {cartItems.length} item{cartItems.length > 1 ? 's' : ''} loaded
              </div>
            )}
          </section>

          <section className="block">
            <button
              type="button"
              className="btn primary block-wide"
              disabled={!canCalculate}
              onClick={() => setCalculated(true)}
            >
              Calculate discounts
            </button>
            {!canCalculate && <p className="hint">Load rules and a cart first.</p>}
          </section>

          {dbEnabled && (
            <section className="block">
              <HistoryPanel history={history} onClear={handleClearSaved} />
            </section>
          )}
        </div>

        <main className="main">
          {results ? (
            <>
              <h1>Your cart</h1>
              <p className="lead">Each item gets the best offer available for it.</p>
              <div className="cart-grid">
                <CartTable items={cartItems} results={results.items} />
                <OrderSummary results={results} baseTotal={baseTotal} />
              </div>
            </>
          ) : cartItems.length > 0 ? (
            <>
              <h1>Cart</h1>
              <p className="lead">Load some rules, then calculate to see the offers.</p>
              <CartTable items={cartItems} />
            </>
          ) : (
            <div className="empty">
              <strong>Nothing to price yet</strong>
              Upload a rules file and a cart on the left, or describe a rule in plain English. Example files are in the
              sample-data folder.
            </div>
          )}
        </main>
      </div>
    </>
  )
}

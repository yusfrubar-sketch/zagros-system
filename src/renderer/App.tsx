import { useState, useEffect } from 'react'

type Part = 'selling' | 'warehouse' | 'products' | 'settings'

export type Product = {
  id: string
  name: string
  barcode: string
  /** Cost price (what you pay to buy it) */
  costPrice: string
  /** Sell price (what you sell it for) */
  sellPrice: string
  quantity: string
  /** Legacy: kept for old saved data */
  price?: string
}

export type Group = {
  id: string
  name: string
  productIds: string[]
}

const inputStyle = {
  width: '100%' as const,
  padding: '10px 12px',
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  color: '#1f2937',
}

function generateBarcode(): string {
  const digits = Array(13)
    .fill(0)
    .map(() => Math.floor(Math.random() * 10))
  return digits.join('')
}

function normalizeProduct(p: Record<string, unknown>): Product {
  return {
    id: String(p.id ?? ''),
    name: String(p.name ?? ''),
    barcode: String(p.barcode ?? ''),
    costPrice: String((p as Product).costPrice ?? p.price ?? ''),
    sellPrice: String((p as Product).sellPrice ?? p.price ?? ''),
    quantity: String(p.quantity ?? ''),
    price: p.price != null ? String(p.price) : undefined,
  }
}

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [groupModalOpen, setGroupModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeAuto, setBarcodeAuto] = useState(true)
  const [costPrice, setCostPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())

  const PRODUCTS_STORAGE_KEY = 'zagros-products'
  const GROUPS_STORAGE_KEY = 'zagros-groups'

  const loadProducts = () => {
    const applyList = (raw: Record<string, unknown>[]) => {
      const list = (raw || []).map(normalizeProduct)
      setProducts(list)
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
      } catch {
        // ignore
      }
    }

    if (window.electron?.getProducts) {
      window.electron.getProducts().then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        if (raw.length > 0) {
          applyList(raw)
        } else {
          try {
            const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
            if (stored) {
              const parsed = JSON.parse(stored) as Record<string, unknown>[]
              setProducts(parsed.map(normalizeProduct))
            } else {
              setProducts([])
            }
          } catch {
            setProducts([])
          }
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, unknown>[]
          setProducts(parsed.map(normalizeProduct))
        } else {
          setProducts([])
        }
      } catch {
        setProducts([])
      }
    }
  }

  const loadGroups = () => {
    const applyList = (raw: Group[]) => {
      setGroups(raw)
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(raw))
      } catch {
        // ignore
      }
    }
    if (window.electron?.getGroups) {
      window.electron.getGroups().then((list) => {
        const raw = (list || []) as Group[]
        if (raw.length > 0) applyList(raw)
        else {
          try {
            const stored = localStorage.getItem(GROUPS_STORAGE_KEY)
            if (stored) setGroups(JSON.parse(stored) as Group[])
            else setGroups([])
          } catch {
            setGroups([])
          }
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(GROUPS_STORAGE_KEY)
        if (stored) setGroups(JSON.parse(stored) as Group[])
        else setGroups([])
      } catch {
        setGroups([])
      }
    }
  }

  useEffect(() => {
    loadProducts()
    loadGroups()
  }, [])

  const openModal = () => {
    setName('')
    setBarcode('')
    setBarcodeAuto(true)
    setCostPrice('')
    setSellPrice('')
    setQuantity('')
    setModalOpen(true)
  }

  const closeModal = () => setModalOpen(false)

  const clearForm = () => {
    setName('')
    setBarcode('')
    setBarcodeAuto(true)
    setCostPrice('')
    setSellPrice('')
    setQuantity('')
  }

  const doAddProduct = (closeAfter: boolean) => {
    if (!name.trim()) return
    const finalBarcode = barcodeAuto ? generateBarcode() : barcode.trim()
    const newProduct: Product = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: name.trim(),
      barcode: finalBarcode,
      costPrice: costPrice.trim(),
      sellPrice: sellPrice.trim(),
      quantity: quantity.trim(),
    }
    if (window.electron?.addProduct) {
      window.electron.addProduct(newProduct).then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setProducts(raw.map(normalizeProduct))
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
        if (closeAfter) closeModal()
        else clearForm()
      })
    } else {
      const nextList = [...products, newProduct]
      setProducts(nextList.map(normalizeProduct))
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextList))
      } catch {
        // ignore
      }
      if (closeAfter) closeModal()
      else clearForm()
    }
  }

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault()
    doAddProduct(true)
  }

  const handleAddMore = () => {
    doAddProduct(false)
  }

  const handleDelete = (id: string) => {
    if (window.electron?.deleteProduct) {
      window.electron.deleteProduct(id).then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setProducts(raw.map(normalizeProduct))
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
      })
    } else {
      const nextList = products.filter((p) => p.id !== id)
      setProducts(nextList)
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextList))
      } catch {
        // ignore
      }
    }
  }

  const openGroupModal = () => {
    setGroupName('')
    setSelectedProductIds(new Set())
    setGroupModalOpen(true)
  }

  const toggleProductInGroup = (productId: string) => {
    setSelectedProductIds((prev) => {
      const next = new Set(prev)
      if (next.has(productId)) next.delete(productId)
      else next.add(productId)
      return next
    })
  }

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    const newGroup: Group = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: groupName.trim(),
      productIds: Array.from(selectedProductIds),
    }
    if (window.electron?.addGroup) {
      window.electron.addGroup(newGroup).then((list) => {
        setGroups((list || []) as Group[])
        try {
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(list))
        } catch {
          // ignore
        }
        setGroupModalOpen(false)
      })
    } else {
      const nextList = [...groups, newGroup]
      setGroups(nextList)
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(nextList))
      } catch {
        // ignore
      }
      setGroupModalOpen(false)
    }
  }

  const hasApi = typeof window !== 'undefined' && window.electron?.getProducts

  return (
    <section>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ color: '#1f2937', margin: 0 }}>Products</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            onClick={openGroupModal}
            style={{
              padding: '10px 20px',
              background: '#1d4ed8',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Add group
          </button>
          <button
            type="button"
            onClick={openModal}
            style={{
              padding: '10px 20px',
              background: '#f97316',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Add products
          </button>
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 18, marginBottom: 12, color: '#1f2937' }}>All products ({products.length})</h2>
        {products.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No products yet. Click “Add products” to add one.</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 80px 70px 80px',
                gap: 16,
                padding: '8px 16px 12px',
                fontSize: 12,
                fontWeight: 600,
                color: '#6b7280',
                borderBottom: '1px solid #e5e7eb',
              }}
            >
              <span>Name</span>
              <span>Barcode</span>
              <span>Cost</span>
              <span>Sell</span>
              <span>Qty</span>
              <span></span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 80px 80px 70px 80px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ color: '#1f2937' }}>{p.name}</span>
                  <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>{p.barcode || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.costPrice || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.sellPrice || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.quantity || '—'}</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    style={{
                      padding: '6px 12px',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: 6,
                      color: '#b91c1c',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {groups.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: '#1f2937' }}>Groups ({groups.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groups.map((g) => {
              const productNames = g.productIds
                .map((id) => products.find((p) => p.id === id)?.name)
                .filter(Boolean) as string[]
              return (
                <li
                  key={g.id}
                  style={{
                    padding: '12px 16px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#1f2937' }}>{g.name}</span>
                  <span style={{ color: '#6b7280', marginLeft: 8 }}>({g.productIds.length} products)</span>
                  {productNames.length > 0 && (
                    <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                      {productNames.join(', ')}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-product-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 420,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-product-title" style={{ margin: '0 0 20px', color: '#1f2937', fontSize: 20 }}>
              Add new product
            </h2>
            <form onSubmit={handleAdd}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Product name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Product name"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Barcode</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="barcodeMode"
                      checked={barcodeAuto}
                      onChange={() => setBarcodeAuto(true)}
                    />
                    <span style={{ fontSize: 14, color: '#1f2937' }}>Auto-generate</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="barcodeMode"
                      checked={!barcodeAuto}
                      onChange={() => setBarcodeAuto(false)}
                    />
                    <span style={{ fontSize: 14, color: '#1f2937' }}>Enter myself</span>
                  </label>
                </div>
                {!barcodeAuto && (
                  <input
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Enter barcode"
                    style={inputStyle}
                  />
                )}
                {barcodeAuto && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                    System will generate a unique 13-digit barcode when you add the product.
                  </p>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Cost price (what you pay)</label>
                <input
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  step="any"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Sell price (what you sell it for)</label>
                <input
                  value={sellPrice}
                  onChange={(e) => setSellPrice(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  step="any"
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Quantity</label>
                <input
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={closeModal}
                  style={{
                    padding: '10px 18px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    color: '#1f2937',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddMore}
                  style={{
                    padding: '10px 18px',
                    background: '#1d4ed8',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Add more products
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 18px',
                    background: '#f97316',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Add product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {groupModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-group-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setGroupModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 440,
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="add-group-title" style={{ margin: '0 0 20px', color: '#1f2937', fontSize: 20 }}>
              Add group
            </h2>
            <form onSubmit={handleCreateGroup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Group name</label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Beverages, Snacks"
                  required
                  style={inputStyle}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                  Select products for this group
                </label>
                {products.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#6b7280' }}>No products yet. Add products first.</p>
                ) : (
                  <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, maxHeight: 200, overflow: 'auto', padding: 8 }}>
                    {products.map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '6px 0',
                          cursor: 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProductIds.has(p.id)}
                          onChange={() => toggleProductInGroup(p.id)}
                        />
                        <span style={{ fontSize: 14, color: '#1f2937' }}>{p.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setGroupModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    color: '#1f2937',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 18px',
                    background: '#1d4ed8',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Create group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {!hasApi && (
        <p style={{ marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          Run the app in Electron to save products to your computer.
        </p>
      )}
    </section>
  )
}

function SettingsSection() {
  const [localPath, setLocalPath] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.getLocalStoragePath) {
      window.electron.getLocalStoragePath().then(setLocalPath)
    }
  }, [])

  return (
    <section>
      <h1 style={{ color: '#1f2937' }}>Settings</h1>
      <div style={{ marginTop: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>Storage (bucket)</h2>
        <p style={{ color: '#6b7280', marginBottom: 8 }}>
          Data is stored <strong style={{ color: '#1f2937' }}>locally on this computer</strong>.
        </p>
        {localPath && (
          <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#6b7280', wordBreak: 'break-all' }}>
            {localPath}
          </p>
        )}
      </div>
      <p style={{ marginTop: 24, color: '#6b7280' }}>Language, printer and other options coming soon.</p>
    </section>
  )
}

const TABS: { id: Part; label: string; description: string }[] = [
  { id: 'selling', label: 'Selling', description: 'Point of sale, barcode, checkout' },
  { id: 'warehouse', label: 'Warehouse', description: 'Stock and inventory' },
  { id: 'products', label: 'Products', description: 'Product list, add and edit items' },
  { id: 'settings', label: 'Settings', description: 'Language, storage, printer' },
]

export default function App() {
  const [current, setCurrent] = useState<Part | null>(null)

  return (
    <div style={{ minHeight: '100vh', padding: 24, background: '#f9fafb' }}>
      {current === null ? (
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img
              src="/zagros-logo.png"
              alt="Zagros System"
              style={{ maxWidth: 280, height: 'auto', display: 'block', margin: '0 auto 24px' }}
            />
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            {TABS.map(({ id, label, description }) => (
              <button
                key={id}
                onClick={() => setCurrent(id)}
                style={{
                  padding: 28,
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  background: '#fff',
                  color: '#1f2937',
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}
              >
                <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: '#1d4ed8' }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>{description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={() => setCurrent(null)}
            style={{
              marginBottom: 24,
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#1d4ed8',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Back to home
          </button>
          {current === 'selling' && (
            <section>
              <h1 style={{ color: '#1f2937' }}>Selling</h1>
              <p style={{ color: '#6b7280' }}>Point of sale: scan barcode, add to cart, checkout.</p>
            </section>
          )}
          {current === 'warehouse' && (
            <section>
              <h1 style={{ color: '#1f2937' }}>Warehouse</h1>
              <p style={{ color: '#6b7280' }}>Stock and inventory management.</p>
            </section>
          )}
          {current === 'products' && <ProductsSection />}
          {current === 'settings' && (
            <SettingsSection />
          )}
        </>
      )}
    </div>
  )
}

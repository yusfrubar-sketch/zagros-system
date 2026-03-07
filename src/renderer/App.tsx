import { useState, useEffect } from 'react'

type Part = 'buying' | 'warehouse' | 'products' | 'selling' | 'settings'

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

export type Company = {
  id: string
  name: string
  phone?: string
}

const THEME_STORAGE_KEY = 'zagros-theme'
type Theme = 'light' | 'dark'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const s = localStorage.getItem(THEME_STORAGE_KEY)
    if (s === 'dark' || s === 'light') return s
  } catch {
    // ignore
  }
  return 'light'
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
  const [editingGroup, setEditingGroup] = useState<Group | null>(null)
  const [deleteConfirmGroupId, setDeleteConfirmGroupId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeAuto, setBarcodeAuto] = useState(true)
  const [costPrice, setCostPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [quantity, setQuantity] = useState('')
  const [groupName, setGroupName] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set())
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

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

  const openEditModal = (p: Product) => {
    setEditingProduct(p)
    setName(p.name)
    setBarcode(p.barcode)
    setBarcodeAuto(false)
    setCostPrice(p.costPrice)
    setSellPrice(p.sellPrice)
    setQuantity(p.quantity)
  }

  const closeEditModal = () => setEditingProduct(null)

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct || !name.trim()) return
    const updated: Product = {
      ...editingProduct,
      name: name.trim(),
      barcode: barcode.trim(),
      costPrice: costPrice.trim(),
      sellPrice: sellPrice.trim(),
      quantity: quantity.trim(),
    }
    const updatedList = products.map((prod) => (prod.id === editingProduct.id ? updated : prod))
    if (window.electron?.saveProducts) {
      window.electron.saveProducts(updatedList).then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setProducts(raw.map(normalizeProduct))
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
        closeEditModal()
      })
    } else {
      setProducts(updatedList.map(normalizeProduct))
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedList))
      } catch {
        // ignore
      }
      closeEditModal()
    }
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
    setEditingGroup(null)
    setGroupName('')
    setSelectedProductIds(new Set())
    setGroupModalOpen(true)
  }

  const openEditGroupModal = (g: Group) => {
    setEditingGroup(g)
    setGroupName(g.name)
    setSelectedProductIds(new Set(g.productIds))
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

  const handleSubmitGroup = (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim()) return
    const productIds = Array.from(selectedProductIds)
    if (editingGroup) {
      const updated: Group = { ...editingGroup, name: groupName.trim(), productIds }
      const nextList = groups.map((g) => (g.id === updated.id ? updated : g))
      if (window.electron?.saveGroups) {
        window.electron.saveGroups(nextList).then((list) => {
          setGroups((list || []) as Group[])
          try {
            localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(list))
          } catch {
            // ignore
          }
          setGroupModalOpen(false)
          setEditingGroup(null)
        })
      } else {
        setGroups(nextList)
        try {
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(nextList))
        } catch {
          // ignore
        }
        setGroupModalOpen(false)
        setEditingGroup(null)
      }
    } else {
      const newGroup: Group = {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        name: groupName.trim(),
        productIds,
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
  }

  const handleDeleteGroup = (id: string) => {
    if (window.electron?.deleteGroup) {
      window.electron.deleteGroup(id).then((list) => {
        setGroups((list || []) as Group[])
        try {
          localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(list))
        } catch {
          // ignore
        }
        setDeleteConfirmGroupId(null)
      })
    } else {
      const nextList = groups.filter((g) => g.id !== id)
      setGroups(nextList)
      try {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(nextList))
      } catch {
        // ignore
      }
      setDeleteConfirmGroupId(null)
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

      <div style={{ overflowX: 'auto' }}>
        <h2 style={{ fontSize: 18, marginBottom: 12, color: '#1f2937' }}>All products ({products.length})</h2>
        {products.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No products yet. Click “Add products” to add one.</p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 80px 70px 160px',
                gap: 16,
                alignItems: 'center',
                padding: '14px 16px',
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: '0.02em',
                color: '#fff',
                background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)',
                border: '1px solid #1f2937',
                borderBottom: 'none',
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10,
                minWidth: 700,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              }}
            >
              <span>Name</span>
              <span>Barcode</span>
              <span>Cost</span>
              <span>Sell</span>
              <span>Qty</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {products.map((p) => (
                <li
                  key={p.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 80px 80px 70px 160px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '12px 16px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    marginBottom: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                    minWidth: 700,
                  }}
                >
                  <span style={{ color: '#1f2937' }}>{p.name}</span>
                  <span style={{ color: '#6b7280', fontFamily: 'monospace' }}>{p.barcode || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.costPrice || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.sellPrice || '—'}</span>
                  <span style={{ color: '#1f2937' }}>{p.quantity || '—'}</span>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(p)}
                      style={{
                        padding: '6px 14px',
                        background: '#1d4ed8',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                        minWidth: 56,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id)}
                      style={{
                        padding: '6px 14px',
                        background: '#fee2e2',
                        border: '1px solid #fecaca',
                        borderRadius: 6,
                        color: '#b91c1c',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 500,
                        minWidth: 56,
                      }}
                    >
                      Delete
                    </button>
                  </div>
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
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: '#1f2937' }}>{g.name}</span>
                    <span style={{ color: '#6b7280', marginLeft: 8 }}>({g.productIds.length} products)</span>
                    {productNames.length > 0 && (
                      <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
                        {productNames.join(', ')}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      type="button"
                      onClick={() => openEditGroupModal(g)}
                      style={{
                        padding: '6px 14px',
                        background: '#1d4ed8',
                        border: 'none',
                        borderRadius: 6,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmGroupId(g.id)}
                      style={{
                        padding: '6px 14px',
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
                  </div>
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

      {editingProduct && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-product-title"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && closeEditModal()}
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
            <h2 id="edit-product-title" style={{ margin: '0 0 20px', color: '#1f2937', fontSize: 20 }}>
              Edit product
            </h2>
            <form onSubmit={handleEditSubmit}>
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
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Barcode</label>
                <input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="Barcode number"
                  style={inputStyle}
                />
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
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={closeEditModal}
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
                  Save
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
              {editingGroup ? 'Edit group' : 'Add group'}
            </h2>
            <form onSubmit={handleSubmitGroup}>
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
                  {editingGroup ? 'Save' : 'Create group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmGroupId && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setDeleteConfirmGroupId(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              width: '100%',
              maxWidth: 380,
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 12px', color: '#1f2937', fontSize: 18 }}>Delete group</h2>
            <p style={{ color: '#6b7280', margin: '0 0 20px', fontSize: 14 }}>
              Are you sure you want to delete this group?
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmGroupId(null)}
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
                onClick={() => deleteConfirmGroupId && handleDeleteGroup(deleteConfirmGroupId)}
                style={{
                  padding: '10px 18px',
                  background: '#dc2626',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Delete
              </button>
            </div>
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

type SelectedForBuying = { productId: string; buyPrice: string; buyQuantity: string }

export type BuyingRecipe = {
  id: string
  companyName: string
  createdAt: number
  /** Date of buying (YYYY-MM-DD), can be changed by user */
  date?: string
  /** Optional recipe/reference number */
  recipeNumber?: string
  /** Optional note */
  note?: string
  items: { productId: string; productName: string; buyPrice: string; buyQuantity: string }[]
}

function todayDateString(): string {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function normalizeRecipe(r: Record<string, unknown>): BuyingRecipe {
  const items = (r.items as Record<string, unknown>[] || []).map((i) => ({
    productId: String(i.productId ?? ''),
    productName: String(i.productName ?? ''),
    buyPrice: String(i.buyPrice ?? ''),
    buyQuantity: String(i.buyQuantity ?? ''),
  }))
  const dateStr = r.date != null ? String(r.date) : undefined
  const createdAt = dateStr ? new Date(dateStr + 'T12:00:00').getTime() : Number(r.createdAt ?? 0)
  return {
    id: String(r.id ?? ''),
    companyName: String(r.companyName ?? ''),
    createdAt: Number(r.createdAt ?? 0) || createdAt,
    date: dateStr,
    recipeNumber: r.recipeNumber != null ? String(r.recipeNumber) : undefined,
    note: r.note != null ? String(r.note) : undefined,
    items,
  }
}

function BuyingSection() {
  const [products, setProducts] = useState<Product[]>([])
  const [recipes, setRecipes] = useState<BuyingRecipe[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [companySearch, setCompanySearch] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [addBuyingModalOpen, setAddBuyingModalOpen] = useState(false)
  const [buyingDate, setBuyingDate] = useState('')
  const [recipeNumber, setRecipeNumber] = useState('')
  const [buyingNote, setBuyingNote] = useState('')
  const [showSplitView, setShowSplitView] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [selectedForBuying, setSelectedForBuying] = useState<SelectedForBuying[]>([])
  const [editingRecipe, setEditingRecipe] = useState<BuyingRecipe | null>(null)
  const [recipeToDeleteId, setRecipeToDeleteId] = useState<string | null>(null)
  const [addProductModalOpen, setAddProductModalOpen] = useState(false)
  const [addProductName, setAddProductName] = useState('')
  const [addProductBarcode, setAddProductBarcode] = useState('')
  const [addProductBarcodeAuto, setAddProductBarcodeAuto] = useState(true)
  const [addProductCostPrice, setAddProductCostPrice] = useState('')
  const [addProductSellPrice, setAddProductSellPrice] = useState('')
  const [addProductQuantity, setAddProductQuantity] = useState('')
  const [editForm, setEditForm] = useState<{
    companyName: string
    date: string
    recipeNumber: string
    note: string
    items: { productId: string; productName: string; buyPrice: string; buyQuantity: string }[]
  } | null>(null)
  const PRODUCTS_STORAGE_KEY = 'zagros-products'
  const RECIPES_STORAGE_KEY = 'zagros-buying-recipes'
  const COMPANIES_STORAGE_KEY = 'zagros-companies'

  const loadProducts = () => {
    const applyList = (raw: Record<string, unknown>[]) => {
      setProducts((raw || []).map(normalizeProduct))
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
      } catch {
        // ignore
      }
    }
    if (window.electron?.getProducts) {
      window.electron.getProducts().then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        if (raw.length > 0) applyList(raw)
        else {
          try {
            const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
            const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
            setProducts(parsed.map(normalizeProduct))
          } catch {
            setProducts([])
          }
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
        const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
        setProducts(parsed.map(normalizeProduct))
      } catch {
        setProducts([])
      }
    }
  }

  const loadRecipes = () => {
    if (window.electron?.getRecipes) {
      window.electron.getRecipes().then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setRecipes(raw.map(normalizeRecipe))
        try {
          localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(RECIPES_STORAGE_KEY)
        const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
        setRecipes(parsed.map(normalizeRecipe))
      } catch {
        setRecipes([])
      }
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    loadRecipes()
  }, [])

  const loadCompanies = () => {
    if (window.electron?.getCompanies) {
      window.electron.getCompanies().then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setCompanies(raw.map(normalizeCompany))
        try {
          localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(COMPANIES_STORAGE_KEY)
        const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
        setCompanies(parsed.map(normalizeCompany))
      } catch {
        setCompanies([])
      }
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const filteredCompanies = companySearch.trim()
    ? companies.filter((c) =>
        c.name.toLowerCase().includes(companySearch.toLowerCase()) ||
        (c.phone ?? '').includes(companySearch.trim())
      )
    : companies

  const saveRecipesList = (next: BuyingRecipe[]) => {
    setRecipes(next)
    if (window.electron?.saveRecipes) {
      window.electron.saveRecipes(next).then((list) => {
        setRecipes((list || []).map(normalizeRecipe))
        try {
          localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(list))
        } catch {
          // ignore
        }
      })
    } else {
      try {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
    }
  }

  const handleDeleteRecipe = (id: string) => {
    setRecipeToDeleteId(id)
  }

  const confirmDeleteRecipe = () => {
    if (!recipeToDeleteId) return
    const next = recipes.filter((r) => r.id !== recipeToDeleteId)
    saveRecipesList(next)
    setRecipeToDeleteId(null)
  }

  const openEditRecipe = (recipe: BuyingRecipe) => {
    setEditingRecipe(recipe)
    setEditForm({
      companyName: recipe.companyName,
      date: recipe.date ?? todayDateString(),
      recipeNumber: recipe.recipeNumber ?? '',
      note: recipe.note ?? '',
      items: recipe.items.map((i) => ({ ...i })),
    })
  }

  const updateEditItem = (idx: number, field: 'buyPrice' | 'buyQuantity', value: string) => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      items: editForm.items.map((item, i) => (i === idx ? { ...item, [field]: value } : item)),
    })
  }

  const removeEditItem = (idx: number) => {
    if (!editForm) return
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== idx) })
  }

  const handleSaveEditRecipe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRecipe || !editForm) return
    const updated: BuyingRecipe = {
      ...editingRecipe,
      companyName: editForm.companyName.trim(),
      date: editForm.date.trim() || undefined,
      recipeNumber: editForm.recipeNumber.trim() || undefined,
      note: editForm.note.trim() || undefined,
      items: editForm.items,
    }
    const next = recipes.map((r) => (r.id === updated.id ? updated : r))
    saveRecipesList(next)
    setEditingRecipe(null)
    setEditForm(null)
  }

  const openAddProductModal = () => {
    setAddProductName('')
    setAddProductBarcode('')
    setAddProductBarcodeAuto(true)
    setAddProductCostPrice('')
    setAddProductSellPrice('')
    setAddProductQuantity('')
    setAddProductModalOpen(true)
  }

  const doAddProductFromBuying = (closeAfter: boolean) => {
    if (!addProductName.trim()) return
    const finalBarcode = addProductBarcodeAuto ? generateBarcode() : addProductBarcode.trim()
    const newProduct: Product = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: addProductName.trim(),
      barcode: finalBarcode,
      costPrice: addProductCostPrice.trim(),
      sellPrice: addProductSellPrice.trim(),
      quantity: addProductQuantity.trim(),
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
        if (closeAfter) setAddProductModalOpen(false)
        else {
          setAddProductName('')
          setAddProductBarcode('')
          setAddProductBarcodeAuto(true)
          setAddProductCostPrice('')
          setAddProductSellPrice('')
          setAddProductQuantity('')
        }
      })
    } else {
      const nextList = [...products, newProduct]
      setProducts(nextList.map(normalizeProduct))
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(nextList))
      } catch {
        // ignore
      }
      if (closeAfter) setAddProductModalOpen(false)
      else {
        setAddProductName('')
        setAddProductBarcode('')
        setAddProductBarcodeAuto(true)
        setAddProductCostPrice('')
        setAddProductSellPrice('')
        setAddProductQuantity('')
      }
    }
  }

  const handleAddProductFromBuying = (e: React.FormEvent) => {
    e.preventDefault()
    doAddProductFromBuying(true)
  }

  const handleAddMoreFromBuying = () => {
    doAddProductFromBuying(false)
  }

  const addToBuying = (product: Product) => {
    if (selectedForBuying.some((s) => s.productId === product.id)) return
    setSelectedForBuying((prev) => [
      ...prev,
      { productId: product.id, buyPrice: product.costPrice, buyQuantity: '' },
    ])
  }

  const removeFromBuying = (productId: string) => {
    setSelectedForBuying((prev) => prev.filter((s) => s.productId !== productId))
  }

  const updateSelected = (productId: string, field: 'buyPrice' | 'buyQuantity', value: string) => {
    setSelectedForBuying((prev) =>
      prev.map((s) => (s.productId === productId ? { ...s, [field]: value } : s))
    )
  }

  const handleAddToProducts = (e: React.FormEvent) => {
    e.preventDefault()
    const toApply = selectedForBuying.filter((s) => {
      const qty = Math.max(0, parseInt(s.buyQuantity, 10) || 0)
      return qty > 0
    })
    if (toApply.length === 0) return
    const updatedList = products.map((p) => {
      const sel = toApply.find((s) => s.productId === p.id)
      if (!sel) return p
      const qty = Math.max(0, parseInt(sel.buyQuantity, 10) || 0)
      const price = sel.buyPrice.trim() || p.costPrice
      const currentQty = parseInt(p.quantity, 10) || 0
      return { ...p, costPrice: price, quantity: String(currentQty + qty) }
    })
    const dateStr = buyingDate.trim() || todayDateString()
    const recipe: BuyingRecipe = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      companyName: selectedCompany?.name ?? companyName.trim(),
      createdAt: new Date(dateStr + 'T12:00:00').getTime(),
      date: dateStr,
      recipeNumber: recipeNumber.trim() || undefined,
      note: buyingNote.trim() || undefined,
      items: toApply.map((s) => {
        const p = products.find((x) => x.id === s.productId)
        return {
          productId: s.productId,
          productName: p?.name ?? '',
          buyPrice: s.buyPrice,
          buyQuantity: s.buyQuantity,
        }
      }),
    }
    const saveAndClear = () => {
      setSelectedForBuying([])
      loadRecipes()
      setShowSplitView(false)
      setCompanyName('')
      setSelectedCompany(null)
      setBuyingDate('')
      setRecipeNumber('')
      setBuyingNote('')
      setProductSearch('')
    }
    if (window.electron?.saveProducts) {
      window.electron.saveProducts(updatedList).then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setProducts(raw.map(normalizeProduct))
        try {
          localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
        if (window.electron?.addRecipe) {
          window.electron.addRecipe(recipe).then(() => saveAndClear())
        } else {
          const nextRecipes = [...recipes, recipe]
          setRecipes(nextRecipes)
          try {
            localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(nextRecipes))
          } catch {
            // ignore
          }
          saveAndClear()
        }
      })
    } else {
      setProducts(updatedList.map(normalizeProduct))
      try {
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedList))
      } catch {
        // ignore
      }
      const nextRecipes = [...recipes, recipe]
      setRecipes(nextRecipes)
      try {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(nextRecipes))
      } catch {
        // ignore
      }
      saveAndClear()
    }
  }

  const openAddBuyingModal = () => {
    setCompanySearch('')
    setSelectedCompany(null)
    setAddBuyingModalOpen(true)
  }

  const confirmAddBuying = () => {
    if (!selectedCompany) return
    setCompanyName(selectedCompany.name)
    setBuyingDate(todayDateString())
    setRecipeNumber('')
    setBuyingNote('')
    setShowSplitView(true)
    setAddBuyingModalOpen(false)
  }

  // Initial page: Add buying button at top + All recipes table
  if (!showSplitView) {
    return (
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={{ color: '#1f2937', margin: 0 }}>Buying</h1>
          <button
            type="button"
            onClick={openAddBuyingModal}
            style={{
              padding: '12px 24px',
              background: '#1d4ed8',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Add buying
          </button>
        </div>
        <h2 style={{ fontSize: 18, marginBottom: 16, color: '#1f2937' }}>All recipes</h2>
        {recipes.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No buying recipes yet. Complete an “Add buying” and “Add to products” to create one.</p>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Company</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Date</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Recipe number</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#374151' }}>Note</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#374151' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...recipes].reverse().map((recipe) => (
                  <tr key={recipe.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '12px 16px', color: '#1f2937', fontWeight: 500 }}>{recipe.companyName}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>
                      {recipe.date
                        ? new Date(recipe.date + 'T12:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })
                        : new Date(recipe.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{recipe.recipeNumber ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: 240 }}>{recipe.note ?? '—'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => openEditRecipe(recipe)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          background: '#fff',
                          color: '#1d4ed8',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          marginRight: 8,
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecipeToDeleteId(recipe.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          background: '#fff',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {recipeToDeleteId !== null && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
            onClick={() => setRecipeToDeleteId(null)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                maxWidth: 360,
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ margin: '0 0 24px', fontSize: 16, color: '#1f2937' }}>Are you sure to delete?</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setRecipeToDeleteId(null)}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteRecipe}
                  style={{
                    padding: '10px 18px',
                    background: '#dc2626',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {addBuyingModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
            onClick={() => setAddBuyingModalOpen(false)}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                maxWidth: 480,
                width: '100%',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px', color: '#1f2937' }}>Add buying</h3>
              <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>Select or search for a company.</p>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Search company</label>
              <input
                type="text"
                placeholder="Search by name or phone..."
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                style={{ ...inputStyle, marginBottom: 12 }}
              />
              {companies.length === 0 ? (
                <p style={{ color: '#6b7280', marginBottom: 16 }}>No companies yet. Go to Settings → Manage companies to add one.</p>
              ) : filteredCompanies.length === 0 ? (
                <p style={{ color: '#6b7280', marginBottom: 16 }}>No company matches your search.</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginBottom: 20, maxHeight: 260, overflowY: 'auto' }}>
                  {filteredCompanies.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedCompany(c)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          textAlign: 'left',
                          border: 'none',
                          borderBottom: '1px solid #e5e7eb',
                          background: selectedCompany?.id === c.id ? '#eff6ff' : '#fff',
                          color: '#1f2937',
                          cursor: 'pointer',
                          fontSize: 14,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                        {c.phone && <span style={{ color: '#6b7280', marginLeft: 8 }}>· {c.phone}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setAddBuyingModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmAddBuying}
                  disabled={!selectedCompany}
                  style={{
                    padding: '10px 18px',
                    background: selectedCompany ? '#1d4ed8' : '#9ca3af',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    cursor: selectedCompany ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                  }}
                >
                  Add buying
                </button>
              </div>
            </div>
          </div>
        )}

        {editingRecipe && editForm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 24,
            }}
            onClick={() => { setEditingRecipe(null); setEditForm(null) }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 12,
                padding: 24,
                maxWidth: 560,
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 20px', color: '#1f2937' }}>Edit recipe</h3>
              <form onSubmit={handleSaveEditRecipe}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Company name</label>
                    <input
                      type="text"
                      value={editForm.companyName}
                      onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Recipe number (optional)</label>
                  <input
                    type="text"
                    value={editForm.recipeNumber}
                    onChange={(e) => setEditForm({ ...editForm, recipeNumber: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note (optional)</label>
                  <input
                    type="text"
                    value={editForm.note}
                    onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Items</label>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {editForm.items.map((item, idx) => (
                      <li
                        key={idx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 80px 80px auto',
                          gap: 8,
                          alignItems: 'center',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 14, color: '#1f2937' }}>{item.productName}</span>
                        <input
                          type="text"
                          placeholder="Price"
                          value={item.buyPrice}
                          onChange={(e) => updateEditItem(idx, 'buyPrice', e.target.value)}
                          style={{ ...inputStyle, padding: '8px 10px' }}
                        />
                        <input
                          type="text"
                          placeholder="Qty"
                          value={item.buyQuantity}
                          onChange={(e) => updateEditItem(idx, 'buyQuantity', e.target.value)}
                          style={{ ...inputStyle, padding: '8px 10px' }}
                        />
                        <button
                          type="button"
                          onClick={() => removeEditItem(idx)}
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            borderRadius: 6,
                            background: '#fff',
                            color: '#dc2626',
                            cursor: 'pointer',
                            fontSize: 12,
                          }}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => { setEditingRecipe(null); setEditForm(null) }}
                    style={{
                      padding: '10px 18px',
                      border: '1px solid #e5e7eb',
                      borderRadius: 8,
                      background: '#fff',
                      color: '#374151',
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
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </section>
    )
  }

  // Split view: left = all products (names), right = selected with price/qty
  const selectedIds = new Set(selectedForBuying.map((s) => s.productId))
  const filteredProductsForBuying = productSearch.trim()
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
          p.barcode.includes(productSearch.trim())
      )
    : products

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={() => {
              setShowSplitView(false)
              setCompanyName('')
              setBuyingDate('')
              setRecipeNumber('')
              setBuyingNote('')
              setSelectedCompany(null)
              setSelectedForBuying([])
            }}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Back
          </button>
          <h1 style={{ color: '#1f2937', margin: 0 }}>
            Buying from: {companyName.trim() || 'Company'}
          </h1>
        </div>
        <button
          type="button"
          onClick={openAddProductModal}
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: 16,
          alignItems: 'end',
          marginBottom: 16,
          padding: 16,
          background: '#f9fafb',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Date</label>
          <input
            type="date"
            value={buyingDate}
            onChange={(e) => setBuyingDate(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Recipe number (optional)</label>
          <input
            type="text"
            placeholder="e.g. INV-001"
            value={recipeNumber}
            onChange={(e) => setRecipeNumber(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Note (optional)</label>
          <input
            type="text"
            placeholder="Any note for this buying..."
            value={buyingNote}
            onChange={(e) => setBuyingNote(e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(260px, 1.25fr) 1.75fr',
          gap: 24,
          height: 'calc(100vh - 280px)',
          minHeight: 400,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#fff',
        }}
      >
        {/* Left: all products (names only) - own scrolling */}
        <div
          style={{
            borderRight: '1px solid #e5e7eb',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <input
            type="text"
            placeholder="Search by name or barcode..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            style={{ ...inputStyle, marginBottom: 12, padding: '8px 12px', flexShrink: 0 }}
          />
          <h2 style={{ fontSize: 16, marginBottom: 12, color: '#1f2937', flexShrink: 0 }}>All products</h2>
          {products.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No products yet. Add products in the Products section first.</p>
          ) : filteredProductsForBuying.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No products match your search.</p>
          ) : (
            <div style={{ overflow: 'auto', flex: 1, minHeight: 0, border: '1px solid #e5e7eb', borderRadius: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'linear-gradient(180deg, #374151 0%, #1f2937 100%)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, letterSpacing: '0.02em', color: '#fff' }}>Name</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, letterSpacing: '0.02em', color: '#fff' }}>Barcode</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13, letterSpacing: '0.02em', color: '#fff' }}>Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProductsForBuying.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => !selectedIds.has(p.id) && addToBuying(p)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && !selectedIds.has(p.id) && addToBuying(p)}
                      style={{
                        borderBottom: '1px solid #e5e7eb',
                        background: selectedIds.has(p.id) ? '#e0e7ff' : '#fff',
                        color: selectedIds.has(p.id) ? '#6b7280' : '#1f2937',
                        cursor: selectedIds.has(p.id) ? 'default' : 'pointer',
                      }}
                    >
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.barcode}</td>
                      <td style={{ padding: '10px 12px', color: '#6b7280' }}>{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: selected products with price & quantity - own scrolling */}
        <div
          style={{
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          <h2 style={{ fontSize: 16, marginBottom: 12, color: '#1f2937', flexShrink: 0 }}>Selected for this buying</h2>
          {selectedForBuying.length === 0 ? (
            <p style={{ color: '#6b7280' }}>Click products on the left to add them here.</p>
          ) : (
            <form onSubmit={handleAddToProducts} style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', flex: 1 }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginBottom: 20, overflow: 'auto', flex: 1, minHeight: 0 }}>
                {selectedForBuying.map((s) => {
                  const p = products.find((x) => x.id === s.productId)
                  if (!p) return null
                  return (
                    <li
                      key={p.id}
                      style={{
                        padding: '12px 0',
                        borderBottom: '1px solid #e5e7eb',
                        display: 'grid',
                        gridTemplateColumns: '1fr 100px 100px auto',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: '#1f2937' }}>{p.name}</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Price"
                        value={s.buyPrice}
                        onChange={(e) => updateSelected(p.id, 'buyPrice', e.target.value)}
                        style={{ ...inputStyle, padding: '8px 10px' }}
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="Qty"
                        value={s.buyQuantity}
                        onChange={(e) => updateSelected(p.id, 'buyQuantity', e.target.value)}
                        style={{ ...inputStyle, padding: '8px 10px' }}
                      />
                      <button
                        type="button"
                        onClick={() => removeFromBuying(p.id)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: 6,
                          background: '#fff',
                          color: '#dc2626',
                          cursor: 'pointer',
                          fontSize: 13,
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  )
                })}
              </ul>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: '#1d4ed8',
                  border: 'none',
                  borderRadius: 8,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                Add to products
              </button>
            </form>
          )}
        </div>
      </div>

      {addProductModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-product-title-buying"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => e.target === e.currentTarget && setAddProductModalOpen(false)}
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
            <h2 id="add-product-title-buying" style={{ margin: '0 0 20px', color: '#1f2937', fontSize: 20 }}>
              Add new product
            </h2>
            <form onSubmit={handleAddProductFromBuying}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Product name</label>
                <input
                  value={addProductName}
                  onChange={(e) => setAddProductName(e.target.value)}
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
                      name="barcodeModeBuying"
                      checked={addProductBarcodeAuto}
                      onChange={() => setAddProductBarcodeAuto(true)}
                    />
                    <span style={{ fontSize: 14, color: '#1f2937' }}>Auto-generate</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="barcodeModeBuying"
                      checked={!addProductBarcodeAuto}
                      onChange={() => setAddProductBarcodeAuto(false)}
                    />
                    <span style={{ fontSize: 14, color: '#1f2937' }}>Enter myself</span>
                  </label>
                </div>
                {!addProductBarcodeAuto && (
                  <input
                    value={addProductBarcode}
                    onChange={(e) => setAddProductBarcode(e.target.value)}
                    placeholder="Enter barcode"
                    style={inputStyle}
                  />
                )}
                {addProductBarcodeAuto && (
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>
                    System will generate a unique 13-digit barcode when you add the product.
                  </p>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Cost price (what you pay)</label>
                <input
                  value={addProductCostPrice}
                  onChange={(e) => setAddProductCostPrice(e.target.value)}
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
                  value={addProductSellPrice}
                  onChange={(e) => setAddProductSellPrice(e.target.value)}
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
                  value={addProductQuantity}
                  onChange={(e) => setAddProductQuantity(e.target.value)}
                  placeholder="0"
                  type="number"
                  min="0"
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setAddProductModalOpen(false)}
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
                  onClick={handleAddMoreFromBuying}
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
    </section>
  )
}

function normalizeCompany(c: Record<string, unknown>): Company {
  return {
    id: String(c.id ?? ''),
    name: String(c.name ?? ''),
    phone: c.phone != null ? String(c.phone) : undefined,
  }
}

const SAMPLE_PRODUCTS: Omit<Product, 'id' | 'barcode'>[] = [
  { name: 'Rice 1kg', costPrice: '8', sellPrice: '12', quantity: '100' },
  { name: 'Oil 1L', costPrice: '15', sellPrice: '22', quantity: '50' },
  { name: 'Sugar 500g', costPrice: '5', sellPrice: '8', quantity: '80' },
  { name: 'Tea 250g', costPrice: '6', sellPrice: '10', quantity: '60' },
  { name: 'Milk 1L', costPrice: '4', sellPrice: '6', quantity: '40' },
  { name: 'Bread', costPrice: '2', sellPrice: '3', quantity: '120' },
  { name: 'Eggs (12)', costPrice: '10', sellPrice: '14', quantity: '30' },
  { name: 'Cheese 200g', costPrice: '12', sellPrice: '18', quantity: '25' },
  { name: 'Butter 250g', costPrice: '14', sellPrice: '20', quantity: '35' },
  { name: 'Juice 1L', costPrice: '6', sellPrice: '9', quantity: '45' },
  { name: 'Water 1.5L', costPrice: '1', sellPrice: '2', quantity: '200' },
  { name: 'Soap', costPrice: '3', sellPrice: '5', quantity: '70' },
  { name: 'Shampoo', costPrice: '18', sellPrice: '25', quantity: '20' },
  { name: 'Tissue Box', costPrice: '4', sellPrice: '7', quantity: '55' },
  { name: 'Pasta 500g', costPrice: '5', sellPrice: '8', quantity: '65' },
  { name: 'Flour 1kg', costPrice: '6', sellPrice: '10', quantity: '45' },
  { name: 'Salt 500g', costPrice: '2', sellPrice: '4', quantity: '90' },
  { name: 'Pepper 100g', costPrice: '8', sellPrice: '12', quantity: '40' },
  { name: 'Tomato Sauce', costPrice: '7', sellPrice: '11', quantity: '35' },
  { name: 'Canned Beans', costPrice: '4', sellPrice: '6', quantity: '50' },
]

function PrinterSection({ onBack }: { onBack: () => void }) {
  const [printers, setPrinters] = useState<{ name: string; displayName: string }[]>([])
  const [printerSmall, setPrinterSmall] = useState('')
  const [printerBig, setPrinterBig] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const api = window.electron
    if (api?.getPrinterSettings) {
      api.getPrinterSettings().then((s) => {
        setPrinterSmall(s.printerSmall ?? '')
        setPrinterBig(s.printerBig ?? '')
      }).catch(() => {})
    }
    if (api?.getPrinters) {
      api.getPrinters()
        .then((list) => {
          setPrinters(Array.isArray(list) ? list : [])
          setLoadError(null)
        })
        .catch(() => {
          setPrinters([])
          setLoadError('Could not load printer list.')
        })
        .finally(() => setLoaded(true))
    } else {
      setLoaded(true)
      setLoadError('Run the app in the desktop (Electron) to see printers.')
    }
  }, [])

  const savePrinterSettings = (small: string, big: string) => {
    if (window.electron?.setPrinterSettings) {
      window.electron.setPrinterSettings({ printerSmall: small, printerBig: big })
    }
  }

  const handleSmallChange = (value: string) => {
    setPrinterSmall(value)
    savePrinterSettings(value, printerBig)
  }
  const handleBigChange = (value: string) => {
    setPrinterBig(value)
    savePrinterSettings(printerSmall, value)
  }

  return (
    <section>
      <div style={{ marginBottom: 24 }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            padding: '8px 16px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          ← Back to Settings
        </button>
      </div>
      <h1 style={{ color: '#1f2937', marginBottom: 24 }}>Printer</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Choose which printer to use for small receipts and for large documents.
      </p>

      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>Small printer</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>For receipts and small tickets.</p>
        <select
          value={printerSmall}
          onChange={(e) => handleSmallChange(e.target.value)}
          style={{ ...inputStyle, maxWidth: 400, display: 'block' }}
          disabled={!loaded}
        >
          <option value="">— Select printer —</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName || p.name}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>Big printer</h2>
        <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>For reports and large documents.</p>
        <select
          value={printerBig}
          onChange={(e) => handleBigChange(e.target.value)}
          style={{ ...inputStyle, maxWidth: 400, display: 'block' }}
          disabled={!loaded}
        >
          <option value="">— Select printer —</option>
          {printers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.displayName || p.name}
            </option>
          ))}
        </select>
      </div>
      {loadError && (
        <p style={{ color: '#b91c1c', fontSize: 14, marginTop: 8 }}>{loadError}</p>
      )}
      {loaded && printers.length === 0 && !loadError && (
        <p style={{ color: '#6b7280', fontSize: 14 }}>No printers detected. Add a printer in your system settings.</p>
      )}
    </section>
  )
}

function CompaniesSection({ onBack }: { onBack: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyModalOpen, setCompanyModalOpen] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyPhone, setCompanyPhone] = useState('')
  const COMPANIES_STORAGE_KEY = 'zagros-companies'

  const loadCompanies = () => {
    if (window.electron?.getCompanies) {
      window.electron.getCompanies().then((list) => {
        const raw = (list || []) as Record<string, unknown>[]
        setCompanies(raw.map(normalizeCompany))
        try {
          localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(raw))
        } catch {
          // ignore
        }
      })
    } else {
      try {
        const stored = localStorage.getItem(COMPANIES_STORAGE_KEY)
        const parsed = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
        setCompanies(parsed.map(normalizeCompany))
      } catch {
        setCompanies([])
      }
    }
  }

  useEffect(() => {
    loadCompanies()
  }, [])

  const openCompanyModal = () => {
    setCompanyName('')
    setCompanyPhone('')
    setCompanyModalOpen(true)
  }

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim()) return
    const company: Company = {
      id: crypto.randomUUID?.() ?? String(Date.now()),
      name: companyName.trim(),
      phone: companyPhone.trim() || undefined,
    }
    if (window.electron?.addCompany) {
      window.electron.addCompany(company).then(() => {
        loadCompanies()
        setCompanyModalOpen(false)
      })
    } else {
      const next = [...companies, company]
      setCompanies(next)
      try {
        localStorage.setItem(COMPANIES_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      setCompanyModalOpen(false)
    }
  }

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: '8px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            ← Back to Settings
          </button>
          <h1 style={{ color: '#1f2937', margin: 0 }}>Companies</h1>
        </div>
        <button
          type="button"
          onClick={openCompanyModal}
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
          Add company
        </button>
      </div>

      {companies.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No companies yet. Click “Add company” in the header to add one.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {companies.map((c) => (
            <li
              key={c.id}
              style={{
                padding: '12px 16px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                marginBottom: 8,
                background: '#fff',
              }}
            >
              <span style={{ fontWeight: 600, color: '#1f2937' }}>{c.name}</span>
              {c.phone && (
                <span style={{ color: '#6b7280', marginLeft: 12 }}>Tel: {c.phone}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      {companyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setCompanyModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              maxWidth: 400,
              width: '100%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px', color: '#1f2937' }}>Add company</h3>
            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Name of the company
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC Supplier"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Phone number (optional)
                </label>
                <input
                  type="text"
                  inputMode="tel"
                  placeholder="e.g. 0750 123 4567"
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  style={inputStyle}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCompanyModalOpen(false)}
                  style={{
                    padding: '10px 18px',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    background: '#fff',
                    color: '#374151',
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
                  Add company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

function SettingsSection({
  theme,
  onSetTheme,
  onManageCompanies,
  onPrinter,
  machineId,
  onActivateLicense,
}: {
  theme: Theme
  onSetTheme: (t: Theme) => void
  onManageCompanies?: () => void
  onPrinter?: () => void
  machineId?: string
  onActivateLicense?: (key: string) => Promise<{ ok: boolean; error?: string }>
}) {
  const [localPath, setLocalPath] = useState<string | null>(null)
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [buyPassword, setBuyPassword] = useState('')
  const [buyError, setBuyError] = useState('')
  const [buyLoading, setBuyLoading] = useState(false)
  const [buySuccess, setBuySuccess] = useState(false)
  const PRODUCTS_STORAGE_KEY = 'zagros-products'

  const handleBuyActivate = () => {
    const key = buyPassword.trim()
    if (!key || !onActivateLicense) return
    setBuyError('')
    setBuyLoading(true)
    onActivateLicense(key).then((r) => {
      setBuyLoading(false)
      if (r.ok) {
        setBuySuccess(true)
        setBuyPassword('')
        setTimeout(() => { setShowBuyModal(false); setBuySuccess(false) }, 1500)
      } else {
        setBuyError(r.error ?? 'Activation failed')
      }
    })
  }

  const handleAddSampleItems = () => {
    const newProducts: Product[] = SAMPLE_PRODUCTS.map((s) => ({
      id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
      name: s.name,
      barcode: generateBarcode(),
      costPrice: s.costPrice,
      sellPrice: s.sellPrice,
      quantity: s.quantity,
    }))
    if (window.electron?.getProducts && window.electron?.saveProducts) {
      window.electron.getProducts().then((current) => {
        const list = Array.isArray(current) ? current : []
        const combined = [...list, ...newProducts]
        window.electron!.saveProducts(combined).then(() => {
          // optional: could show a brief "Added 20 items" message
        })
      })
    } else {
      try {
        const stored = localStorage.getItem(PRODUCTS_STORAGE_KEY)
        const list = stored ? (JSON.parse(stored) as Record<string, unknown>[]) : []
        const combined = [...list, ...newProducts]
        localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(combined))
      } catch {
        // ignore
      }
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron?.getLocalStoragePath) {
      window.electron.getLocalStoragePath().then(setLocalPath)
    }
  }, [])

  return (
    <section>
      <h1 style={{ color: '#1f2937' }}>Settings</h1>

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>Mode</h2>
        <p style={{ color: '#6b7280', marginBottom: 12, fontSize: 14 }}>Choose light or dark appearance.</p>
        <div
          style={{
            display: 'inline-flex',
            gap: 0,
            border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            borderRadius: 10,
            overflow: 'hidden',
            background: theme === 'dark' ? '#1f2937' : '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <button
            type="button"
            onClick={() => onSetTheme('light')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: theme === 'light' ? '#1d4ed8' : theme === 'dark' ? '#374151' : '#f9fafb',
              color: theme === 'light' ? '#fff' : theme === 'dark' ? '#e5e7eb' : '#374151',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Light
          </button>
          <button
            type="button"
            onClick={() => onSetTheme('dark')}
            style={{
              padding: '12px 24px',
              border: 'none',
              borderLeft: `1px solid ${theme === 'dark' ? '#4b5563' : '#e5e7eb'}`,
              background: theme === 'dark' ? '#1d4ed8' : theme === 'light' ? '#f9fafb' : '#f9fafb',
              color: theme === 'dark' ? '#fff' : '#374151',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Dark
          </button>
        </div>
      </div>

      {machineId != null && onActivateLicense != null && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>License</h2>
          <p style={{ color: '#6b7280', marginBottom: 12, fontSize: 14 }}>Already bought? Enter your password to activate and use the system forever.</p>
          <button
            type="button"
            onClick={() => { setShowBuyModal(true); setBuyError(''); setBuyPassword('') }}
            style={{
              padding: '10px 20px',
              background: '#059669',
              border: 'none',
              borderRadius: 8,
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Buy the system
          </button>
        </div>
      )}

      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8, color: '#1f2937' }}>Data storage location</h2>
        <p style={{ color: '#6b7280', marginBottom: 8 }}>
          Data (products, groups, buying recipes, companies) is stored <strong style={{ color: '#1f2937' }}>locally on this computer</strong>. You can change the folder.
        </p>
        {localPath && (
          <p style={{ fontSize: 13, fontFamily: 'monospace', color: '#6b7280', wordBreak: 'break-all', marginBottom: 12 }}>
            {localPath}
          </p>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            onClick={async () => {
              if (typeof window !== 'undefined' && window.electron?.chooseDataFolder) {
                const newPath = await window.electron.chooseDataFolder()
                if (newPath != null) setLocalPath(newPath)
              } else {
                alert('Change location is only available in the desktop app. Run the app with Electron to choose a different folder.')
              }
            }}
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
            Change location
          </button>
          <button
            type="button"
            onClick={() => onManageCompanies?.()}
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
            Manage companies
          </button>
          <button
            type="button"
            onClick={() => onPrinter?.()}
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
            Printer
          </button>
        </div>
      </div>

      {showBuyModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !buyLoading && setShowBuyModal(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 28,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 20, color: '#1f2937' }}>Buy the system</h2>
            <p style={{ color: '#6b7280', marginBottom: 20, fontSize: 14 }}>
              Enter the license password you received. You must be online. After activation you can use the system forever.
            </p>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={buyPassword}
                onChange={(e) => setBuyPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBuyActivate()}
                placeholder="License password"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15 }}
              />
            </div>
            {buyError && <p style={{ color: '#dc2626', fontSize: 14, marginBottom: 12 }}>{buyError}</p>}
            {buySuccess && <p style={{ color: '#059669', fontSize: 14, marginBottom: 12 }}>Activated. You can use the system forever.</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => !buyLoading && setShowBuyModal(false)} style={{ padding: '10px 18px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Close
              </button>
              <button type="button" onClick={handleBuyActivate} disabled={buyLoading} style={{ padding: '10px 18px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {buyLoading ? 'Activating…' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

const TABS: { id: Part; label: string; description: string }[] = [
  { id: 'selling', label: 'Selling', description: 'Point of sale, barcode, checkout' },
  { id: 'buying', label: 'Buying', description: 'Purchase orders, receive goods, suppliers' },
  { id: 'warehouse', label: 'Warehouse', description: 'Stock and inventory' },
  { id: 'products', label: 'Products', description: 'Product list, add and edit items' },
  { id: 'settings', label: 'Settings', description: 'Language, storage, printer' },
]

type GateStatus = 'loading' | 'allowed' | 'expired' | 'no_trial_offline'

function TrialExpiredScreen({
  machineId,
  error,
  onActivate,
}: {
  machineId: string
  error: string
  onActivate: (key: string) => void
}) {
  const [key, setKey] = useState('')
  const [loading, setLoading] = useState(false)

  const handleActivate = () => {
    const k = key.trim()
    if (!k) return
    setLoading(true)
    onActivate(k)
    setKey('')
    setLoading(false)
  }

  const copyMachineId = () => {
    try {
      navigator.clipboard.writeText(machineId)
    } catch {
      // ignore
    }
  }

  return (
    <div style={{ maxWidth: 520, margin: '60px auto', padding: 32, textAlign: 'center' }}>
      <h1 style={{ color: '#1f2937', marginBottom: 16 }}>Please buy a license</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Your 7-day trial has ended. You can open the app but cannot use any features until you activate with a license password. Contact the seller to get your password, then enter it below. You must be online to activate.
      </p>
      <div style={{ marginBottom: 16, textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
          Your Machine ID (send this to the seller)
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <code style={{ flex: 1, padding: '10px 12px', background: '#f3f4f6', borderRadius: 8, fontSize: 13, wordBreak: 'break-all' }}>
            {machineId}
          </code>
          <button type="button" onClick={copyMachineId} style={{ padding: '10px 16px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
            Copy
          </button>
        </div>
      </div>
      <div style={{ marginBottom: 16, textAlign: 'left' }}>
        <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6, color: '#374151' }}>
          License password
        </label>
        <input
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleActivate()}
          placeholder="Enter the password you received"
          style={{ width: '100%', padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 15 }}
        />
      </div>
      {error && <p style={{ color: '#dc2626', marginBottom: 12, fontSize: 14 }}>{error}</p>}
      <button
        type="button"
        onClick={handleActivate}
        disabled={loading}
        style={{ padding: '12px 24px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}
      >
        {loading ? 'Activating…' : 'Activate'}
      </button>
    </div>
  )
}

export default function App() {
  const [gateStatus, setGateStatus] = useState<GateStatus>('loading')
  const [machineId, setMachineId] = useState<string>('')
  const [activateError, setActivateError] = useState('')
  const [current, setCurrent] = useState<Part | null>(null)
  const [settingsSubView, setSettingsSubView] = useState<'main' | 'companies' | 'printer'>('main')
  const [theme, setTheme] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    if (!window.electron?.getMachineId || !window.electron?.licenseGetState) {
      setGateStatus('allowed')
      return
    }
    let cancelled = false
    window.electron.getMachineId().then((mid) => {
      if (cancelled) return
      setMachineId(mid)
      window.electron!.licenseGetState().then((state) => {
        if (cancelled) return
        if (state.licensed) {
          setGateStatus('allowed')
          return
        }
        if (state.trialEndsAt) {
          window.electron!.licenseCheckTrial(mid).then((r) => {
            if (cancelled) return
            if (r.ok && r.valid) setGateStatus('allowed')
            else if (r.ok && !r.valid) setGateStatus('expired')
            else {
              const trialEnded = new Date() > new Date(state.trialEndsAt)
              setGateStatus(trialEnded ? 'expired' : 'no_trial_offline')
            }
          })
          return
        }
        window.electron!.licenseStartTrial(mid).then((r) => {
          if (cancelled) return
          if (r.ok) {
            window.electron!.licenseSetTrialEndsAt(r.trialEndsAt)
            setGateStatus('allowed')
          } else setGateStatus('no_trial_offline')
        })
      })
    })
    return () => { cancelled = true }
  }, [])

  const handleActivateLicense = (key: string) => {
    if (!window.electron?.licenseActivate || !window.electron?.licenseSetLicensed) return
    setActivateError('')
    window.electron.licenseActivate(key, machineId).then((r) => {
      if (r.ok) {
        window.electron!.licenseSetLicensed()
        setGateStatus('allowed')
      } else {
        setActivateError(r.error === 'already_used' ? 'This license is already used on another computer.' : r.error === 'invalid_key' ? 'Invalid password.' : r.error)
      }
    })
  }

  const activateLicenseAndReturn = (key: string): Promise<{ ok: boolean; error?: string }> => {
    if (!window.electron?.licenseActivate || !window.electron?.licenseSetLicensed) return Promise.resolve({ ok: false, error: 'Unavailable' })
    return window.electron.licenseActivate(key, machineId).then((r) => {
      if (r.ok) {
        window.electron!.licenseSetLicensed()
        return { ok: true }
      }
      return { ok: false, error: r.error === 'already_used' ? 'This license is already used on another computer.' : r.error === 'invalid_key' ? 'Invalid password.' : r.error }
    })
  }

  useEffect(() => {
    if (current !== 'settings') setSettingsSubView('main')
  }, [current])

  const handleSetTheme = (value: Theme) => {
    setTheme(value)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value)
    } catch {
      // ignore
    }
  }

  const isDark = theme === 'dark'
  const rootStyle: React.CSSProperties = {
    minHeight: '100vh',
    padding: 24,
    background: isDark ? '#111827' : '#f9fafb',
    color: isDark ? '#e5e7eb' : '#1f2937',
  }

  if (gateStatus === 'loading') {
    return (
      <div style={rootStyle} data-theme={theme}>
        <div style={{ textAlign: 'center', padding: 48 }}>Loading…</div>
      </div>
    )
  }
  if (gateStatus === 'no_trial_offline') {
    return (
      <div style={rootStyle} data-theme={theme}>
        <div style={{ maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
          <h1 style={{ color: '#1f2937', marginBottom: 16 }}>Internet required</h1>
          <p style={{ color: '#6b7280' }}>Please connect to the internet to start your 7-day trial. Then open the app again.</p>
        </div>
      </div>
    )
  }
  if (gateStatus === 'expired') {
    return (
      <div style={rootStyle} data-theme={theme}>
        <TrialExpiredScreen machineId={machineId} error={activateError} onActivate={handleActivateLicense} />
      </div>
    )
  }

  return (
    <>
      {isDark && (
        <style>{`
          [data-theme="dark"] section { background: transparent !important; color: #e5e7eb !important; }
          [data-theme="dark"] h1, [data-theme="dark"] h2, [data-theme="dark"] h3 { color: #f3f4f6 !important; }
          [data-theme="dark"] p { color: #d1d5db !important; }
          [data-theme="dark"] button { background: #374151 !important; color: #e5e7eb !important; border-color: #4b5563 !important; }
          [data-theme="dark"] button:hover { background: #4b5563 !important; }
          [data-theme="dark"] input, [data-theme="dark"] select { background: #1f2937 !important; color: #e5e7eb !important; border-color: #4b5563 !important; }
          [data-theme="dark"] label { color: #d1d5db !important; }
          [data-theme="dark"] table { color: #e5e7eb !important; }
          [data-theme="dark"] th { background: #374151 !important; color: #fff !important; border-color: #4b5563 !important; }
          [data-theme="dark"] td { border-color: #374151 !important; }
          [data-theme="dark"] tr:hover { background: #1f2937 !important; }
          [data-theme="dark"] li { background: #1f2937 !important; border-color: #374151 !important; color: #e5e7eb !important; }
          [data-theme="dark"] div[style*="background: #fff"], [data-theme="dark"] div[style*="background:#fff"] { background: #1f2937 !important; }
        `}</style>
      )}
    <div data-theme={theme} style={rootStyle}>
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
          {current === 'buying' && <BuyingSection />}
          {current === 'warehouse' && (
            <section>
              <h1 style={{ color: '#1f2937' }}>Warehouse</h1>
              <p style={{ color: '#6b7280' }}>Stock and inventory management.</p>
            </section>
          )}
          {current === 'products' && <ProductsSection />}
          {current === 'selling' && (
            <section>
              <h1 style={{ color: '#1f2937' }}>Selling</h1>
              <p style={{ color: '#6b7280' }}>Point of sale: scan barcode, add to cart, checkout.</p>
            </section>
          )}
          {current === 'settings' && settingsSubView === 'companies' && (
            <CompaniesSection onBack={() => setSettingsSubView('main')} />
          )}
          {current === 'settings' && settingsSubView === 'printer' && (
            <PrinterSection onBack={() => setSettingsSubView('main')} />
          )}
          {current === 'settings' && settingsSubView === 'main' && (
            <SettingsSection
              theme={theme}
              onSetTheme={handleSetTheme}
              onManageCompanies={() => setSettingsSubView('companies')}
              onPrinter={() => setSettingsSubView('printer')}
              machineId={machineId}
              onActivateLicense={activateLicenseAndReturn}
            />
          )}
        </>
      )}
    </div>
    </>
  )
}

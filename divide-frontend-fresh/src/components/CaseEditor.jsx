import React, { useState, useEffect } from 'react';
import api from '../services/api';

const rarityColors = {
  common: '#808080',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
};

export default function CaseEditor({ caseId, onSave, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [caseImage, setCaseImage] = useState(''); // Case card image
  const [items, setItems] = useState([]);
  const [isPublic, setIsPublic] = useState(true);
  const [houseEdge, setHouseEdge] = useState(10); // House edge percentage
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [databaseItems, setDatabaseItems] = useState([]);
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    // Load database items
    loadDatabaseItems();
    // If editing existing case, load it
    if (caseId) {
      loadCase(caseId);
    }
  }, [caseId]);

  const loadDatabaseItems = async () => {
    try {
      const res = await api.get('/items');
      if (res.items) {
        setDatabaseItems(res.items);
      }
    } catch (err) {
      console.error('Error loading items:', err);
    }
  };

  const loadCase = async (id) => {
    try {
      const res = await fetch((import.meta.env.VITE_API_URL || '') + `/cases/${id}`);
      const data = await res.json();
      if (data.case) {
        setName(data.case.name);
        setDescription(data.case.description);
        setCaseImage(data.case.image || '');
        setItems(data.case.items || []);
        setIsPublic(data.case.isPublic);
        setHouseEdge(data.case.houseEdge || 10);
      }
    } catch (err) {
      console.error('Error loading case:', err);
      setError('Failed to load case');
    }
  };

  const addItem = (dbItem) => {
    if (!dbItem) return;
    // Add from database
    setItems([
      ...items,
      {
        name: dbItem.name,
        value: dbItem.price || 100,
        chance: 0,
        rarity: dbItem.rarity || 'common',
        color: rarityColors[dbItem.rarity || 'common'],
        image: dbItem.image,
        databaseId: dbItem._id,
      },
    ]);
    setShowItemSelector(false);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Calculate rarity the same way backend does
  const calculateRarity = (value, chance) => {
    // Rarity based primarily on chance (lower = rarer), with value as secondary factor
    if (chance <= 1) return 'legendary'; // ≤1% is legendary (gold spin items)
    if (chance <= 3) return 'epic'; // 1-3% is epic
    if (chance <= 10) return 'rare'; // 3-10% is rare
    if (chance <= 30) return 'uncommon'; // 10-30% is uncommon
    return 'common'; // >30% is common
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Recalculate rarity whenever value or chance changes
    if (field === 'value' || field === 'chance') {
      const rarity = calculateRarity(newItems[index].value, newItems[index].chance);
      newItems[index].rarity = rarity;
      newItems[index].color = rarityColors[rarity] || '#808080';
    } else if (field === 'rarity') {
      newItems[index].color = rarityColors[value] || '#808080';
    }
    
    setItems(newItems);
  };

  const getTotalValue = () => {
    return items.reduce((sum, item) => sum + (item.value || 0), 0);
  };

  const calculateEV = () => {
    // EV = Σ(item_value × probability)
    // probability = chance / 100
    return items.reduce((sum, item) => {
      const probability = (item.chance || 0) / 100;
      return sum + ((item.value || 0) * probability);
    }, 0);
  };

  const calculatePrice = () => {
    // Price = EV / (1 - house_edge%)
    const ev = calculateEV();
    const edgeDecimal = houseEdge / 100;
    return ev / (1 - edgeDecimal);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      setUploadError(null);
      const token = localStorage.getItem('token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/upload', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      console.log('Upload response:', res.status, data);
      if (!res.ok) {
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }
      if (data.url) {
        setCaseImage(data.url);
      } else {
        throw new Error('No URL returned');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Case name is required');
      return;
    }
    if (items.length === 0) {
      setError('At least one item is required');
      return;
    }

    // Validate total chance is 100%
    const totalChance = items.reduce((sum, item) => sum + (item.chance || 0), 0);
    if (Math.abs(totalChance - 100) > 0.01) {
      setError(`Item chances must total 100% (currently ${totalChance.toFixed(4)}%)`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        description,
        image: caseImage,
        items,
        isPublic,
        houseEdge,
      };

      let res;
      if (caseId) {
        res = await api.put(`/cases/${caseId}`, payload);
      } else {
        res = await api.post('/cases/create', payload);
      }

      if (res.success) {
        setError(null);
        if (onSave) {
          onSave(res.case);
        }
      }
    } catch (err) {
      console.error('Error saving case:', err);
      setError(err.message || 'Failed to save case');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = getTotalValue();

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflowY: 'auto',
      }}
    >
      <h2>{caseId ? 'Edit Case' : 'Create New Case'}</h2>

      {error && <p style={{ color: '#e74c3c', marginBottom: '10px' }}>{error}</p>}

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>Case Name</strong>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Dragon Slayer Case"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>Description (optional)</strong>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what's in this case..."
          rows="3"
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxSizing: 'border-box',
            fontFamily: 'Arial, sans-serif',
          }}
        />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>
          <strong>Case Card Image (optional)</strong>
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={caseImage}
            onChange={(e) => setCaseImage(e.target.value)}
            placeholder="Enter image URL for the case card..."
            style={{
              flex: 1,
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxSizing: 'border-box',
            }}
          />
          <label style={{
            padding: '8px 16px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: uploading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            opacity: uploading ? 0.6 : 1,
          }}>
            {uploading ? '⏳ Uploading...' : '📤 Upload'}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {uploadError && <div style={{ color: '#e74c3c', fontSize: '12px', marginBottom: '8px' }}>Upload error: {uploadError}</div>}
        {caseImage && (
          <div style={{ marginTop: '10px', textAlign: 'center' }}>
            <img 
              src={caseImage} 
              alt="Case preview" 
              style={{
                maxWidth: '100%',
                maxHeight: '200px',
                borderRadius: '6px',
                border: '1px solid #ccc',
              }}
              onError={() => setError('Invalid image URL')}
            />
          </div>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
          />
          <strong>Make Public (others can use in battles)</strong>
        </label>
      </div>

      {/* EV-Based Pricing Section */}
      <div style={{
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: '#ecf0f1',
        borderRadius: '6px',
        border: '1px solid #bdc3c7',
      }}>
        <h3 style={{ marginTop: 0, marginBottom: '12px' }}>Expected Value & Pricing</h3>
        
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            <strong>House Edge: {houseEdge}%</strong>
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={houseEdge}
            onChange={(e) => setHouseEdge(Number(e.target.value))}
            style={{ width: '100%' }}
          />
          <small style={{ color: '#555' }}>
            Profit margin (1-50%). Higher = more profit. Default 10% is standard.
          </small>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
          marginBottom: '12px',
        }}>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Total Chance %</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: items.reduce((sum, item) => sum + (item.chance || 0), 0) === 100 ? '#27ae60' : '#e74c3c' }}>
              {items.reduce((sum, item) => sum + (item.chance || 0), 0).toFixed(4)}%
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Expected Value (EV)</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60' }}>
              ${calculateEV().toFixed(2)}
            </div>
          </div>
          <div style={{ padding: '10px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
            <div style={{ fontSize: '12px', color: '#555' }}>Battle Price</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff6b00' }}>
              ${calculatePrice().toFixed(2)}
            </div>
          </div>
        </div>

        <small style={{ color: '#555', display: 'block', marginTop: '10px' }}>
          <strong>Formula:</strong> EV = Σ(item_value × chance%) where chance is 0-100%
          <br />
          <strong>Price:</strong> EV ÷ (1 - house_edge%) | Chances must total 100%
        </small>
      </div>

      <div style={{ marginBottom: '15px', padding: '10px', backgroundColor: '#ecf0f1', borderRadius: '4px' }}>
        <p style={{ margin: 0 }}>
          <strong>Total Case Value:</strong> ${totalValue.toFixed(2)}
        </p>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#555' }}>
          {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <h3 style={{ marginTop: 0 }}>Items</h3>
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              padding: '10px',
              backgroundColor: '#fff',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 80px auto', gap: '10px', marginBottom: '8px' }}>
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Item name"
                style={{
                  padding: '6px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <input
                type="number"
                value={item.value}
                onChange={(e) => updateItem(index, 'value', parseFloat(e.target.value || 0))}
                placeholder="Value ($)"
                step="0.01"
                min="0.01"
                style={{
                  padding: '6px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <input
                type="number"
                value={item.chance}
                onChange={(e) => updateItem(index, 'chance', Math.max(0, Math.min(100, parseFloat(e.target.value || 0))))}
                placeholder="Chance %"
                min="0"
                max="100"
                step="0.0001"
                style={{
                  padding: '6px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              />
              <button
                onClick={() => removeItem(index)}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#e74c3c',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Remove
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              Value: ${item.value.toFixed(2)} | Chance: {item.chance}% | Rarity: {item.rarity}
            </div>
          </div>
        ))}

        {showItemSelector ? (
          <div style={{ marginBottom: '10px', padding: '15px', backgroundColor: '#ecf0f1', borderRadius: '4px', border: '1px solid #bdc3c7' }}>
            <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Select Item from Database</h4>
            {databaseItems.length === 0 ? (
              <p style={{ color: '#555' }}>No items in database. Create items in the Admin Items panel first.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {databaseItems.map((dbItem) => (
                  <div
                    key={dbItem._id}
                    onClick={() => addItem(dbItem)}
                    style={{
                      padding: '10px',
                      backgroundColor: 'white',
                      border: `2px solid ${rarityColors[dbItem.rarity] || '#808080'}`,
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {dbItem.image && (
                      <img
                        src={dbItem.image}
                        alt={dbItem.name}
                        style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '2px' }}
                      />
                    )}
                    <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{dbItem.name}</div>
                    <div style={{ fontSize: '11px', color: '#555' }}>
                      ${dbItem.price.toFixed(2)} • {dbItem.rarity}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowItemSelector(false)}
              style={{
                marginTop: '10px',
                padding: '8px 16px',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowItemSelector(true)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + Add Item from Database
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              backgroundColor: '#95a5a6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving...' : caseId ? 'Update Case' : 'Create Case'}
        </button>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import '../styles/AdminItems.css';

export default function AdminItems() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    image: '',
    rarity: 'common',
  });
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Rarity glow colors
  const rarityGlowMap = {
    common: 'rgba(200, 200, 200, 0.2)',
    uncommon: 'rgba(76, 175, 80, 0.25)',
    rare: 'rgba(33, 150, 243, 0.25)',
    epic: 'rgba(255, 87, 34, 0.3)',
    legendary: 'rgba(255, 193, 7, 0.35)',
    mythic: 'rgba(156, 39, 176, 0.25)',
  };

  const getRarityGlowStyle = (rarity) => ({
    '--rarity-glow': rarityGlowMap[rarity] || rarityGlowMap.common,
  });

  // Define fetchItems with useCallback to prevent infinite loops
  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/items');
      console.log('[AdminItems] Fetched items:', res);
      setItems(res.items || []);
    } catch (err) {
      console.error('[AdminItems] Error fetching items:', err);
      setError(err?.error || err?.message || 'Failed to load items');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch items on mount
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchItems();
    }
  }, [user, fetchItems]);

  // Check if user is admin
  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="admin-error">
          ❌ Access Denied - Admin only
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value,
    }));
  };

  const handleRemoveBackground = async () => {
    if (!formData.image) {
      setError('Please enter an image URL first');
      return;
    }

    try {
      setError('');
      setSuccess('Processing image...');
      
      // Call backend to remove background
      const response = await api.post('/remove-background', {
        imageUrl: formData.image,
      });

      if (response.imageUrl) {
        setFormData(prev => ({ ...prev, image: response.imageUrl }));
        setSuccess('Background removed successfully!');
      } else {
        throw new Error('No image returned from service');
      }
    } catch (err) {
      console.error('Background removal error:', err);
      setError('Failed to remove background. Try a different image.');
    }
  };

  const handleSearchImages = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search term');
      return;
    }

    try {
      setSearching(true);
      setError('');
      
      const response = await api.post('/search-images', {
        query: searchQuery,
      });

      setSearchResults(response.results || []);
      if (!response.results || response.results.length === 0) {
        setError('No images found. Try a different search term.');
      }
    } catch (err) {
      console.error('Image search error:', err);
      setError('Failed to search for images');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectImage = (imageUrl) => {
    setFormData(prev => ({ ...prev, image: imageUrl }));
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      setUploading(true);
      setUploadError('');
      const token = localStorage.getItem('token');
      const res = await fetch((import.meta.env.VITE_API_URL || '') + '/upload', {
        method: 'POST',
        credentials: 'include',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: uploadFormData,
      });
      const data = await res.json();
      console.log('Upload response:', res.status, data);
      if (!res.ok) {
        throw new Error(data.error || `Upload failed: ${res.status}`);
      }
      if (data.url) {
        setFormData(prev => ({ ...prev, image: data.url }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');

      if (!formData.name || formData.price < 0 || !formData.image) {
        setError('Please fill all fields correctly');
        return;
      }

      let res;
      if (editing) {
        // Update
        res = await api.put(`/items/${editing._id}`, formData);
        setItems(prev =>
          prev.map(item => item._id === editing._id ? res.item : item)
        );
        setSuccess('Item updated!');
      } else {
        // Create
        res = await api.post('/items', formData);
        setItems(prev => [res.item, ...prev]);
        setSuccess('Item created!');
      }

      // Reset form
      setFormData({
        name: '',
        price: '',
        image: '',
        rarity: 'common',
      });
      setEditing(null);
    } catch (err) {
      console.error('Error saving item:', err);
      setError(err.message || 'Failed to save item');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      name: item.name,
      price: item.price,
      image: item.image,
      rarity: item.rarity,
    });
    setEditing(item);
    window.scrollTo(0, 0);
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      price: '',
      image: '',
      rarity: 'common',
    });
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item? This cannot be undone.')) return;

    try {
      await api.delete(`/items/${id}`);
      setItems(prev => prev.filter(item => item._id !== id));
      setSuccess('Item deleted!');
    } catch (err) {
      console.error('Error deleting item:', err);
      setError('Failed to delete item');
    }
  };

  const rarityColors = {
    common: '#888',
    uncommon: '#4ade80',
    rare: '#60a5fa',
    epic: '#a78bfa',
    legendary: '#fbbf24',
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>🛠️ Manage Items</h1>
        <p>Create, edit, and delete items in the database</p>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      {/* Form */}
      <div className="admin-form-section">
        <h2>{editing ? '✏️ Edit Item' : '➕ Add New Item'}</h2>
        <form onSubmit={handleSubmit} className="admin-form">
          <div className="form-group">
            <label>Item Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Diamond Sword"
              required
            />
          </div>

          <div className="form-group">
            <label>Price ($) *</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="form-group">
            <label>Image URL *</label>
            <div className="image-input-group">
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleInputChange}
                placeholder="https://example.com/image.png"
                required
              />
              <button
                type="button"
                onClick={() => setShowSearchModal(true)}
                className="btn-search-images"
                title="Search for images using Google"
              >
                🔍 Search
              </button>
              <label
                style={{
                  padding: '8px 12px',
                  backgroundColor: uploading ? '#999' : '#4CAF50',
                  color: 'white',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  whiteSpace: 'nowrap',
                  opacity: uploading ? 0.6 : 1,
                  border: 'none',
                }}
                title="Upload an image file"
              >
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
            {uploadError && (
              <div style={{ color: '#d32f2f', fontSize: '14px', marginTop: '4px' }}>
                {uploadError}
              </div>
            )}
            {formData.image && (
              <div className="image-preview">
                <img src={formData.image} alt="Preview" />
                <button
                  type="button"
                  onClick={handleRemoveBackground}
                  className="btn-remove-bg"
                  title="Remove background from image using AI"
                >
                  🎯 Remove Background
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Rarity</label>
            <select
              name="rarity"
              value={formData.rarity}
              onChange={handleInputChange}
            >
              <option value="common">Common</option>
              <option value="uncommon">Uncommon</option>
              <option value="rare">Rare</option>
              <option value="epic">Epic</option>
              <option value="legendary">Legendary</option>
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-primary">
              {editing ? '💾 Update Item' : '➕ Create Item'}
            </button>
            {editing && (
              <button type="button" onClick={handleCancel} className="btn-secondary">
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Items List */}
      <div className="admin-items-section">
        <h2>📦 Items ({items.length})</h2>
        {loading ? (
          <p>Loading items...</p>
        ) : items.length === 0 ? (
          <p>No items yet. Create one above!</p>
        ) : (
          <div className="items-grid">
            {items.map(item => (
              <div key={item._id} className="item-card">
                <div className="item-image" style={getRarityGlowStyle(item.rarity)}>
                  <img src={item.image} alt={item.name} />
                </div>
                <div className="item-info">
                  <h3>{item.name}</h3>
                  <p className="item-price">${item.price.toFixed(2)}</p>
                  <span
                    className="item-rarity"
                    style={{ color: rarityColors[item.rarity] }}
                  >
                    {item.rarity.toUpperCase()}
                  </span>
                </div>
                <div className="item-actions">
                  <button
                    onClick={() => handleEdit(item)}
                    className="btn-edit"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="btn-delete"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Image Search Modal */}
      {showSearchModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>🔍 Search Images</h2>
              <button
                className="modal-close"
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="search-input-group">
                <input
                  type="text"
                  placeholder="Search for item images (e.g., 'sword', 'treasure chest')"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchImages()}
                />
                <button
                  onClick={handleSearchImages}
                  disabled={searching}
                  className="btn-search"
                >
                  {searching ? '⏳ Searching...' : '🔎 Search'}
                </button>
              </div>

              {error && <div className="modal-error">{error}</div>}

              {searchResults.length > 0 && (
                <div className="search-results-grid">
                  {searchResults.map((result, idx) => (
                    <div
                      key={idx}
                      className="search-result-item"
                      onClick={() => handleSelectImage(result.image)}
                    >
                      <img
                        src={result.image}
                        alt={result.title || 'search result'}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="result-overlay">
                        <span>👆 Click to select</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

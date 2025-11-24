import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import CaseEditor from './CaseEditor';
import '../styles/AdminItems.css';

export default function AdminCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingCaseId, setEditingCaseId] = useState(null);
  const [showCreateNew, setShowCreateNew] = useState(false);

  // Fetch all cases (admin can see all)
  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/cases');
      console.log('[AdminCases] Fetched cases:', res);
      setCases(res.cases || []);
    } catch (err) {
      console.error('[AdminCases] Error fetching cases:', err);
      setError(err?.error || err?.message || 'Failed to load cases');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchCases();
    }
  }, [user, fetchCases]);

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

  const handleDeleteCase = async (caseId) => {
    if (!window.confirm('Delete this case? This cannot be undone.')) return;
    
    try {
      setError('');
      await api.delete(`/cases/${caseId}`);
      setCases(prev => prev.filter(c => c._id !== caseId));
      setSuccess('Case deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting case:', err);
      setError(err.message || 'Failed to delete case');
    }
  };

  const handleEditComplete = (updatedCase) => {
    setCases(prev =>
      prev.map(c => c._id === updatedCase._id ? updatedCase : c)
    );
    setEditingCaseId(null);
    setSuccess('Case updated successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleCreateComplete = (newCase) => {
    setCases(prev => [newCase, ...prev]);
    setShowCreateNew(false);
    setSuccess('Case created successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (editingCaseId || showCreateNew) {
    return (
      <div className="admin-container">
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={() => {
              setEditingCaseId(null);
              setShowCreateNew(false);
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            ← Back to Cases
          </button>
        </div>
        <CaseEditor
          caseId={editingCaseId}
          onSave={editingCaseId ? handleEditComplete : handleCreateComplete}
          onClose={() => {
            setEditingCaseId(null);
            setShowCreateNew(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Manage Cases</h1>
        <button
          onClick={() => setShowCreateNew(true)}
          style={{
            padding: '12px 24px',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
          }}
        >
          ➕ Create New Case
        </button>
      </div>

      {error && <div className="admin-alert error">{error}</div>}
      {success && <div className="admin-alert success">{success}</div>}

      {loading ? (
        <p>Loading cases...</p>
      ) : cases.length === 0 ? (
        <p>No cases found. Create one to get started!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            backgroundColor: '#f9f9f9',
            marginTop: '20px',
          }}>
            <thead>
              <tr style={{ backgroundColor: '#ecf0f1', borderBottom: '2px solid #bdc3c7' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Case Name</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 'bold' }}>Creator</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Items</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold' }}>Cost</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Public</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Used</th>
                <th style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((caseObj) => (
                <tr key={caseObj._id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px', fontWeight: '500' }}>{caseObj.name}</td>
                  <td style={{ padding: '12px' }}>{caseObj.creatorUsername}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{caseObj.items?.length || 0}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#27ae60' }}>${(caseObj.calculatedPrice || 0).toFixed(2)}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: caseObj.status === 'active' ? '#d4edda' : '#f8d7da',
                      color: caseObj.status === 'active' ? '#155724' : '#721c24',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      {caseObj.status || 'active'}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {caseObj.isPublic ? '✓' : '✗'}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>{caseObj.usageCount || 0}</td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => setEditingCaseId(caseObj._id)}
                      style={{
                        padding: '6px 12px',
                        marginRight: '6px',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteCase(caseObj._id)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
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
    </div>
  );
}

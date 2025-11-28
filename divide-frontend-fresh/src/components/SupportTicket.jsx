import { useState } from 'react';
import { X } from 'lucide-react';

export default function SupportTicket({ onClose }) {
  const [formData, setFormData] = useState({
    subject: '',
    category: 'general',
    description: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const categories = [
    { value: 'general', label: 'General Question' },
    { value: 'account', label: 'Account Issue' },
    { value: 'payment', label: 'Payment/Withdrawal' },
    { value: 'technical', label: 'Technical Problem' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'complaint', label: 'Complaint' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/support/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus({ type: 'success', message: data.message || 'Ticket submitted successfully! Our team will respond soon.' });
        setFormData({ subject: '', category: 'general', description: '', email: '' });
        setTimeout(() => onClose?.(), 2000);
      } else {
        setSubmitStatus({ type: 'error', message: data.error || 'Failed to submit ticket' });
      }
    } catch {
      setSubmitStatus({ type: 'error', message: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
      <div className="bg-[#1a1d29] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700 sticky top-0 bg-[#1a1d29] z-10">
          <h2 className="text-xl md:text-2xl font-bold text-white">Contact Support</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email Address (optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-base"
              placeholder="your.email@example.com"
            />
            <p className="text-xs text-gray-500 mt-1">Optional - only if you want a response via email</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-base"
              required
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 text-base"
              placeholder="Brief description of your issue"
              required
              maxLength={100}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-[#0f1218] border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 min-h-[150px] text-base resize-none"
              placeholder="Please provide as much detail as possible..."
              required
              maxLength={1000}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.description.length}/1000 characters</p>
          </div>

          {/* Status Message */}
          {submitStatus && (
            <div className={`p-4 rounded-lg ${
              submitStatus.type === 'success' 
                ? 'bg-green-500/10 border border-green-500/50 text-green-400'
                : 'bg-red-500/10 border border-red-500/50 text-red-400'
            }`}>
              {submitStatus.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium py-3 md:py-4 rounded-lg transition-colors text-base"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </form>

        {/* Footer Note */}
        <div className="p-4 md:p-6 bg-[#0f1218] border-t border-gray-700">
          <p className="text-sm text-gray-400">
            📧 Our support team typically responds within 24 hours. For urgent matters, please join our Discord server.
          </p>
        </div>
      </div>
    </div>
  );
}

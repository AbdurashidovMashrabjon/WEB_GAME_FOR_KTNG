// src/pages/CardsPage.jsx - Complete Cards Management
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cards } from '../lib/api';
import { toast } from 'sonner';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Upload,
  Save,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function CardsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('fruits'); // 'fruits' or 'texts'
  const [editingCard, setEditingCard] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(getDefaultFormData());
  const [imagePreview, setImagePreview] = useState(null);

  // Fetch fruits
  const { data: fruits, isLoading: fruitsLoading } = useQuery({
    queryKey: ['fruit-cards'],
    queryFn: async () => {
      const res = await cards.fruits.getAll();
      return res.data;
    },
  });

  // Fetch texts
  const { data: texts, isLoading: textsLoading } = useQuery({
    queryKey: ['text-cards'],
    queryFn: async () => {
      const res = await cards.texts.getAll();
      return res.data;
    },
  });

  // Mutations for fruits
  const createFruitMutation = useMutation({
    mutationFn: (data) => cards.fruits.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fruit-cards']);
      toast.success('Fruit card created!');
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create card');
    },
  });

  const updateFruitMutation = useMutation({
    mutationFn: ({ id, data }) => cards.fruits.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fruit-cards']);
      toast.success('Fruit card updated!');
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update card');
    },
  });

  const deleteFruitMutation = useMutation({
    mutationFn: (id) => cards.fruits.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['fruit-cards']);
      toast.success('Fruit card deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete card');
    },
  });

  // Mutations for texts
  const createTextMutation = useMutation({
    mutationFn: (data) => cards.texts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['text-cards']);
      toast.success('Text card created!');
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create card');
    },
  });

  const updateTextMutation = useMutation({
    mutationFn: ({ id, data }) => cards.texts.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['text-cards']);
      toast.success('Text card updated!');
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to update card');
    },
  });

  const deleteTextMutation = useMutation({
    mutationFn: (id) => cards.texts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['text-cards']);
      toast.success('Text card deleted');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete card');
    },
  });

  function getDefaultFormData() {
    return {
      title: '',
      code: '',
      image: null,
      correct_fruit_id: null,
      is_active: true,
      weight: 1,
      order: 0,
    };
  }

  function resetForm() {
    setEditingCard(null);
    setIsCreating(false);
    setFormData(getDefaultFormData());
    setImagePreview(null);
  }

  function handleEdit(card) {
    setEditingCard(card);
    setFormData({
      title: card.title,
      code: card.code,
      image: null,
      correct_fruit_id: card.correct_fruit?.id || null,
      is_active: card.is_active,
      weight: card.weight,
      order: card.order,
    });
    setImagePreview(card.image);
  }

  function handleImageChange(e) {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, image: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSave() {
    if (activeTab === 'fruits') {
      if (editingCard) {
        updateFruitMutation.mutate({ id: editingCard.id, data: formData });
      } else if (isCreating) {
        createFruitMutation.mutate(formData);
      }
    } else {
      if (editingCard) {
        updateTextMutation.mutate({ id: editingCard.id, data: formData });
      } else if (isCreating) {
        createTextMutation.mutate(formData);
      }
    }
  }

  function handleDelete(id) {
    if (window.confirm('Are you sure you want to delete this card?')) {
      if (activeTab === 'fruits') {
        deleteFruitMutation.mutate(id);
      } else {
        deleteTextMutation.mutate(id);
      }
    }
  }

  const isLoading = fruitsLoading || textsLoading;
  const currentCards = activeTab === 'fruits' ? fruits : texts;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cards Management</h1>
          <p className="text-gray-600 mt-1">Manage fruit and text cards</p>
        </div>
        {!isCreating && !editingCard && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus size={20} />
            Add New Card
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('fruits')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'fruits'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          🍎 Fruit Cards ({fruits?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('texts')}
          className={`px-6 py-3 font-semibold transition ${
            activeTab === 'texts'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📝 Text Cards ({texts?.length || 0})
        </button>
      </div>

      {/* Create/Edit Form */}
      {(isCreating || editingCard) && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {editingCard ? `Edit ${activeTab === 'fruits' ? 'Fruit' : 'Text'} Card` : `Create New ${activeTab === 'fruits' ? 'Fruit' : 'Text'} Card`}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.code}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter card title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Unique code (e.g., f1, t1)"
                />
              </div>

              {activeTab === 'texts' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Correct Fruit</label>
                  <select
                    value={formData.correct_fruit_id || ''}
                    onChange={(e) => setFormData({ ...formData, correct_fruit_id: e.target.value || null })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select a fruit...</option>
                    {fruits?.map((fruit) => (
                      <option key={fruit.id} value={fruit.id}>
                        {fruit.title} ({fruit.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) })}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500"
                />
                <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                  Active
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {imagePreview ? (
                  <div className="space-y-3">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-48 object-contain rounded-lg"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setFormData({ ...formData, image: null });
                      }}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center">
                      <Upload className="text-gray-400 mb-2" size={48} />
                      <span className="text-sm text-gray-600">Click to upload image</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      {!isCreating && !editingCard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            <div className="col-span-full text-center py-12 text-gray-600">Loading...</div>
          ) : currentCards?.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-600">
              No cards yet. Create your first one!
            </div>
          ) : (
            currentCards?.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition"
              >
                {card.image && (
                  <div className="h-48 bg-gray-100">
                    <img
                      src={card.image}
                      alt={card.title}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900">{card.title}</h3>
                      <code className="text-xs text-gray-500">{card.code}</code>
                    </div>
                    {card.is_active ? (
                      <Eye size={18} className="text-green-600" />
                    ) : (
                      <EyeOff size={18} className="text-gray-400" />
                    )}
                  </div>

                  {card.correct_fruit && (
                    <p className="text-sm text-gray-600 mb-3">
                      → {card.correct_fruit.title}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                    <span>Weight: {card.weight}</span>
                    <span>•</span>
                    <span>Order: {card.order}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(card)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                    >
                      <Edit2 size={16} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(card.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
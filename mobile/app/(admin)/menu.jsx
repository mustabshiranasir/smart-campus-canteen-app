// mobile/app/(admin)/menu.jsx
import { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Switch, Alert, Modal, ActivityIndicator, Image,
  Dimensions, Platform, StatusBar, Animated
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import api, { SERVER_BASE_URL } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const CATEGORIES = ['All', 'Fast Food', 'Healthy', 'Drinks', 'Snacks', 'Italian', 'Mexican', 'Asian', 'Desserts', 'Beverages'];
const EMPTY_FORM = { 
  name: '', 
  category: 'Fast Food', 
  price: '', 
  stock: '', 
  description: '', 
  imageUrl: '', 
  isAvailable: true, 
  extras: [],
  dietary: [],
  nutrition: { calories: '', protein: '', carbs: '', fat: '' }
};

// Helper to resolve absolute URLs for profile & food images
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SERVER_BASE_URL}${url}`;
};

export default function AdminMenuScreen() {
  const router = useRouter();
  const { theme } = useTheme();

  const [items, setItems]       = useState([]);
  const [catFilter, setCatFilter] = useState('All');
  const [search, setSearch]     = useState('');
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null); // null = add mode
  const [form, setForm]         = useState(EMPTY_FORM);
  const [saving, setSaving]     = useState(false);
  const [uploading, setUploading] = useState(false);

  const modalScale = useRef(new Animated.Value(0.95)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const fetchFoods = async () => {
    try {
      const res = await api.get('/food');
      if (res.data.success) {
        const formatted = res.data.data.map(item => ({
          _id: item._id,
          name: item.name,
          category: item.category,
          price: item.price,
          stock: item.stock !== undefined ? item.stock : 99,
          isAvailable: item.status === 'available',
          description: item.description,
          imageUrl: item.imageUrl,
          extras: item.extras || [],
          dietary: item.dietary || [],
          nutrition: item.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
        }));
        setItems(formatted);
      }
    } catch (err) {
      console.log('Error fetching foods:', err);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const filtered = items.filter(i => {
    const matchCat  = catFilter === 'All' || i.category === catFilter;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const animateModal = (show) => {
    if (show) {
      setModal(true);
      Animated.parallel([
        Animated.spring(modalScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalScale, { toValue: 0.95, duration: 200, useNativeDriver: true }),
        Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
      ]).start(() => setModal(false));
    }
  };

  const openAdd  = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    animateModal(true);
  };

  const openEdit = (item) => {
    setEditing(item._id);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      stock: String(item.stock),
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable,
      extras: (item.extras || []).map((e) => ({
        name: e.name,
        price: String(e.price),
        maxQuantity: String(e.maxQuantity ?? 3),
      })),
      dietary: item.dietary || [],
      nutrition: {
        calories: item.nutrition?.calories !== undefined ? String(item.nutrition.calories) : '',
        protein: item.nutrition?.protein !== undefined ? String(item.nutrition.protein) : '',
        carbs: item.nutrition?.carbs !== undefined ? String(item.nutrition.carbs) : '',
        fat: item.nutrition?.fat !== undefined ? String(item.nutrition.fat) : '',
      }
    });
    animateModal(true);
  };

  /* ─── Image Upload via Gallery or Camera ─── */
  const handlePickImage = async (source) => {
    try {
      let permissionResult;
      if (source === 'camera') {
        permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      } else {
        permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      }

      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', `Access to ${source} is required to select food images.`);
        return;
      }

      let result;
      const options = {
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      };

      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync(options);
      } else {
        result = await ImagePicker.launchImageLibraryAsync(options);
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedUri = result.assets[0].uri;
        await handleUpload(selectedUri);
      }
    } catch (error) {
      console.log('Error selecting image:', error);
      Alert.alert('Error', 'Something went wrong while selecting image.');
    }
  };

  const handleUpload = async (uri) => {
    setUploading(true);
    try {
      const filename = uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename || '');
      const type = match ? `image/${match[1]}` : `image`;

      const formData = new FormData();
      formData.append('foodImage', {
        uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
        name: filename || 'food.jpg',
        type,
      });

      const res = await api.post('/food/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setForm(prev => ({ ...prev, imageUrl: res.data.imageUrl }));
        Alert.alert('Success', 'Food image uploaded successfully!');
      }
    } catch (err) {
      console.log('Upload error:', err);
      Alert.alert('Upload Failed', err.response?.data?.message || 'Could not upload food image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price || !form.stock) {
      Alert.alert('Missing Fields', 'Please fill in name, price, and stock.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        price: Number(form.price),
        category: form.category,
        imageUrl: form.imageUrl.trim() || undefined,
        stock: Number(form.stock),
        description: form.description.trim(),
        status: form.isAvailable ? 'available' : 'unavailable',
        extras: (form.extras || [])
          .filter((e) => e.name?.trim())
          .map((e) => ({
            name: e.name.trim(),
            price: Number(e.price) || 0,
            maxQuantity: Number(e.maxQuantity) || 3,
          })),
        dietary: form.dietary || [],
        nutrition: {
          calories: Number(form.nutrition?.calories) || 0,
          protein: Number(form.nutrition?.protein) || 0,
          carbs: Number(form.nutrition?.carbs) || 0,
          fat: Number(form.nutrition?.fat) || 0,
        }
      };

      if (editing) {
        await api.put(`/food/${editing}`, payload);
        setItems(prev => prev.map(i => i._id === editing ? { ...i, ...payload, isAvailable: form.isAvailable } : i));
      } else {
        const res = await api.post('/food', payload);
        const savedItem = {
          ...payload,
          _id: res.data.data?._id || String(Date.now()),
          isAvailable: form.isAvailable
        };
        setItems(prev => [savedItem, ...prev]);
      }
      animateModal(false);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Delete "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/food/${item._id}`);
            setItems(prev => prev.filter(i => i._id !== item._id));
          } catch { Alert.alert('Error', 'Could not delete item'); }
        }
      },
    ]);
  };

  const handleToggle = async (item) => {
    try {
      const nextAvailable = !item.isAvailable;
      const nextStatus = nextAvailable ? 'available' : 'unavailable';
      await api.put(`/food/${item._id}`, {
        name: item.name,
        price: item.price,
        category: item.category,
        imageUrl: item.imageUrl,
        stock: item.stock,
        description: item.description,
        extras: item.extras || [],
        status: nextStatus
      });
      setItems(prev => prev.map(i => i._id === item._id ? { ...i, isAvailable: nextAvailable } : i));
    } catch {
      Alert.alert('Error', 'Could not toggle availability');
    }
  };

  const getStockChip = (stock) => {
    if (stock === 0) return { label: 'Out of Stock', color: '#EF4444', bg: '#FEE2E2' };
    if (stock < 15) return { label: `Low Stock (${stock})`, color: '#F59E0B', bg: '#FEF3C7' };
    return { label: `In Stock (${stock})`, color: '#10B981', bg: '#D1FAE5' };
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border, overflow: 'hidden' }]}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1000' }} 
          style={[StyleSheet.absoluteFillObject, { opacity: theme.isDark ? 0.25 : 0.15 }]} 
          resizeMode="cover"
        />
        <View style={styles.headerLeft}>
          <Image 
            source={require('../../assets/images/icon.png')} 
            style={{ width: 40, height: 40, borderRadius: 12 }} 
          />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Foodie Moodie</Text>
            <Text style={[styles.headerSub, { color: theme.textSub }]}>
              Menu Management 🍔
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={openAdd}>
            <Ionicons name="add" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Search menu items..." placeholderTextColor={theme.textMuted}
            value={search} onChangeText={setSearch} />
        </View>
      </View>

      {/* Category Filter */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          style={[styles.catBar, { backgroundColor: theme.card }]} contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingVertical: 10 }}>
          {CATEGORIES.map(c => (
            <TouchableOpacity 
              key={c} 
              style={[
                styles.catChip, 
                { borderColor: theme.border, backgroundColor: theme.card },
                catFilter === c && { backgroundColor: theme.accent, borderColor: theme.accent }
              ]}
              onPress={() => setCatFilter(c)}
            >
              <Text style={[styles.catText, { color: theme.textSub }, catFilter === c && { color: '#fff', fontWeight: '800' }]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Text style={[styles.statsText, { color: theme.textSub }]}>{filtered.length} items</Text>
        <Text style={[styles.statsText, { color: theme.textSub }]}>{items.filter(i => i.isAvailable).length} active</Text>
        <Text style={[styles.statsText, { color: '#ef4444' }]}>{items.filter(i => i.stock === 0).length} out of stock</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid} showsVerticalScrollIndicator={false}>
        {filtered.map(item => {
          const stockInfo = getStockChip(item.stock);
          return (
            <View key={item._id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
              <View style={styles.cardImageWrap}>
                {item.imageUrl ? (
                  <Image source={{ uri: getImageUrl(item.imageUrl) }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: theme.inputBg }]}>
                    <Ionicons name="fast-food-outline" size={32} color={theme.textMuted} />
                  </View>
                )}
                
                {/* Modern aspect-ratio price tag overlay */}
                <View style={styles.priceTag}>
                  <Text style={styles.priceTagText}>Rs. {item.price}</Text>
                </View>

                {/* Rounded action overlay buttons */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: 'rgba(255,255,255,0.9)' }]} onPress={() => openEdit(item)}>
                    <Ionicons name="pencil" size={13} color={theme.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.cardActionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash" size={13} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={[styles.cardCat, { color: theme.accent }]}>{item.category.toUpperCase()}</Text>
                <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cardDesc, { color: theme.textSub }]} numberOfLines={2}>{item.description || 'No description provided.'}</Text>
                
                {/* Modern Inventory Progress Pill */}
                <View style={[styles.stockBadge, { backgroundColor: stockInfo.bg }]}>
                  <View style={[styles.stockDot, { backgroundColor: stockInfo.color }]} />
                  <Text style={[styles.stockBadgeText, { color: stockInfo.color }]}>{stockInfo.label}</Text>
                </View>

                <View style={[styles.cardFooter, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10, marginTop: 10 }]}>
                  <Text style={[styles.availLabel, { color: item.isAvailable ? '#10B981' : theme.textMuted }]}>
                    {item.isAvailable ? 'Active Menu' : 'Hidden'}
                  </Text>
                  <Switch 
                    value={item.isAvailable} 
                    onValueChange={() => handleToggle(item)}
                    thumbColor={Platform.OS === 'web' ? (item.isAvailable ? theme.accent : '#ccc') : undefined}
                    trackColor={{ true: theme.accentSoft, false: '#eee' }} 
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Edit/Add Modal */}
      {modal && (
        <Modal visible={modal} animationType="fade" transparent={true} onRequestClose={() => animateModal(false)}>
          <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Animated.View style={[styles.modalSheet, {
              backgroundColor: theme.card,
              transform: [{ scale: modalScale }],
              opacity: modalOpacity
            }]}>
              <View style={styles.modalHandle} />
              
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalTitle, { color: theme.text, marginBottom: 0 }]}>
                  {editing ? 'Edit Menu Item' : 'Add New Item'}
                </Text>
                <TouchableOpacity onPress={() => animateModal(false)} style={styles.modalCloseBtn}>
                  <Ionicons name="close" size={22} color={theme.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                {/* ── Dynamic Image Selector and Uploader Box ── */}
                <View style={[styles.imageUploadBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  {form.imageUrl ? (
                    <Image source={{ uri: getImageUrl(form.imageUrl) }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.placeholderImgBox}>
                      <Ionicons name="cloud-upload-outline" size={36} color={theme.textMuted} />
                      <Text style={[styles.placeholderImgText, { color: theme.textSub }]}>No Food Picture Uploaded</Text>
                    </View>
                  )}
                  {uploading && (
                    <View style={styles.uploadSpinnerCover}>
                      <ActivityIndicator size="large" color={theme.accent} />
                      <Text style={styles.uploadSpinnerText}>Uploading picture...</Text>
                    </View>
                  )}
                </View>

                {/* Upload action buttons */}
                <View style={styles.uploadActionsRow}>
                  <TouchableOpacity style={[styles.uploadActionBtn, { backgroundColor: theme.accentSoft }]} onPress={() => handlePickImage('gallery')} disabled={uploading}>
                    <Ionicons name="images-outline" size={16} color={theme.accent} />
                    <Text style={[styles.uploadActionText, { color: theme.accent }]}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.uploadActionBtn, { backgroundColor: theme.accentSoft }]} onPress={() => handlePickImage('camera')} disabled={uploading}>
                    <Ionicons name="camera-outline" size={16} color={theme.accent} />
                    <Text style={[styles.uploadActionText, { color: theme.accent }]}>Camera</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: theme.textSub }]}>Item Name</Text>
                  <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg }]} value={form.name} onChangeText={t => setForm({ ...form, name: t })} placeholder="e.g. Gourmet Club Sandwich" placeholderTextColor={theme.textMuted} />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: theme.textSub }]}>Category</Text>
                  <View style={styles.catPickerRow}>
                    {CATEGORIES.slice(1).map(cat => (
                      <TouchableOpacity 
                        key={cat} 
                        style={[
                          styles.catPickChip, 
                          { borderColor: theme.border, backgroundColor: theme.inputBg },
                          form.category === cat && { backgroundColor: theme.accentSoft, borderColor: theme.accent }
                        ]}
                        onPress={() => setForm({ ...form, category: cat })}
                      >
                        <Text style={[styles.catPickText, { color: theme.textSub }, form.category === cat && { color: theme.accent, fontWeight: '700' }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { color: theme.textSub }]}>Price (Rs.)</Text>
                    <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={form.price} onChangeText={t => setForm({ ...form, price: t })} placeholder="Price" placeholderTextColor={theme.textMuted} />
                  </View>
                  <View style={[styles.formField, { flex: 1 }]}>
                    <Text style={[styles.formLabel, { color: theme.textSub }]}>Stock Count</Text>
                    <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg }]} keyboardType="numeric" value={form.stock} onChangeText={t => setForm({ ...form, stock: t })} placeholder="Stock" placeholderTextColor={theme.textMuted} />
                  </View>
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: theme.textSub }]}>Custom Image URL (Fallback)</Text>
                  <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg }]} value={form.imageUrl} onChangeText={t => setForm({ ...form, imageUrl: t })} placeholder="https://example.com/image.jpg" placeholderTextColor={theme.textMuted} />
                </View>

                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: theme.textSub }]}>Description</Text>
                  <TextInput style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg, height: 80, textAlignVertical: 'top' }]} multiline={true} value={form.description} onChangeText={t => setForm({ ...form, description: t })} placeholder="Ingredients, size, taste notes..." placeholderTextColor={theme.textMuted} />
                </View>

                {/* Nutrition Inputs */}
                <Text style={[styles.sectionHeading, { color: theme.text, marginTop: 12 }]}>Nutritional Information</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {['calories', 'protein', 'carbs', 'fat'].map(nutField => (
                    <View key={nutField} style={{ flex: 1 }}>
                      <Text style={[styles.formLabel, { color: theme.textSub, fontSize: 11 }]}>
                        {nutField.charAt(0).toUpperCase() + nutField.slice(1)} {nutField === 'calories' ? '(kcal)' : '(g)'}
                      </Text>
                      <TextInput
                        style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.inputBg, paddingHorizontal: 8 }]}
                        keyboardType="numeric"
                        value={form.nutrition?.[nutField] || ''}
                        placeholder="0"
                        placeholderTextColor={theme.textMuted}
                        onChangeText={t => setForm({
                          ...form,
                          nutrition: { ...form.nutrition, [nutField]: t }
                        })}
                      />
                    </View>
                  ))}
                </View>

                {/* Dietary Tags Selector */}
                <View style={styles.formField}>
                  <Text style={[styles.formLabel, { color: theme.textSub }]}>Dietary Classification</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                    {['vegan', 'vegetarian', 'gluten-free', 'halal', 'keto', 'nut-free', 'dairy-free'].map(dietTag => {
                      const selected = (form.dietary || []).includes(dietTag);
                      
                      let label = dietTag;
                      if (dietTag === 'gluten-free') label = 'Gluten-Free';
                      else if (dietTag === 'nut-free') label = 'Nut-Free';
                      else if (dietTag === 'dairy-free') label = 'Dairy-Free';
                      else label = dietTag.charAt(0).toUpperCase() + dietTag.slice(1);

                      return (
                        <TouchableOpacity
                          key={dietTag}
                          style={[
                            styles.dietSelectChip,
                            { borderColor: theme.border, backgroundColor: theme.inputBg, marginBottom: 8 },
                            selected && { backgroundColor: '#10B981', borderColor: '#10B981' }
                          ]}
                          onPress={() => {
                            let nextDietary = [...(form.dietary || [])];
                            if (selected) {
                              nextDietary = nextDietary.filter(tag => tag !== dietTag);
                            } else {
                              nextDietary.push(dietTag);
                            }
                            setForm({ ...form, dietary: nextDietary });
                          }}
                        >
                          <Text style={[styles.dietSelectText, { color: theme.textSub }, selected && { color: '#fff', fontWeight: '700' }]}>
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.formField}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={[styles.formLabel, { color: theme.textSub, marginBottom: 0 }]}>Add-ons / extras</Text>
                    <TouchableOpacity
                      onPress={() => setForm({
                        ...form,
                        extras: [...(form.extras || []), { name: '', price: '', maxQuantity: '3' }],
                      })}
                    >
                      <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 13 }}>+ Add extra</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {[
                      { label: '+ Cheese', item: { name: 'Extra Cheese', price: '50', maxQuantity: '2' } },
                      { label: '+ Salad', item: { name: 'Extra Salad', price: '45', maxQuantity: '2' } },
                      { label: '+ Raita', item: { name: 'Extra Raita', price: '35', maxQuantity: '3' } },
                      { label: '+ Toppings', item: { name: 'Extra Toppings', price: '40', maxQuantity: '3' } },
                    ].map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        style={[styles.presetChip, { borderColor: theme.accent, backgroundColor: theme.inputBg }]}
                        onPress={() => {
                          const exists = (form.extras || []).some((e) => e.name === preset.item.name);
                          if (!exists) {
                            setForm({ ...form, extras: [...(form.extras || []), preset.item] });
                          }
                        }}
                      >
                        <Text style={{ color: theme.accent, fontSize: 11, fontWeight: '700' }}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {(form.extras || []).map((extra, idx) => (
                    <View key={idx} style={[styles.extraFormRow, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                      <TextInput
                        style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card, flex: 1 }]}
                        value={extra.name}
                        onChangeText={(t) => {
                          const next = [...form.extras];
                          next[idx] = { ...next[idx], name: t };
                          setForm({ ...form, extras: next });
                        }}
                        placeholder="e.g. Extra cheese"
                        placeholderTextColor={theme.textMuted}
                      />
                      <TextInput
                        style={[styles.formInput, { borderColor: theme.border, color: theme.text, backgroundColor: theme.card, width: 72 }]}
                        keyboardType="numeric"
                        value={extra.price}
                        onChangeText={(t) => {
                          const next = [...form.extras];
                          next[idx] = { ...next[idx], price: t };
                          setForm({ ...form, extras: next });
                        }}
                        placeholder="Rs"
                        placeholderTextColor={theme.textMuted}
                      />
                      <TouchableOpacity
                        onPress={() => setForm({ ...form, extras: form.extras.filter((_, i) => i !== idx) })}
                      >
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.toggleRow}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.text }}>Available for Order</Text>
                    <Text style={{ fontSize: 12, color: theme.textSub, marginTop: 2 }}>Show item in student app menu</Text>
                  </View>
                  <Switch value={form.isAvailable} onValueChange={v => setForm({ ...form, isAvailable: v })} />
                </View>

                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.accent }]} onPress={handleSave} disabled={saving || uploading}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Item</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => animateModal(false)}>
                  <Text style={[styles.cancelBtnText, { color: theme.textSub }]}>Cancel</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </Modal>
      )}

      {/* ── Bottom Navigation ── */}
      <View style={[styles.bottomNav, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        {[
          { icon: 'grid',       iconO: 'grid-outline',       label: 'Dashboard', active: false, route: '/(admin)/dashboard' },
          { icon: 'bag-handle', iconO: 'bag-handle-outline', label: 'Orders',    active: false, route: '/(admin)/orders' },
          { icon: 'cube',       iconO: 'cube-outline',       label: 'Menu',      active: true,  route: '/(admin)/menu' },
          { icon: 'settings',   iconO: 'settings-outline',   label: 'Settings',  active: false, route: '/(admin)/settings' },
        ].map(n => (
          <TouchableOpacity
            key={n.label}
            style={styles.bottomNavItem}
            onPress={() => n.route && router.replace(n.route)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={n.active ? n.icon : n.iconO}
              size={22}
              color={n.active ? theme.accent : theme.textSub}
            />
            <Text style={[styles.bottomNavLabel, { color: theme.textSub }, n.active && { color: theme.accent, fontWeight: '700' }]}>
              {n.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1 },
  header:           { paddingTop: Platform.OS === 'ios' ? 54 : 44, paddingBottom: 16, borderBottomWidth: 1,
                      paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 99999, elevation: 10 },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerSub:        { fontSize: 12 },
  backBtn:          { width: 36, height: 36, borderRadius: 18,
                      alignItems: 'center', justifyContent: 'center' },
  headerTitle:      { fontSize: 18, fontWeight: '800' },
  addBtn:           { width: 36, height: 36, borderRadius: 18,
                      alignItems: 'center', justifyContent: 'center' },
  searchWrap:       { padding: 12, borderBottomWidth: 1 },
  searchBar:        { flexDirection: 'row', alignItems: 'center', gap: 10,
                      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput:      { flex: 1, fontSize: 14 },
  catBar:           { borderBottomWidth: 0 },
  catChip:          { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  catChipActive:    { },
  catText:          { fontSize: 13, fontWeight: '600' },
  catTextActive:    { color: '#fff' },
  statsBar:         { flexDirection: 'row', justifyContent: 'space-around',
                      paddingVertical: 10, marginBottom: 4, borderBottomWidth: 1 },
  statsText:        { fontSize: 12, fontWeight: '600' },
  grid:             { padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', paddingBottom: 40 },
  card:             { width: '48%', borderRadius: 18, overflow: 'hidden',
                      shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  cardImageWrap:    { position: 'relative' },
  cardImage:        { width: '100%', height: 110, resizeMode: 'cover' },
  cardImagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  priceTag:         { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.65)',
                      borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  priceTagText:     { color: '#fff', fontWeight: '800', fontSize: 11 },
  cardActions:      { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 6 },
  cardActionBtn:    { width: 28, height: 28, borderRadius: 8,
                      alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  cardBody:         { padding: 12 },
  cardName:         { fontSize: 14, fontWeight: '800' },
  cardCat:          { fontSize: 9, fontWeight: '800', marginBottom: 4, letterSpacing: 0.5 },
  cardDesc:         { fontSize: 11, lineHeight: 15, marginBottom: 10, height: 30 },
  stockBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 2 },
  stockDot:         { width: 6, height: 6, borderRadius: 3 },
  stockBadgeText:   { fontSize: 10, fontWeight: '700' },
  cardFooter:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availLabel:       { fontSize: 11, fontWeight: '700' },
  modalOverlay:     { flex: 1, justifyContent: 'flex-end' },
  modalSheet:       { borderTopLeftRadius: 28, borderTopRightRadius: 28,
                      padding: 24, maxHeight: '92%' },
  modalHandle:      { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2,
                      alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalCloseBtn:    { padding: 4 },
  modalTitle:       { fontSize: 20, fontWeight: '800' },
  imageUploadBox:   { width: '100%', height: 160, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', marginBottom: 12 },
  uploadedImage:    { width: '100%', height: '100%', resizeMode: 'cover' },
  placeholderImgBox:{ alignItems: 'center', justifyContent: 'center' },
  placeholderImgText: { fontSize: 12, fontWeight: '600', marginTop: 8 },
  uploadSpinnerCover: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.85)', alignItems: 'center', justifyContent: 'center' },
  uploadSpinnerText:  { fontSize: 12, fontWeight: '700', marginTop: 8, color: '#374151' },
  uploadActionsRow:   { flexDirection: 'row', gap: 12, marginBottom: 18 },
  uploadActionBtn:    { flex: 1, height: 44, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  uploadActionText:   { fontSize: 13, fontWeight: '700' },
  formField:        { marginBottom: 14 },
  formLabel:        { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  presetChip:       { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  extraFormRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, padding: 8, borderRadius: 10, borderWidth: 1 },
  formInput:        { borderWidth: 1.5, borderRadius: 12,
                      paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  catPickerRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPickChip:      { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  catPickChipActive:{ },
  catPickText:      { fontSize: 13, fontWeight: '600' },
  catPickTextActive:{ },
  toggleRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  saveBtn:          { borderRadius: 14, padding: 16, alignItems: 'center', marginBottom: 10 },
  saveBtnText:      { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn:        { padding: 12, alignItems: 'center' },
  cancelBtnText:    { fontSize: 15 },

  /* ── Bottom Nav ── */
  bottomNav: {
    flexDirection: 'row',
    height: 64,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 14 : 0,
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  bottomNavLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  bottomNavLabelActive: {
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  dietSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  dietSelectText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

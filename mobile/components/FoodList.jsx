import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ScrollView, ActivityIndicator, Platform, Dimensions, RefreshControl, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { useCart, useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api, { SERVER_BASE_URL } from '../services/api';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 24 - 24 - 12) / 2; // 12px padding + 12 gap

const CATEGORIES = ['All', 'Fast Food', 'Healthy', 'Drinks', 'Snacks', 'Italian', 'Mexican', 'Asian', 'Desserts', 'Beverages'];

const getImageUrl = (url) => {
  if (!url) return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${SERVER_BASE_URL}${url}`;
};

export default function FoodList() {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAdmin } = useAuth();
  const { theme } = useTheme();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeDietary, setActiveDietary] = useState('All');
  const [selectedFood, setSelectedFood] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSuccess, setRatingSuccess] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch foods from /api/food
  const fetchFoods = async () => {
    try {
      const res = await api.get('/food');
      if (res.data.success) {
        // Map data to local structure
        const formatted = res.data.data.map(item => ({
          id: item._id,
          name: item.name,
          price: item.price,
          category: item.category,
          image: getImageUrl(item.imageUrl),
          status: item.status,
          stock: item.stock !== undefined ? item.stock : 99,
          rating: item.rating !== undefined ? item.rating : 4.5,
          numReviews: item.numReviews !== undefined ? item.numReviews : 1,
          dietary: item.dietary || [],
          nutrition: item.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0 },
          description: item.description || (item.category + ' item'),
          extras: item.extras || [],
        }));
        setFoods(formatted);
      }
    } catch (error) {
      console.error('Error fetching foods:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFoods();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFoods();
  };

  const handleOpenDetail = (item) => {
    setSelectedFood(item);
    setUserRating(0);
    setDetailVisible(true);
  };

  const handleRateFood = async (ratingVal) => {
    if (!selectedFood) return;
    setSubmittingRating(true);
    try {
      const res = await api.post(`/food/${selectedFood.id}/rate`, { rating: ratingVal });
      if (res.data.success) {
        const updatedFood = res.data.data;
        const newRating = updatedFood.rating;
        const newNumReviews = updatedFood.numReviews;
        
        setSelectedFood(prev => ({
          ...prev,
          rating: newRating,
          numReviews: newNumReviews,
        }));
        
        setFoods(prevFoods => prevFoods.map(f => f.id === selectedFood.id ? {
          ...f,
          rating: newRating,
          numReviews: newNumReviews,
        } : f));
        
        setRatingSuccess(true);
        setTimeout(() => setRatingSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Error rating food item:', err);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Only display items where status: "available"
  const availableFoods = foods.filter(item => item.status === 'available');

  const filteredFoods = availableFoods.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    
    let matchDietary = true;
    if (activeDietary !== 'All') {
      const tag = activeDietary.toLowerCase();
      matchDietary = item.dietary && item.dietary.some(d => d.toLowerCase() === tag);
    }
    
    return matchCat && matchSearch && matchDietary;
  });

  const renderFoodCard = ({ item }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, width: CARD_W }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => handleOpenDetail(item)}>
        <Image source={{ uri: item.image }} style={styles.foodImg} resizeMode="cover" />

        {/* Rating badge */}
        <View style={[styles.ratingBadge, { backgroundColor: theme.card }]}>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={[styles.ratingText, { color: theme.text }]}>{item.rating?.toFixed(1) || '4.5'}</Text>
        </View>

        {/* Category badge */}
        <View style={[styles.catBadge, { backgroundColor: theme.accent }]}>
          <Text style={styles.catBadgeText}>{item.category}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.foodName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
          
          {/* Dietary Badges (Small Pills) */}
          {item.dietary && item.dietary.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 6 }}>
              {item.dietary.map(tag => {
                const lowerTag = tag.toLowerCase();
                let icon = 'leaf-outline';
                let label = tag;
                if (lowerTag === 'vegan') { icon = 'leaf-outline'; label = 'Vegan'; }
                else if (lowerTag === 'vegetarian') { icon = 'egg-outline'; label = 'Veg'; }
                else if (lowerTag === 'gluten-free') { icon = 'nutrition-outline'; label = 'GF'; }
                else if (lowerTag === 'halal') { icon = 'checkmark-circle-outline'; label = 'Halal'; }
                else if (lowerTag === 'keto') { icon = 'fitness-outline'; label = 'Keto'; }
                else if (lowerTag === 'nut-free') { icon = 'shield-checkmark-outline'; label = 'Nut-Free'; }
                else if (lowerTag === 'dairy-free') { icon = 'water-outline'; label = 'Dairy-Free'; }

                return (
                  <View key={tag} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.isDark ? '#2A2A2A' : '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12, gap: 4 }}>
                    <Ionicons name={icon} size={10} color={theme.textSub} />
                    <Text style={{ fontSize: 9, color: theme.textSub, fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto', fontWeight: '500' }}>{label}</Text>
                  </View>
                );
              })}
            </View>
          )}

          <Text style={[styles.foodDesc, { color: theme.textSub }]} numberOfLines={2}>{item.description}</Text>

          {/* Stock Status Indicator */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: theme.textSub }}>Quantity Available</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ 
                width: 6, 
                height: 6, 
                borderRadius: 3, 
                backgroundColor: item.stock === 0 ? '#EF4444' : (item.stock <= 5 ? '#F59E0B' : '#10B981') 
              }} />
              <Text style={{ 
                fontSize: 11, 
                fontWeight: '700', 
                color: item.stock === 0 ? '#EF4444' : (item.stock <= 5 ? '#F59E0B' : '#10B981') 
              }}>
                {item.stock === 0 ? 'Out of stock' : `${item.stock} left`}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <View style={[styles.cardBody, { paddingTop: 0 }]}>
        <View style={styles.cardFooter}>
          <View>
            <Text style={[styles.priceLabel, { color: theme.textMuted }]}>Price</Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>Rs. {item.price}</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.addBtn, 
              { backgroundColor: item.stock === 0 ? '#9CA3AF' : theme.accent }
            ]}
            onPress={() => addToCart({ ...item, _id: item.id })}
            activeOpacity={0.85}
            disabled={item.stock === 0}
          >
            <Text style={styles.addBtnText}>{item.stock === 0 ? 'Sold Out' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingCenter, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filteredFoods}
        keyExtractor={item => item.id}
        renderItem={renderFoodCard}
        numColumns={2}
        ListHeaderComponent={
          <View>
            {/* Search Input */}
            <View style={[styles.searchWrap, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search for food items..."
                placeholderTextColor={theme.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={18} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Category Horizontal list */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catRow}
            >
              {CATEGORIES.map(cat => {
                const active = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPill,
                      { borderColor: theme.border, backgroundColor: theme.card },
                      active && { backgroundColor: theme.accent, borderColor: theme.accent }
                    ]}
                    onPress={() => setActiveCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.catPillText, { color: theme.textSub }, active && { color: '#fff', fontWeight: '700' }]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Dietary Needs Filter Pills */}
            <View style={{ marginTop: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
              >
                {['All', 'Vegan', 'Vegetarian', 'Gluten-Free', 'Halal', 'Keto', 'Nut-Free', 'Dairy-Free'].map(diet => {
                  const active = activeDietary === diet;
                  let icon = 'filter-outline';
                  if (diet === 'Vegan') icon = 'leaf-outline';
                  else if (diet === 'Gluten-Free') icon = 'nutrition-outline';
                  else if (diet === 'Vegetarian') icon = 'egg-outline';
                  else if (diet === 'Halal') icon = 'checkmark-circle-outline';
                  else if (diet === 'Keto') icon = 'fitness-outline';
                  else if (diet === 'Nut-Free') icon = 'shield-checkmark-outline';
                  else if (diet === 'Dairy-Free') icon = 'water-outline';

                  return (
                    <TouchableOpacity
                      key={diet}
                      style={[
                        styles.dietPill,
                        { borderColor: theme.border, backgroundColor: theme.card },
                        active && { backgroundColor: '#10B981', borderColor: '#10B981' }
                      ]}
                      onPress={() => setActiveDietary(diet)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={icon}
                        size={12}
                        color={active ? '#fff' : theme.textSub}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.dietPillText, { color: theme.textSub }, active && { color: '#fff', fontWeight: '700' }]}>
                        {diet}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Results Count */}
            <Text style={[styles.resultCount, { color: theme.textSub }]}>{filteredFoods.length} items found</Text>
          </View>
        }
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.accent]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="fast-food-outline" size={64} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.textSub }]}>No food available yet</Text>
            <TouchableOpacity
              style={[styles.refreshBtn, { backgroundColor: theme.accent }]}
              onPress={fetchFoods}
            >
              <Text style={styles.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {isAdmin && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push('/admin/add-food')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Food Detail Modal */}
      {selectedFood && (
        <Modal
          visible={detailVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setDetailVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]} numberOfLines={1}>
                  {selectedFood.name}
                </Text>
                <TouchableOpacity onPress={() => setDetailVisible(false)} style={styles.closeBtn}>
                  <Ionicons name="close" size={24} color={theme.textSub} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Food Image */}
                <Image source={{ uri: selectedFood.image }} style={styles.modalImage} resizeMode="cover" />

                {/* Categories & Dietary Needs */}
                <View style={styles.modalBadgesRow}>
                  <View style={[styles.modalCatBadge, { backgroundColor: theme.accent }]}>
                    <Text style={styles.modalCatBadgeText}>{selectedFood.category}</Text>
                  </View>
                  {selectedFood.dietary && selectedFood.dietary.map(tag => (
                    <View key={tag} style={[styles.modalDietBadge, { backgroundColor: '#E0F2FE' }]}>
                      <Ionicons name={tag === 'vegan' ? 'leaf' : 'nutrition'} size={12} color="#0369A1" style={{ marginRight: 2 }} />
                      <Text style={styles.modalDietBadgeText}>{tag.toUpperCase()}</Text>
                    </View>
                  ))}
                </View>

                {/* Price & Stock */}
                <View style={styles.modalPriceStockRow}>
                  <Text style={[styles.modalPrice, { color: theme.text }]}>Rs. {selectedFood.price}</Text>
                  <Text style={[
                    styles.modalStock, 
                    { color: selectedFood.stock === 0 ? '#EF4444' : (selectedFood.stock <= 5 ? '#F59E0B' : '#10B981') }
                  ]}>
                    {selectedFood.stock === 0 ? 'Out of Stock' : `${selectedFood.stock} Available`}
                  </Text>
                </View>

                {/* Description */}
                <Text style={[styles.modalDescLabel, { color: theme.text }]}>Description</Text>
                <Text style={[styles.modalDesc, { color: theme.textSub }]}>{selectedFood.description}</Text>

                {/* Nutritional Facts */}
                <Text style={[styles.modalDescLabel, { color: theme.text }]}>Nutritional Facts</Text>
                <View style={[styles.nutritionCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <View style={styles.caloriesBanner}>
                    <View style={styles.caloriesTextGroup}>
                      <Ionicons name="flame" size={22} color="#EF4444" />
                      <Text style={[styles.caloriesValueText, { color: theme.text }]}>
                        {selectedFood.nutrition?.calories || 0}
                      </Text>
                      <Text style={[styles.caloriesUnitText, { color: theme.textSub }]}> kcal</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: theme.textSub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Energy Count
                    </Text>
                  </View>

                  <View style={[styles.macrosDivider, { backgroundColor: theme.border }]} />

                  <View style={styles.macrosContainer}>
                    {[
                      { label: 'Protein', val: selectedFood.nutrition?.protein || 0, unit: 'g', color: '#3B82F6', max: 50, icon: 'fitness' },
                      { label: 'Carbs', val: selectedFood.nutrition?.carbs || 0, unit: 'g', color: '#F59E0B', max: 100, icon: 'cafe' },
                      { label: 'Fat', val: selectedFood.nutrition?.fat || 0, unit: 'g', color: '#10B981', max: 40, icon: 'water' },
                    ].map(macro => {
                      const pct = Math.min(100, Math.round((macro.val / macro.max) * 100));
                      return (
                        <View key={macro.label} style={styles.macroProgressRow}>
                          <View style={styles.macroHeaderRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Ionicons name={macro.icon} size={14} color={macro.color} />
                              <Text style={[styles.macroLabelText, { color: theme.text }]}>{macro.label}</Text>
                            </View>
                            <Text style={[styles.macroValText, { color: theme.textSub }]}>
                              {macro.val}{macro.unit} <Text style={{ fontSize: 10, color: theme.textMuted }}>({pct}%)</Text>
                            </Text>
                          </View>
                          {/* Progress Bar Track */}
                          <View style={[styles.macroProgressBarTrack, { backgroundColor: theme.border }]}>
                            <View style={[styles.macroProgressBarFill, { width: `${pct}%`, backgroundColor: macro.color }]} />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Star Rating Section */}
                <View style={[styles.ratingSection, { borderColor: theme.border, backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.ratingSectionTitle, { color: theme.text }]}>Customer Rating</Text>
                  
                  <View style={styles.ratingStatsRow}>
                    <Ionicons name="star" size={20} color="#F59E0B" />
                    <Text style={[styles.ratingAvgText, { color: theme.text }]}>
                      {selectedFood.rating?.toFixed(1) || '4.5'}
                    </Text>
                    <Text style={{ color: theme.textSub, fontSize: 13 }}>
                      out of 5 ({selectedFood.numReviews || 1} {selectedFood.numReviews === 1 ? 'review' : 'reviews'})
                    </Text>
                  </View>

                  <View style={[styles.ratingDivider, { backgroundColor: theme.border }]} />

                  <Text style={[styles.ratePromptText, { color: theme.textSub }]}>Tap stars to submit your rating:</Text>
                  <View style={styles.starsSelectorRow}>
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isHighlighted = userRating > 0 ? (starVal <= userRating) : (starVal <= Math.round(selectedFood.rating || 4));
                      return (
                        <TouchableOpacity
                          key={starVal}
                          onPress={() => {
                            setUserRating(starVal);
                            handleRateFood(starVal);
                          }}
                          disabled={submittingRating}
                          style={{ padding: 4 }}
                        >
                          <Ionicons
                            name={isHighlighted ? 'star' : 'star-outline'}
                            size={32}
                            color="#F59E0B"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {submittingRating && (
                    <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
                  )}

                  {ratingSuccess && (
                    <View style={styles.ratingSuccessBanner}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.ratingSuccessText}>Thank you! Your rating has been recorded.</Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Add to Cart Actions */}
              <View style={[styles.modalActions, { borderTopColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.modalAddBtn, 
                    { backgroundColor: selectedFood.stock === 0 ? '#9CA3AF' : theme.accent }
                  ]}
                  disabled={selectedFood.stock === 0}
                  onPress={() => {
                    addToCart({ ...selectedFood, _id: selectedFood.id });
                    setDetailVisible(false);
                  }}
                >
                  <Ionicons name="cart" size={18} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.modalAddBtnText}>
                    {selectedFood.stock === 0 ? 'Out of Stock' : `Add to Cart · Rs. ${selectedFood.price}`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  catRow: {
    paddingHorizontal: 16,
    paddingBottom: 4,
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  catPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  resultCount: {
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  foodImg: {
    width: '100%',
    height: 120,
  },
  ratingBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 10,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
  },
  catBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  catBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  cardBody: {
    padding: 12,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 3,
  },
  foodDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 1,
  },
  priceValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 },
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1.5,
  },
  dietPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    flex: 1,
    marginRight: 10,
  },
  closeBtn: {
    padding: 4,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 16,
    marginBottom: 16,
  },
  modalBadgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modalCatBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  modalCatBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalDietBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },
  modalDietBadgeText: {
    color: '#0369A1',
    fontSize: 10,
    fontWeight: '700',
  },
  modalPriceStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalPrice: {
    fontSize: 22,
    fontWeight: '800',
  },
  modalStock: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalDescLabel: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
    marginTop: 4,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  nutritionCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  caloriesBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  caloriesTextGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  caloriesValueText: {
    fontSize: 22,
    fontWeight: '900',
  },
  caloriesUnitText: {
    fontSize: 13,
    fontWeight: '700',
  },
  macrosDivider: {
    height: 1,
    marginVertical: 4,
  },
  macrosContainer: {
    gap: 12,
    paddingTop: 8,
  },
  macroProgressRow: {
    gap: 6,
  },
  macroHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  macroValText: {
    fontSize: 12,
    fontWeight: '600',
  },
  macroProgressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingSection: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  ratingSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  ratingStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  ratingAvgText: {
    fontSize: 18,
    fontWeight: '800',
  },
  ratingDivider: {
    width: '100%',
    height: 1,
    marginVertical: 10,
  },
  ratePromptText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  starsSelectorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 6,
  },
  ratingSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  ratingSuccessText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  modalActions: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingBottom: 20,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
  },
  modalAddBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  dietaryOverlay: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    gap: 4,
    zIndex: 10,
  },
  dietaryBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dietaryBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
});

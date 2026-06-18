import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
  ScrollView, Image, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calcUnitPrice, calcLineTotal } from '../utils/pricing';

export default function FoodCustomizeModal({
  visible,
  food,
  onClose,
  onAdd,
  theme,
  mode = 'add',
  confirmLabel,
}) {
  const [qty, setQty] = useState(1);
  const [extraQtys, setExtraQtys] = useState({});

  const extras = food?.extras || [];

  useEffect(() => {
    if (!visible || !food) return;
    setQty(food.initialQty || 1);
    const map = {};
    (food.initialExtras || []).forEach((e) => {
      map[e.name] = e.quantity || 1;
    });
    setExtraQtys(map);
  }, [visible, food?._id, food?.id]);

  const selectedExtras = useMemo(
    () =>
      extras
        .filter((e) => (extraQtys[e.name] || 0) > 0)
        .map((e) => ({
          name: e.name,
          price: e.price,
          quantity: extraQtys[e.name] || 0,
        })),
    [extras, extraQtys]
  );

  const unitPrice = food ? calcUnitPrice(food.price, selectedExtras) : 0;
  const lineTotal = food ? calcLineTotal(food.price, qty, selectedExtras) : 0;

  const setExtraQty = (name, max, delta) => {
    setExtraQtys((prev) => {
      const current = prev[name] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [name]: next };
    });
  };

  const handleAdd = () => {
    if (!food) return;
    onAdd(food, qty, selectedExtras);
    setQty(1);
    setExtraQtys({});
    onClose();
  };

  if (!food) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.card }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {mode === 'edit' ? 'Customize your order' : 'Customize & add'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.foodRow}>
              {food.image ? (
                <Image source={{ uri: food.image }} style={styles.foodImg} />
              ) : null}
              <View style={{ flex: 1 }}>
                <Text style={[styles.foodName, { color: theme.text }]}>{food.name}</Text>
                <Text style={{ color: theme.textSub, fontSize: 12 }}>Base Rs. {food.price}</Text>
              </View>
            </View>

            <Text style={[styles.sectionLabel, { color: theme.text }]}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={[styles.qtyBtn, { borderColor: theme.border }]}
                onPress={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Ionicons name="remove" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.qtyVal, { color: theme.text }]}>{qty}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, { backgroundColor: theme.accent }]}
                onPress={() => setQty((q) => Math.min(food.stock || 99, q + 1))}
              >
                <Ionicons name="add" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {extras.length > 0 ? (
              <>
                <Text style={[styles.sectionLabel, { color: theme.text }]}>Toppings & add-ons</Text>
                {extras.map((extra) => {
                  const count = extraQtys[extra.name] || 0;
                  const max = extra.maxQuantity || 3;
                  return (
                    <View
                      key={extra.name}
                      style={[styles.extraRow, { borderColor: theme.border, backgroundColor: theme.inputBg }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.extraName, { color: theme.text }]}>{extra.name}</Text>
                        <Text style={{ color: theme.textSub, fontSize: 12 }}>
                          + Rs. {extra.price} each (max {max})
                        </Text>
                      </View>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={[styles.qtyBtnSm, { borderColor: theme.border }]}
                          onPress={() => setExtraQty(extra.name, max, -1)}
                        >
                          <Ionicons name="remove" size={14} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.extraCount, { color: theme.text }]}>{count}</Text>
                        <TouchableOpacity
                          style={[styles.qtyBtnSm, { backgroundColor: theme.accent }]}
                          onPress={() => setExtraQty(extra.name, max, 1)}
                        >
                          <Ionicons name="add" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={{ color: theme.textSub, fontSize: 13, marginBottom: 12 }}>
                No add-ons for this item.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.totalBox, { backgroundColor: theme.inputBg }]}>
            <Text style={{ color: theme.textSub, fontSize: 12 }}>
              Rs. {unitPrice} × {qty}
              {selectedExtras.length > 0 ? ` (incl. add-ons)` : ''}
            </Text>
            <Text style={[styles.totalVal, { color: theme.accent }]}>Rs. {lineTotal}</Text>
          </View>

          <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accent }]} onPress={handleAdd}>
            <Text style={styles.addBtnText}>
              {confirmLabel || (mode === 'edit' ? `Update · Rs. ${lineTotal}` : `Add to cart · Rs. ${lineTotal}`)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '88%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '800' },
  foodRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  foodImg: { width: 64, height: 64, borderRadius: 12 },
  foodName: { fontSize: 16, fontWeight: '700' },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  qtyBtn: {
    width: 36, height: 36, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnSm: {
    width: 30, height: 30, borderRadius: 8, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyVal: { fontSize: 18, fontWeight: '800', minWidth: 28, textAlign: 'center' },
  extraRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  extraName: { fontSize: 14, fontWeight: '600' },
  extraCount: { fontSize: 14, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  totalBox: { padding: 14, borderRadius: 12, marginTop: 8, marginBottom: 12 },
  totalVal: { fontSize: 22, fontWeight: '800', marginTop: 4 },
  addBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

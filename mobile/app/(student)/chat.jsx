// mobile/app/(student)/chat.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator, StatusBar, Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useCart } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { fetchCart } = useCart();
  const { theme } = useTheme();

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Hello ${user?.name || 'there'}! 👋 I am your Foodie AI Assistant.\nI can help you search the menu, add items to your cart, check prices, or check your past orders.\n\nTry asking me: "What burgers are available?" or "Add a chicken burger to my cart!"`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const flatListRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Sync cart on mount in case
  useEffect(() => {
    fetchCart();
  }, []);

  const suggestions = [
    { label: '🍔 Burgers & Wraps', query: 'Search for available burgers and wraps' },
    { label: '🍹 Drinks under Rs. 150', query: 'Show me drinks under Rs. 150' },
    { label: '📦 Check my orders', query: 'What is the status of my past orders?' },
    { label: '☕ Add Cold Coffee', query: 'Add Cold Coffee to my cart' },
  ];

  const handleSend = async (textToSend) => {
    const query = (textToSend || message).trim();
    if (!query) return;

    if (!textToSend) setMessage('');

    // Add user message to UI
    const newUserMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, newUserMsg]);
    setLoading(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await api.post('/ai/chat', {
        message: query,
        history: history,
      });

      if (response.data.success) {
        const botReplyText = response.data.message;
        const updatedHistory = response.data.history;

        // Save updated conversational history
        setHistory(updatedHistory);

        const newBotMsg = {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: botReplyText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => [...prev, newBotMsg]);

        // If message suggests cart modification, reload cart state
        const triggerCartSync = /add|added|cart|shopping/i.test(botReplyText);
        if (triggerCartSync) {
          await fetchCart();
        }
      } else {
        throw new Error(response.data.message || 'Error executing AI chat request');
      }
    } catch (err) {
      console.error('Chat Error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Unable to connect to Gemini AI Assistant';
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 2).toString(),
          sender: 'bot',
          text: `⚠️ Request Failed: ${errMsg}. Make sure you have configured a valid GEMINI_API_KEY inside your .env configuration.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true,
        }
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userContainer : styles.botContainer
      ]}>
        {!isUser && (
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
          </View>
        )}
        <View style={[
          styles.bubble,
          isUser
            ? { backgroundColor: theme.accent, borderBottomRightRadius: 4 }
            : { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, borderBottomLeftRadius: 4 },
          item.isError && { borderColor: theme.error, backgroundColor: theme.isDark ? '#2D161A' : '#FDF2F4' }
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? { color: '#FFF' } : { color: theme.text },
            item.isError && { color: theme.error }
          ]}>
            {item.text}
          </Text>
          <Text style={[
            styles.timeText,
            isUser ? { color: 'rgba(255,255,255,0.7)' } : { color: theme.textMuted }
          ]}>
            {item.time}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.card}
      />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Foodie AI Assistant</Text>
            <View style={styles.onlineBadge} />
          </View>
          <Text style={[styles.headerSub, { color: theme.textSub }]}>Gemini Powered ordering & search</Text>
        </View>
        <TouchableOpacity
          style={[styles.clearButton, { backgroundColor: theme.inputBg }]}
          onPress={() => {
            setHistory([]);
            setMessages([
              {
                id: 'welcome_reset',
                sender: 'bot',
                text: 'Chat history cleared. How can I help you pre-order now?',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              }
            ]);
          }}
        >
          <Ionicons name="trash-outline" size={18} color={theme.textSub} />
        </TouchableOpacity>
      </View>

      {/* Suggestion Chips */}
      {messages.length <= 1 && (
        <View style={styles.suggestionBox}>
          <Text style={[styles.suggestionTitle, { color: theme.textSub }]}>Suggested questions</Text>
          <View style={styles.suggestionsList}>
            {suggestions.map((s, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.chip, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={() => handleSend(s.query)}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContainer,
          messages.length <= 1 && { paddingTop: 10 }
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Typing Indicator */}
      {loading && (
        <View style={styles.typingContainer}>
          <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
            <Ionicons name="sparkles" size={16} color={theme.accent} />
          </View>
          <View style={[styles.bubble, styles.typingBubble, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}>
            <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 4 }} />
            <Text style={[styles.typingText, { color: theme.textSub }]}>AI is ordering / checking menu...</Text>
          </View>
        </View>
      )}

      {/* Input area */}
      <View style={[styles.inputContainer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TextInput
          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Ask AI to search food or manage cart..."
          placeholderTextColor={theme.textMuted}
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: message.trim() ? theme.accent : theme.inputBg }
          ]}
          onPress={() => handleSend()}
          disabled={!message.trim() || loading}
        >
          <Ionicons
            name="send"
            size={18}
            color={message.trim() ? '#FFF' : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 6,
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  onlineBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C58E',
  },
  headerSub: {
    fontSize: 11,
    marginTop: 1,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userContainer: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  botContainer: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 4,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  timeText: {
    fontSize: 9,
    marginTop: 6,
    textAlign: 'right',
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
  },
  typingText: {
    fontSize: 12,
    marginLeft: 6,
  },
  suggestionBox: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  suggestionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

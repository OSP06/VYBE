import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { fonts, radius } from '../constants/theme';

export default function Register({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(null);

  const handleRegister = async () => {
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setError('');
    setLoading(true);
    try {
      await register(email.trim(), password, displayName.trim() || null);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not create account');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (name) => [
    styles.input,
    focused === name && { borderColor: colors.sage },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.eyebrow}>MOOD-FIRST DISCOVERY</Text>
          <Text style={styles.title}>JOIN{'\n'}VYBE</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>YOUR NAME (OPTIONAL)</Text>
              <TextInput
                style={inputStyle('name')}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="e.g. Sana Rawat"
                placeholderTextColor={colors.txt3}
                autoCapitalize="words"
                autoComplete="name"
                onFocus={() => setFocused('name')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={inputStyle('email')}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.txt3}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={inputStyle('password')}
                value={password}
                onChangeText={setPassword}
                placeholder="min. 6 characters"
                placeholderTextColor={colors.txt3}
                secureTextEntry
                autoComplete="new-password"
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
            </View>

            {!!error && <Text style={styles.error}>{error}</Text>}

            <Pressable style={styles.btn} onPress={handleRegister} disabled={loading}>
              {loading
                ? <ActivityIndicator color={colors.bg} />
                : <Text style={styles.btnTxt}>START VYBING</Text>}
            </Pressable>

            <Pressable style={styles.link} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkTxt}>
                ALREADY A VYBER?{'  '}
                <Text style={styles.linkAcc}>SIGN IN</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    inner: { flexGrow: 1, paddingHorizontal: 24, justifyContent: 'center', paddingBottom: 48, paddingTop: 24 },
    eyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: 3, color: colors.sage, marginBottom: 10 },
    title: { fontFamily: fonts.display, fontSize: 54, color: colors.txt, letterSpacing: 1, lineHeight: 50, marginBottom: 44 },
    form: { gap: 14 },
    field: { gap: 5 },
    label: { fontSize: 9, fontWeight: '700', letterSpacing: 2, color: colors.txt3 },
    input: {
      borderWidth: 1, borderColor: colors.border2, borderRadius: radius.card,
      paddingHorizontal: 14, paddingVertical: 13,
      fontFamily: fonts.body, fontSize: 14, color: colors.txt,
      backgroundColor: colors.glass,
    },
    error: { fontSize: 11, color: '#C0392B', fontWeight: '600', letterSpacing: 0.3 },
    btn: {
      backgroundColor: colors.sage, borderRadius: radius.card,
      paddingVertical: 15, alignItems: 'center', marginTop: 4,
    },
    btnTxt: { fontFamily: fonts.display, fontSize: 18, color: '#fff', letterSpacing: 2 },
    link: { alignItems: 'center', paddingTop: 6 },
    linkTxt: { fontSize: 10, color: colors.txt3, letterSpacing: 1 },
    linkAcc: { color: colors.sage, fontWeight: '700' },
  });
}

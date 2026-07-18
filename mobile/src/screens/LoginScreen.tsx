import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { authApi, tokenStore } from "../services/api";

interface Props {
  navigation: any;
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState("operator@demo.com");
  const [password, setPassword] = useState("Operator123!");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Hata", "Email ve şifre gerekli");
      return;
    }
    setLoading(true);
    try {
      const { data } = await authApi.login(email, password);
      await tokenStore.set(data.access_token, data.refresh_token);
      onLogin();
    } catch (e: any) {
      Alert.alert("Giriş Başarısız",
        e?.response?.data?.detail ?? "Email veya şifre hatalı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>QC</Text>
          </View>
          <Text style={styles.title}>QC Platform</Text>
          <Text style={styles.subtitle}>Endüstriyel Kalite Kontrol</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#4b5563"
            placeholder="operator@fabrika.com"
          />

          <Text style={styles.label}>Şifre</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#4b5563"
            placeholder="••••••••"
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#030712", justifyContent: "center", padding: 24 },
  card: { backgroundColor: "#111827", borderRadius: 20, padding: 28,
          borderWidth: 1, borderColor: "#1f2937" },
  logoContainer: { alignItems: "center", marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 14, backgroundColor: "#2563eb",
          alignItems: "center", justifyContent: "center", marginBottom: 12 },
  logoText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  title: { color: "#f9fafb", fontSize: 20, fontWeight: "700" },
  subtitle: { color: "#6b7280", fontSize: 13, marginTop: 4 },
  form: { gap: 4 },
  label: { color: "#9ca3af", fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#1f2937", borderRadius: 10, paddingHorizontal: 14,
           paddingVertical: 12, color: "#f9fafb", fontSize: 15,
           borderWidth: 1, borderColor: "#374151" },
  button: { backgroundColor: "#2563eb", borderRadius: 10, paddingVertical: 14,
            alignItems: "center", marginTop: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

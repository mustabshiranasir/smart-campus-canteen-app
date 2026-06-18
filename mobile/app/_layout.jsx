// mobile/app/_layout.jsx
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { CartProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

function AuthGuard({ children }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (authLoading) return;

    const inAuthGroup    = segments[0] === '(auth)';
    const inAdminGroup   = segments[0] === '(admin)' || segments[0] === 'admin';
    const inStudentGroup = segments[0] === '(student)';
    const isRoot = segments.length === 0 || segments[0] === '' || segments.join('/') === '';

    if (!user) {
      if (!inAuthGroup && !isRoot) router.replace('/');
    } else {
      if (inAuthGroup || isRoot) {
        if (user.role === 'admin') router.replace('/(admin)/dashboard');
        else router.replace('/(student)/');
      }
      if (user.role === 'admin' && inStudentGroup) router.replace('/(admin)/dashboard');
      if (user.role !== 'admin' && inAdminGroup) router.replace('/(student)/');
    }
  }, [user, authLoading, segments, router]);

  if (authLoading) return null;
  return children;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <CartProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGuard>
      </CartProvider>
    </ThemeProvider>
  );
}
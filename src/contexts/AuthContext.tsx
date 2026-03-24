import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'user' | 'admin' | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  loading: true,
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.status === 'banned') {
              await signOut(auth);
              setCurrentUser(null);
              setUserRole(null);
              setLoading(false);
              return;
            }
            const docRole = data.role;
            if (user.email === 'samadeniji852@gmail.com' && user.emailVerified && docRole !== 'admin') {
              try {
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
                setUserRole('admin');
              } catch (e) {
                setUserRole(docRole as 'user' | 'admin');
              }
            } else {
              setUserRole(docRole as 'user' | 'admin');
            }
          } else {
            // Create user document if it doesn't exist
            const role = (user.email === 'samadeniji852@gmail.com' && user.emailVerified) ? 'admin' : 'user';
            await setDoc(userDocRef, {
              uid: user.uid,
              email: user.email,
              role: role,
              status: 'active',
              createdAt: serverTimestamp(),
            });
            setUserRole(role);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const value = {
    currentUser,
    userRole,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

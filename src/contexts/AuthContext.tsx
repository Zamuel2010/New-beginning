import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'user' | 'admin' | null;
  userData: any | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  userData: null,
  loading: true,
  logout: async () => {},
  refreshUserData: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'user' | 'admin' | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (user: User) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setUserData(data);
        if (data.status === 'banned') {
          await signOut(auth);
          setCurrentUser(null);
          setUserRole(null);
          setUserData(null);
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
        const initialData = {
          uid: user.uid,
          email: user.email,
          role: role,
          status: 'active',
          createdAt: serverTimestamp(),
          displayName: user.displayName || '',
          walletAddress: '',
        };
        await setDoc(userDocRef, initialData);
        setUserData(initialData);
        setUserRole(role);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      try {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } catch (e) {
        // Ignore the thrown error from handleFirestoreError so we can continue
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserData(user);
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => signOut(auth);

  const refreshUserData = async () => {
    if (currentUser) {
      await fetchUserData(currentUser);
    }
  };

  const value = {
    currentUser,
    userRole,
    userData,
    loading,
    logout,
    refreshUserData,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center bg-[#06080F]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

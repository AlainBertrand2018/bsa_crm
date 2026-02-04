
import * as firestore from "firebase/firestore";
import { db } from "./firebase";
import { User, Quotation, Invoice, ClientDetails, BusinessDetails, OnboardingProduct } from "./types";

// Helper to remove undefined values from objects (Firestore doesn't allow them)
const cleanData = (data: any) => {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
        if (cleaned[key] === undefined) {
            delete cleaned[key];
        }
    });
    return cleaned;
};

// Generic CRUD helpers
export const addDocument = async (collectionName: string, data: any) => {
    const cleanedData = cleanData(data);
    return await firestore.addDoc(firestore.collection(db, collectionName), {
        ...cleanedData,
        createdAt: firestore.serverTimestamp(),
    });
};

export const getDocument = async (collectionName: string, id: string) => {
    const docRef = firestore.doc(db, collectionName, id);
    const docSnap = await firestore.getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

export const getDocuments = async (collectionName: string, constraints: firestore.QueryConstraint[] = []) => {
    try {
        const q = firestore.query(firestore.collection(db, collectionName), ...constraints);
        const querySnapshot = await firestore.getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id  // Ensure Firestore document ID is always used, even if data has its own id field
        }));
        console.log(`[Firestore] Fetched ${data.length} documents from ${collectionName}`);
        return data;
    } catch (error) {
        console.error(`[Firestore] Error fetching from ${collectionName}:`, error);
        throw error;
    }
};

export const updateDocument = async (collectionName: string, id: string, data: any) => {
    const docRef = firestore.doc(db, collectionName, id);
    const cleanedData = cleanData(data);
    await firestore.updateDoc(docRef, {
        ...cleanedData,
        updatedAt: firestore.serverTimestamp(),
    });
};

export const setDocument = async (collectionName: string, id: string, data: any, options: firestore.SetOptions = {}) => {
    const docRef = firestore.doc(db, collectionName, id);
    const cleanedData = cleanData(data);
    await firestore.setDoc(docRef, {
        ...cleanedData,
        createdAt: firestore.serverTimestamp(),
    }, options);
};

export const deleteDocument = async (collectionName: string, id: string) => {
    const docRef = firestore.doc(db, collectionName, id);
    await firestore.deleteDoc(docRef);
};

// Collection-specific functions
export const quotationsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'User' && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (role === 'Admin' && !companyId && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("quotations", constraints);
    },
    getById: (id: string) => getDocument("quotations", id),
    create: (data: Omit<Quotation, "id">) => addDocument("quotations", data),
    update: (id: string, data: Partial<Quotation>) => updateDocument("quotations", id, data),
    delete: (id: string) => deleteDocument("quotations", id),
};

export const invoicesService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'User' && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (role === 'Admin' && !companyId && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("invoices", constraints);
    },
    getById: (id: string) => getDocument("invoices", id),
    create: (data: Omit<Invoice, "id">) => addDocument("invoices", data),
    update: (id: string, data: Partial<Invoice>) => updateDocument("invoices", id, data),
    delete: (id: string) => deleteDocument("invoices", id),
};

export const clientsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'User' && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (role === 'Admin' && !companyId && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("clients", constraints);
    },
    getById: (id: string) => getDocument("clients", id),
    create: (data: ClientDetails) => addDocument("clients", data),
    update: (id: string, data: Partial<ClientDetails>) => updateDocument("clients", id, data),
    delete: (id: string) => deleteDocument("clients", id),
};

export const onboardingService = {
    completeOnboarding: async (userId: string, businessData: BusinessDetails, products: OnboardingProduct[]) => {
        console.log("Completing onboarding for user:", userId);

        // 1. Create business profile
        await setDocument("businesses", userId, {
            ...businessData,
            userId,
        });

        // 2. Create products
        for (const product of products) {
            await addDocument("user_products", {
                ...product,
                userId,
            });
        }

        // 3. Mark user as onboarding completed and save business details
        await firestore.setDoc(firestore.doc(db, "users", userId), {
            onboardingCompleted: true,
            onboarding: 'True', // Explicit string flag as requested
            businessName: businessData.businessName,
            businessDetails: cleanData(businessData),
            products: products.map(p => cleanData(p)),
            updatedAt: firestore.serverTimestamp()
        }, { merge: true });
    }
};

export const usersService = {
    getAll: (companyId?: string, role?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        }
        return getDocuments("users", constraints);
    },
    getById: (id: string) => getDocument("users", id),
    getBusinessDetails: (userId: string) => getDocument("businesses", userId),
    getProducts: (userId: string) => getDocuments("user_products", [firestore.where("userId", "==", userId)]),
    update: (id: string, data: Partial<User>) => updateDocument("users", id, data),
    updateBusinessDetails: (userId: string, data: BusinessDetails) => setDocument("businesses", userId, data, { merge: true }),
    delete: (id: string) => deleteDocument("users", id),
};

export const productsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];

        // Always filter by userId if provided - each user sees their own products
        if (userId) {
            constraints.push(firestore.where("userId", "==", userId));
        } else if (companyId) {
            // Fallback to companyId for company-wide product queries
            constraints.push(firestore.where("companyId", "==", companyId));
        } else {
            console.warn("[Firestore] Products fetch without userId or companyId - returning empty");
            return Promise.resolve([]);
        }

        return getDocuments("user_products", constraints);
    },
    create: (data: any) => addDocument("user_products", data),
    update: (id: string, data: any) => updateDocument("user_products", id, data),
    delete: (id: string) => deleteDocument("user_products", id),
};

export const receiptsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'User' && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (role === 'Admin' && !companyId && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'User' && !userId) {
            // Fallback for safety
            console.warn("[Firestore] Receipts fetch by User without ID");
            return Promise.resolve([]);
        }
        return getDocuments("receipts", constraints);
    },
    create: (data: any) => addDocument("receipts", data),
    update: (id: string, data: any) => updateDocument("receipts", id, data),
    delete: (id: string) => deleteDocument("receipts", id),
};

export const statementsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'User' && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (role === 'Admin' && !companyId && userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        } else if (role === 'User' && !userId) {
            console.warn("[Firestore] Statements fetch by User without ID");
            return Promise.resolve([]);
        }
        return getDocuments("statements", constraints);
    },
    create: (data: any) => addDocument("statements", data),
    update: (id: string, data: any) => updateDocument("statements", id, data),
    delete: (id: string) => deleteDocument("statements", id),
};

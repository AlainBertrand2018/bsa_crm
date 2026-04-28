
import * as firestore from "firebase/firestore";
import { db } from "./firebase";
import { User, Quotation, Invoice, ClientDetails, BusinessDetails, OnboardingProduct } from "./types";

const cleanData = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    return Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
    );
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

export const getDocuments = async (collectionName: string, constraints: firestore.QueryConstraint[] = [], limitCount?: number) => {
    try {
        const queryConstraints = [...constraints];
        if (limitCount) {
            queryConstraints.push(firestore.limit(limitCount));
        }
        const q = firestore.query(firestore.collection(db, collectionName), ...queryConstraints);
        const querySnapshot = await firestore.getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        }));
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
        if (role === 'Super Admin') {
            // No constraints for Super Admin
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            // Regular User or Admin without companyId sees only their own
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("quotations", constraints);
    },
    getById: (id: string) => getDocument("quotations", id),
    create: (data: Omit<Quotation, "id">) => addDocument("quotations", data),
    update: (id: string, data: Partial<Quotation>) => updateDocument("quotations", id, data),
    delete: async (id: string) => {
        // 1. Delete associated invoices (which will delete their receipts)
        const invoices = await getDocuments("invoices", [firestore.where("quotationId", "==", id)]);
        for (const inv of invoices) {
            await invoicesService.delete(inv.id);
        }
        // 2. Delete the quotation
        return await deleteDocument("quotations", id);
    },
};

export const invoicesService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'Super Admin') {
            // No constraints
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("invoices", constraints);
    },
    getById: (id: string) => getDocument("invoices", id),
    create: (data: Omit<Invoice, "id">) => addDocument("invoices", data),
    update: (id: string, data: Partial<Invoice>) => updateDocument("invoices", id, data),
    delete: async (id: string) => {
        // 1. Delete associated receipts
        const receipts = await getDocuments("receipts", [firestore.where("invoiceId", "==", id)]);
        for (const r of receipts) {
            await deleteDocument("receipts", r.id);
        }
        // 2. Delete the invoice
        return await deleteDocument("invoices", id);
    },
};

export const clientsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'Super Admin') {
            // No constraints
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("clients", constraints);
    },
    getById: (id: string) => getDocument("clients", id),
    create: (data: ClientDetails) => addDocument("clients", data),
    update: (id: string, data: Partial<ClientDetails>) => updateDocument("clients", id, data),
    delete: async (id: string) => {
        // 1. Delete associated quotations (which will delete invoices and receipts)
        const quotations = await getDocuments("quotations", [firestore.where("clientId", "==", id)]);
        for (const q of quotations) {
            await quotationsService.delete(q.id);
        }

        // 2. Delete associated invoices that might not be linked to quotations
        const invoices = await getDocuments("invoices", [firestore.where("clientId", "==", id)]);
        for (const inv of invoices) {
            await invoicesService.delete(inv.id);
        }

        // 3. Delete associated receipts (just in case any are orphan or directly linked)
        const receipts = await getDocuments("receipts", [firestore.where("clientId", "==", id)]);
        for (const r of receipts) {
            await deleteDocument("receipts", r.id);
        }

        // 4. Delete associated statements
        const statements = await getDocuments("statements", [firestore.where("clientId", "==", id)]);
        for (const s of statements) {
            await deleteDocument("statements", s.id);
        }

        // 5. Delete the client
        return await deleteDocument("clients", id);
    },
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
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];
        if (role === 'Super Admin') {
            // Sees all
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            // Regular users see only themselves
            constraints.push(firestore.where("id", "==", userId));
        }
        return getDocuments("users", constraints);
    },
    getById: (id: string) => getDocument("users", id),
    getBusinessDetails: (userId: string) => getDocument("businesses", userId),
    getAllBusinesses: () => getDocuments("businesses"),
    getProducts: (userId: string) => {
        if (!userId) return Promise.resolve([]);
        return getDocuments("user_products", [firestore.where("userId", "==", userId)]);
    },
    update: (id: string, data: Partial<User>) => updateDocument("users", id, data),
    updateBusinessDetails: (userId: string, data: BusinessDetails) => setDocument("businesses", userId, data, { merge: true }),
    delete: (id: string) => deleteDocument("users", id),
};

export const productsService = {
    getAll: (userId?: string, role?: string, companyId?: string) => {
        const constraints: firestore.QueryConstraint[] = [];

        if (role === 'Super Admin') {
            // No constraints
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            constraints.push(firestore.where("userId", "==", userId));
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
        if (role === 'Super Admin') {
            // No constraints
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
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
        if (role === 'Super Admin') {
            // No constraints
        } else if (role === 'Admin' && companyId) {
            constraints.push(firestore.where("companyId", "==", companyId));
        } else if (userId) {
            constraints.push(firestore.where("createdBy", "==", userId));
        }
        return getDocuments("statements", constraints);
    },
    create: (data: any) => addDocument("statements", data),
    update: (id: string, data: any) => updateDocument("statements", id, data),
    delete: (id: string) => deleteDocument("statements", id),
};

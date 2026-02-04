
import { db } from "../lib/firebase";
import { collection, addDoc, serverTimestamp, setDoc, doc } from "firebase/firestore";
import { USERS } from "../lib/constants";

const PRODUCT_TYPES = [
    { id: "sme_skybridge", name: "SME Skybridge", available: 60, minArea: "9m²", unitPrice: 15000, currency: "MUR" },
    { id: "souk_zone", name: "Souk Zone", available: 14, minArea: "9m²", unitPrice: 45000, currency: "MUR" },
    { id: "regional_pavilions", name: "Regional Pavilions", available: 6, minArea: "<200m² - 15 Products Max", unitPrice: 1200000, currency: "MUR" },
    { id: "main_expo", name: "Main Expo", available: 30, minArea: "9m²", unitPrice: 90000, currency: "MUR" },
    { id: "foodcourt_stations", name: "Foodcourt Cooking Stations", available: 12, minArea: "9m²", unitPrice: 20000, currency: "MUR", remarks: "Revenue sharing 70/30" },
    { id: "gastronomic_pavilions", name: "Gastronomic Pavilions", available: 3, minArea: "<300m²", unitPrice: 1400000, currency: "MUR" },
];

const clients = [
    {
        clientName: "Global Tech Solutions",
        clientCompany: "GTS Ltd",
        clientEmail: "contact@gts.mu",
        clientPhone: "+230 5123 4567",
        clientAddress: "Ebène Cybercity, Mauritius",
        clientBRN: "C123456789",
        createdBy: "user-1",
    },
    {
        clientName: "Oceanic Enterprises",
        clientCompany: "Oceanic Ltd",
        clientEmail: "info@oceanic.mu",
        clientPhone: "+230 5987 6543",
        clientAddress: "Port Louis, Mauritius",
        clientBRN: "C987654321",
        createdBy: "user-1",
    },
];

const seedFirestore = async () => {
    console.log("Starting Firestore seeding...");

    try {
        // 1. Seed Products (using specific IDs from constants)
        console.log("Seeding products...");
        for (const product of PRODUCT_TYPES) {
            await setDoc(doc(db, "products", product.id), {
                ...product,
                createdAt: serverTimestamp(),
            });
        }
        console.log("Products seeded.");

        // 2. Seed Users (using specific IDs from constants)
        console.log("Seeding users...");
        for (const user of USERS) {
            const { password, ...userData } = user; // Don't store plain passwords if possible, or handle as needed
            await setDoc(doc(db, "users", user.id), {
                ...userData,
                password: password, // For mock purposes we keeping it
                createdAt: serverTimestamp(),
            });
        }
        console.log("Users seeded.");

        // 3. Seed Clients
        console.log("Seeding clients...");
        const clientRefs = [];
        for (const client of clients) {
            const docRef = await addDoc(collection(db, "clients"), {
                ...client,
                createdAt: serverTimestamp(),
            });
            clientRefs.push({ id: docRef.id, ...client });
        }
        console.log("Clients seeded.");

        // 4. Seed Quotations (sample for first client)
        console.log("Seeding quotations...");
        const sampleQuotation = {
            clientName: clientRefs[0].clientName,
            clientCompany: clientRefs[0].clientCompany,
            clientEmail: clientRefs[0].clientEmail,
            clientPhone: clientRefs[0].clientPhone,
            clientAddress: clientRefs[0].clientAddress,
            clientBRN: clientRefs[0].clientBRN,
            clientId: clientRefs[0].id,
            quotationDate: new Date().toISOString(),
            expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            items: [
                {
                    id: "item-1",
                    productTypeId: "main_expo",
                    description: "Main Expo Stand",
                    quantity: 1,
                    unitPrice: 90000,
                    total: 90000,
                }
            ],
            subTotal: 90000,
            discount: 0,
            vatAmount: 13500,
            grandTotal: 103500,
            status: "Sent",
            currency: "MUR",
            createdBy: "user-1",
            createdAt: serverTimestamp(),
        };
        const qDocRef = await addDoc(collection(db, "quotations"), sampleQuotation);
        console.log("Quotations seeded.");

        // 5. Seed Invoices (sample from the quotation)
        console.log("Seeding invoices...");
        const sampleInvoice = {
            ...sampleQuotation,
            id: "INV-2026-001",
            quotationId: qDocRef.id,
            invoiceDate: new Date().toISOString(),
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: "Sent",
            totalPaid: 0,
            createdAt: serverTimestamp(),
        };
        // Note: In reality ID might be generated or auto-assigned. 
        // Here we use addDoc but could use setDoc if we want specific custom IDs
        await addDoc(collection(db, "invoices"), sampleInvoice);
        console.log("Invoices seeded.");

        console.log("Firestore seeding completed successfully!");
    } catch (error) {
        console.error("Error seeding Firestore:", error);
    }
};

seedFirestore();

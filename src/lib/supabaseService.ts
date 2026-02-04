import { where } from 'firebase/firestore';
import {
    quotationsService,
    invoicesService,
    clientsService,
    productsService,
    usersService,
    receiptsService,
    statementsService,
    addDocument,
    getDocument,
    getDocuments,
    updateDocument,
    deleteDocument
} from './firestore';
import { Quotation, Invoice, ClientDetails, BusinessDetails, OnboardingProduct } from './types';

/**
 * SHIM SERVICE
 * This service replicates the Supabase service interface but uses Firestore under the hood.
 * This allows us to "disable" Supabase without rewriting every component.
 */
export const supabaseService = {
    // Profiles
    profiles: {
        get: async (userId: string) => {
            console.log(`[Shim] profiles.get(${userId})`);

            // 1. Try businesses collection first
            let business: any = await usersService.getBusinessDetails(userId);

            // 2. Fallback: Try user document
            if (!business) {
                const userDoc: any = await usersService.getById(userId);
                if (userDoc?.businessDetails) {
                    business = userDoc.businessDetails;
                }
            }

            if (!business) return null;

            // Map BusinessDetails to Profile format
            return {
                id: userId,
                business_name: business.businessName || business.name,
                business_address: business.businessAddress || business.address,
                brn: business.brn,
                vat_no: business.vatNo || business.vat,
                telephone: business.telephone || business.tel,
                website: business.website || business.url,
                email: business.email,
                role: business.position,
                onboarding_completed: true
            };
        },
        update: async (userId: string, updates: any) => {
            console.log(`[Shim] profiles.update(${userId})`, updates);
            // Map Supabase updates back to Firestore format if needed
            const firestoreUpdates: any = {};
            if (updates.business_name) firestoreUpdates.businessName = updates.business_name;
            if (updates.business_address) firestoreUpdates.businessAddress = updates.business_address;
            if (updates.brn) firestoreUpdates.brn = updates.brn;
            if (updates.vat_no) firestoreUpdates.vatNo = updates.vat_no;
            if (updates.telephone) firestoreUpdates.telephone = updates.telephone;
            if (updates.website) firestoreUpdates.website = updates.website;

            await updateDocument('businesses', userId, firestoreUpdates);
            return { success: true };
        }
    },

    // Clients
    clients: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            console.log(`[Shim] clients.getAll()`);
            const data = await clientsService.getAll(userId, role, companyId);
            return data.map((c: any) => ({
                ...c,
                client_name: c.clientName,
                client_email: c.clientEmail,
                client_company: c.clientCompany,
                client_phone: c.clientPhone,
                client_address: c.clientAddress,
                client_brn: c.clientBRN
            }));
        },
        create: async (client: any) => {
            console.log(`[Shim] clients.create()`, client);
            // Map Supabase insert format to Firestore
            const firestoreClient = {
                clientName: client.client_name || client.clientName,
                clientEmail: client.client_email || client.clientEmail,
                clientCompany: client.client_company || client.clientCompany,
                clientPhone: client.client_phone || client.clientPhone,
                clientAddress: client.client_address || client.clientAddress,
                clientBRN: client.client_brn || client.clientBRN,
                createdBy: client.userId || client.user_id || client.createdBy,
                companyId: client.companyId || client.company_id
            };
            const docRef = await clientsService.create(firestoreClient as any);
            return { id: docRef.id, ...firestoreClient };
        },
        getById: async (id: string) => {
            console.log(`[Shim] clients.getById(${id})`);
            const c: any = await clientsService.getById(id);
            if (!c) return null;
            return {
                ...c,
                client_name: c.clientName,
                client_email: c.clientEmail,
                client_company: c.clientCompany,
                client_phone: c.clientPhone,
                client_address: c.clientAddress,
                client_brn: c.clientBRN
            };
        },
        update: async (id: string, updates: any) => {
            console.log(`[Shim] clients.update(${id})`, updates);
            const firestoreUpdates: any = { ...updates };
            if (updates.client_name) firestoreUpdates.clientName = updates.client_name;
            if (updates.client_email) firestoreUpdates.clientEmail = updates.client_email;
            if (updates.client_company) firestoreUpdates.clientCompany = updates.client_company;

            await clientsService.update(id, firestoreUpdates);
            return { id, ...firestoreUpdates };
        },
        delete: async (id: string) => {
            console.log(`[Shim] clients.delete(${id})`);
            await clientsService.delete(id);
        }
    },

    // Products
    products: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            console.log(`[Shim] products.getAll(userId=${userId}, role=${role}, companyId=${companyId})`);
            const data = await productsService.getAll(userId, role, companyId);
            return data;
        },
        create: async (product: any) => {
            console.log(`[Shim] products.create()`, product);
            const firestoreProduct = {
                ...product,
                unitPrice: product.unit_price || product.unitPrice,
                bulkPrice: product.bulk_price || product.bulkPrice,
                minOrder: product.min_order || product.minOrder,
                userId: product.userId || product.user_id || product.createdBy,
                companyId: product.companyId || product.company_id
            };
            const docRef = await productsService.create(firestoreProduct);
            return { id: docRef.id, ...firestoreProduct };
        },
        getById: async (id: string) => {
            const data = await getDocument('user_products', id);
            return data;
        },
        update: async (id: string, updates: any) => {
            await productsService.update(id, updates);
            return { id, ...updates };
        },
        delete: async (id: string) => {
            await productsService.delete(id);
        }
    },

    // Quotations
    quotations: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            console.log(`[Shim] quotations.getAll(userId=${userId}, role=${role}, companyId=${companyId})`);
            const data = await quotationsService.getAll(userId, role, companyId);
            return data.map((q: any) => ({
                ...q,
                user_id: q.createdBy,
                client_id: q.clientId,
                quotation_date: q.quotationDate,
                expiry_date: q.expiryDate,
                sub_total: q.subTotal,
                vat_amount: q.vatAmount,
                grand_total: q.grandTotal
            }));
        },
        create: async (quotation: any) => {
            console.log(`[Shim] quotations.create()`, quotation);
            const firestoreQuotation = {
                ...quotation,
                quotationDate: quotation.quotation_date || quotation.quotationDate,
                expiryDate: quotation.expiry_date || quotation.expiryDate,
                subTotal: quotation.sub_total || quotation.subTotal,
                vatAmount: quotation.vat_amount || quotation.vatAmount,
                grandTotal: quotation.grand_total || quotation.grandTotal,
                clientId: quotation.client_id || quotation.clientId,
                createdBy: quotation.user_id || quotation.createdBy
            };
            const docRef = await quotationsService.create(firestoreQuotation as any);

            if (firestoreQuotation.status === 'Won') {
                // Auto-generate invoice
                const fullQuotation = { id: docRef.id, ...firestoreQuotation };
                await (supabaseService.quotations as any)._autoGenerateInvoice(docRef.id, fullQuotation);
            }

            return { id: docRef.id, ...firestoreQuotation };
        },
        getById: async (id: string) => {
            console.log(`[Shim] quotations.getById(${id})`);
            const q: any = await quotationsService.getById(id);
            if (!q) return null;

            // Fetch client details as well for the 'clients(*)' join simulator
            let clientData = null;
            if (q.clientId) {
                const c: any = await clientsService.getById(q.clientId);
                if (c) {
                    clientData = {
                        client_name: c.clientName,
                        client_email: c.clientEmail,
                        client_company: c.clientCompany,
                        client_phone: c.clientPhone,
                        client_address: c.clientAddress,
                        client_brn: c.clientBRN
                    };
                }
            }

            return {
                ...q,
                user_id: q.createdBy,
                client_id: q.clientId,
                quotation_date: q.quotationDate,
                expiry_date: q.expiryDate,
                sub_total: q.subTotal,
                vat_amount: q.vatAmount,
                grand_total: q.grandTotal,
                clients: clientData
            };
        },
        update: async (id: string, updates: any) => {
            console.log(`[Shim] quotations.update(${id})`, updates);
            await quotationsService.update(id, updates);

            if (updates.status === 'Won') {
                // Auto-generate invoice. We need full quotation data
                const fullQuotation = await supabaseService.quotations.getById(id);
                if (fullQuotation) {
                    await (supabaseService.quotations as any)._autoGenerateInvoice(id, fullQuotation);
                }
            }

            return { id, ...updates };
        },
        _autoGenerateInvoice: async (quotationId: string, q: any) => {
            try {
                // 1. Check if invoice already exists for this quotation
                const existing = await getDocuments("invoices", [
                    where("quotationId", "==", quotationId)
                ]);

                if (existing.length > 0) {
                    console.log(`[Shim] Invoice already exists for quotation ${quotationId}, skipping auto-generation.`);
                    return;
                }

                console.log(`[Shim] Auto-generating invoice for quotation ${quotationId}`);

                // 2. Map quotation to invoice
                const isNaoNA = (val: any) => !val || val === 'N/A' || val === 'undefined';

                const clientName = !isNaoNA(q.clientName) ? q.clientName : (!isNaoNA(q.client_name) ? q.client_name : q.clients?.client_name);
                const clientEmail = !isNaoNA(q.clientEmail) ? q.clientEmail : (!isNaoNA(q.client_email) ? q.client_email : q.clients?.client_email);
                const clientCompany = !isNaoNA(q.clientCompany) ? q.clientCompany : (!isNaoNA(q.client_company) ? q.client_company : q.clients?.client_company);
                const clientPhone = !isNaoNA(q.clientPhone) ? q.clientPhone : (!isNaoNA(q.client_phone) ? q.client_phone : (q.clients?.client_phone || ''));
                const clientAddress = !isNaoNA(q.clientAddress) ? q.clientAddress : (!isNaoNA(q.client_address) ? q.client_address : (q.clients?.client_address || ''));
                const clientBRN = !isNaoNA(q.clientBRN) ? q.clientBRN : (!isNaoNA(q.client_brn) ? q.client_brn : (q.clients?.client_brn || ''));

                const invoiceData = {
                    clientId: q.clientId || q.client_id || '',
                    quotationId: q.id || quotationId,
                    clientName,
                    clientCompany,
                    clientEmail,
                    clientPhone,
                    clientAddress,
                    clientBRN,
                    items: q.items || [],
                    subTotal: q.subTotal || q.sub_total || 0,
                    discount: q.discount || 0,
                    vatAmount: q.vatAmount || q.vat_amount || 0,
                    grandTotal: q.grandTotal || q.grand_total || 0,
                    currency: q.currency || 'MUR',
                    notes: `Generated from Quotation ${q.id || quotationId}`,
                    status: 'To Send',
                    totalPaid: 0,
                    invoiceDate: new Date().toISOString(),
                    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    createdBy: q.createdBy || q.user_id,
                    companyId: q.companyId || q.company_id,
                };

                await supabaseService.invoices.create(invoiceData);
                console.log(`[Shim] Successfully auto-generated invoice for quotation ${quotationId}`);
            } catch (error) {
                console.error(`[Shim] Error in _autoGenerateInvoice:`, error);
            }
        },
        delete: async (id: string) => {
            await quotationsService.delete(id);
        }
    },

    // Invoices
    invoices: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            const data = await invoicesService.getAll(userId, role, companyId);
            return data.map((i: any) => ({
                ...i,
                user_id: i.createdBy,
                client_id: i.clientId,
                invoice_date: i.invoiceDate,
                due_date: i.dueDate,
                sub_total: i.subTotal,
                vat_amount: i.vatAmount,
                grand_total: i.grandTotal,
                total_paid: i.totalPaid || 0
            }));
        },
        create: async (invoice: any) => {
            const firestoreInvoice = {
                ...invoice,
                invoiceDate: invoice.invoice_date || invoice.invoiceDate,
                dueDate: invoice.due_date || invoice.dueDate,
                subTotal: invoice.sub_total || invoice.subTotal,
                vatAmount: invoice.vat_amount || invoice.vatAmount,
                grandTotal: invoice.grand_total || invoice.grandTotal,
                clientId: invoice.client_id || invoice.clientId,
                createdBy: invoice.userId || invoice.user_id || invoice.createdBy,
                companyId: invoice.companyId || invoice.company_id
            };
            const docRef = await invoicesService.create(firestoreInvoice);
            return { id: docRef.id, ...firestoreInvoice };
        },
        update: async (id: string, updates: any) => {
            await invoicesService.update(id, updates);
            return { id, ...updates };
        },
        getById: async (id: string) => {
            const i: any = await invoicesService.getById(id);
            if (!i) return null;

            // Fetch client details as well for the 'clients(*)' join simulator
            let clientData = null;
            const clientId = i.clientId || i.client_id;
            if (clientId) {
                const c: any = await clientsService.getById(clientId);
                if (c) {
                    clientData = {
                        client_name: c.clientName,
                        client_email: c.clientEmail,
                        client_company: c.clientCompany,
                        client_phone: c.clientPhone,
                        client_address: c.clientAddress,
                        client_brn: c.clientBRN
                    };
                }
            }

            return {
                ...i,
                user_id: i.createdBy,
                client_id: i.clientId,
                invoice_date: i.invoiceDate,
                due_date: i.dueDate,
                sub_total: i.subTotal,
                vat_amount: i.vatAmount,
                grand_total: i.grandTotal,
                total_paid: i.totalPaid || 0,
                clients: clientData
            };
        },
        delete: async (id: string) => {
            await invoicesService.delete(id);
        }
    },

    // Receipts
    receipts: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            const data = await receiptsService.getAll(userId, role, companyId);
            return data.map((r: any) => ({
                ...r,
                user_id: r.createdBy,
                invoice_id: r.invoiceId,
                client_name: r.clientName,
                client_company: r.clientCompany,
                client_email: r.clientEmail,
                client_phone: r.clientPhone,
                client_address: r.clientAddress,
                client_brn: r.clientBRN,
                payment_method: r.paymentMethod,
            }));
        },
        create: async (receipt: any) => {
            const firestoreReceipt = {
                ...receipt,
                invoiceId: receipt.invoice_id || receipt.invoiceId,
                clientName: receipt.client_name || receipt.clientName,
                clientCompany: receipt.client_company || receipt.clientCompany,
                clientEmail: receipt.client_email || receipt.clientEmail,
                clientPhone: receipt.client_phone || receipt.clientPhone,
                clientAddress: receipt.client_address || receipt.clientAddress,
                clientBRN: receipt.client_brn || receipt.clientBRN,
                paymentMethod: receipt.payment_method || receipt.paymentMethod,
                createdBy: receipt.userId || receipt.user_id || receipt.createdBy,
                companyId: receipt.companyId || receipt.company_id
            };
            const docRef = await receiptsService.create(firestoreReceipt);

            // Update the corresponding invoice
            const invoiceId = receipt.invoice_id || receipt.invoiceId;
            if (invoiceId) {
                try {
                    const invoice: any = await invoicesService.getById(invoiceId);
                    if (invoice) {
                        const newTotalPaid = (invoice.totalPaid || 0) + receipt.amount;
                        const newStatus = newTotalPaid >= invoice.grandTotal ? 'Fully Paid' : 'Partly Paid';

                        await invoicesService.update(invoiceId, {
                            totalPaid: newTotalPaid,
                            status: newStatus as any
                        });
                        console.log(`[SupabaseShim] Updated invoice ${invoiceId}: totalPaid=${newTotalPaid}, status=${newStatus}`);
                    }
                } catch (e) {
                    console.error(`[SupabaseShim] Error updating invoice ${invoiceId} after receipt:`, e);
                }
            }

            return { id: docRef.id, ...firestoreReceipt };
        },
        getById: async (id: string) => {
            return await getDocument('receipts', id);
        },
        update: async (id: string, updates: any) => {
            await receiptsService.update(id, updates);
            return { id, ...updates };
        },
        delete: async (id: string) => {
            await receiptsService.delete(id);
        }
    },

    // Statements
    statements: {
        getAll: async (userId?: string, role?: string, companyId?: string) => {
            const data = await statementsService.getAll(userId, role, companyId);
            return data;
        },
        create: async (statement: any) => {
            const firestoreStatement = {
                ...statement,
                createdBy: statement.userId || statement.user_id || statement.createdBy,
                companyId: statement.companyId || statement.company_id
            };
            const docRef = await statementsService.create(firestoreStatement);
            return { id: docRef.id, ...firestoreStatement };
        },
        getById: async (id: string) => {
            return await getDocument('statements', id);
        },
        update: async (id: string, updates: any) => {
            await statementsService.update(id, updates);
            return { id, ...updates };
        },
        delete: async (id: string) => {
            await statementsService.delete(id);
        },
        generateOverdue: async () => {
            console.warn("[Shim] generateOverdue (RPC) not implemented in Firestore shim");
            return [];
        }
    }
};

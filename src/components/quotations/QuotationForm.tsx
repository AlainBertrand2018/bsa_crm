
"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { VAT_RATE, QUOTATION_STATUSES } from '@/lib/constants';
import type { DocumentItem, Quotation, Product } from '@/lib/types';
import { formatCurrency, formatDate, generateQuotationId } from '@/lib/utils';
import { PlusCircle, Trash2, Save, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabaseService } from '@/lib/supabaseService';

const quotationItemSchema = z.object({
  id: z.string().optional(), // Existing item ID for updates
  productTypeId: z.string().min(1, "Product type is required"),
  description: z.string().optional(),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price cannot be negative"),
  total: z.number(),
});

const quotationFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientCompany: z.string().optional(),
  clientEmail: z.string().email("Invalid email address").min(1, "Client email is required"),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  clientBRN: z.string().optional(),
  items: z.array(quotationItemSchema).min(1, "At least one item is required"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").optional().default(0),
  notes: z.string().optional(),
  status: z.enum(QUOTATION_STATUSES), // Default is handled by form init
  currency: z.string().default('MUR'),
  clientId: z.string().optional(),
});

type QuotationFormValues = z.infer<typeof quotationFormSchema>;

interface QuotationFormProps {
  initialData?: Quotation;
  saveQuotation: (data: Quotation) => Promise<Quotation | void | undefined>;
  mode: 'create' | 'edit';
}

export function QuotationForm({ initialData, saveQuotation, mode }: QuotationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      if (!currentUser) return;
      try {
        const productsData = await supabaseService.products.getAll(currentUser.id, currentUser.role, currentUser.companyId);
        setProducts(productsData as Product[]);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    }
    fetchProducts();
  }, [currentUser]);

  const isOwner = !initialData || initialData.createdBy === currentUser?.id;
  const canEdit = currentUser?.role === 'Super Admin' || currentUser?.role === 'Admin' || isOwner;

  const form = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      discount: initialData.discount || 0,
      items: initialData.items.map(item => ({
        id: item.id,
        productTypeId: item.productTypeId,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
    } : {
      clientName: '',
      clientCompany: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientBRN: '',
      items: [{ productTypeId: '', description: '', quantity: 1, unitPrice: 0, total: 0 }],
      discount: 0,
      notes: '',
      status: 'To Send',
      currency: 'MUR',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedDiscount = form.watch("discount");

  const calculateTotals = useCallback(() => {
    const subTotal = watchedItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const discountAmount = watchedDiscount || 0;
    const amountBeforeVat = Math.max(0, subTotal - discountAmount);
    const vatAmount = amountBeforeVat * VAT_RATE;
    const grandTotal = amountBeforeVat + vatAmount;
    return { subTotal, discountAmount, vatAmount, grandTotal };
  }, [watchedItems, watchedDiscount]);

  const [totals, setTotals] = useState(calculateTotals());

  useEffect(() => {
    setTotals(calculateTotals());
  }, [watchedItems, watchedDiscount, calculateTotals]);

  const handleProductTypeChange = (index: number, productTypeId: string) => {
    const selectedProduct = products.find(p => p.id === productTypeId);
    if (selectedProduct) {
      const currentItem = form.getValues(`items.${index}`);
      const quantity = currentItem?.quantity || 1;
      form.setValue(`items.${index}.productTypeId`, selectedProduct.id);
      form.setValue(`items.${index}.description`, selectedProduct.name);
      form.setValue(`items.${index}.unitPrice`, selectedProduct.unitPrice);
      form.setValue(`items.${index}.total`, quantity * selectedProduct.unitPrice);
    }
  };

  const handleQuantityChange = (index: number, quantityInput: string | number) => {
    const numQuantity = Number(quantityInput);
    const validQuantity = isNaN(numQuantity) || numQuantity < 1 ? 1 : numQuantity;
    const currentItem = form.getValues(`items.${index}`);
    const unitPrice = currentItem?.unitPrice || 0;
    form.setValue(`items.${index}.quantity`, validQuantity);
    form.setValue(`items.${index}.total`, validQuantity * unitPrice);
  };

  const handleUnitPriceChange = (index: number, unitPriceInput: string | number) => {
    const numUnitPrice = Number(unitPriceInput);
    const validUnitPrice = isNaN(numUnitPrice) || numUnitPrice < 0 ? 0 : numUnitPrice;
    const currentItem = form.getValues(`items.${index}`);
    const quantity = currentItem?.quantity || 0;
    form.setValue(`items.${index}.unitPrice`, validUnitPrice);
    form.setValue(`items.${index}.total`, quantity * validUnitPrice);
  };



  async function onSubmit(data: QuotationFormValues) {
    setIsLoading(true);
    const { subTotal, discountAmount, vatAmount, grandTotal } = calculateTotals();

    const quotationData: Quotation = {
      id: initialData?.id || generateQuotationId(data.clientName),
      quotationDate: initialData?.quotationDate || new Date().toISOString(),
      expiryDate: initialData?.expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      clientName: data.clientName,
      clientCompany: data.clientCompany,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      clientAddress: data.clientAddress,
      clientBRN: data.clientBRN,
      items: data.items.map((item): DocumentItem => ({
        id: item.id || `item-new-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        productTypeId: item.productTypeId,
        description: item.description || products.find(p => p.id === item.productTypeId)?.name || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      subTotal,
      discount: discountAmount,
      vatAmount,
      grandTotal,
      status: data.status,
      notes: data.notes,
      currency: data.currency,
      createdBy: initialData?.createdBy || currentUser?.id || 'unknown',
    } as any;

    if (data.clientId) {
      (quotationData as any).clientId = data.clientId;
    }

    try {
      const result = await saveQuotation(quotationData);
      const resultId = result ? (result as Quotation).id : quotationData.id;

      toast({
        title: mode === 'create' ? "Quotation Created" : "Quotation Updated",
        description: `Quotation ${resultId} has been successfully ${mode === 'create' ? 'created' : 'updated'}.`,
      });
      router.push(`/quotations/${resultId}`);
    } catch (error) {
      console.error(`Failed to ${mode} quotation:`, error);
      toast({
        title: "Error",
        description: `Failed to ${mode} quotation. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Client Details</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="clientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Name*</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientCompany"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter company name (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client Email*</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter client email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientBRN"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client BRN</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter client BRN (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mobile Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter mobile number (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientAddress"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter client address (optional)" {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quotation Items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-lg relative">
                <FormField
                  control={form.control}
                  name={`items.${index}.productTypeId`}
                  render={({ field: controllerField }) => (
                    <FormItem className="md:col-span-4">
                      <FormLabel>Product Type*</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          controllerField.onChange(value);
                          handleProductTypeChange(index, value);
                        }}
                        defaultValue={controllerField.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select product type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem
                              key={product.id}
                              value={product.id}
                              disabled={(product.inventory ?? 0) <= 0 && (!initialData || initialData.items.find(i => i.productTypeId === product.id)?.productTypeId !== product.id)}
                            >
                              {product.name} ({(product.inventory ?? 0) > 0 || (initialData && initialData.items.find(i => i.productTypeId === product.id)) ? `${product.inventory ?? 0} available` : 'Sold out'})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.description`}
                  render={({ field: controllerField }) => (
                    <FormItem className="md:col-span-3 hidden md:block">
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Product description" {...controllerField} readOnly />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.quantity`}
                  render={({ field: controllerField }) => (
                    <FormItem className="md:col-span-1">
                      <FormLabel>Qty*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1"
                          {...controllerField}
                          value={controllerField.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            controllerField.onChange(value === '' ? undefined : parseInt(value, 10));
                            handleQuantityChange(index, value === '' ? 1 : parseInt(value, 10));
                          }}
                          min="1"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`items.${index}.unitPrice`}
                  render={({ field: controllerField }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Unit Price*</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0.00"
                          step="any"
                          {...controllerField}
                          value={controllerField.value || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            controllerField.onChange(value === '' ? undefined : parseFloat(value));
                            handleUnitPriceChange(index, value === '' ? 0 : parseFloat(value));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="md:col-span-1 text-right font-medium self-center pt-7">
                  {formatCurrency(watchedItems[index]?.total || 0, form.getValues('currency'))}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="md:col-span-1 text-destructive hover:text-destructive-foreground hover:bg-destructive/90 absolute top-2 right-2 md:static md:self-center"
                  aria-label="Remove item"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() => append({ productTypeId: '', description: '', quantity: 1, unitPrice: 0, total: 0 })}
              className="mt-2"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary & Notes</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add any notes for the client (optional)" {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount ({form.getValues('currency')})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0.00"
                        step="any"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) || value < 0 ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="space-y-2 text-right bg-muted/30 p-4 rounded-lg self-start">
              <div className="flex justify-between"><span>Subtotal:</span> <span>{formatCurrency(totals.subTotal, form.getValues('currency'))}</span></div>
              {(totals.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Discount:</span>
                  <span>-{formatCurrency(totals.discountAmount, form.getValues('currency'))}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Amount before VAT:</span>
                <span>{formatCurrency(Math.max(0, totals.subTotal - (totals.discountAmount || 0)), form.getValues('currency'))}</span>
              </div>
              <div className="flex justify-between"><span>VAT ({VAT_RATE * 100}%):</span> <span>{formatCurrency(totals.vatAmount, form.getValues('currency'))}</span></div>
              <div className="flex justify-between font-bold text-lg text-primary border-t pt-2 mt-2"><span>Grand Total:</span> <span>{formatCurrency(totals.grandTotal, form.getValues('currency'))}</span></div>
            </div>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {QUOTATION_STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isLoading || !canEdit}>
              {isLoading ? <><Save className="mr-2 h-4 w-4 animate-pulse" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> {mode === 'create' ? 'Save Quotation' : 'Update Quotation'}</>}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}

"use client";
import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabaseService } from '@/lib/supabaseService';
import { Product } from '@/lib/types';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Plus, Package, Tag, Loader2, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters."),
    type: z.enum(["Physical", "Service", "Digital DL"]),
    description: z.string().min(5, "Description must be at least 5 characters."),
    unitPrice: z.number().min(0, "Price cannot be negative."),
    bulkPrice: z.number().min(0, "Bulk price cannot be negative."),
    minOrder: z.number().min(1, "Minimum order must be at least 1."),
    inventory: z.number().min(0, "Inventory cannot be negative."),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function ProductsPage() {
    const { currentUser } = useAuth();
    const { toast } = useToast();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            type: "Physical",
            description: "",
            unitPrice: 0,
            bulkPrice: 0,
            minOrder: 1,
            inventory: 0,
        },
    });

    const fetchProducts = async () => {
        if (!currentUser) return;
        try {
            const data = await supabaseService.products.getAll(currentUser.id, currentUser.role, currentUser.companyId);
            const rawProducts = data as any[];
            const normalizedProducts = rawProducts.map(p => ({
                ...p,
                unitPrice: p.unitPrice ?? p.unit_price ?? 0,
                bulkPrice: p.bulkPrice ?? p.bulk_price ?? 0,
                minOrder: p.minOrder ?? p.min_order ?? 1,
                inventory: p.inventory ?? p.available ?? 0,
                type: p.type || 'Physical'
            }));
            setProducts(normalizedProducts as Product[]);
        } catch (error) {
            console.error("Error fetching products:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts();
    }, [currentUser]);

    const handleDelete = async (productId: string) => {
        if (currentUser?.role === 'User') {
            toast({
                title: "Permission Denied",
                description: "Regular users cannot delete product records.",
                variant: "destructive",
            });
            return;
        }

        try {
            await supabaseService.products.delete(productId);
            toast({
                title: "Product Deleted",
                description: "The product has been removed from the system.",
            });
            fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast({
                title: "Error",
                description: "Failed to delete product.",
                variant: "destructive",
            });
        }
    };

    const onSubmit = async (values: ProductFormValues) => {
        if (!currentUser) return;
        setIsSubmitting(true);
        try {
            await supabaseService.products.create({
                name: values.name,
                type: values.type,
                description: values.description,
                unitPrice: values.unitPrice,
                bulkPrice: values.bulkPrice,
                minOrder: values.minOrder,
                inventory: values.inventory,
                userId: currentUser.id,
                companyId: currentUser.companyId,
                rrp: values.unitPrice * 1.2, // Default RRP
            });

            toast({
                title: "Product Created",
                description: `${values.name} has been added to your inventory.`,
            });

            setIsDialogOpen(false);
            form.reset();
            fetchProducts();
        } catch (error) {
            console.error("Error creating product:", error);
            toast({
                title: "Error",
                description: "Failed to create product. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <FullPageLoading message="Loading products..." />;

    return (
        <>
            <PageHeader
                title="Products"
                description="Manage your products and inventory."
                actions={
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> New Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[525px]">
                            <DialogHeader>
                                <DialogTitle>Add New Product</DialogTitle>
                                <DialogDescription>
                                    Create a new product or service for your business.
                                </DialogDescription>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem className="col-span-2">
                                                    <FormLabel>Product Name</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Premium Hub Cap" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="type"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Type</FormLabel>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select type" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="Physical">Physical</SelectItem>
                                                            <SelectItem value="Service">Service</SelectItem>
                                                            <SelectItem value="Digital DL">Digital DL</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="inventory"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Inventory (Stock)</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type={form.watch("type") === "Physical" ? "number" : "text"}
                                                            min="0"
                                                            disabled={form.watch("type") !== "Physical"}
                                                            value={form.watch("type") === "Physical" ? field.value : "Unlimited"}
                                                            onChange={e => {
                                                                if (form.watch("type") === "Physical") {
                                                                    field.onChange(Math.max(0, Number(e.target.value)));
                                                                }
                                                            }}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea placeholder="Describe your product..." {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div className="grid grid-cols-3 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="unitPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Unit Price</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            {...field}
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="bulkPrice"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Bulk Price</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="0"
                                                            {...field}
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="minOrder"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Min Order</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            {...field}
                                                            onChange={e => field.onChange(Number(e.target.value))}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <DialogFooter>
                                        <Button type="submit" disabled={isSubmitting}>
                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Create Product
                                        </Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                }
            />
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead className="text-right">Unit Price</TableHead>
                                <TableHead className="text-right">Inventory</TableHead>
                                <TableHead className="text-right">Min Order</TableHead>
                                {currentUser?.role !== 'User' && (
                                    <TableHead className="text-right">Actions</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                        No products found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow key={product.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="bg-primary/10 p-2 rounded-full">
                                                    <Package className="h-4 w-4 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{product.name}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[200px]">{product.description}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                                                <Tag className="h-3 w-3" />
                                                {product.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
                                        <TableCell className="text-right">
                                            {product.type?.toLowerCase() === "physical" ? (
                                                <Badge variant={(product.inventory ?? 0) > 10 ? "secondary" : "destructive"}>
                                                    {product.inventory ?? 0} in stock
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary">Unlimited</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">{product.minOrder}</TableCell>
                                        {currentUser?.role !== 'User' && (
                                            <TableCell className="text-right">
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                This action cannot be undone. This will permanently delete the product
                                                                "{product.name}" from the database.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(product.id)}
                                                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                Delete
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}

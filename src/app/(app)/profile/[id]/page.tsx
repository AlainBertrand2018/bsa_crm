
"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { usersService } from '@/lib/firestore';
import { User, BusinessDetails, OnboardingProduct } from '@/lib/types';
import { ArrowLeft, User as UserIcon, Building2, Phone, Mail, MapPin, Globe, Briefcase, Package, Table as TableIcon, Plus } from 'lucide-react';
import { FullPageLoading } from '@/components/shared/LoadingSpinner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Edit2, Save, X } from 'lucide-react';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const id = typeof params.id === 'string' ? params.id : '';
    const { currentUser, isLoading: authLoading } = useAuth();

    const [user, setUser] = useState<User | null>(null);
    const [business, setBusiness] = useState<BusinessDetails | null>(null);
    const [products, setProducts] = useState<OnboardingProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editData, setEditData] = useState<Partial<BusinessDetails>>({});
    const { toast } = useToast();

    useEffect(() => {
        if (!authLoading && currentUser) {
            // Allow if Admin, Super Admin, or if viewing own profile
            if (currentUser.role !== 'Super Admin' && currentUser.role !== 'Admin' && currentUser.id !== id) {
                router.push('/dashboard');
            }
        }
    }, [currentUser, authLoading, id, router]);

    useEffect(() => {
        if (id) {
            setIsLoading(true);
            Promise.all([
                usersService.getById(id),
                usersService.getBusinessDetails(id),
                usersService.getProducts(id)
            ])
                .then(([userData, businessData, productsData]) => {
                    if (userData) {
                        setUser(userData as User);
                        setBusiness(businessData as BusinessDetails);
                        setProducts(productsData as OnboardingProduct[]);
                        if (businessData) {
                            setEditData(businessData as BusinessDetails);
                        }
                    }
                })
                .catch(console.error)
                .finally(() => setIsLoading(false));
        }
    }, [id]);

    const handleSaveBusiness = async () => {
        if (!id) return;

        // Validate BRN format
        const brnRegex = /^[CI]\d{8}$/i;
        if (editData.brn && !brnRegex.test(editData.brn.trim())) {
            toast({
                title: "Invalid BRN Format",
                description: "BRN must be 'C' or 'I' followed by 8 digits (e.g., C15127871).",
                variant: "destructive",
            });
            return;
        }

        setIsSaving(true);
        try {
            // Update in both locations for consistency
            await usersService.updateBusinessDetails(id, editData as BusinessDetails);

            // Trigger a silent update on the user doc too
            await usersService.update(id, {
                businessDetails: editData as BusinessDetails,
                businessName: editData.businessName || '',
                onboardingCompleted: true // Ensure they are marked as onboarded if they save this
            });

            setBusiness(prev => ({ ...prev, ...editData } as BusinessDetails));
            setIsEditing(false);
            toast({
                title: "Business Details Updated",
                description: "Your document headers will now reflect these changes.",
            });
            // Refresh currentUser if the user is viewing their own profile
            if (currentUser?.id === id) {
                // We'll let the listener handle it or we could call refreshUser
            }
        } catch (error) {
            console.error("Error updating business:", error);
            toast({
                title: "Error",
                description: "Failed to save business details.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <FullPageLoading message="Loading profile..." />;
    }

    if (!user) {
        return (
            <div className="container mx-auto py-12 text-center">
                <h2 className="text-2xl font-bold mb-4">User Not Found</h2>
                <Button onClick={() => router.back()}>Back</Button>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title={`User Profile: ${user.name}`}
                description="Detailed information about the user and their business."
                actions={
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                }
            />

            <div className="grid lg:grid-cols-3 gap-8">
                {/* User Account Info */}
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-lg overflow-hidden border-primary/20">
                        <div className="h-24 bg-primary/10 flex items-center justify-center">
                            <div className="bg-background p-4 rounded-full shadow-md border-2 border-primary/20">
                                <UserIcon className="h-12 w-12 text-primary" />
                            </div>
                        </div>
                        <CardHeader className="pt-8 text-center">
                            <CardTitle className="text-2xl font-bold">{user.name}</CardTitle>
                            <CardDescription className="flex items-center justify-center gap-2 mt-1">
                                <Mail className="h-3 w-3" /> {user.email}
                            </CardDescription>
                            <div className="flex justify-center gap-2 mt-4">
                                <Badge variant={user.role === 'Super Admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                </Badge>
                                <Badge variant={(!user.status || user.status === 'active') ? 'outline' : 'destructive'}>
                                    {user.status || 'active'}
                                </Badge>
                                <Badge variant={user.onboardingCompleted ? 'success' as any : 'warning' as any}>
                                    {user.onboardingCompleted ? 'Onboarded' : 'Pending Onboarding'}
                                </Badge>
                            </div>
                        </CardHeader>
                    </Card>

                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary" />
                                Account Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">User ID</p>
                                <p className="text-sm font-mono break-all">{user.id}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                                <p className="text-sm">{user.onboardingCompleted ? 'Active' : 'Awaiting Setup'}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Business and Products Info */}
                <div className="lg:col-span-2 space-y-8">
                    {business ? (
                        <Card className="shadow-lg">
                            <CardHeader className="bg-muted/30">
                                <CardTitle className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-6 w-6 text-primary" />
                                        Business Information
                                    </div>
                                    {(currentUser?.role === 'Super Admin' || currentUser?.id === id) && !isEditing && (
                                        <Button variant="outline" size="sm" onClick={() => {
                                            setEditData(business || {
                                                businessName: '',
                                                businessAddress: '',
                                                brn: '',
                                                telephone: '',
                                                position: '',
                                                email: user.email || ''
                                            });
                                            setIsEditing(true);
                                        }}>
                                            <Edit2 className="h-4 w-4 mr-2" /> Edit Details
                                        </Button>
                                    )}
                                </CardTitle>
                                <CardDescription>This information appears on your quotations and invoices.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-6 md:p-8">
                                {isEditing ? (
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Business Name</Label>
                                            <Input
                                                value={editData.businessName || ''}
                                                onChange={e => setEditData({ ...editData, businessName: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>BRN</Label>
                                            <Input
                                                value={editData.brn || ''}
                                                onChange={e => setEditData({ ...editData, brn: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label>Address</Label>
                                            <Textarea
                                                value={editData.businessAddress || ''}
                                                onChange={e => setEditData({ ...editData, businessAddress: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Position</Label>
                                            <Input
                                                value={editData.position || ''}
                                                onChange={e => setEditData({ ...editData, position: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Email</Label>
                                            <Input
                                                value={editData.email || ''}
                                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Telephone</Label>
                                            <Input
                                                value={editData.telephone || ''}
                                                onChange={e => setEditData({ ...editData, telephone: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>VAT Number (Optional)</Label>
                                            <Input
                                                value={editData.vatNo || ''}
                                                onChange={e => setEditData({ ...editData, vatNo: e.target.value })}
                                            />
                                        </div>
                                        <div className="md:col-span-2 flex justify-end gap-2 pt-4">
                                            <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                                                <X className="mr-2 h-4 w-4" /> Cancel
                                            </Button>
                                            <Button onClick={handleSaveBusiness} disabled={isSaving}>
                                                <Save className="mr-2 h-4 w-4" /> {isSaving ? 'Saving...' : 'Save Changes'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid md:grid-cols-2 gap-y-8 gap-x-12">
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Business Name</p>
                                            <p className="text-lg font-semibold">{business.businessName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">BRN</p>
                                            <p className="text-lg font-semibold">{business.brn}</p>
                                        </div>

                                        <div className="md:col-span-2 space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Address</p>
                                            <div className="flex items-start gap-2 pt-1 text-foreground/90">
                                                <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                                <p className="text-base whitespace-pre-wrap">{business.businessAddress}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Position</p>
                                            <p className="text-base font-medium">{business.position}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Business email</p>
                                            <div className="flex items-center gap-2 text-base">
                                                <Mail className="h-4 w-4 text-primary" />
                                                {business.email}
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">Telephone</p>
                                            <div className="flex items-center gap-2 text-base">
                                                <Phone className="h-4 w-4 text-primary" />
                                                {business.telephone}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-xs text-muted-foreground uppercase font-bold tracking-tight">VAT Number</p>
                                            <p className="text-base font-medium">{business.vatNo || 'N/A'}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="p-12 text-center shadow-lg border-dashed border-2 bg-muted/20">
                            <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-40" />
                            <h3 className="text-xl font-bold mb-2">No Business Profile</h3>
                            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">This account hasn't established a business profile yet. Document headers will use default system values.</p>
                            {(currentUser?.role === 'Super Admin' || currentUser?.id === id) && (
                                <Button onClick={() => setIsEditing(true)}>
                                    <Plus className="mr-2 h-4 w-4" /> Initialize Business Details
                                </Button>
                            )}
                        </Card>
                    )}

                    {products.length > 0 && (
                        <Card className="shadow-lg">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-6 w-6 text-primary" />
                                    Initial Product Inventory
                                </CardTitle>
                                <CardDescription>Items added during the onboarding process.</CardDescription>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="pl-6">Product</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="text-right">Unit Price</TableHead>
                                            <TableHead className="text-right pr-6">Min Order</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {products.map((product) => (
                                            <TableRow key={product.id}>
                                                <TableCell className="pl-6 font-medium">{product.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px]">{product.type}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(product.unitPrice, 'MUR')}</TableCell>
                                                <TableCell className="text-right pr-6">{product.minOrder}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </>
    );
}

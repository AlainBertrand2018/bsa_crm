
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { onboardingService } from "@/lib/firestore";
import { BusinessDetails, OnboardingProduct } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, ArrowLeft, CheckCircle2, Briefcase, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const OnboardingPage = () => {
    const { currentUser, refreshUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Business Details State
    const [businessData, setBusinessData] = useState<BusinessDetails>({
        businessName: "",
        businessAddress: "",
        brn: "",
        telephone: "",
        position: "",
        email: currentUser?.email || "",
        vatNo: "",
        mobilePhone: "",
        whatsapp: "",
        facebookPage: "",
        website: "",
    });

    // Products State
    const [products, setProducts] = useState<OnboardingProduct[]>([
        {
            id: "prod-" + Date.now(),
            name: "",
            type: "Physical",
            description: "",
            bulkPrice: 0,
            unitPrice: 0,
            rrp: 0,
            minOrder: 1,
            available: 0,
            inventory: 0,
        },
    ]);

    const handleBusinessChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setBusinessData((prev) => ({ ...prev, [name]: value }));
    };

    const handleProductChange = (index: number, field: keyof OnboardingProduct, value: string | number) => {
        const updatedProducts = [...products];
        updatedProducts[index] = { ...updatedProducts[index], [field]: value };
        setProducts(updatedProducts);
    };

    const addProduct = () => {
        setProducts([
            ...products,
            {
                id: "prod-" + Date.now(),
                name: "",
                type: "Physical",
                description: "",
                bulkPrice: 0,
                unitPrice: 0,
                rrp: 0,
                minOrder: 1,
                available: 0,
                inventory: 0,
            },
        ]);
    };

    const removeProduct = (index: number) => {
        if (products.length > 1) {
            setProducts(products.filter((_, i) => i !== index));
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!businessData.businessName || !businessData.businessAddress || !businessData.brn || !businessData.telephone || !businessData.position || !businessData.email) {
                toast({
                    title: "Missing Information",
                    description: "Please fill in all mandatory business details.",
                    variant: "destructive",
                });
                return;
            }
        }
        setStep(step + 1);
    };

    const prevStep = () => setStep(step - 1);

    const handleSubmit = async () => {
        if (!currentUser) return;

        // Validation for Step 2
        const invalidProduct = products.find(p => !p.name || !p.description || p.unitPrice <= 0);
        if (invalidProduct) {
            toast({
                title: "Invalid Product",
                description: "Please ensure all products have a name, description, and unit price.",
                variant: "destructive",
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await onboardingService.completeOnboarding(currentUser.id, businessData, products);
            await refreshUser(); // Force UI state update
            toast({
                title: "Onboarding Complete!",
                description: "Welcome to your new dashboard.",
            });
            router.push("/dashboard");
        } catch (error) {
            console.error("Onboarding failed:", error);
            toast({
                title: "Error",
                description: "There was a problem saving your information. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex flex-col items-center justify-center p-4 md:p-8">
            <div className="max-w-4xl w-full">
                {/* Progress Indicator */}
                <div className="flex items-center justify-center mb-8 space-x-4">
                    <div className={`flex items-center space-x-2 ${step >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 1 ? "border-primary bg-primary/10" : "border-muted"}`}>1</div>
                        <span className="font-medium hidden sm:inline">Business Details</span>
                    </div>
                    <div className={`w-12 h-px ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
                    <div className={`flex items-center space-x-2 ${step >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 2 ? "border-primary bg-primary/10" : "border-muted"}`}>2</div>
                        <span className="font-medium hidden sm:inline">Products/Services</span>
                    </div>
                    <div className={`w-12 h-px ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
                    <div className={`flex items-center space-x-2 ${step >= 3 ? "text-primary" : "text-muted-foreground"}`}>
                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold ${step >= 3 ? "border-primary bg-primary/10" : "border-muted"}`}>3</div>
                        <span className="font-medium hidden sm:inline">Review</span>
                    </div>
                </div>

                {step === 1 && (
                    <Card className="shadow-2xl border-primary/10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CardHeader>
                            <div className="flex items-center space-x-2 text-primary mb-2">
                                <Briefcase className="w-6 h-6" />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Step 1</h3>
                            </div>
                            <CardTitle className="text-3xl font-headline">Tell us about your Business</CardTitle>
                            <CardDescription>This information will be used for your invoices and quotations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="businessName">Business Name *</Label>
                                    <Input id="businessName" name="businessName" value={businessData.businessName} onChange={handleBusinessChange} placeholder="e.g. Acme Mauritius Ltd" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="brn">Business Registration Number (BRN) *</Label>
                                    <Input id="brn" name="brn" value={businessData.brn} onChange={handleBusinessChange} placeholder="e.g. C12345678" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="vatNo">VAT Number (Optional)</Label>
                                    <Input id="vatNo" name="vatNo" value={businessData.vatNo} onChange={handleBusinessChange} placeholder="e.g. 27000000" />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label htmlFor="businessAddress">Business Address *</Label>
                                    <Textarea id="businessAddress" name="businessAddress" value={businessData.businessAddress} onChange={handleBusinessChange} placeholder="Main Road, Port Louis, Mauritius" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telephone">Telephone *</Label>
                                    <Input id="telephone" name="telephone" value={businessData.telephone} onChange={handleBusinessChange} placeholder="+230 123 4567" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="position">Your Position *</Label>
                                    <Input id="position" name="position" value={businessData.position} onChange={handleBusinessChange} placeholder="e.g. Director, Manager" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Work Email *</Label>
                                    <Input id="email" name="email" type="email" value={businessData.email} onChange={handleBusinessChange} placeholder="contact@business.mu" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobilePhone">Mobile Phone (Optional)</Label>
                                    <Input id="mobilePhone" name="mobilePhone" value={businessData.mobilePhone} onChange={handleBusinessChange} placeholder="+230 5123 4567" />
                                </div>
                            </div>

                            <div className="pt-6 border-t">
                                <h4 className="font-semibold mb-4 text-primary">Socials & Website (Optional)</h4>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="whatsapp">Whatsapp</Label>
                                        <Input id="whatsapp" name="whatsapp" value={businessData.whatsapp} onChange={handleBusinessChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="facebookPage">Facebook</Label>
                                        <Input id="facebookPage" name="facebookPage" value={businessData.facebookPage} onChange={handleBusinessChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="website">Website</Label>
                                        <Input id="website" name="website" value={businessData.website} onChange={handleBusinessChange} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end p-6 bg-secondary/5">
                            <Button onClick={nextStep} className="group">
                                Next: Products
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === 2 && (
                    <Card className="shadow-2xl border-primary/10 animate-in fade-in slide-in-from-right-4 duration-500">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <div className="flex items-center space-x-2 text-primary mb-2">
                                    <Package className="w-6 h-6" />
                                    <h3 className="font-bold uppercase tracking-wider text-sm">Step 2</h3>
                                </div>
                                <CardTitle className="text-3xl font-headline">Define your Products</CardTitle>
                                <CardDescription>Add the products or services you want to sell.</CardDescription>
                            </div>
                            <Button onClick={addProduct} variant="outline" size="sm" className="hidden sm:flex">
                                <Plus className="mr-2 w-4 h-4" /> Add Product
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {products.map((product, index) => (
                                <div key={product.id} className="p-4 rounded-lg border bg-card relative group animate-in zoom-in-95 duration-300">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label>Product Name</Label>
                                            <Input value={product.name} onChange={(e) => handleProductChange(index, "name", e.target.value)} placeholder="e.g. Website Development" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={product.type} onValueChange={(val) => handleProductChange(index, "type", val)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Physical">Physical</SelectItem>
                                                    <SelectItem value="Service">Service</SelectItem>
                                                    <SelectItem value="Digital DL">Digital Download</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-3 space-y-2">
                                            <Label>Description</Label>
                                            <Textarea value={product.description} onChange={(e) => handleProductChange(index, "description", e.target.value)} placeholder="Describe what this product includes..." />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Unit Price (MUR)</Label>
                                            <Input type="number" value={product.unitPrice} onChange={(e) => handleProductChange(index, "unitPrice", Number(e.target.value))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Bulk Price (MUR)</Label>
                                            <Input type="number" value={product.bulkPrice} onChange={(e) => handleProductChange(index, "bulkPrice", Number(e.target.value))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Min Order</Label>
                                            <Input type="number" value={product.minOrder} onChange={(e) => handleProductChange(index, "minOrder", Number(e.target.value))} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Inventory (Total Stock)</Label>
                                            <Input
                                                type={product.type === "Physical" ? "number" : "text"}
                                                min="0"
                                                disabled={product.type !== "Physical"}
                                                value={product.type === "Physical" ? product.inventory : "Unlimited"}
                                                onChange={(e) => {
                                                    if (product.type === "Physical") {
                                                        handleProductChange(index, "inventory", Math.max(0, Number(e.target.value)));
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                    {products.length > 1 && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute -top-2 -right-2 bg-background border text-destructive hover:bg-destructive hover:text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removeProduct(index)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            <Button onClick={addProduct} variant="outline" className="w-full sm:hidden">
                                <Plus className="mr-2 w-4 h-4" /> Add Product
                            </Button>
                        </CardContent>
                        <CardFooter className="flex justify-between p-6 bg-secondary/5">
                            <Button variant="ghost" onClick={prevStep}>
                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                            </Button>
                            <Button onClick={nextStep} className="group">
                                Next: Review
                                <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </CardFooter>
                    </Card>
                )}

                {step === 3 && (
                    <Card className="shadow-2xl border-primary/10 animate-in fade-in slide-in-from-left-4 duration-500">
                        <CardHeader>
                            <div className="flex items-center space-x-2 text-primary mb-2">
                                <CheckCircle2 className="w-6 h-6" />
                                <h3 className="font-bold uppercase tracking-wider text-sm">Step 3</h3>
                            </div>
                            <CardTitle className="text-3xl font-headline">Review & Complete</CardTitle>
                            <CardDescription>Check your information before we set up your dashboard.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-8">
                                <div>
                                    <h4 className="font-bold text-primary mb-2">Business Details</h4>
                                    <div className="space-y-1 text-sm text-foreground/80">
                                        <p><span className="font-semibold">Name:</span> {businessData.businessName}</p>
                                        <p><span className="font-semibold">BRN:</span> {businessData.brn}</p>
                                        <p><span className="font-semibold">Address:</span> {businessData.businessAddress}</p>
                                        <p><span className="font-semibold">Contact:</span> {businessData.telephone}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-bold text-primary mb-2">Products Summary</h4>
                                    <p className="text-sm text-foreground/80">{products.length} product(s) added.</p>
                                    <ul className="mt-2 space-y-1">
                                        {products.slice(0, 3).map(p => (
                                            <li key={p.id} className="text-sm truncate">• {p.name || "Unnamed Product"}</li>
                                        ))}
                                        {products.length > 3 && <li className="text-xs text-muted-foreground">...and {products.length - 3} more</li>}
                                    </ul>
                                </div>
                            </div>
                            <div className="p-4 rounded-lg bg-primary/5 text-primary text-sm flex items-start space-x-2">
                                <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" />
                                <p>By completing this step, your business profile will be activated and you can start creating quotations immediately.</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between p-6 bg-secondary/5">
                            <Button variant="ghost" onClick={prevStep}>
                                <ArrowLeft className="mr-2 w-4 h-4" /> Back
                            </Button>
                            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8">
                                {isSubmitting ? "Saving..." : "Finish Setup"}
                            </Button>
                        </CardFooter>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default OnboardingPage;
